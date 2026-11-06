import { Linking, Platform, Share } from 'react-native';
import { getBlobUtil, getViewDocument } from './nativeModules';
import { toFileUri } from './fileUtils';

export type DownloadProgress = {
  received: number;
  total: number;
};

function cacheRoot(): string {
  const RNFetchBlob = getBlobUtil();
  if (!RNFetchBlob) {
    throw new Error('react-native-blob-util is not installed');
  }
  return `${RNFetchBlob.fs.dirs.CacheDir}/teletype-sdk`;
}

async function ensureDir(path: string): Promise<void> {
  const RNFetchBlob = getBlobUtil();
  const exists = await RNFetchBlob.fs.exists(path);
  if (!exists) {
    await RNFetchBlob.fs.mkdir(path);
  }
}

function cachedPathFor(fileName: string, id?: string): string {
  const safeName = (fileName || 'file').replace(/[\\/]/g, '_');
  return `${cacheRoot()}/${id || 'anon'}/${safeName}`;
}

/** Return the local cache path if the file was already downloaded. */
export async function getCachedFilePath(opts: {
  fileName: string;
  id?: string;
}): Promise<string | null> {
  const RNFetchBlob = getBlobUtil();
  if (!RNFetchBlob) {
    return null;
  }
  const path = cachedPathFor(opts.fileName, opts.id);
  try {
    const exists = await RNFetchBlob.fs.exists(path);
    return exists ? path : null;
  } catch {
    return null;
  }
}

/**
 * Download `url` into the SDK cache directory (keyed by id + file name) and
 * return the absolute local path. Reuses an existing file when present.
 */
export async function ensureCachedFile(opts: {
  url: string;
  fileName: string;
  id?: string;
  onProgress?: (p: DownloadProgress) => void;
}): Promise<string> {
  const RNFetchBlob = getBlobUtil();
  if (!RNFetchBlob) {
    throw new Error('react-native-blob-util is not installed');
  }
  if (!opts.url) {
    throw new Error('Missing file url');
  }

  const safeName = (opts.fileName || 'file').replace(/[\\/]/g, '_');
  const folder = `${cacheRoot()}/${opts.id || 'anon'}`;
  await ensureDir(cacheRoot());
  await ensureDir(folder);
  const path = `${folder}/${safeName}`;

  const exists = await RNFetchBlob.fs.exists(path);
  if (exists) {
    return path;
  }

  const task = RNFetchBlob.config({
    path,
    fileCache: true,
  }).fetch('GET', opts.url);

  if (opts.onProgress && typeof task.progress === 'function') {
    task.progress({ interval: 200 }, (received: number, total: number) => {
      opts.onProgress?.({ received: Number(received), total: Number(total) });
    });
  }

  const res = await task;
  return res.path();
}

/**
 * Persist a cached file to a user-visible location:
 * - Android → Downloads/Teletype
 * - iOS → Documents/Teletype + Share sheet so the user can save/open it
 */
export async function saveFileToDevice(opts: {
  localPath: string;
  fileName: string;
}): Promise<string> {
  const RNFetchBlob = getBlobUtil();
  if (!RNFetchBlob) {
    throw new Error('react-native-blob-util is not installed');
  }

  const safeName = (opts.fileName || 'file').replace(/[\\/]/g, '_');
  const uri = toFileUri(opts.localPath);

  if (Platform.OS === 'android') {
    const destDir = `${RNFetchBlob.fs.dirs.DownloadDir}/Teletype`;
    await ensureDir(destDir);
    const dest = `${destDir}/${safeName}`;
    const already = await RNFetchBlob.fs.exists(dest);
    if (!already) {
      await RNFetchBlob.fs.cp(opts.localPath, dest);
    }
    // Make the file show up in the system Downloads UI when possible.
    try {
      if (RNFetchBlob.android?.actionViewIntent) {
        // no-op: just leave the file in Downloads
      }
      await RNFetchBlob.fs.scanFile([{ path: dest }]);
    } catch {
      // scanFile is best-effort
    }
    return dest;
  }

  // iOS: copy into Documents/Teletype and offer the system share sheet.
  const destDir = `${RNFetchBlob.fs.dirs.DocumentDir}/Teletype`;
  await ensureDir(destDir);
  const dest = `${destDir}/${safeName}`;
  const already = await RNFetchBlob.fs.exists(dest);
  if (!already) {
    await RNFetchBlob.fs.cp(opts.localPath, dest);
  }
  try {
    await Share.share({ url: toFileUri(dest) });
  } catch {
    // User dismissed the share sheet — file is still in Documents.
  }
  return dest;
}

/**
 * Open a local (or remote) file with a system app that can handle it —
 * e.g. a text editor for `.txt`, Preview for PDF, etc.
 */
export async function openWithSystemApp(opts: {
  localPath?: string;
  remoteUrl?: string;
}): Promise<void> {
  const viewDocument = getViewDocument();
  if (opts.localPath && viewDocument) {
    await viewDocument({ uri: toFileUri(opts.localPath) });
    return;
  }
  if (opts.localPath) {
    const can = await Linking.canOpenURL(toFileUri(opts.localPath));
    if (can) {
      await Linking.openURL(toFileUri(opts.localPath));
      return;
    }
  }
  if (opts.remoteUrl) {
    await Linking.openURL(opts.remoteUrl);
    return;
  }
  throw new Error('No app can open this file');
}

export function canDownloadLocally(): boolean {
  return !!getBlobUtil();
}
