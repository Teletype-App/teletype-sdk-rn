import React, { useEffect, useRef, useState } from 'react';
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getLocales } from 'react-native-localize';
import { pick, isErrorWithCode, errorCodes } from '@react-native-documents/picker';
import {
  TeletypeProvider,
  ChatWidget,
  TeletypeClient,
  useTeletype,
  useUnreadCount,
  getSystemLanguage,
} from 'teletype-react-native-sdk';

// Languages the demo cycles through with the "Language" button.
const LOCALE_ORDER = ['en', 'ru', 'es'];

function nextLocale(current: string): string {
  const idx = LOCALE_ORDER.indexOf(current);
  return LOCALE_ORDER[(idx + 1) % LOCALE_ORDER.length];
}

/**
 * Detect the device's language. `react-native-localize` reads the real device
 * preference (`NSLocale.preferredLanguages`), which is reliable even when the
 * app itself isn't localized for that language — unlike `Intl`, which on iOS is
 * capped by the app's declared localizations. Falls back to the SDK helper.
 */
function detectDeviceLanguage(): string {
  try {
    const code = getLocales()?.[0]?.languageCode;
    if (code) {
      return code.slice(0, 2).toLowerCase();
    }
  } catch {
    // fall through
  }
  return getSystemLanguage();
}
import { translations, getDemoStrings } from './localization';

// Hardcode a real external id here to skip the setup input entirely. Leave it
// empty to let the app ask for it (and remember it on the device).
const EXTERNAL_ID = '';

// AsyncStorage key where the demo remembers the external id entered at runtime.
const STORAGE_KEY = 'teletype_demo_external_id';

/**
 * Accepts either a bare external id or a full Teletype install `<script>`
 * snippet and returns just the id. In the snippet the id lives in
 * `window.teletypeExternalId = "…"`, so we pull it from there; anything else is
 * treated as an already-clean id.
 */
function extractExternalId(input: string): string {
  const trimmed = input.trim();
  const match = trimmed.match(/teletypeExternalId\s*=\s*["']([^"']+)["']/);
  return (match ? match[1] : trimmed).trim();
}

function Demo({
  locale,
  onCycleLocale,
  onClearCache,
}: {
  locale: string;
  onCycleLocale: () => void;
  onClearCache: () => void;
}) {
  const client = useTeletype();
  const unread = useUnreadCount();
  // Localize the demo's own UI the same way the SDK localizes the chat.
  const t = getDemoStrings(locale);

  // Pick a file from the device and send it as a chat attachment. The SDK
  // handles the actual upload (multipart POST) + delivery; the host app only
  // decides how files are chosen. Uses `@react-native-documents/picker`, a
  // plain React Native library (not tied to Expo).
  const handleAttachment = async () => {
    try {
      const [file] = await pick();
      // iOS document picker dismisses the chat modal; bring it back.
      client.show();
      if (!file) {
        return;
      }
      await client.uploadFile({
        uri: file.uri,
        name: file.name ?? 'file',
        type: file.type ?? 'application/octet-stream',
        size: file.size ?? undefined,
      });
    } catch (e) {
      // The user dismissing the picker is not an error.
      if (isErrorWithCode(e) && e.code === errorCodes.OPERATION_CANCELED) {
        client.show();
        return;
      }
      console.warn('[teletype] attachment failed', e);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>{t.screenTitle}</Text>
        <Text style={styles.subtitle}>
          {t.screenSubtitle.replace('{unread}', String(unread))}
        </Text>

        <TouchableOpacity style={styles.btnOutline} onPress={onCycleLocale}>
          <Text style={styles.btnOutlineText}>
            {t.languageButton.replace('{lang}', locale.toUpperCase())}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.btn} onPress={() => client.show()}>
          <Text style={styles.btnText}>{t.openChat}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.btnDanger} onPress={onClearCache}>
          <Text style={styles.btnDangerText}>{t.clearCache}</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Floating launcher + modal chat surface. Color and chat title come
          from TeletypeProvider. Attachment picking stays in the host app. */}
      <ChatWidget
        buttonProps={{
          position: 'right',
          scale: 100,
        }}
        screenProps={{
          onAttachmentPress: handleAttachment,
        }}
      />
    </SafeAreaView>
  );
}

