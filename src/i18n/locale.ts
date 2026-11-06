import { NativeModules, Platform } from 'react-native';
import {
  BUILTIN_LOCALES,
  DEFAULT_LOCALE,
  TeletypeStrings,
  en,
} from './strings';

/**
 * Map of language code -> partial string overrides. Pass this to the provider
 * to add a brand-new language or tweak individual strings for a built-in one.
 * Keys are matched against the resolved two-letter language code (e.g. `ru`).
 */
export type TeletypeTranslations = Record<string, Partial<TeletypeStrings>>;

/**
 * Reduce an OS locale identifier to a bare two-letter language code:
 * `ru_RU` / `ru-RU` / `RU` -> `ru`, `en-US` -> `en`.
 */
export function normalizeLanguage(locale?: string | null): string {
  if (!locale || typeof locale !== 'string') {
    return DEFAULT_LOCALE;
  }
  const lang = locale.split(/[-_]/)[0]?.toLowerCase();
  return lang || DEFAULT_LOCALE;
}

/**
 * Best-effort read of the device's current language. Returns a normalized
 * two-letter language code, defaulting to English.
 *
 * Resolution order:
 *   1. `react-native-localize` (optional peer) — the *device's* real preferred
 *      language via `NSLocale.preferredLanguages` / Android resources. This is
 *      the only source that is correct regardless of which localizations the
 *      host app declares, so it is strongly recommended. Loaded lazily so the
 *      SDK never hard-requires it.
 *   2. Legacy native modules (`SettingsManager` iOS / `I18nManager` Android),
 *      which only work on the old architecture.
 *   3. `Intl.DateTimeFormat().resolvedOptions().locale`.
 *
 * NB: on iOS `Intl` (and `NSLocale.currentLocale`) return the app's *effective*
 * locale, capped by the languages the app itself declares — usually just
 * English. So a Russian device reports `en` through `Intl` unless the app is
 * localized for Russian. Install `react-native-localize` (or pass `locale`
 * explicitly) to detect the true device language reliably.
 */
export function getSystemLanguage(): string {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires, global-require
    const rnLocalize = require('react-native-localize');
    const locales = rnLocalize?.getLocales?.();
    const code = Array.isArray(locales) ? locales[0]?.languageCode : undefined;
    if (code) {
      return normalizeLanguage(code);
    }
  } catch {
    // Not installed / unavailable — fall through.
  }

  try {
    if (Platform.OS === 'ios') {
      const settings = NativeModules.SettingsManager?.settings;
      const raw =
        (Array.isArray(settings?.AppleLanguages)
          ? settings.AppleLanguages[0]
          : undefined) || settings?.AppleLocale;
      if (raw) {
        return normalizeLanguage(raw);
      }
    }
    if (Platform.OS === 'android') {
      const raw = NativeModules.I18nManager?.localeIdentifier;
      if (raw) {
        return normalizeLanguage(raw);
      }
    }
  } catch {
    // Fall through to Intl / default on any unexpected native shape.
  }

  try {
    const intl =
      typeof Intl !== 'undefined' &&
      typeof Intl.DateTimeFormat === 'function'
        ? Intl.DateTimeFormat().resolvedOptions().locale
        : undefined;
    if (intl) {
      return normalizeLanguage(intl);
    }
  } catch {
    // Intl missing/unusable — fall through to the default.
  }

  return DEFAULT_LOCALE;
}

/**
 * Resolve the final string table for the given locale.
 *
 * Resolution order (later wins), per key:
 *   1. English built-in (guarantees no missing keys)
 *   2. Built-in dictionary for the resolved language (e.g. `ru`)
 *   3. Caller-supplied override for that language (`translations[lang]`)
 *
 * @param locale       Explicit locale/language. When omitted, the device's
 *                     system language is used.
 * @param translations Optional custom/override translations.
 */
export function resolveStrings(
  locale?: string,
  translations?: TeletypeTranslations,
): { language: string; strings: TeletypeStrings } {
  const language = normalizeLanguage(locale ?? getSystemLanguage());
  const builtin = BUILTIN_LOCALES[language];
  const custom = translations?.[language];
  const strings: TeletypeStrings = {
    ...en,
    ...(builtin || {}),
    ...(custom || {}),
  };
  return { language, strings };
}
