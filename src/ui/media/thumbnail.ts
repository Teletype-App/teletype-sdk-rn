import { Platform } from 'react-native';
import { getBlobUtil, getCreateThumbnail } from './nativeModules';
import { getExt, isImagePreviewUri, toFileUri } from './fileUtils';

export type VideoThumbnail = {
  uri: string;
  width?: number;
  height?: number;
};

const VIDEO_EXTS = new Set([
  'mp4',
  'mov',
  'm4v',
  'webm',
  'mkv',
  'avi',
  '3gp',
  '3g2',
  'ogv',
  'wmv',
  'flv',
]);

function decodePath(uri: string): string {
  try {
    return decodeURIComponent(uri);
  } catch {
    try {
      return decodeURI(uri);
    } catch {
      return uri;
    }
  }
}

function uniqueNonEmpty(values: string[]): string[] {
  return values.filter((value, index, all) => !!value && all.indexOf(value) === index);
}

function isContentLikeUri(uri: string): boolean {
  return /^(content|ph|assets-library):\/\//i.test(uri);
}

function isAndroidImageContentUri(uri: string): boolean {
  return /content:\/\/[^\s]*image[:%]/i.test(uri);
}

/**
 * Only run the native thumbnailper on sources that are actually video.
 * `react-native-create-thumbnail` uses Android `MediaMetadataRetriever`, which
 * throws an uncaught `RuntimeException` (`setDataSource failed: 0x80000000`)
 * on images / expired `content://` URIs and kills the app.
 */
function isVideoSource(uri: string): boolean {
  if (!uri || isImagePreviewUri(uri) || isAndroidImageContentUri(uri)) {
    return false;
  }
  if (/^data:video\//i.test(uri) || /^data:image\//i.test(uri)) {
    return /^data:video\//i.test(uri);
  }
  const ext = getExt(uri);
  if (ext) {
    return VIDEO_EXTS.has(ext);
  }
  return /content:\/\/[^\s]*video[:%]/i.test(uri) || /\bvideo\b/i.test(uri);
}

function videoUrlCandidates(uri: string): string[] {
  const decoded = decodePath(uri);
  if (/^(https?|content|ph|assets-library):\/\//i.test(decoded)) {
    return uniqueNonEmpty([decoded, uri]);
  }
  const stripped = decoded.replace(/^file:\/\//, '');
  const withoutPrivate = stripped.replace(/^\/private\//, '/');
  return uniqueNonEmpty([decoded, stripped, withoutPrivate, uri]);
}

async function copyToCache(uri: string): Promise<string | null> {
  const blobUtil = getBlobUtil();
  const cacheDir = blobUtil?.fs?.dirs?.CacheDir as string | undefined;
  if (!blobUtil?.fs?.cp || !cacheDir) {
    return null;
  }
  const ext = getExt(uri) || 'mp4';
  const dest = `${cacheDir}/teletype-thumb-${Date.now()}.${ext}`;
  for (const source of videoUrlCandidates(uri)) {
    try {
      await blobUtil.fs.cp(source, dest);
      if (await blobUtil.fs.exists(dest)) {
        return dest;
      }
    } catch {
      // try the next form
    }
  }
  if (isContentLikeUri(uri) && blobUtil.config && blobUtil.fetch) {
    try {
      const res = await blobUtil
        .config({ path: dest, overwrite: true })
        .fetch('GET', uri);
      const path = typeof res?.path === 'function' ? res.path() : dest;
      if (path && (await blobUtil.fs.exists(path))) {
        return path;
      }
    } catch {
      return null;
    }
  }
  return null;
}

function readThumb(result: {
  path?: string;
  width?: number;
  height?: number;
} | null | undefined): VideoThumbnail | null {
  if (!result?.path) {
    return null;
  }
  const width = Number(result.width);
  const height = Number(result.height);
  return {
    uri: toFileUri(result.path),
    width: Number.isFinite(width) && width > 0 ? width : undefined,
    height: Number.isFinite(height) && height > 0 ? height : undefined,
  };
}

/**
 * First-frame cover for a local or remote video.
 *
 * Never calls `react-native-create-thumbnail` on Android — that native module
 * crashes the app when MediaMetadataRetriever cannot open the file (images,
 * picker URIs, many https attachments). The web widget does not generate
 * video covers either; the chat shows a placeholder until the video is opened.
 */
export async function createVideoThumbnail(
  uri: string,
): Promise<VideoThumbnail | null> {
  if (Platform.OS === 'android' || !uri || !isVideoSource(uri)) {
    return null;
  }

  const createThumbnail = getCreateThumbnail();
  if (!createThumbnail) {
    return null;
  }

  const urls = videoUrlCandidates(uri);
  const cached = await copyToCache(uri);
  if (cached) {
    urls.unshift(cached);
  }

  for (const url of uniqueNonEmpty(urls)) {
    try {
      const result = await createThumbnail({
        url,
        timeStamp: 100,
        format: 'jpeg',
      });
      const thumb = readThumb(result);
      if (thumb) {
        return thumb;
      }
    } catch {
      // try the next candidate
    }
  }
  return null;
}
