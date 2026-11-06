/**
 * Teletype channel ids as they appear in the dashboard install snippet:
 *
 *   window.teletypeExternalId = "SQGksD5cZOeuhPzY6L0EhoVcsRdUrAuEY5-CeWcSPDiUySEEBnJ9HhBwG3hS21DL";
 *
 * They are long URL-safe tokens (letters, digits, `_`, `-`), not free-form
 * names. The checks below are deliberately minimal — they reject pasted HTML,
 * sentences and placeholders, not every impossible id.
 */

const ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_-]{15,127}$/;

const SNIPPET_HINT =
  /<\s*script|teletypeExternalId|widget\.teletype(?:app)?\.com/i;

/**
 * Pull the channel id out of a dashboard `<script>` snippet, or return a
 * bare id unchanged. Returns `''` when the input looks like markup / prose
 * rather than an id.
 */
export function extractTeletypeExternalId(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) {
    return '';
  }

  const assigned = trimmed.match(
    /teletypeExternalId\s*=\s*["']([^"']+)["']/,
  );
  if (assigned?.[1]) {
    return assigned[1].trim();
  }

  if (SNIPPET_HINT.test(trimmed) || /\s/.test(trimmed)) {
    return '';
  }

  return trimmed;
}

/**
 * Minimal shape check for a Teletype external id: 16–128 URL-safe characters
 * with at least one letter and one digit (the dashboard tokens always have
 * both; this rejects `aaaaaaaaaaaaaaaa` / `1111111111111111`).
 */
export function isTeletypeExternalId(id: string): boolean {
  return ID_PATTERN.test(id) && /[A-Za-z]/.test(id) && /\d/.test(id);
}