/** Shown when there is no external id yet: lets the user paste one (or a snippet). */
function SetupScreen({
  locale,
  onCycleLocale,
  onConnect,
}: {
  locale: string;
  onCycleLocale: () => void;
  onConnect: (raw: string) => void;
}) {
  const [value, setValue] = useState('');
  const t = getDemoStrings(locale);
  const canConnect = extractExternalId(value).length > 0;

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="dark" />
      <View style={styles.content}>
        <Text style={styles.title}>{t.screenTitle}</Text>
        <Text style={styles.subtitle}>{t.setupTitle}</Text>
        <Text style={styles.hint}>{t.setupHint}</Text>

        <TouchableOpacity style={styles.btnOutline} onPress={onCycleLocale}>
          <Text style={styles.btnOutlineText}>
            {t.languageButton.replace('{lang}', locale.toUpperCase())}
          </Text>
        </TouchableOpacity>

        <TextInput
          style={styles.input}
          value={value}
          onChangeText={setValue}
          placeholder={t.externalIdPlaceholder}
          placeholderTextColor="#9aa0a6"
          autoCapitalize="none"
          autoCorrect={false}
          multiline
        />

        <TouchableOpacity
          style={[styles.btn, !canConnect && styles.btnDisabled]}
          disabled={!canConnect}
          onPress={() => onConnect(value)}
        >
          <Text style={styles.btnText}>{t.connect}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

export default function App() {
  // null → still loading the saved id, '' → needs setup, non-empty → connected.
  const [externalId, setExternalId] = useState<string | null>(null);
  // UI language for the whole app. Defaults to the device language and is
  // available even before a channel is connected (on the setup screen).
  const [uiLocale, setUiLocale] = useState<string>(() => detectDeviceLanguage());
  const clientRef = useRef<TeletypeClient | null>(null);

  // Cycle language everywhere: the demo UI (via `uiLocale`) and, once a client
  // exists, the SDK chat too (via `setLocale`).
  const handleCycleLocale = () => {
    setUiLocale((current) => {
      const next = nextLocale(current);
      clientRef.current?.setLocale(next);
      return next;
    });
  };

  useEffect(() => {
    (async () => {
      if (EXTERNAL_ID) {
        setExternalId(EXTERNAL_ID);
        return;
      }
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        setExternalId(stored ?? '');
      } catch {
        setExternalId('');
      }
    })();
  }, []);

  const handleConnect = async (raw: string) => {
    const id = extractExternalId(raw);
    if (!id) {
      return;
    }
    try {
      await AsyncStorage.setItem(STORAGE_KEY, id);
    } catch {
      // Non-fatal: we still connect for this session.
    }
    setExternalId(id);
  };

  // Red "clear cache" action: wipe every locally persisted chat key (messages,
  // person data, appeal, config, …) plus the saved external id, then return to
  // the setup screen.
  const handleClearCache = async () => {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const toRemove = keys.filter(
        (k) => k.startsWith('teletype-') || k === STORAGE_KEY,
      );
      if (toRemove.length) {
        await AsyncStorage.multiRemove(toRemove);
      }
    } catch {
      // Ignore storage errors; still reset the UI below.
    }
    clientRef.current = null;
    setExternalId(EXTERNAL_ID || '');
  };

  // Still resolving the stored id.
  if (externalId === null) {
    return (
      <SafeAreaView style={styles.safe}>
        <StatusBar style="dark" />
      </SafeAreaView>
    );
  }

  // No id yet → ask for one (language switch already works here).
  if (!externalId) {
    return (
      <SetupScreen
        locale={uiLocale}
        onCycleLocale={handleCycleLocale}
        onConnect={handleConnect}
      />
    );
  }

  return (
    <TeletypeProvider
      // Re-mount the client cleanly whenever the external id changes.
      key={externalId}
      teletypeExternalId={externalId}
      // 'dev' → teletypeapp.com cluster, 'prod' → teletype.app. The REST API and
      // sockets both follow this. Switch to 'prod' for a teletype.app account.
      mode="dev"
      soundEnabled
      // Start in the language chosen on the setup screen (defaults to device).
      // Runtime switches go through `setLocale` (see handleCycleLocale).
      locale={uiLocale}
      translations={translations}
      title={getDemoStrings(uiLocale).chatTitle}
      primaryColor="#0084ff"
      onReady={(client) => {
        clientRef.current = client;
        // Subscribe to the public events (equivalent to `teletype.*` DOM events)
        client.on('ready', () => console.log('[teletype] ready'));
        client.on('messageReceived', (m) =>
          console.log('[teletype] received', m.message),
        );
        client.on('messageSent', (m) =>
          console.log('[teletype] sent', m.message),
        );
        client.on('dialogRated', (r) => console.log('[teletype] rated', r));
      }}
    >
      <StatusBar style="dark" />
      <Demo
        locale={uiLocale}
        onCycleLocale={handleCycleLocale}
        onClearCache={handleClearCache}
      />
    </TeletypeProvider>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 24, paddingTop: 60 },
  title: { fontSize: 28, fontWeight: '800', color: '#111' },
  subtitle: { fontSize: 15, color: '#666', marginTop: 6, marginBottom: 28 },
  hint: { fontSize: 14, color: '#888', marginTop: -18, marginBottom: 20 },
  input: {
    borderWidth: 1,
    borderColor: '#d0d5da',
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: '#111',
    minHeight: 96,
    textAlignVertical: 'top',
    marginBottom: 16,
  },
  btn: {
    backgroundColor: '#0084ff',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  btnDisabled: { opacity: 0.4 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  btnOutline: {
    borderWidth: 1,
    borderColor: '#0084ff',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  btnOutlineText: { color: '#0084ff', fontSize: 16, fontWeight: '600' },
  btnDanger: {
    backgroundColor: '#e5352b',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 24,
  },
  btnDangerText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
