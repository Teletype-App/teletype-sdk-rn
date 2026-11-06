/**
 * Backend endpoints for the two Teletype clusters. These mirror the web
 * widget's `.env.dev` / `.env.prod` files 1:1 so the same accounts work.
 *
 * Pick a cluster with the `mode` option on `TeletypeProvider` /
 * `TeletypeConfig`. You can still override individual fields via
 * `environment` (e.g. for a self-hosted install).
 */
export interface TeletypeEnvironment {
  /** Cluster label reported by the backend (`dev` or `stable`). */
  mode: 'dev' | 'stable';
  /** Widget protocol version reported to the backend. */
  version: string;
  /** REST API base url (trailing slash), e.g. `https://api.teletype.app/`. */
  apiUrl: string;
  /** socket.io endpoint, e.g. `https://websocket-widget.teletype.app/`. */
  wsUrl: string;
  /** Static assets base url, e.g. `https://widget.teletype.app/`. */
  assetsUrl: string;
  /** API version segment used in REST routes. */
  apiVersion: string;
  /** Marketing/landing url. */
  landingUrl: string;
}

/** Public switch chosen by the integrator. */
export type TeletypeMode = 'dev' | 'prod';

/**
 * Development cluster (`teletypeapp.com`). Matches `widget/.env.dev`.
 */
export const DEV_ENVIRONMENT: TeletypeEnvironment = {
  mode: 'dev',
  version: '4.0.0',
  apiUrl: 'https://api.teletypeapp.com/',
  wsUrl: 'https://websocket-widget.teletypeapp.com',
  assetsUrl: 'https://widget.teletypeapp.com/',
  apiVersion: '1',
  landingUrl: 'https://teletype.app',
};

/**
 * Production / stable cluster (`teletype.app`). Matches `widget/.env.prod`.
 */
export const PROD_ENVIRONMENT: TeletypeEnvironment = {
  mode: 'stable',
  version: '5.0.0',
  apiUrl: 'https://api.teletype.app/',
  wsUrl: 'https://websocket-widget.teletype.app/',
  assetsUrl: 'https://widget.teletype.app/',
  apiVersion: '1',
  landingUrl: 'https://teletype.app',
};

/** Mode used when the integrator doesn't pass one. */
export const DEFAULT_MODE: TeletypeMode = 'prod';

/** Resolve the endpoint preset for a mode. */
export function getEnvironment(mode: TeletypeMode = DEFAULT_MODE): TeletypeEnvironment {
  return mode === 'dev' ? DEV_ENVIRONMENT : PROD_ENVIRONMENT;
}

/** Backwards-compatible default (production cluster). */
export const DEFAULT_ENVIRONMENT: TeletypeEnvironment = PROD_ENVIRONMENT;
