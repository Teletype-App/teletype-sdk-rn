import { Message, MessageType } from '../../types/message';

const IMAGE_EXTS = new Set([
  'jpg',
  'jpeg',
  'png',
  'gif',
  'webp',
  'heic',
  'heif',
  'bmp',
]);
const VIDEO_EXTS = new Set([
  'mp4',
  'mov',
  'm4v',
  'webm',
  'mkv',
  'avi',
  '3gp',
]);
const AUDIO_EXTS = new Set([
  'mp3',
  'm4a',
  'aac',
  'wav',
  'ogg',
  'oga',
  'flac',
  'opus',
  'amr',
  'caf',
]);

export type MediaKind = 'image' | 'video' | 'audio' | 'file';

/** True when `uri` points at an image (a video cover), not a video file. */
export function isImagePreviewUri(uri?: string | null): boolean {
  if (!uri) {
    return false;
  }
  if (/^data:image\//i.test(uri)) {
    return true;
  }
  return IMAGE_EXTS.has(getExt(uri));
}

/** Extension without the leading dot, lowercased. */
export function getExt(nameOrUrl = ''): string {
  const clean = nameOrUrl.split('?')[0].split('#')[0];
  const base = clean.split('/').pop() || '';
  const idx = base.lastIndexOf('.');
  if (idx < 0 || idx === base.length - 1) {
    return '';
  }
  return base.slice(idx + 1).toLowerCase();
}

export function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) {
    return '00:00';
  }
  const total = Math.floor(seconds);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m < 10 ? `0${m}` : m}:${s < 10 ? `0${s}` : s}`;
}

function kindFromExt(ext: string): MediaKind | null {
  if (!ext) {
    return null;
  }
  if (IMAGE_EXTS.has(ext)) {
    return 'image';
  }
  if (VIDEO_EXTS.has(ext)) {
    return 'video';
  }
  if (AUDIO_EXTS.has(ext)) {
    return 'audio';
  }
  return null;
}

/**
 * Resolve how a message should be rendered. Prefers the server-provided
 * `messageType`, then falls back to the file name / URL extension so an
 * `attachment` that is actually a video/image/audio still gets the rich UI.
 */
export function resolveMediaKind(message: Message): MediaKind | null {
  const type: MessageType | undefined =
    message.messageType === 'gif' ? 'image' : message.messageType;

  if (type === 'image') {
    return 'image';
  }
  if (type === 'video') {
    return 'video';
  }
  if (type === 'audio') {
    return 'audio';
  }
  if (type === 'attachment') {
    const name = message.attachment || '';
    const url = message.attachmentUrl || '';
    return (
      kindFromExt(getExt(name)) ||
      kindFromExt(getExt(url)) ||
      'file'
    );
  }

  // Some payloads arrive as text with an attachment URL filled in.
  if (message.attachmentUrl || message.attachment) {
    const name = message.attachment || '';
    const url = message.attachmentUrl || '';
    return (
      kindFromExt(getExt(name)) ||
      kindFromExt(getExt(url)) ||
      'file'
    );
  }

  return null;
}

export function attachmentUrl(message: Message): string {
  return message.attachmentUrl || message.attachment || '';
}

export function attachmentName(message: Message): string {
  if (message.attachment && !/^https?:\/\//i.test(message.attachment)) {
    return message.attachment;
  }
  const fromUrl = (message.attachmentUrl || '').split('?')[0].split('/').pop();
  return fromUrl || 'file';
}

/** `file://` URI that native viewers / Share accept. */
export function toFileUri(path: string): string {
  if (!path) {
    return path;
  }
  if (path.startsWith('file://')) {
    return path;
  }
  // iOS sometimes returns paths under /private — leave them as-is, just prefix.
  return `file://${path}`;
}

/** Max side of an image/video bubble in the chat list. */
export const MEDIA_MAX_SIDE = 250;

/**
 * Fit natural media dimensions into a `maxSide × maxSide` box while keeping
 * aspect ratio — landscape stays wide, portrait stays tall, square stays square.
 */
export function fitMediaSize(
  naturalWidth?: number | null,
  naturalHeight?: number | null,
  maxSide = MEDIA_MAX_SIDE,
): { width: number; height: number } {
  const w = Number(naturalWidth);
  const h = Number(naturalHeight);
  if (!Number.isFinite(w) || !Number.isFinite(h) || w <= 0 || h <= 0) {
    return { width: maxSide, height: maxSide };
  }
  const ratio = w / h;
  let width = w;
  let height = h;
  if (width > maxSide) {
    width = maxSide;
    height = width / ratio;
  }
  if (height > maxSide) {
    height = maxSide;
    width = height * ratio;
  }
  return {
    width: Math.max(1, Math.round(width)),
    height: Math.max(1, Math.round(height)),
  };
}
