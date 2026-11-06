import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Modal,
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
  ChatScreen,
  TeletypeClient,
  useTeletype,
  useTeletypeState,
  useUnreadCount,
  getSystemLanguage,
  CHAT_BACKGROUND_PICKER,
  CHAT_BACKGROUND_THUMBS,
  CHAT_BUTTON_SCALES,
  isChatBackground,
  extractTeletypeExternalId,
  isTeletypeExternalId,
} from 'teletype-sdk-rn';
import type {
  ChatBackground,
  ChatButtonPosition,
  ChatButtonScale,
} from 'teletype-sdk-rn';
import { translations, getDemoStrings } from './localization';
import type { DemoStrings } from './localization';

// Languages the demo cycles through with the "Language" button.
const LOCALE_ORDER = ['en', 'ru'];

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
      const lang = code.slice(0, 2).toLowerCase();
      return lang === 'ru' ? 'ru' : 'en';
    }
  } catch {
    // fall through
  }
  const system = getSystemLanguage();
  return system === 'ru' ? 'ru' : 'en';
}

// Hardcode a real external id here to skip the setup input entirely. Leave it
// empty to let the app ask for it (and remember it on the device).
const EXTERNAL_ID = '';

// AsyncStorage keys for the values entered on the setup / home screens.
const STORAGE_KEY = 'teletype_demo_external_id';
const STORAGE_KEY_TITLE = 'teletype_demo_chat_title';
const STORAGE_KEY_COLOR = 'teletype_demo_primary_color';
const STORAGE_KEY_BG = 'teletype_demo_chat_background';
const STORAGE_KEY_BTN_POS = 'teletype_demo_button_position';
const STORAGE_KEY_BTN_SCALE = 'teletype_demo_button_scale';

const CHAT_COLORS = [
  '#0084ff',
  '#34c759',
  '#ff3b30',
  '#7c3aed',
  '#ffcc00',
] as const;

type SetupError = 'format' | 'snippet' | 'channel' | 'connection';

function looksLikeEmbedSnippet(input: string): boolean {
  return /<\s*script|teletypeExternalId|widget\.teletype/i.test(input);
}

function setupErrorText(t: DemoStrings, error: SetupError | null): string {
  if (!error) {
    return '';
  }
  if (error === 'snippet') {
    return t.snippetMissingId;
  }
  if (error === 'channel') {
    return t.invalidChannel;
  }
  if (error === 'connection') {
    return t.connectionFailed;
  }
  return t.invalidExternalId;
}

function isButtonPosition(value: string | null): value is ChatButtonPosition {
  return value === 'left' || value === 'right';
}

function parseButtonScale(value: string | null): ChatButtonScale | null {
  const n = Number(value);
  return (CHAT_BUTTON_SCALES as readonly number[]).includes(n)
    ? (n as ChatButtonScale)
    : null;
}

