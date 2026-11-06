export type { TeletypeStrings } from './strings';
export { BUILTIN_LOCALES, DEFAULT_LOCALE, en, ru } from './strings';
export type { TeletypeTranslations } from './locale';
export {
  getSystemLanguage,
  normalizeLanguage,
  resolveStrings,
} from './locale';
export { formatRelativeTime } from './time';
