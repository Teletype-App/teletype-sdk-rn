import enStrings from './en.json';
import ruStrings from './ru.json';

/**
 * All user-facing UI strings rendered by the built-in components. Every string
 * the SDK shows lives here — nothing is hard-coded in the components — so each
 * one always ships with both an English (`en.json`) and a Russian (`ru.json`)
 * value, and can be translated or overridden per project.
 *
 * Add a new language by supplying a `Partial<TeletypeStrings>` for it via the
 * provider's `translations` prop (see `resolveStrings`). Missing keys always
 * fall back to English, so partial translations are safe.
 *
 * The dictionaries live in JSON files (mirroring the `teletype-mobile` app's
 * `translations/*.json` layout) and are type-checked against this interface.
 */
export interface TeletypeStrings {
  /** Header title used when the backend config has no project/channel name. */
  headerTitleFallback: string;
  /** Header subtitle (with a clock icon): typical reply time. */
  headerReplyTime: string;
  /** Header subtitle while the socket is (re)connecting. */
  statusConnecting: string;
  /** Header subtitle when at least one operator is online. */
  statusOnline: string;
  /** Header subtitle when no operator is online. */
  statusOffline: string;
  /** Composer input placeholder. */
  composerPlaceholder: string;
  /** Title of the "rate this conversation" form. */
  ratingTitle: string;
  /** Fallback label for a file attachment with no name. */
  attachmentFallback: string;
  /** Outgoing message status: still sending. */
  messageSending: string;
  /** Outgoing message status: delivered to the server. */
  messageDelivered: string;
  /** Outgoing message status: read by operator. */
  messageSeen: string;
  /** Outgoing message status: failed (tappable to retry). */
  messageFailed: string;
  /** Relative time: less than a minute ago. */
  timeJustNow: string;
  /** Relative time suffix, e.g. "5 minutes {ago}". */
  timeAgo: string;
  /** Relative time: the previous day (prefixes a HH:mm time). */
  timeYesterday: string;

  /** Media viewer: save the file to the device. */
  mediaSave: string;
  /** Media/file: open with another app on the device. */
  mediaOpen: string;
  /** File/media: download in progress. */
  mediaDownloading: string;
  /** File/media: saved to the device successfully. */
  mediaSaved: string;
  /** File/media: something went wrong downloading. */
  mediaDownloadError: string;
  /** File: no app on the device can open this file type. */
  mediaCannotOpen: string;
  /** Video: generic label used when a preview can't be generated. */
  mediaVideo: string;
  /** Audio: generic label. */
  mediaAudio: string;
  /** Close a fullscreen media viewer. */
  mediaClose: string;

  /** File size unit: bytes. */
  Bt: string;
  /** File size unit: kilobytes. */
  Kb: string;
  /** File size unit: megabytes. */
  Mb: string;
  /** File size unit: gigabytes. */
  Gb: string;
  /** File size unit: terabytes. */
  Tb: string;
  /** File size unit: petabytes. */
  Pb: string;
  /** File size unit: exabytes. */
  Eb: string;
  /** File size unit: zettabytes. */
  Zb: string;
  /** File size unit: yottabytes. */
  Yb: string;
}

/** English strings. Also the fallback for any missing key in other locales. */
export const en: TeletypeStrings = enStrings;

/** Russian strings. */
export const ru: TeletypeStrings = ruStrings;

/** Built-in translation dictionaries, keyed by two-letter language code. */
export const BUILTIN_LOCALES: Record<string, TeletypeStrings> = { en, ru };

/** Default language used when the system locale can't be resolved. */
export const DEFAULT_LOCALE = 'en';
