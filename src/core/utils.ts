/** Generate an RFC4122-ish v4 GUID without external deps. */
export function guid(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/** Short pseudo-random id (used by rating/contact form temp ids). */
export function makeId(length = 10): string {
  const set =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let text = '';
  for (let i = 0; i <= length; i++) {
    text += set.charAt(Math.floor(Math.random() * set.length));
  }
  return text;
}

function toSnake(str: string): string {
  return str
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1_$2')
    .replace(/[\s-]+/g, '_')
    .toLowerCase();
}

function toCamel(str: string): string {
  return str.replace(/[_-]([a-z0-9])/gi, (_, c: string) => c.toUpperCase());
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return (
    Object.prototype.toString.call(value) === '[object Object]' ||
    Object.prototype.toString.call(value) === '[object Array]'
  );
}

/** Recursively convert object keys to snake_case (for socket/REST payloads). */
export function snakeKeys<T = unknown>(input: T): unknown {
  if (input === null || input === undefined) {
    return input;
  }
  if (Array.isArray(input)) {
    return input.map((v) => snakeKeys(v));
  }
  if (isPlainObject(input)) {
    const out: Record<string, unknown> = {};
    Object.keys(input as Record<string, unknown>).forEach((key) => {
      const value = (input as Record<string, unknown>)[key];
      out[toSnake(key)] = isPlainObject(value) ? snakeKeys(value) : value;
    });
    return out;
  }
  return input;
}

/** Recursively convert object keys to camelCase (for parsing responses). */
export function camelKeys<T = unknown>(input: T): unknown {
  if (input === null || input === undefined) {
    return input;
  }
  if (Array.isArray(input)) {
    return input.map((v) => camelKeys(v));
  }
  if (isPlainObject(input)) {
    const out: Record<string, unknown> = {};
    Object.keys(input as Record<string, unknown>).forEach((key) => {
      const value = (input as Record<string, unknown>)[key];
      out[toCamel(key)] = isPlainObject(value) ? camelKeys(value) : value;
    });
    return out;
  }
  return input;
}

/** Serialize a (possibly nested) object into an application/x-www-form-urlencoded string. */
export function serialize(obj: Record<string, unknown>, prefix = ''): string {
  const parts: string[] = [];
  Object.keys(obj).forEach((p) => {
    const k = prefix ? `${prefix}[${p}]` : p;
    const v = obj[p];
    if (v !== null && typeof v === 'object') {
      parts.push(serialize(v as Record<string, unknown>, k));
    } else {
      parts.push(`${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`);
    }
  });
  return parts.join('&');
}

/** Simple emoji-only heuristic used to render large emoji bubbles. */
export function isEmojiOnly(text?: string): boolean {
  if (!text) {
    return false;
  }
  const stripped = text
    .replace(/\ufe0f/g, '')
    .replace(/\u200d/g, '')
    .replace(
      /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{1F1E6}-\u{1F1FF}]/gu,
      '',
    )
    .trim();
  return stripped === '' && text.trim() !== '';
}

/**
 * Convert a byte count to a human-readable size string.
 * Copied from teletype-mobile `src/utils/formatBytes` (Bt / Kb / Mb / …).
 *
 * Pass `labels` (usually the resolved `TeletypeStrings`) so units follow the
 * active locale — same role as `translate('Bt')` in the mobile app.
 */
export function formatBytes(
  bytes?: number,
  decimals = 2,
  labels?: Pick<
    {
      Bt: string;
      Kb: string;
      Mb: string;
      Gb: string;
      Tb: string;
      Pb: string;
      Eb: string;
      Zb: string;
      Yb: string;
    },
    'Bt' | 'Kb' | 'Mb' | 'Gb' | 'Tb' | 'Pb' | 'Eb' | 'Zb' | 'Yb'
  >,
): string {
  const sizes = labels
    ? [
        labels.Bt,
        labels.Kb,
        labels.Mb,
        labels.Gb,
        labels.Tb,
        labels.Pb,
        labels.Eb,
        labels.Zb,
        labels.Yb,
      ]
    : ['BT', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

  if (!+(bytes as number)) {
    return `0 ${sizes[0]}`;
  }

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const i = Math.floor(Math.log(bytes as number) / Math.log(k));

  return `${parseFloat(((bytes as number) / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

/** File extension (lowercase, no dot) from a name or url. E.g. `pdf`. */
export function getExtension(nameOrUrl?: string): string {
  if (!nameOrUrl) {
    return '';
  }
  const clean = nameOrUrl.split(/[?#]/)[0];
  const dot = clean.lastIndexOf('.');
  if (dot < 0 || dot === clean.length - 1) {
    return '';
  }
  return clean.slice(dot + 1).toLowerCase();
}

/** Very small linkify: wraps bare urls in a marker the UI can turn into links. */
export function extractUrls(text: string): Array<{ url: string }> {
  const urls: Array<{ url: string }> = [];
  const re = /(https?:\/\/[^\s]+)/g;
  let match: RegExpExecArray | null;
  // eslint-disable-next-line no-cond-assign
  while ((match = re.exec(text)) !== null) {
    urls.push({ url: match[1] });
  }
  return urls;
}
