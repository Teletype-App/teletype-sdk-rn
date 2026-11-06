import { TeletypeEnvironment } from '../config/environment';
import {
  ConfigResponse,
  HistoryResponse,
  UploadFileResponse,
} from '../types/config';
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

type LocalFile = {
  uri: string;
  name: string;
  type: string;
};

function parseUploadBody(raw: unknown): UploadFileResponse {
  let body: unknown = raw;
  if (typeof body === 'string') {
    body = body ? JSON.parse(body) : {};
  }
  return camelKeys(body) as UploadFileResponse;
}

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
   * `POST api/v1/widget-attachment/<channel_id>` — no auth / X-Project-Id.
   * Dialog id (`appeal_id`) is sent in the body when known.
   *
   * Uses `react-native-blob-util` when installed (RN's `fetch`+`FormData` throws
   * `Unsupported FormDataPart implementation` on the New Architecture). Falls
   * back to XMLHttpRequest.
   */
  async uploadFile(file: LocalFile, appealId?: string): Promise<UploadFileResponse> {
    const url = this.v(`widget-attachment/${this.externalId}`);
    const blobUtil = getBlobUtil();
    if (blobUtil?.fetch && blobUtil.wrap) {
      return this.uploadFileWithBlobUtil(blobUtil, url, file, appealId);
    }
    return this.uploadFileWithXhr(url, file, appealId);
  }

  private async uploadFileWithBlobUtil(
    blobUtil: any,
    url: string,
    file: LocalFile,
    appealId?: string,
  ): Promise<UploadFileResponse> {
    const parts: Array<Record<string, string>> = [
      {
        name: 'file',
        filename: file.name || 'file',
        type: file.type || 'application/octet-stream',
        data: blobUtil.wrap(file.uri),
      },
    ];
    if (appealId) {
      parts.push({ name: 'appeal_id', data: String(appealId) });
      parts.push({ name: 'dialog_id', data: String(appealId) });
    }
    const resp = await blobUtil.fetch(
      'POST',
      url,
      { 'Content-Type': 'multipart/form-data' },
      parts,
    );
    const status = resp?.info?.()?.status;
    const raw = typeof resp?.data === 'string' ? resp.data : resp?.text?.() ?? resp?.data;
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
    appealId?: string,
  ): Promise<UploadFileResponse> {
    return new Promise((resolve, reject) => {
      const form = new FormData();
      form.append('file', {
        uri: file.uri,
        name: file.name || 'file',
        type: file.type || 'application/octet-stream',
      } as unknown as Blob);
      if (appealId) {
        form.append('appeal_id', String(appealId));
        form.append('dialog_id', String(appealId));
      }
      const xhr = new XMLHttpRequest();
      xhr.open('POST', url);
      xhr.onload = () => {
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
