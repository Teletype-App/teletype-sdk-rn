import { LocalFile } from '../types/file';

/**
 * A file returned from the host app's picker (`onAttachmentPress`).
 * Same shape as {@link LocalFile}.
 */
export type PickedAttachment = LocalFile;

function isPicked(value: unknown): value is PickedAttachment & {
  fileCopyUri?: string | null;
} {
  return (
    !!value &&
    typeof value === 'object' &&
    typeof (value as PickedAttachment).uri === 'string' &&
    (value as PickedAttachment).uri.length > 0
  );
}

/**
 * Normalize whatever `onAttachmentPress` returned into a single file, or
 * `null` if the host already handled sending (legacy `uploadFile` flow) /
 * the user cancelled.
 *
 * Prefer `fileCopyUri` when the host used `@react-native-documents/picker`
 * with `copyTo: 'cachesDirectory'` — on Android the original `content://`
 * URI often becomes unreadable after the picker closes.
 */
export function asPickedAttachment(
  result: unknown,
): PickedAttachment | null {
  if (!result) {
    return null;
  }
  const first = Array.isArray(result) ? result[0] : result;
  if (!isPicked(first)) {
    return null;
  }
  const copied =
    typeof first.fileCopyUri === 'string' ? first.fileCopyUri.trim() : '';
  const uri = copied || first.uri;
  return {
    uri,
    name: first.name || uri.split('/').pop() || 'file',
    type: first.type || 'application/octet-stream',
    size: typeof first.size === 'number' ? first.size : undefined,
  };
}
