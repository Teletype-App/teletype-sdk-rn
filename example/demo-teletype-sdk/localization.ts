import type { TeletypeTranslations } from 'teletype-react-native-sdk';

/**
 * Example of a custom localization file.
 *
 * - Override individual built-in strings (see `ru` below), or
 * - add a brand-new language (see `es`).
 *
 * Keys are two-letter language codes. Any string you omit falls back to
 * English, so partial tables are fine. Pass this object to the provider via
 * the `translations` prop.
 */
export const translations: TeletypeTranslations = {
  // Tweak one string of the built-in Russian locale.
  ru: {
    statusOffline: 'Мы онлайн — ответим сразу',
  },
  // Add Spanish, which the SDK doesn't ship with out of the box.
  es: {
    headerTitleFallback: 'Chat',
    headerReplyTime: 'Normalmente responde en una hora',
    statusConnecting: 'Conectando…',
    statusOnline: 'En línea',
    statusOffline: 'Responderemos pronto',
    composerPlaceholder: 'Escribe un mensaje…',
    ratingTitle: 'Por favor, valora esta conversación',
    attachmentFallback: 'Adjunto',
    messageSending: 'enviando…',
    messageDelivered: 'enviado',
    messageSeen: 'leído',
    messageFailed: 'error · toca para reintentar',
    timeJustNow: 'Ahora mismo',
    timeAgo: 'atrás',
    timeYesterday: 'Ayer',
  },
};

/**
 * Strings for the demo app's *own* UI (the launcher screen). This is separate
 * from the SDK's chat strings above: it shows how a host app localizes its own
 * interface alongside the chat. Every string has an English and Russian value;
 * Spanish is added to match the in-app language switcher.
 *
 * `{unread}` / `{lang}` are simple placeholders replaced at render time.
 */
export interface DemoStrings {
  screenTitle: string;
  screenSubtitle: string;
  languageButton: string;
  openChat: string;
  chatTitle: string;
  clearCache: string;
  setupTitle: string;
  setupHint: string;
  externalIdPlaceholder: string;
  connect: string;
}

const demoStrings: Record<string, DemoStrings> = {
  en: {
    screenTitle: 'Teletype RN SDK',
    screenSubtitle: 'Bare React Native (no Expo). Unread: {unread}',
    languageButton: 'Language: {lang} (tap to switch)',
    openChat: 'Open chat',
    chatTitle: 'Online chat',
    clearCache: 'Clear chat cache',
    setupTitle: 'Connect a channel',
    setupHint:
      'Paste your external id or the whole Teletype install <script> snippet.',
    externalIdPlaceholder: 'External id or <script> snippet',
    connect: 'Connect',
  },
  ru: {
    screenTitle: 'Teletype RN SDK',
    screenSubtitle: 'Bare React Native (без Expo). Непрочитанных: {unread}',
    languageButton: 'Язык: {lang} (нажмите, чтобы сменить)',
    openChat: 'Открыть чат',
    chatTitle: 'Онлайн чат',
    clearCache: 'Очистить кэш чата',
    setupTitle: 'Подключить канал',
    setupHint:
      'Вставьте external id или весь <script> сниппет установки Teletype.',
    externalIdPlaceholder: 'External id или <script> сниппет',
    connect: 'Подключить',
  },
  es: {
    screenTitle: 'Teletype RN SDK',
    screenSubtitle: 'React Native puro (sin Expo). No leídos: {unread}',
    languageButton: 'Idioma: {lang} (toca para cambiar)',
    openChat: 'Abrir chat',
    chatTitle: 'Chat en línea',
    clearCache: 'Borrar caché del chat',
    setupTitle: 'Conectar un canal',
    setupHint:
      'Pega tu external id o todo el <script> de instalación de Teletype.',
    externalIdPlaceholder: 'External id o fragmento <script>',
    connect: 'Conectar',
  },
};

/**
 * Resolve the demo UI strings for the active language, falling back to English
 * for any language the demo doesn't translate.
 */
export function getDemoStrings(locale: string): DemoStrings {
  const lang = (locale || 'en').slice(0, 2).toLowerCase();
  return demoStrings[lang] ?? demoStrings.en;
}
