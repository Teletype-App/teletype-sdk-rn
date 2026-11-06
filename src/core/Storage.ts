/**
 * Persistence abstraction. Mirrors the web widget's namespaced localStorage
 * (`teletype-{apiId}-{key}`). On React Native we prefer AsyncStorage when it is
 * installed, and transparently fall back to an in-memory store otherwise (so
 * the SDK still works, just without cross-launch persistence).
 */
export interface KeyValueStore {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

class MemoryStore implements KeyValueStore {
  private map = new Map<string, string>();
  async getItem(key: string) {
    return this.map.has(key) ? (this.map.get(key) as string) : null;
  }
  async setItem(key: string, value: string) {
    this.map.set(key, value);
  }
  async removeItem(key: string) {
    this.map.delete(key);
  }
}

function resolveBackend(explicit?: KeyValueStore): KeyValueStore {
  if (explicit) {
    return explicit;
  }
  try {
    // Optional peer dependency. Loaded lazily so the SDK does not hard-require it.
    // eslint-disable-next-line @typescript-eslint/no-var-requires, global-require
    const mod = require('@react-native-async-storage/async-storage');
    const AsyncStorage = mod?.default ?? mod;
    if (AsyncStorage && typeof AsyncStorage.getItem === 'function') {
      return AsyncStorage as KeyValueStore;
    }
  } catch {
    // not installed; fall through
  }
  return new MemoryStore();
}

export class Storage {
  private backend: KeyValueStore;
  private apiId: string;
  /** Small in-memory cache to keep synchronous reads possible after warm-up. */
  private cache = new Map<string, unknown>();

  constructor(apiId: string, backend?: KeyValueStore) {
    this.apiId = apiId;
    this.backend = resolveBackend(backend);
  }

  private fullKey(key: string): string {
    return `teletype-${this.apiId}-${key}`;
  }

  /** Preload a set of keys into the synchronous cache. */
  async hydrate(keys: string[]): Promise<void> {
    await Promise.all(
      keys.map(async (key) => {
        const raw = await this.backend.getItem(this.fullKey(key));
        this.cache.set(key, this.parse(raw));
      }),
    );
  }

  private parse(raw: string | null): unknown {
    if (raw === null || raw === undefined) {
      return undefined;
    }
    try {
      return JSON.parse(raw);
    } catch {
      return raw;
    }
  }

  /** Synchronous read from the warmed cache. Returns defaultValue when unset. */
  get<T = unknown>(key: string, defaultValue: T | false = false): T | false {
    const value = this.cache.get(key);
    return value === undefined || value === null ? defaultValue : (value as T);
  }

  async getAsync<T = unknown>(
    key: string,
    defaultValue: T | false = false,
  ): Promise<T | false> {
    if (this.cache.has(key)) {
      return this.get(key, defaultValue);
    }
    const raw = await this.backend.getItem(this.fullKey(key));
    const value = this.parse(raw);
    this.cache.set(key, value);
    return value === undefined || value === null ? defaultValue : (value as T);
  }

  set(key: string, value: unknown): void {
    this.cache.set(key, value);
    void this.backend.setItem(this.fullKey(key), JSON.stringify(value));
  }

  remove(key: string): void {
    this.cache.delete(key);
    void this.backend.removeItem(this.fullKey(key));
  }
}