function DemoSelect<T extends string | number>({
  title,
  value,
  options,
  open,
  onOpenChange,
  onChange,
}: {
  title: string;
  value: T;
  options: { value: T; label: string }[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChange: (value: T) => void;
}) {
  const selected = options.find((option) => option.value === value);
  return (
    <View style={styles.selectWrap}>
      <TouchableOpacity
        style={styles.selectField}
        onPress={() => onOpenChange(!open)}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
      >
        <Text style={styles.selectValue} numberOfLines={1}>
          {selected?.label ?? ''}
        </Text>
        <Text style={styles.selectArrow}>▼</Text>
      </TouchableOpacity>
      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => onOpenChange(false)}
      >
        <View style={styles.selectOverlay}>
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={() => onOpenChange(false)}
          />
          <View
            style={styles.selectModal}
            onStartShouldSetResponder={() => true}
          >
            <Text style={styles.selectModalTitle}>{title}</Text>
            {options.map((option) => {
              const active = option.value === value;
              return (
                <TouchableOpacity
                  key={String(option.value)}
                  style={[
                    styles.selectOption,
                    active && styles.selectOptionActive,
                  ]}
                  onPress={() => {
                    onChange(option.value);
                    onOpenChange(false);
                  }}
                >
                  <Text
                    style={[
                      styles.selectOptionText,
                      active && styles.selectOptionTextActive,
                    ]}
                  >
                    {option.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </Modal>
    </View>
  );
}

function AppearanceFields({
  locale,
  chatTitle,
  onChangeTitle,
  primaryColor,
  onChangeColor,
  chatBackground,
  onChangeBackground,
  buttonPosition,
  onChangePosition,
  buttonScale,
  onChangeScale,
}: {
  locale: string;
  chatTitle: string;
  onChangeTitle: (value: string) => void;
  primaryColor: string;
  onChangeColor: (value: string) => void;
  chatBackground: ChatBackground;
  onChangeBackground: (value: ChatBackground) => void;
  buttonPosition: ChatButtonPosition;
  onChangePosition: (value: ChatButtonPosition) => void;
  buttonScale: ChatButtonScale;
  onChangeScale: (value: ChatButtonScale) => void;
}) {
  const t = getDemoStrings(locale);
  const [openSelect, setOpenSelect] = useState<'position' | 'scale' | null>(
    null,
  );
  return (
    <>
      <Text style={styles.fieldLabel}>{t.chatTitleLabel}</Text>
      <TextInput
        style={styles.inputSingle}
        value={chatTitle}
        onChangeText={onChangeTitle}
        placeholder={t.chatTitlePlaceholder}
        placeholderTextColor="#9aa0a6"
        autoCorrect={false}
      />

      <Text style={styles.fieldLabel}>{t.chatColorLabel}</Text>
      <View style={styles.swatchRow}>
        {CHAT_COLORS.map((color) => {
          const selected = color.toLowerCase() === primaryColor.toLowerCase();
          return (
            <TouchableOpacity
              key={color}
              style={[styles.swatch, { backgroundColor: color }]}
              onPress={() => onChangeColor(color)}
              accessibilityRole="button"
              accessibilityState={{ selected }}
            >
              {selected ? <Text style={styles.swatchCheck}>✓</Text> : null}
            </TouchableOpacity>
          );
        })}
      </View>

      <Text style={styles.fieldLabel}>{t.chatBackgroundLabel}</Text>
      <View style={styles.bgRow}>
        {CHAT_BACKGROUND_PICKER.map((id) => {
          const selected = id === chatBackground;
          const source = id === 'white' ? null : CHAT_BACKGROUND_THUMBS[id];
          return (
            <TouchableOpacity
              key={id}
              style={[styles.bgCard, selected && styles.bgCardSelected]}
              onPress={() => onChangeBackground(id)}
              accessibilityRole="button"
              accessibilityState={{ selected }}
            >
              {source ? (
                <Image
                  source={source}
                  style={styles.bgCardImage}
                  resizeMode="cover"
                />
              ) : null}
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={styles.selectRow}>
        <View style={styles.selectCol}>
          <Text style={styles.fieldLabel}>{t.buttonPositionLabel}</Text>
          <DemoSelect
            title={t.buttonPositionLabel}
            value={buttonPosition}
            options={[
              { value: 'right', label: t.buttonPositionRight },
              { value: 'left', label: t.buttonPositionLeft },
            ]}
            open={openSelect === 'position'}
            onOpenChange={(next) => setOpenSelect(next ? 'position' : null)}
            onChange={onChangePosition}
          />
        </View>
        <View style={styles.selectCol}>
          <Text style={styles.fieldLabel}>{t.buttonScaleLabel}</Text>
          <DemoSelect
            title={t.buttonScaleLabel}
            value={buttonScale}
            options={[...CHAT_BUTTON_SCALES]
              .reverse()
              .map((scale) => ({ value: scale, label: `${scale}%` }))}
            open={openSelect === 'scale'}
            onOpenChange={(next) => setOpenSelect(next ? 'scale' : null)}
            onChange={onChangeScale}
          />
        </View>
      </View>
    </>
  );
}

function Demo({
  locale,
  onCycleLocale,
  onClearCache,
  chatTitle,
  onChangeTitle,
  primaryColor,
  onChangeColor,
  chatBackground,
  onChangeBackground,
  buttonPosition,
  onChangePosition,
  buttonScale,
  onChangeScale,
}: {
  locale: string;
  onCycleLocale: () => void;
  onClearCache: () => void;
  chatTitle: string;
  onChangeTitle: (value: string) => void;
  primaryColor: string;
  onChangeColor: (value: string) => void;
  chatBackground: ChatBackground;
  onChangeBackground: (value: ChatBackground) => void;
  buttonPosition: ChatButtonPosition;
  onChangePosition: (value: ChatButtonPosition) => void;
  buttonScale: ChatButtonScale;
  onChangeScale: (value: ChatButtonScale) => void;
}) {
  const client = useTeletype();
  const { opened } = useTeletypeState();
  const unread = useUnreadCount();
  // Localize the demo's own UI the same way the SDK localizes the chat.
  const t = getDemoStrings(locale);

  // Pick a file from the device. Return it so the SDK can show the
  // send-confirmation modal, then upload + deliver. Uses
  // `@react-native-documents/picker`, a plain React Native library (not
  // tied to Expo).
  const handleAttachment = async () => {
    try {
      const [file] = await pick({ copyTo: 'cachesDirectory' });
      if (!file) {
        return;
      }
      return {
        uri: file.fileCopyUri || file.uri,
        name: file.name ?? 'file',
        type: file.type ?? 'application/octet-stream',
        size: file.size ?? undefined,
      };
    } catch (e) {
      // The user dismissing the picker is not an error.
      if (isErrorWithCode(e) && e.code === errorCodes.OPERATION_CANCELED) {
        return;
      }
      console.warn('[teletype] attachment failed', e);
    }
  };

  if (opened) {
    return (
      <ChatScreen
        onAttachmentPress={handleAttachment}
        onClose={() => client.hide()}
      />
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>{t.screenTitle}</Text>
        <Text style={styles.subtitle}>
          {t.screenSubtitle.replace('{unread}', String(unread))}
        </Text>

        <AppearanceFields
          locale={locale}
          chatTitle={chatTitle}
          onChangeTitle={onChangeTitle}
          primaryColor={primaryColor}
          onChangeColor={onChangeColor}
          chatBackground={chatBackground}
          onChangeBackground={onChangeBackground}
          buttonPosition={buttonPosition}
          onChangePosition={onChangePosition}
          buttonScale={buttonScale}
          onChangeScale={onChangeScale}
        />

        <TouchableOpacity style={styles.btn} onPress={() => client.show()}>
          <Text style={styles.btnText}>{t.openChat}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.btnDanger} onPress={onClearCache}>
          <Text style={styles.btnDangerText}>{t.clearCache}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.btnOutline}
          onPress={onCycleLocale}
        >
          <Text style={styles.btnOutlineText} numberOfLines={1}>
            {t.languageButton.replace('{lang}', locale.toUpperCase())}
          </Text>
        </TouchableOpacity>
      </ScrollView>

      <ChatWidget
        buttonProps={{
          position: buttonPosition,
          scale: buttonScale,
          bottom: 40,
        }}
      />
    </SafeAreaView>
  );
}

/** Full-screen blocker shown while the channel id is verified over REST + WS. */
function ConnectingScreen({ locale }: { locale: string }) {
  const t = getDemoStrings(locale);
  return (
    <View style={[styles.safe, styles.connecting]} pointerEvents="auto">
      <StatusBar style="dark" />
      <ActivityIndicator size="large" color="#0084ff" />
      <Text style={styles.connectingText}>{t.connecting}</Text>
    </View>
  );
}

/** Shown when there is no external id yet: lets the user paste one (or a snippet). */
function SetupScreen({
  locale,
  value,
  error,
  onChangeValue,
  onCycleLocale,
  onConnect,
}: {
  locale: string;
  value: string;
  error: SetupError | null;
  onChangeValue: (value: string) => void;
  onCycleLocale: () => void;
  onConnect: (raw: string) => void;
}) {
  const t = getDemoStrings(locale);
  const parsedId = extractTeletypeExternalId(value);
  const idLooksValid = isTeletypeExternalId(parsedId);
  const canSubmit = value.trim().length > 0;
  const errorText = setupErrorText(t, error);

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="dark" />
      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.setupContent}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        automaticallyAdjustKeyboardInsets
      >
        <Text style={styles.title}>{t.screenTitle}</Text>
        <Text style={styles.subtitle}>{t.setupTitle}</Text>
        <Text style={styles.hint}>{t.setupHint}</Text>

        <TouchableOpacity style={styles.btnOutline} onPress={onCycleLocale}>
          <Text style={styles.btnOutlineText} numberOfLines={1}>
            {t.languageButton.replace('{lang}', locale.toUpperCase())}
          </Text>
        </TouchableOpacity>

        <TextInput
          style={[styles.input, error ? styles.inputError : null]}
          value={value}
          onChangeText={onChangeValue}
          placeholder={t.externalIdPlaceholder}
          placeholderTextColor="#9aa0a6"
          autoCapitalize="none"
          autoCorrect={false}
          multiline
          scrollEnabled
          textAlignVertical="top"
        />

        {idLooksValid ? (
          <Text style={styles.parsedId} numberOfLines={2}>
            {t.parsedId.replace('{id}', parsedId)}
          </Text>
        ) : null}

        {errorText ? <Text style={styles.errorText}>{errorText}</Text> : null}

        <TouchableOpacity
          style={[styles.btn, !canSubmit && styles.btnDisabled]}
          disabled={!canSubmit}
          onPress={() => onConnect(value)}
        >
          <Text style={styles.btnText}>{t.connect}</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

export default function App() {
  const [session, setSession] = useState<'boot' | 'setup' | 'connecting' | 'ready'>(
    'boot',
  );
  const [externalId, setExternalId] = useState('');
  const [draftId, setDraftId] = useState('');
  const [setupError, setSetupError] = useState<SetupError | null>(null);
  // UI language for the whole app. Defaults to the device language and is
  // available even before a channel is connected (on the setup screen).
  const [uiLocale, setUiLocale] = useState<string>(() => detectDeviceLanguage());
  const [chatTitle, setChatTitle] = useState('');
  const [primaryColor, setPrimaryColor] = useState('#0084ff');
  const [chatBackground, setChatBackground] =
    useState<ChatBackground>('white');
  const [buttonPosition, setButtonPosition] =
    useState<ChatButtonPosition>('right');
  const [buttonScale, setButtonScale] = useState<ChatButtonScale>(100);
  const [channelClient, setChannelClient] = useState<TeletypeClient | null>(
    null,
  );
  const clientRef = useRef<TeletypeClient | null>(null);

  const resolvedTitle =
    chatTitle.trim() || getDemoStrings(uiLocale).chatTitle;

  const persistTitle = (value: string) => {
    setChatTitle(value);
    void AsyncStorage.setItem(STORAGE_KEY_TITLE, value).catch(() => undefined);
  };

  const persistColor = (value: string) => {
    setPrimaryColor(value);
    void AsyncStorage.setItem(STORAGE_KEY_COLOR, value).catch(() => undefined);
  };

  const persistBackground = (value: ChatBackground) => {
    setChatBackground(value);
    void AsyncStorage.setItem(STORAGE_KEY_BG, value).catch(() => undefined);
  };

  const persistPosition = (value: ChatButtonPosition) => {
    setButtonPosition(value);
    void AsyncStorage.setItem(STORAGE_KEY_BTN_POS, value).catch(() => undefined);
  };

  const persistScale = (value: ChatButtonScale) => {
    setButtonScale(value);
    void AsyncStorage.setItem(STORAGE_KEY_BTN_SCALE, String(value)).catch(
      () => undefined,
    );
  };

  // Cycle language everywhere: the demo UI (via `uiLocale`) and, once a client
  // exists, the SDK chat too (via `setLocale`).
  const handleCycleLocale = () => {
    setUiLocale((current) => {
      const next = nextLocale(current);
      clientRef.current?.setLocale(next);
      return next;
    });
  };

  const dropClient = () => {
    clientRef.current?.destroy();
    clientRef.current = null;
    setChannelClient(null);
  };

  const verifyAndEnter = async (id: string) => {
    setSetupError(null);
    setSession('connecting');
    dropClient();

    const client = new TeletypeClient({
      teletypeExternalId: id,
      mode: 'dev',
      soundEnabled: true,
      locale: uiLocale,
      translations,
      title: resolvedTitle,
      primaryColor,
      chatBackground,
    });

    try {
      await client.init();
      if (!client.state.config) {
        throw new Error('channel');
      }
      await client.waitUntilConnected(15000);
      clientRef.current = client;
      setChannelClient(client);
      try {
        await AsyncStorage.setItem(STORAGE_KEY, id);
      } catch {
        // Non-fatal: we still connect for this session.
      }
      setExternalId(id);
      setSession('ready');
    } catch (err) {
      client.destroy();
      const isChannel =
        err instanceof Error && err.message === 'channel';
      setSetupError(isChannel ? 'channel' : 'connection');
      setDraftId(id);
      setExternalId('');
      setSession('setup');
    }
  };

  useEffect(() => {
    (async () => {
      let storedId = EXTERNAL_ID;
      try {
        const [
          stored,
          storedTitle,
          storedColor,
          storedBg,
          storedPos,
          storedScale,
        ] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEY),
          AsyncStorage.getItem(STORAGE_KEY_TITLE),
          AsyncStorage.getItem(STORAGE_KEY_COLOR),
          AsyncStorage.getItem(STORAGE_KEY_BG),
          AsyncStorage.getItem(STORAGE_KEY_BTN_POS),
          AsyncStorage.getItem(STORAGE_KEY_BTN_SCALE),
        ]);
        if (!storedId) {
          storedId = stored ?? '';
        }
        if (storedTitle) {
          setChatTitle(storedTitle);
        }
        if (storedColor) {
          setPrimaryColor(storedColor);
        }
        if (isChatBackground(storedBg)) {
          setChatBackground(storedBg);
        }
        if (isButtonPosition(storedPos)) {
          setButtonPosition(storedPos);
        }
        const parsedScale = parseButtonScale(storedScale);
        if (parsedScale) {
          setButtonScale(parsedScale);
        }
      } catch {
        storedId = EXTERNAL_ID;
      }

      const parsed = extractTeletypeExternalId(storedId);
      if (!parsed) {
        setDraftId(storedId);
        setSession('setup');
        return;
      }
      if (!isTeletypeExternalId(parsed)) {
        setDraftId(storedId);
        setSetupError('format');
        setSession('setup');
        return;
      }
      setDraftId(parsed);
      await verifyAndEnter(parsed);
    })();
    // Boot-only: appearance setters and verifyAndEnter close over the initial render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleConnect = (raw: string) => {
    const parsed = extractTeletypeExternalId(raw);
    if (!parsed) {
      setSetupError(looksLikeEmbedSnippet(raw) ? 'snippet' : 'format');
      return;
    }
    if (!isTeletypeExternalId(parsed)) {
      setSetupError('format');
      return;
    }
    setDraftId(parsed);
    void verifyAndEnter(parsed);
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
    dropClient();
    setExternalId('');
    setDraftId('');
    setSetupError(null);
    setSession('setup');
  };

  if (session === 'boot' || session === 'connecting') {
    return <ConnectingScreen locale={uiLocale} />;
  }

  if (session !== 'ready' || !channelClient) {
    return (
      <SetupScreen
        locale={uiLocale}
        value={draftId}
        error={setupError}
        onChangeValue={(next) => {
          setDraftId(next);
          if (setupError) {
            setSetupError(null);
          }
        }}
        onCycleLocale={handleCycleLocale}
        onConnect={handleConnect}
      />
    );
  }

  return (
    <TeletypeProvider
      // Re-mount the client cleanly whenever the external id changes.
      key={externalId}
      client={channelClient}
      teletypeExternalId={externalId}
      // 'dev' → teletypeapp.com cluster, 'prod' → teletype.app. The REST API and
      // sockets both follow this. Switch to 'prod' for a teletype.app account.
      mode="dev"
      soundEnabled
      // Start in the language chosen on the setup screen (defaults to device).
      // Runtime switches go through `setLocale` (see handleCycleLocale).
      locale={uiLocale}
      title={resolvedTitle}
      primaryColor={primaryColor}
      chatBackground={chatBackground}
      onReady={(client) => {
        clientRef.current = client;
        client.setLocale(uiLocale, translations);
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
        chatTitle={resolvedTitle}
        onChangeTitle={persistTitle}
        primaryColor={primaryColor}
        onChangeColor={persistColor}
        chatBackground={chatBackground}
        onChangeBackground={persistBackground}
        buttonPosition={buttonPosition}
        onChangePosition={persistPosition}
        buttonScale={buttonScale}
        onChangeScale={persistScale}
      />
    </TeletypeProvider>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  flex: { flex: 1 },
  loading: { alignItems: 'center', justifyContent: 'center' },
  connecting: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#fff',
  },
  connectingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  parsedId: {
    fontSize: 13,
    color: '#5f6368',
    marginBottom: 12,
  },
  errorText: {
    color: '#e5352b',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
  },
  content: { padding: 24, paddingTop: 60, paddingBottom: 128 },
  setupContent: { padding: 24, paddingTop: 60, paddingBottom: 40 },
  title: { fontSize: 28, fontWeight: '800', color: '#111' },
  subtitle: { fontSize: 15, color: '#666', marginTop: 6, marginBottom: 28 },
  hint: { fontSize: 14, color: '#888', marginTop: -18, marginBottom: 20 },
  fieldLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111',
    marginBottom: 8,
  },
  inputSingle: {
    borderWidth: 1,
    borderColor: '#d0d5da',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#111',
    marginBottom: 16,
  },
  swatchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 20,
  },
  swatch: {
    width: 52,
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  swatchCheck: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '700',
  },
  bgRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 8,
    marginBottom: 20,
  },
  bgCard: {
    flex: 1,
    flexBasis: 0,
    minWidth: 0,
    height: 56,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: '#d0d5da',
  },
  bgCardSelected: {
    borderColor: '#0084ff',
  },
  bgCardImage: {
    ...StyleSheet.absoluteFillObject,
  },
  selectRow: {
    marginBottom: 20,
  },
  selectCol: {
    marginBottom: 16,
  },
  selectWrap: {
    position: 'relative',
  },
  selectField: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: '#d0d5da',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selectValue: {
    flex: 1,
    fontSize: 15,
    color: '#111',
    marginRight: 8,
  },
  selectArrow: {
    fontSize: 10,
    color: '#111',
  },
  selectOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
    padding: 24,
  },
  selectModal: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#fff',
    borderRadius: 16,
    paddingVertical: 8,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 20,
    elevation: 12,
  },
  selectModalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  selectOption: {
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  selectOptionActive: {
    backgroundColor: '#f3f4f6',
  },
  selectOptionText: {
    fontSize: 16,
    color: '#111',
  },
  selectOptionTextActive: {
    fontWeight: '600',
  },
  input: {
    borderWidth: 1,
    borderColor: '#d0d5da',
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: '#111',
    height: 125,
    maxHeight: 125,
    textAlignVertical: 'top',
    marginBottom: 16,
  },
  inputError: {
    borderColor: '#e5352b',
  },
  btn: {
    backgroundColor: '#0084ff',
    height: 48,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  btnDisabled: { opacity: 0.4 },
  btnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 20,
  },
  btnOutline: {
    height: 48,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#0084ff',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  btnOutlineText: {
    color: '#0084ff',
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 20,
  },
  btnDanger: {
    backgroundColor: '#e5352b',
    height: 48,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  btnDangerText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 20,
  },
});
