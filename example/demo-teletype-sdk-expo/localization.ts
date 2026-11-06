import type { TeletypeTranslations } from 'teletype-sdk-rn';

/**
 * Example of a custom localization file.
 *
 * Override individual built-in strings (see `ru` below). Keys are two-letter
 * language codes. Any string you omit falls back to English, so partial tables
 * are fine. Pass this object to the provider via the `translations` prop.
 */
export const translations: TeletypeTranslations = {
  ru: {
    statusOffline: 'Мы онлайн — ответим сразу',
  },
};

/**
 * Strings for the demo app's *own* UI (the launcher screen). This is separate
 * from the SDK's chat strings above: it shows how a host app localizes its own
 * interface alongside the chat. Every string has an English and Russian value.
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
  connecting: string;
  parsedId: string;
  invalidExternalId: string;
  snippetMissingId: string;
  invalidChannel: string;
  connectionFailed: string;
  chatTitleLabel: string;
  chatTitlePlaceholder: string;
  chatColorLabel: string;
  chatBackgroundLabel: string;
  buttonPositionLabel: string;
  buttonPositionRight: string;
  buttonPositionLeft: string;
  buttonScaleLabel: string;
}

const demoStrings: Record<string, DemoStrings> = {
  en: {
    screenTitle: 'Teletype RN SDK',
    screenSubtitle: 'Teletype online chat. Unread: {unread}',
    languageButton: 'Language: {lang} (tap to switch)',
    openChat: 'Open chat',
    chatTitle: 'Online chat',
    clearCache: 'Clear chat cache',
    setupTitle: 'Connect a channel',
    setupHint:
      'Paste your external id or the whole Teletype install <script> snippet.',
    externalIdPlaceholder: 'External id or <script> snippet',
    connect: 'Connect',
    connecting: 'Connecting…',
    parsedId: 'Channel id: {id}',
    invalidExternalId:
      'This does not look like a Teletype external id. Paste the id or the whole install <script>.',
    snippetMissingId:
      'Could not find teletypeExternalId in that snippet. Copy the full install script from the dashboard.',
    invalidChannel: 'No Teletype channel found for this id.',
    connectionFailed: 'Could not reach Teletype. Check the network and try again.',
    chatTitleLabel: 'Chat title',
    chatTitlePlaceholder: 'Online chat',
    chatColorLabel: 'Button and chat color',
    chatBackgroundLabel: 'Chat background',
    buttonPositionLabel: 'Button position',
    buttonPositionRight: 'Bottom right',
    buttonPositionLeft: 'Bottom left',
    buttonScaleLabel: 'Button scale',
  },
  ru: {
    screenTitle: 'Teletype RN SDK',
    screenSubtitle: 'Онлайн-чат Teletype. Непрочитанных: {unread}',
    languageButton: 'Язык: {lang} (нажмите, чтобы сменить)',
    openChat: 'Открыть чат',
    chatTitle: 'Онлайн чат',
    clearCache: 'Очистить кэш чата',
    setupTitle: 'Подключить канал',
    setupHint:
      'Вставьте external id или весь <script> сниппет установки Teletype.',
    externalIdPlaceholder: 'External id или <script> сниппет',
    connect: 'Подключить',
    connecting: 'Подключение…',
    parsedId: 'Id канала: {id}',
    invalidExternalId:
      'Это не похоже на Teletype external id. Вставьте id или весь установочный <script>.',
    snippetMissingId:
      'В сниппете нет teletypeExternalId. Скопируйте полный скрипт установки из кабинета.',
    invalidChannel: 'Канал Teletype с таким id не найден.',
    connectionFailed: 'Не удалось связаться с Teletype. Проверьте сеть и попробуйте ещё раз.',
    chatTitleLabel: 'Название чата',
    chatTitlePlaceholder: 'Онлайн чат',
    chatColorLabel: 'Цвет кнопки и чата',
    chatBackgroundLabel: 'Фон чата',
    buttonPositionLabel: 'Расположение кнопки',
    buttonPositionRight: 'Внизу справа',
    buttonPositionLeft: 'Внизу слева',
    buttonScaleLabel: 'Масштаб кнопки',
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
