import { ImageSourcePropType } from 'react-native';
import {
  ChatBackground,
  DEFAULT_CHAT_BACKGROUND,
} from '../../types/appearance';
import doodle from './doodle.png';
import circles from './circles.png';
import scribbles from './scribbles.png';
import doodleThumb from './doodle-thumb.png';
import circlesThumb from './circles-thumb.png';
import scribblesThumb from './scribbles-thumb.png';

export type { ChatBackground } from '../../types/appearance';
export {
  CHAT_BACKGROUNDS,
  DEFAULT_CHAT_BACKGROUND,
  isChatBackground,
} from '../../types/appearance';

export const CHAT_BACKGROUND_SOURCES: Record<
  Exclude<ChatBackground, 'white'>,
  ImageSourcePropType
> = {
  doodle,
  circles,
  scribbles,
};

/** Compact previews for host pickers (not the full-screen chat fill). */
export const CHAT_BACKGROUND_THUMBS: Record<
  Exclude<ChatBackground, 'white'>,
  ImageSourcePropType
> = {
  doodle: doodleThumb,
  circles: circlesThumb,
  scribbles: scribblesThumb,
};

/** Picker order: patterns first, solid white last. */
export const CHAT_BACKGROUND_PICKER: ChatBackground[] = [
  'doodle',
  'circles',
  'scribbles',
  'white',
];

/** Image source for a patterned background, or `null` for the solid white fill. */
export function chatBackgroundSource(
  id?: ChatBackground | null,
): ImageSourcePropType | null {
  if (!id || id === DEFAULT_CHAT_BACKGROUND) {
    return null;
  }
  return CHAT_BACKGROUND_SOURCES[id] ?? null;
}
