/**
 * Built-in chat transcript backgrounds.
 * `'white'` is a solid fill (the default); the rest are tiled patterns
 * shipped with the SDK.
 */
export type ChatBackground = 'white' | 'doodle' | 'circles' | 'scribbles';

export const DEFAULT_CHAT_BACKGROUND: ChatBackground = 'white';

export const CHAT_BACKGROUNDS: ChatBackground[] = [
  'white',
  'doodle',
  'circles',
  'scribbles',
];

export function isChatBackground(value: unknown): value is ChatBackground {
  return (
    typeof value === 'string' &&
    (CHAT_BACKGROUNDS as string[]).includes(value)
  );
}
