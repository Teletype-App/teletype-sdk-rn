import { TeletypeEnvironment } from '../config/environment';
import {
  ConfigResponse,
  HistoryResponse,
  UploadFileResponse,
} from '../types/config';
import { LocalFile } from '../types/file';
import { camelKeys, serialize, snakeKeys } from './utils';

/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-var-requires, global-require */

function getBlobUtil(): any {
  try {
    const mod = require('react-native-blob-util');
    return mod?.default ?? mod ?? null;
  } catch {
    return null;
  }
}

function parseUploadBody(raw: unknown): UploadFileResponse {
  let body: unknown = raw;
  if (typeof body === 'string') {
    body = body ? JSON.parse(body) : {};
  }
  return camelKeys(body) as UploadFileResponse;
}

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

/**
 * Paths that `fs.cp` / `wrap` can actually open. iOS document-picker URIs
 * come in as `file:///private/var/…` (percent-encoded); `wrap()` always
 * prefixes `ReactNativeBlobUtil-file://`, so a leftover `file://` becomes a
 * double scheme and native `fetchBlobForm` fails to create the body.
 */
function candidateFilePaths(uri: string): string[] {
  const decoded = decodePath(uri);
  if (isContentLikeUri(decoded)) {
    return uniqueNonEmpty([decoded, uri]);
  }
  const stripped = decoded.replace(/^file:\/\//, '');
  const withoutPrivate = stripped.replace(/^\/private\//, '/');
  return uniqueNonEmpty([decoded, stripped, withoutPrivate, uri]);
}

async function copyUriToPath(
  blobUtil: any,
  source: string,
  dest: string,
): Promise<boolean> {
  try {
    await blobUtil.fs.cp(source, dest);
    if (await blobUtil.fs.exists(dest)) {
      const stat = await blobUtil.fs.stat(dest);
      if (stat && Number(stat.size) > 0) {
        return true;
      }
    }
  } catch {
    // try fetch() copy below
  }
  try {
    if (blobUtil.config && typeof blobUtil.fetch === 'function') {
      const res = await blobUtil
        .config({ path: dest, overwrite: true })
        .fetch('GET', source);
      const path = typeof res?.path === 'function' ? res.path() : dest;
      return !!(path && (await blobUtil.fs.exists(path)));
    }
  } catch {
    return false;
  }
  return false;
}

/**
 * Copy the picked file into the app cache, then wrap a bare filesystem path.
 * Inbox / security-scoped picker URIs often cannot be read in-place.
 * Android gallery picks arrive as `content://` — `fs.cp` plus a GET-to-cache
 * fallback, matching how the web widget uploads a real File blob.
 */
async function wrapLocalFile(
  blobUtil: any,
  uri: string,
  filename: string,
): Promise<string> {
  const cacheDir = blobUtil.fs?.dirs?.CacheDir as string | undefined;
  const safeName = (filename || 'file').replace(/[\\/]/g, '_');
  const sources = candidateFilePaths(uri);

  if (cacheDir) {
    const dest = `${cacheDir}/teletype-up-${Date.now()}-${safeName}`;
    for (const source of sources) {
      if (await copyUriToPath(blobUtil, source, dest)) {
        return blobUtil.wrap(dest);
      }
    }
  }

  const decoded = decodePath(uri);
  if (isContentLikeUri(decoded)) {
    return blobUtil.wrap(decoded);
  }
  return blobUtil.wrap(decoded.replace(/^file:\/\//, '') || decoded);
}

export type UploadProgressHandler = (progress: number) => void;

/**
 * Thin REST client for the Teletype widget HTTP API. Endpoints and payload
 * conventions (snake_case bodies, camelCase parsing) are ported 1:1 from the
 * web widget's `ApiService`.
 */
export class ApiClient {
  private env: TeletypeEnvironment;
  private externalId: string;

  constructor(env: TeletypeEnvironment, externalId: string) {
    this.env = env;
    this.externalId = externalId;
  }

  private base(path: string): string {
    return `${this.env.apiUrl}${path}`;
  }

  private v(path: string): string {
    return this.base(`api/v${this.env.apiVersion}/${path}`);
  }

  private async getJson<T>(url: string): Promise<T> {
    const res = await fetch(url, { method: 'GET' });
    const body = (await res.json()) as unknown;
    return camelKeys(body) as T;
  }

  private async postForm<T>(
    url: string,
    payload: Record<string, unknown>,
  ): Promise<T> {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: serialize(payload),
    });
    const body = (await res.json()) as unknown;
    return camelKeys(body) as T;
  }

  /** Visitor IP + metadata bootstrap. */
  async getIp(): Promise<{ data: string }> {
    return this.getJson(this.v('widget/ip'));
  }

  /** Channel configuration: operators, channels, colours, invitations. */
  async getConfig(): Promise<ConfigResponse> {
    return this.getJson(this.v(`widget/${this.externalId}/config`));
  }

  async getOperators(): Promise<unknown> {
    return this.getJson(this.v(`widget/${this.externalId}/operators`));
  }

  async getInvitations(): Promise<unknown> {
    return this.getJson(this.v(`widget/${this.externalId}/invitations`));
  }

  async getMessengers(): Promise<unknown> {
    return this.getJson(this.v(`widget/${this.externalId}/messengers`));
  }

  /** Message history for an existing appeal (dialog). */
  async getHistory(appealId: string): Promise<HistoryResponse> {
    const dt = encodeURIComponent('2018-02-12T17:08:55+0000');
    return this.getJson(
      this.v(`history/${this.externalId}/${appealId}/messages?datetime=${dt}`),
    );
  }

  /** Upload a remote url (e.g. giphy) as an attachment. */
  async uploadUrl(
    url: string,
    appealId?: string,
  ): Promise<UploadFileResponse> {
    const payload: Record<string, unknown> = { url };
    if (appealId) {
      payload.appeal_id = appealId;
    }
    return this.postForm(this.v(`widget-attachment/${this.externalId}`), payload);
  }

  /**
   * Upload a local file as multipart/form-data.
   * `POST api/v1/widget-attachment/<channel_id>` — matches the web widget:
   * body is `file` + `externalId`. No auth / X-Project-Id.
   *
   * Uses `react-native-blob-util` when installed (RN's `fetch`+`FormData` throws
   * `Unsupported FormDataPart implementation` on the New Architecture). Falls
   * back to XMLHttpRequest.
   */
  async uploadFile(
    file: LocalFile,
    onProgress?: UploadProgressHandler,
  ): Promise<UploadFileResponse> {
    const url = this.v(`widget-attachment/${this.externalId}`);
    const blobUtil = getBlobUtil();
    if (blobUtil?.fetch && blobUtil.wrap && blobUtil.fs) {
      try {
        return await this.uploadFileWithBlobUtil(
          blobUtil,
          url,
          file,
          onProgress,
        );
      } catch {
        // Android `content://` and some picker URIs fail in blob-util; RN
        // FormData can still read them through the ContentResolver.
      }
    }
    return this.uploadFileWithXhr(url, file, onProgress);
  }

  private async uploadFileWithBlobUtil(
    blobUtil: any,
    url: string,
    file: LocalFile,
    onProgress?: UploadProgressHandler,
  ): Promise<UploadFileResponse> {
    const parts: Array<Record<string, string>> = [
      {
        name: 'file',
        filename: file.name || 'file',
        type: file.type || 'application/octet-stream',
        data: await wrapLocalFile(blobUtil, file.uri, file.name),
      },
      { name: 'externalId', data: this.externalId },
    ];
    // Do not set Content-Type: blob-util adds the multipart boundary itself.
    // A bare `multipart/form-data` header makes fetchBlobForm fail to build the body.
    let task = blobUtil.fetch('POST', url, {}, parts);
    if (onProgress && typeof task?.uploadProgress === 'function') {
      task = task.uploadProgress((written: number, total: number) => {
        if (total > 0) {
          onProgress(Math.round((written / total) * 100));
        }
      });
    }
    const resp = await task;
    const status = resp?.info?.()?.status;
    const raw =
      typeof resp?.data === 'string' ? resp.data : resp?.text?.() ?? resp?.data;
    if (typeof status === 'number' && (status < 200 || status >= 300)) {
      throw new Error(
        `uploadFailed: ${status} ${String(raw).slice(0, 200)}`,
      );
    }
    try {
      return parseUploadBody(raw);
    } catch {
      throw new Error(
        `uploadFailed: ${status ?? '?'} ${String(raw).slice(0, 200)}`,
      );
    }
  }

  private uploadFileWithXhr(
    url: string,
    file: LocalFile,
    onProgress?: UploadProgressHandler,
  ): Promise<UploadFileResponse> {
    return new Promise((resolve, reject) => {
      const form = new FormData();
      form.append('file', {
        uri: file.uri,
        name: file.name || 'file',
        type: file.type || 'application/octet-stream',
      } as unknown as Blob);
      form.append('externalId', this.externalId);
      const xhr = new XMLHttpRequest();
      xhr.open('POST', url);
      if (onProgress) {
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable && e.total > 0) {
            onProgress(Math.round((e.loaded / e.total) * 100));
          }
        };
      }
      xhr.onload = () => {
        if (xhr.status < 200 || xhr.status >= 300) {
          reject(
            new Error(
              `uploadFailed: ${xhr.status} ${String(xhr.responseText).slice(0, 200)}`,
            ),
          );
          return;
        }
        try {
          resolve(parseUploadBody(xhr.responseText));
        } catch {
          reject(
            new Error(
              `uploadFailed: ${xhr.status} ${String(xhr.responseText).slice(0, 200)}`,
            ),
          );
        }
      };
      xhr.onerror = () => reject(new Error('uploadFailed'));
      xhr.send(form);
    });
  }

  /** Analytics ping (e.g. widget opened). */
  async collect(data: Record<string, unknown>): Promise<unknown> {
    return this.postForm(this.base(`api/v${this.env.apiVersion}/collect`), {
      ...(snakeKeys(data) as Record<string, unknown>),
    });
  }

  /** Report a client-side error to the backend. */
  async reportError(data: Record<string, unknown>): Promise<unknown> {
    return this.postForm(this.base(`api/v${this.env.apiVersion}/widget/error`), {
      ...(snakeKeys(data) as Record<string, unknown>),
    });
  }

  /** Notify backend that the visitor navigated to a new screen/url. */
  async notifyLocationChange(location: string): Promise<unknown> {
    return this.postForm(this.v(`widget/${this.externalId}/url`), {
      ...(snakeKeys({ clientUrl: location }) as Record<string, unknown>),
    });
  }
}
