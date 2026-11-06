import { TeletypeStrings } from './strings';

const SEC_MIN = 60;
const SEC_HOUR = 60 * 60;
const SEC_DAY = SEC_HOUR * 24;

/** Plural word forms [one, few, many] per language. */
const UNITS: Record<
  string,
  { minute: string[]; hour: string[] }
> = {
  en: {
    minute: ['minute', 'minutes'],
    hour: ['hour', 'hours'],
  },
  ru: {
    minute: ['минуту', 'минуты', 'минут'],
    hour: ['час', 'часа', 'часов'],
  },
};

const MONTHS: Record<string, string[]> = {
  en: [
    'January', 'February', 'March', 'April', 'May', 'June', 'July',
    'August', 'September', 'October', 'November', 'December',
  ],
  ru: [
    'января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля',
    'августа', 'сентября', 'октября', 'ноября', 'декабря',
  ],
};

/** Pick a plural form. Russian uses [one, few, many]; others fall back to en. */
function morph(n: number, forms: string[], language: string): string {
  if (language === 'ru') {
    const mod100 = Math.abs(n) % 100;
    const mod10 = mod100 % 10;
    if (mod100 >= 11 && mod100 <= 14) {
      return forms[2];
    }
    if (mod10 === 1) {
      return forms[0];
    }
    if (mod10 >= 2 && mod10 <= 4) {
      return forms[1];
    }
    return forms[2];
  }
  // English-style: singular for 1, plural otherwise.
  return n === 1 ? forms[0] : forms[1];
}

function pad(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

function hhmm(d: Date): string {
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/**
 * Human-friendly relative timestamp, mirroring the Teletype web widget:
 *   <1m → "Just now", <1h → "N minutes ago", <3h → "N hours ago",
 *   <24h → "HH:mm", <48h → "Yesterday HH:mm", else → "D Month[, YYYY]".
 */
export function formatRelativeTime(
  iso: string | undefined,
  language: string,
  strings: TeletypeStrings,
): string {
  if (!iso) {
    return '';
  }
  const date = new Date(iso);
  const ms = date.getTime();
  if (Number.isNaN(ms)) {
    return '';
  }

  const units = UNITS[language] || UNITS.en;
  const diffSec = Math.max(0, Math.floor((Date.now() - ms) / 1000));

  if (diffSec < SEC_MIN) {
    return strings.timeJustNow;
  }
  if (diffSec < SEC_HOUR) {
    const n = Math.floor(diffSec / SEC_MIN);
    return `${n} ${morph(n, units.minute, language)} ${strings.timeAgo}`;
  }
  if (diffSec < SEC_HOUR * 3) {
    const n = Math.floor(diffSec / SEC_HOUR);
    return `${n} ${morph(n, units.hour, language)} ${strings.timeAgo}`;
  }
  if (diffSec < SEC_DAY) {
    return hhmm(date);
  }
  if (diffSec < SEC_DAY * 2) {
    return `${strings.timeYesterday} ${hhmm(date)}`;
  }

  const months = MONTHS[language] || MONTHS.en;
  const day = date.getDate();
  const month = months[date.getMonth()];
  const now = new Date();
  return date.getFullYear() === now.getFullYear()
    ? `${day} ${month}`
    : `${day} ${month}, ${date.getFullYear()}`;
}
