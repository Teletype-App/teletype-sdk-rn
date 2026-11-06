import io from 'socket.io-client';

/**
 * socket.io wrapper. The Teletype backend runs socket.io **v2** (2.2.0), so the
 * `socket.io-client` dependency is pinned to the 2.x line for wire
 * compatibility. This class hides the raw socket and exposes a tiny, testable
 * surface used by `TeletypeClient`.
 */
export class SocketClient {
  private url: string;
  private options: Record<string, unknown>;
  private socket: SocketIOClient.Socket | null = null;
  /** When true, every inbound/outbound event is logged to the console. */
  private debug: boolean;

  constructor(
    url: string,
    options: Record<string, unknown> = {},
    debug = false,
  ) {
    this.url = url;
    this.options = { forceNew: true, ...options };
    this.debug = debug;
  }

  get connected(): boolean {
    return !!this.socket && this.socket.connected;
  }

  get disconnected(): boolean {
    return !this.socket || this.socket.disconnected;
  }

  connect(): void {
    if (!this.socket) {
      this.socket = io(this.url, this.options);
      if (this.debug) {
        this.installDebugLogging(this.socket);
      }
    } else if (this.socket.disconnected) {
      this.socket.connect();
    }
  }

  /**
   * Log every websocket event (name + payload) to the console. Used in dev
   * mode. socket.io v2 has no `onAny`, so we patch `Socket#onevent`, which the
   * client calls for every inbound EVENT packet regardless of registered
   * listeners. Patching a method (rather than adding a listener) also means it
   * survives the `removeAllListeners()` call in `TeletypeClient.bindSocket`.
   */
  private installDebugLogging(socket: SocketIOClient.Socket): void {
    const target = socket as unknown as {
      onevent: (packet: { data?: unknown[] }) => void;
    };
    const original = target.onevent;
    target.onevent = function patchedOnevent(packet) {
      const data = Array.isArray(packet?.data) ? packet.data : [];
      const [event, ...args] = data;
      // eslint-disable-next-line no-console
      console.log(
        `[teletype][ws] ⬇ ${String(event)}`,
        ...(args.length ? args : ['(no payload)']),
      );
      original.call(this, packet);
    };
  }

  disconnect(): void {
    this.socket?.disconnect();
  }

  on(event: string, cb: (...args: unknown[]) => void): void {
    this.socket?.on(event, cb);
  }

  once(event: string, cb: (...args: unknown[]) => void): void {
    this.socket?.once(event, cb);
  }

  off(event?: string): void {
    if (!this.socket) {
      return;
    }
    if (event) {
      // socket.io v2 Socket#off removes all handlers for the given event.
      (this.socket as unknown as { off: (e: string) => void }).off(event);
    } else {
      this.socket.removeAllListeners();
    }
  }

  emit(event: string, payload?: unknown): void {
    if (this.debug) {
      // eslint-disable-next-line no-console
      console.log(`[teletype][ws] ⬆ ${event}`, payload ?? '(no payload)');
    }
    this.socket?.emit(event, payload);
  }
}
