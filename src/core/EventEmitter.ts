import {
  TeletypeEventMap,
  TeletypeEventName,
  TeletypeEventListener,
} from '../types/events';

type Listeners = {
  [K in TeletypeEventName]?: Set<TeletypeEventListener<K>>;
};

/**
 * Minimal, strongly-typed event emitter. Framework-agnostic so the headless
 * core can be used without React.
 */
export class TypedEventEmitter {
  private listeners: Listeners = {};

  on<K extends TeletypeEventName>(
    event: K,
    listener: TeletypeEventListener<K>,
  ): () => void {
    if (!this.listeners[event]) {
      this.listeners[event] = new Set() as Listeners[K];
    }
    (this.listeners[event] as Set<TeletypeEventListener<K>>).add(listener);
    return () => this.off(event, listener);
  }

  once<K extends TeletypeEventName>(
    event: K,
    listener: TeletypeEventListener<K>,
  ): () => void {
    const wrapped: TeletypeEventListener<K> = (payload) => {
      this.off(event, wrapped);
      listener(payload);
    };
    return this.on(event, wrapped);
  }

  off<K extends TeletypeEventName>(
    event: K,
    listener: TeletypeEventListener<K>,
  ): void {
    (this.listeners[event] as Set<TeletypeEventListener<K>> | undefined)?.delete(
      listener,
    );
  }

  emit<K extends TeletypeEventName>(
    event: K,
    payload: TeletypeEventMap[K],
  ): void {
    (this.listeners[event] as Set<TeletypeEventListener<K>> | undefined)?.forEach(
      (listener) => {
        try {
          listener(payload);
        } catch (err) {
          // Never let a subscriber throw break the emit loop.
          // eslint-disable-next-line no-console
          console.warn('[teletype] event listener threw', err);
        }
      },
    );
  }

  removeAllListeners(): void {
    this.listeners = {};
  }
}
