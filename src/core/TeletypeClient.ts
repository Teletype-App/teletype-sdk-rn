import {
  DEFAULT_MODE,
  TeletypeEnvironment,
  TeletypeMode,
  getEnvironment,
} from '../config/environment';
import {
  APPEAL_STATUS_CLOSED,
  CONFIG_LIFETIME,
  MAX_UPLOAD_BYTES,
  RECEIVED_ACK_TIMEOUT,
  STORAGE_KEYS,
  DEFAULT_PRIMARY_COLOR,
  DEFAULT_CHAT_TITLE,
  WsEvent,
} from '../config/constants';
import {
  AdditionalPersonInfo,
  TeletypeEventListener,
  TeletypeEventName,
} from '../types/events';
import { Message, ConversationRating } from '../types/message';
import { LocalFile, UploadedAttachment } from '../types/file';
import { Operator } from '../types/operator';
import {
  ChannelMessenger,
  ConfigResponse,
  WidgetConfigData,
} from '../types/config';
import { ApiClient } from './ApiClient';
import { SocketClient } from './SocketClient';
import { Storage, KeyValueStore } from './Storage';
import { TypedEventEmitter } from './EventEmitter';
import { camelKeys, guid, isEmojiOnly, snakeKeys } from './utils';
import {
  isAllowedUploadFile,
  messageTypeFromFile,
} from '../config/fileTypes';
import { TeletypeStrings } from '../i18n/strings';
import { TeletypeTranslations, resolveStrings } from '../i18n/locale';
import {
  ChatBackground,
  DEFAULT_CHAT_BACKGROUND,
} from '../types/appearance';

export interface TeletypeConfig {
  /**
   * Widget external id. Copy it from the channel's install snippet in the
   * Teletype dashboard (the value assigned to `teletypeExternalId` on the web).
   */
  teletypeExternalId: string;
  /**
   * Which Teletype cluster to talk to:
   *   - `'dev'`  → `teletypeapp.com` (matches the web widget's `.env.dev`)
   *   - `'prod'` → `teletype.app`    (matches `.env.prod`, the default)
   *
   * The REST API **and** the socket.io endpoint are both taken from the
   * selected cluster, so messages connect to the right host automatically.
   */
  mode?: TeletypeMode;
  /**
   * Fine-grained endpoint overrides applied on top of the selected `mode`
   * (self-hosted installs, staging, etc.).
   */
  environment?: Partial<TeletypeEnvironment>;
  /** Custom persistence backend. Defaults to AsyncStorage → memory. */
  storage?: KeyValueStore;
  /** Play a sound on incoming messages (host app decides how). Default false. */
  soundEnabled?: boolean;
  /**
   * Extra `socket.io-client` (v2) options, merged over the SDK defaults
   * (`forceNew`, `autoConnect: false`). The web widget does not pin the
   * transport — polling is allowed as a fallback.
   */
  socketOptions?: Record<string, unknown>;
  /**
   * UI language as a locale or two-letter code (e.g. `'ru'`, `'en-US'`). When
   * omitted, the SDK follows the device's system language and falls back to
   * English. Change it at runtime via {@link TeletypeClient.setLocale}.
   */
  locale?: string;
  /**
   * Custom / additional translations, keyed by two-letter language code. Use it
   * to add a brand-new language or override individual built-in strings:
   *
   * ```ts
   * translations={{ ru: { statusOnline: 'Оператор на связи' }, de: {...} }}
   * ```
   *
   * Missing keys always fall back to English, so partial tables are fine.
   */
  translations?: TeletypeTranslations;
  /**
   * Chat header title. Defaults to `'Онлайн чат'`. Shown at the top of the
   * conversation screen (a back button sits to its left).
   */
  title?: string;
  /**
   * Accent color for the launcher button **and** the chat header.
   * Defaults to `#0084ff`. When omitted, the channel's `backgroundColor`
   * from the widget config is used if the dashboard has one.
   */
  primaryColor?: string;
  /**
   * Chat transcript background. `'white'` (default) is a solid fill;
   * `'doodle'`, `'circles'` and `'scribbles'` tile a built-in pattern.
   */
  chatBackground?: ChatBackground;
  /**
   * Static device metadata reported to the backend with person data.
   * (os / device / browser). All optional.
   */
  device?: Record<string, string>;
}

/** Immutable snapshot of client state, handed to React on every change. */
export interface TeletypeState {
  ready: boolean;
  opened: boolean;
  connection: 'connected' | 'disconnected';
  messages: Message[];
  operators: Operator[];
  channels: ChannelMessenger[];
  config: WidgetConfigData | null;
  unreadCount: number;
  operatorTyping: boolean;
  draft: string;
  /** Chat header title (from config, default `'Онлайн чат'`). */
  title: string;
  /**
   * Accent color for the launcher button and chat header.
   * Provider `primaryColor` → channel `backgroundColor` → `#0084ff`.
   */
  primaryColor: string;
  /** Chat transcript background (`'white'` or a built-in pattern). */
  chatBackground: ChatBackground;
  /** Active two-letter UI language code (e.g. `'ru'`). */
  locale: string;
  /** Resolved UI string table for the active language. */
  strings: TeletypeStrings;
}

/**
 * Headless, framework-agnostic chat engine. Owns the socket + REST lifecycle
 * and all conversation state. The React layer and UI components are thin
 * subscribers on top of this. Logic mirrors the Teletype web widget's
 * `AppComponent`, adapted to run without a DOM.
 */
export class TeletypeClient {
  readonly externalId: string;
  readonly env: TeletypeEnvironment;

  private _locale: string;
  private _strings: TeletypeStrings;
  private _title: string;
  private _primaryColor: string | null;
  private _chatBackground: ChatBackground;
  private translations?: TeletypeTranslations;

  private api: ApiClient;
  private socket: SocketClient;
  private storage: Storage;
  private emitter = new TypedEventEmitter();

  private soundEnabled: boolean;
  private device: Record<string, string>;

  private _ready = false;
  private _opened = false;
  private _connection: 'connected' | 'disconnected' = 'disconnected';
  private _messages: Message[] = [];
  private _operators: Operator[] = [];
  private _channels: ChannelMessenger[] = [];
  private _config: WidgetConfigData | null = null;
  private _unreadCount = 0;
  private _operatorTyping = false;
  private _draft = '';

  private personId = '';
  private _appealId = '';
  private personData: Record<string, unknown> | null = null;
  private personAdditionalInfo: AdditionalPersonInfo = {};
  private greetingSent = false;
  private messageWasSent = false;
  private banned = false;

  private pendingMessages: Message[] = [];
  private messagesInPending: Message[] = [];
  private receivedTimeouts: Record<string, ReturnType<typeof setTimeout>> = {};
  private operatorTypingTimeout: ReturnType<typeof setTimeout> | null = null;
  private initialized = false;
  /** Socket listeners must be bound once; re-binding after `connect` drops `connect`. */
  private listenersBound = false;

  constructor(config: TeletypeConfig) {
    this.externalId = config.teletypeExternalId;
    this.env = {
      ...getEnvironment(config.mode ?? DEFAULT_MODE),
      ...(config.environment || {}),
    };
    this.soundEnabled = config.soundEnabled ?? false;
    this.device = config.device || {};

    this.translations = config.translations;
    const resolved = resolveStrings(config.locale, this.translations);
    this._locale = resolved.language;
    this._strings = resolved.strings;
    this._title =
      typeof config.title === 'string' ? config.title : DEFAULT_CHAT_TITLE;
    this._primaryColor = config.primaryColor ?? null;
    this._chatBackground = config.chatBackground ?? DEFAULT_CHAT_BACKGROUND;

    this.api = new ApiClient(this.env, this.externalId);
    this.socket = new SocketClient(
      this.env.wsUrl,
      {
        // Same as the web widget (`forceNew: true` only). Do not pin
        // `transports: ['websocket']` — on Android emulator / some networks
        // the websocket handshake never completes and messages stay on
        // "sending". Polling is the fallback the widget uses.
        forceNew: true,
        autoConnect: false,
        ...(config.socketOptions || {}),
      },
      this.env.mode === 'dev',
    );
    this.storage = new Storage(this.externalId, config.storage);
  }

  // --------------------------------------------------------------------------
  // Public getters
  // --------------------------------------------------------------------------

  get appealId(): string {
    return this._appealId;
  }

  /** Active two-letter UI language code (e.g. `'ru'`). */
  get locale(): string {
    return this._locale;
  }

  /** Resolved UI string table for the active language. */
  get strings(): TeletypeStrings {
    return this._strings;
  }

  /** Chat header title (from config, default `'Онлайн чат'`). */
  get title(): string {
    return this._title;
  }

  /**
   * Accent color for the launcher button and chat header.
   * Provider value → channel `backgroundColor` → `#0084ff`.
   */
  get primaryColor(): string {
    return (
      this._primaryColor ||
      this._config?.backgroundColor ||
      DEFAULT_PRIMARY_COLOR
    );
  }

  /** Chat transcript background (`'white'` or a built-in pattern). */
  get chatBackground(): ChatBackground {
    return this._chatBackground;
  }

  get state(): TeletypeState {
    return {
      ready: this._ready,
      opened: this._opened,
      connection: this._connection,
      messages: this._messages,
      operators: this._operators,
      channels: this._channels,
      config: this._config,
      unreadCount: this._unreadCount,
      operatorTyping: this._operatorTyping,
      draft: this._draft,
      title: this._title,
      primaryColor: this.primaryColor,
      chatBackground: this._chatBackground,
      locale: this._locale,
      strings: this._strings,
    };
  }

  getMessages(): Message[] {
    return this._messages;
  }

  /**
   * Switch the UI language at runtime. Pass a locale/language code (`'ru'`,
   * `'en-US'`) or omit it to re-read the device's system language. Optionally
   * merge extra translations. Emits `localeChanged` so the UI re-renders.
   */
  setLocale(locale?: string, translations?: TeletypeTranslations): void {
    if (translations) {
      this.translations = { ...this.translations, ...translations };
    }
    const resolved = resolveStrings(locale, this.translations);
    this._locale = resolved.language;
    this._strings = resolved.strings;
    this.emitter.emit('localeChanged', this._locale);
  }

  /** Update the chat header title at runtime. */
  setTitle(title: string): void {
    if (typeof title !== 'string') {
      return;
    }
    this._title = title;
    this.emitter.emit('appearanceChanged', undefined);
  }

  /**
   * Update the shared accent color (launcher button + chat header).
   * Pass `null` to fall back to the channel config / default.
   */
  setPrimaryColor(color: string | null): void {
    this._primaryColor = color;
    this.emitter.emit('appearanceChanged', undefined);
  }

  /** Update the chat transcript background at runtime. */
  setChatBackground(background: ChatBackground): void {
    this._chatBackground = background;
    this.emitter.emit('appearanceChanged', undefined);
  }

  // --------------------------------------------------------------------------
  // Events
  // --------------------------------------------------------------------------

  on<K extends TeletypeEventName>(
    event: K,
    listener: TeletypeEventListener<K>,
  ): () => void {
    return this.emitter.on(event, listener);
  }

  once<K extends TeletypeEventName>(
    event: K,
    listener: TeletypeEventListener<K>,
  ): () => void {
    return this.emitter.once(event, listener);
  }

  off<K extends TeletypeEventName>(
    event: K,
    listener: TeletypeEventListener<K>,
  ): void {
    this.emitter.off(event, listener);
  }

  // --------------------------------------------------------------------------
  // Lifecycle
  // --------------------------------------------------------------------------

  /** Load storage + config + history and prepare the socket. Idempotent. */
  async init(): Promise<void> {
    if (this.initialized) {
      return;
    }
    this.initialized = true;

    await this.storage.hydrate([
      STORAGE_KEYS.personId,
      STORAGE_KEYS.appealId,
      STORAGE_KEYS.config,
      STORAGE_KEYS.configSaveTime,
      STORAGE_KEYS.pendingMessages,
      STORAGE_KEYS.popupState,
      STORAGE_KEYS.widgetInteracted,
    ]);

    this.personId = this.storage.get<string>(STORAGE_KEYS.personId, '') || '';
    this._appealId = this.storage.get<string>(STORAGE_KEYS.appealId, '') || '';
    this.pendingMessages =
      this.storage.get<Message[]>(STORAGE_KEYS.pendingMessages, []) || [];
    this.pendingMessages = this.pendingMessages.map((m) => ({
      ...m,
      status: 'failed',
    }));

    try {
      const response = await this.loadConfig();
      this.applyConfig(response);
    } catch (err) {
      this.emitter.emit('error', err as Error);
    }

    if (this._appealId) {
      await this.loadHistory();
    }

    this._ready = true;
    this.emitter.emit('ready', undefined);
    this.publishMessages();

    // Connect eagerly if there's an existing conversation, matching the web
    // widget which reconnects when history is present.
    if (this._appealId || this.pendingMessages.length > 0) {
      this.ensureConnected();
    }
  }

  private async loadConfig(): Promise<ConfigResponse> {
    const saveTime = this.storage.get<number>(STORAGE_KEYS.configSaveTime, 0) || 0;
    const cached = this.storage.get<ConfigResponse>(STORAGE_KEYS.config);
    const expired = Date.now() - saveTime > CONFIG_LIFETIME;
    if (cached && !expired) {
      return cached;
    }
    const fresh = await this.api.getConfig();
    if (isUsableConfigResponse(fresh)) {
      this.storage.set(STORAGE_KEYS.config, fresh);
      this.storage.set(STORAGE_KEYS.configSaveTime, Date.now());
    }
    return fresh;
  }

  private applyConfig(response: ConfigResponse): void {
    if (!isUsableConfigResponse(response)) {
      return;
    }
    const data = response.data;
    this._config = data;
    this._operators = (data.operators || []).filter(
      (op) => op && op.name && op.name.trim() !== '',
    );
    this._channels = data.channels || [];
    if (typeof data.soundEnabled === 'boolean') {
      this.soundEnabled = data.soundEnabled;
    }
    this.emitter.emit('config', data);
  }

  private async loadHistory(): Promise<void> {
    try {
      const res = await this.api.getHistory(this._appealId);
      const history: Message[] = (res && res.data) || [];
      history.forEach((m) => {
        m.unread = m.seen === undefined ? false : !m.seen;
        m.emojiOnly = isEmojiOnly((m.message || '').trim());
      });
      const merged = [...history.reverse(), ...this.pendingMessages];
      this.setMessages(merged, true);
    } catch (err) {
      this.emitter.emit('error', err as Error);
    }
  }

  /** Open the socket (if needed) and bind all listeners. */
  ensureConnected(): void {
    // Create the socket first (autoConnect is false) so we can attach
    // listeners before `connect()` — otherwise the `connect` event is missed
    // and queued messages never leave "sending".
    this.socket.ensureCreated();
    if (!this.listenersBound) {
      this.bindSocket();
      this.listenersBound = true;
    }
    this.socket.connect();
  }

  /**
   * Open the socket and resolve once it is connected. Used by host apps to
   * verify that a channel id is reachable before showing the chat UI.
   */
  waitUntilConnected(timeoutMs = 15000): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this._connection === 'connected') {
        resolve();
        return;
      }
      const timer = setTimeout(() => {
        off();
        reject(new Error('Socket connect timeout'));
      }, timeoutMs);
      const off = this.on('connectionChanged', (state) => {
        if (state !== 'connected') {
          return;
        }
        clearTimeout(timer);
        off();
        resolve();
      });
      this.ensureConnected();
      if (this._connection === 'connected') {
        clearTimeout(timer);
        off();
        resolve();
      }
    });
  }

  private bindSocket(): void {
    this.socket.off();

    const debug = this.env.mode === 'dev';

    this.socket.on(WsEvent.CONNECT, () => {
      if (debug) {
        // eslint-disable-next-line no-console
        console.log('[teletype][ws] • connect');
      }
      this._connection = 'connected';
      this.emitter.emit('connectionChanged', 'connected');
      this.handleConnect();
    });

    this.socket.on(WsEvent.DISCONNECT, () => {
      if (debug) {
        // eslint-disable-next-line no-console
        console.log('[teletype][ws] • disconnect');
      }
      this._connection = 'disconnected';
      this.emitter.emit('connectionChanged', 'disconnected');
    });

    this.socket.on(WsEvent.INIT_DATA_TO_PERSON, (raw) => {
      const data = raw as { person_id?: string; appeal_id?: string };
      if (data.person_id) {
        this.personId = data.person_id;
        this.storage.set(STORAGE_KEYS.personId, this.personId);
        if (this.personData) {
          this.setUserData(this.personData);
        }
      }
      if (data.appeal_id) {
        if (!this._appealId && this.messagesInPending.length > 0) {
          this.messagesInPending.forEach((m) => this.emitMessage(m));
          this.messagesInPending = [];
        }
        this.setAppealId(data.appeal_id);
      }
    });

    this.socket.on(WsEvent.MESSAGE_FROM_CLIENT, (raw) => {
      const data = camelKeys(raw) as Message;
      this.handleIncomingMessage(data);
      this.emitter.emit('messageReceived', data);
    });

    this.socket.on(WsEvent.OPERATOR_TYPING, (raw) => {
      const data = raw as { person?: unknown };
      void data;
      this.setOperatorTyping(true);
    });

    this.socket.on(WsEvent.OPERATOR_STOP_TYPING, () => {
      this.setOperatorTyping(false);
    });

    this.socket.on(WsEvent.OPERATOR_STATUS_CHANGE, (raw) => {
      const data = raw as { client_id?: string; online?: boolean };
      const idx = this._operators.findIndex((o) => o.id === data.client_id);
      if (idx > -1) {
        this._operators[idx].isOnline = !!data.online;
        this._operators = [...this._operators];
      }
    });

    this.socket.on(WsEvent.APPEAL_STATUS_CHANGE, (raw) => {
      const data = raw as { status?: number };
      if (data.status === APPEAL_STATUS_CLOSED && !this.banned) {
        this.createRatingForm();
        this.emitter.emit(
          'dialogClosed',
          data as { status: number } & Record<string, unknown>,
        );
      }
    });

    this.socket.on(WsEvent.RECEIVED, (raw) => {
      this.handleReceived(raw as Record<string, unknown>);
    });

    this.socket.on(WsEvent.SEEN, (raw) => {
      this.handleSeen(raw as { ids?: string[]; appeal_id?: string });
    });
  }

  private handleConnect(): void {
    if (this.personId) {
      setTimeout(() => {
        this.socket.emit(
          WsEvent.AUTH_PERSON,
          snakeKeys({ widgetId: this.externalId, id: this.personId }),
        );
      }, 1000);
    }
  }

  // --------------------------------------------------------------------------
  // Incoming
  // --------------------------------------------------------------------------

  private handleIncomingMessage(data: Message, unread = true): void {
    this.setOperatorTyping(false);
    data.date = data.date || {
      date: new Date().toISOString(),
      timezone: 'UTC',
    };
    // While the chat is open the user is looking at the conversation, so a new
    // inbound message must not bump the unread counter.
    data.unread = unread && !this._opened;
    data.isOwn = false;
    data.emojiOnly =
      data.emojiOnly || isEmojiOnly((data.message || '').trim());
    data.message = data.originalMessage || data.message;

    this._messages = [...this._messages, data];
    this.setMessages(this._messages);

    if (data.appealId && data.appealId !== this._appealId) {
      this.setAppealId(data.appealId);
      this.emitter.emit('appealStarted', data);
    }
  }

  private handleReceived(data: Record<string, unknown>): void {
    this.banned = Boolean(data.banned);
    const tempId = (data.temp_id ?? data.tempId) as string | undefined;
    const newId = data.id as string;
    const appealId = (data.appeal_id ?? data.appealId) as string | undefined;
    if (!tempId) {
      return;
    }

    if (this.receivedTimeouts[tempId]) {
      clearTimeout(this.receivedTimeouts[tempId]);
      delete this.receivedTimeouts[tempId];
    }

    if (appealId && this._appealId !== appealId) {
      this.setAppealId(appealId);
    }

    const idx = this._messages.findIndex(
      (m) => !m.fromInvite && m.tempId === tempId,
    );
    if (idx > -1) {
      this._messages[idx] = {
        ...this._messages[idx],
        id: newId,
        tempId: newId,
        status: 'sent',
        appealId: this._appealId,
        date: { date: new Date().toISOString(), timezone: 'UTC' },
      };
    }
    this.removePending(tempId);
    this.setMessages([...this._messages]);
  }

  private handleSeen(data: { ids?: string[]; appeal_id?: string }): void {
    const ids = Array.isArray(data.ids) ? data.ids : [];
    this._messages = this._messages.map((m) => {
      const byId = ids.includes(m.id || '') || ids.includes(m.tempId);
      const byAppeal =
        !ids.length && !!data.appeal_id && m.appealId === data.appeal_id;
      if (byId || byAppeal) {
        return { ...m, seen: true, unread: false };
      }
      return m;
    });
    this.setMessages(this._messages);
  }

  // --------------------------------------------------------------------------
  // Outgoing
  // --------------------------------------------------------------------------

  /** Send a plain text message. */
  sendMessage(text: string): void {
    const trimmed = (text || '').trim();
    if (!trimmed) {
      return;
    }
    const message: Message = {
      message: trimmed,
      isOwn: true,
      date: { date: new Date().toISOString(), timezone: 'UTC' },
      emojiOnly: isEmojiOnly(trimmed),
      messageType: 'text',
      tempId: guid(),
    };
    this.handleSendMessage(message);
  }

  /**
   * Send an already-uploaded attachment. The local preview (created by
   * `uploadFile`) is already in the message list, so this only emits the
   * socket event — same as the web widget's `sendAttachment` (`save = false`).
   */
  sendAttachment(attachment: UploadedAttachment): void {
    const message: Message = {
      isOwn: true,
      date: { date: new Date().toISOString(), timezone: 'UTC' },
      attachment: attachment.attachment,
      attachmentId: attachment.attachmentId,
      attachmentUrl: attachment.attachmentUrl,
      width: attachment.width,
      height: attachment.height,
      size: attachment.size,
      messageType: attachment.type || 'attachment',
      tempId: guid(),
    };
    this.handleSendMessage(message, false);
  }

  /**
   * Upload a local file without sending it as a chat message.
   * Matches the web widget: `POST widget-attachment/<channel_id>` with
   * multipart `file` + `externalId`.
   */
  async uploadAttachment(
    file: LocalFile,
    onProgress?: (progress: number) => void,
  ): Promise<UploadedAttachment> {
    if (typeof file.size === 'number' && file.size > MAX_UPLOAD_BYTES) {
      const error = new Error('fileSizeError');
      this.emitter.emit('error', error);
      throw error;
    }
    if (!isAllowedUploadFile(file)) {
      const error = new Error('fileFormatNotAllowed');
      this.emitter.emit('error', error);
      throw error;
    }

    let res: Awaited<ReturnType<ApiClient['uploadFile']>>;
    try {
      res = await this.api.uploadFile(
        {
          uri: file.uri,
          name: file.name,
          type: file.type,
        },
        onProgress,
      );
    } catch (e) {
      const error = e instanceof Error ? e : new Error('uploadFailed');
      this.emitter.emit('error', error);
      throw error;
    }
    const data = res?.data || {};
    if (res && res.success === false) {
      const detail = Array.isArray(res.error)
        ? res.error.join(', ')
        : typeof res.error === 'string'
          ? res.error
          : 'uploadFailed';
      const error = new Error(detail || 'uploadFailed');
      this.emitter.emit('error', error);
      throw error;
    }

    const attachmentId =
      (data.attachmentId as string) ||
      (data.attachment_id as string) ||
      '';
    const attachmentUrl =
      (data.attachment as string) ||
      (data.attachmentUrl as string) ||
      file.uri;

    return {
      attachment: file.name,
      attachmentId,
      attachmentUrl,
      type: messageTypeFromFile(file),
      size: file.size,
      width: file.width,
      height: file.height,
    };
  }

  /**
   * Widget-style send: insert a local preview, upload the file, then emit the
   * attachment over the socket. Progress is written onto the preview message.
   */
  async uploadFile(file: LocalFile): Promise<void> {
    if (typeof file.size === 'number' && file.size > MAX_UPLOAD_BYTES) {
      this.addAttachmentError(file, 'fileSizeError');
      const error = new Error('fileSizeError');
      this.emitter.emit('error', error);
      throw error;
    }
    if (!isAllowedUploadFile(file)) {
      this.addAttachmentError(file, 'fileFormatNotAllowed');
      const error = new Error('fileFormatNotAllowed');
      this.emitter.emit('error', error);
      throw error;
    }

    const localId = `${file.name}_${file.size ?? 0}_${Date.now()}_${Math.random()
      .toString(36)
      .slice(2, 11)}`;
    const preview: Message = {
      message: '',
      messageType: messageTypeFromFile(file),
      progress: 0,
      attachmentId: localId,
      tempId: guid(),
      isOwn: true,
      attachment: file.name,
      attachmentPreviewUrl:
        file.previewUri ||
        (messageTypeFromFile(file) === 'image' ? file.uri : undefined),
      attachmentUrl: file.uri,
      date: { date: new Date().toISOString(), timezone: 'UTC' },
      size: file.size,
      width: file.width,
      height: file.height,
      status: 'sending',
    };
    this._messages = [...this._messages, preview];
    this.setMessages(this._messages);

    try {
      const uploaded = await this.uploadAttachment(file, (pct) => {
        this.patchAttachment(localId, { progress: pct });
      });
      this.patchAttachment(localId, {
        attachmentId: uploaded.attachmentId,
        attachmentUrl: uploaded.attachmentUrl,
        progress: 100,
      });
      this.sendAttachment(uploaded);
    } catch (e) {
      const code = e instanceof Error ? e.message : 'uploadFailed';
      this.patchAttachment(localId, {
        errorMessage: code,
        progress: 100,
        status: 'failed',
      });
      throw e;
    }
  }

  private addAttachmentError(file: LocalFile, errorMessage: string): void {
    const message: Message = {
      message: '',
      messageType: messageTypeFromFile(file),
      progress: 100,
      attachmentId: `${file.name}${file.size ?? 0}`,
      tempId: guid(),
      isOwn: true,
      attachment: file.name,
      attachmentPreviewUrl: file.uri,
      date: { date: new Date().toISOString(), timezone: 'UTC' },
      size: file.size,
      errorMessage,
      status: 'failed',
    };
    this._messages = [...this._messages, message];
    this.setMessages(this._messages);
  }

  private patchAttachment(attachmentId: string, patch: Partial<Message>): void {
    this._messages = this._messages.map((m) =>
      m.attachmentId === attachmentId ? { ...m, ...patch } : m,
    );
    this.setMessages(this._messages);
  }

  private handleSendMessage(message: Message, save = true): void {
    this.ensureConnected();

    if (!this.messageWasSent) {
      this.messageWasSent = true;
      void this.sendPersonData();
    }

    message.status = this.banned ? 'sent' : 'sending';
    // Web widget always mints a fresh id here (including retries).
    message.tempId = guid();

    const userMessages = this._messages.filter(
      (m) =>
        m.isOwn &&
        !m.errorMessage &&
        !m.attachment &&
        m.status !== 'failed' &&
        m.tempId !== message.tempId,
    );
    const attachmentMessages = this._messages.filter(
      (m) =>
        m.isOwn &&
        !m.errorMessage &&
        m.attachment &&
        m.status !== 'failed' &&
        m.tempId !== message.tempId,
    );
    const last = this._messages[this._messages.length - 1];
    const hasRating = last && last.formType === 'rating';

    const isFirstMessage =
      !this._appealId &&
      ((!userMessages.length && !attachmentMessages.length) ||
        hasRating ||
        // Web widget: the first outgoing file still counts as the dialog-opening
        // message even when a local preview of the same attachment is already
        // sitting in `_messages`.
        (!!message.attachment &&
          attachmentMessages.length > 0 &&
          message.attachment === attachmentMessages[0].attachment));

    if (message.messageType && message.messageType !== 'text' && message.attachmentId) {
      const previewIdx = this._messages.findIndex(
        (m) => m.attachmentId === message.attachmentId,
      );
      if (previewIdx > -1) {
        this._messages = this._messages.map((m, i) =>
          i === previewIdx ? { ...m, tempId: message.tempId } : m,
        );
      }
    }

    if (save) {
      this._messages = [...this._messages, message];
    }
    this.setMessages(this._messages);
    this.pushPending(message);

    if (isFirstMessage || this._appealId) {
      this.emitMessage(message);
    } else {
      this.messagesInPending.push(message);
    }

    if (isFirstMessage) {
      this.emitter.emit('dialogStarted', message);
    }
    this.emitter.emit('messageSent', message);
  }

  private emitMessage(message: Message): void {
    this.ensureConnected();
    const personId =
      this.personId || this.storage.get<string>(STORAGE_KEYS.personId, '') || '';
    // Same payload as the web widget `emitMessage`: empty strings, not `null`,
    // for a missing person/appeal. socket.io v2 buffers the packet while the
    // handshake is in flight — do not wait for `connected` or the send is
    // dropped if `connect` is missed (widget shows the composer ~700ms after
    // connect, so it rarely hits this; the SDK can send immediately).
    this.socket.emit(
      WsEvent.MESSAGE_FROM_PERSON,
      snakeKeys({
        external_id: this.externalId,
        message,
        person_id: personId,
        appeal_id: this._appealId || '',
      }),
    );
    this.armReceivedTimeout(message);
  }

  private armReceivedTimeout(message: Message): void {
    if (this.banned || !message.tempId) {
      return;
    }
    clearTimeout(this.receivedTimeouts[message.tempId]);
    this.receivedTimeouts[message.tempId] = setTimeout(() => {
      void this.api
        .reportError({
          error: 'Did not receive "received" event from websockets',
          widgetId: this.externalId,
          appealId: this._appealId,
          personId: this.personId,
        })
        .catch(() => undefined);
      this._messages = this._messages.map((m) =>
        m.tempId === message.tempId ? { ...m, status: 'failed' } : m,
      );
      this.setMessages(this._messages);
    }, RECEIVED_ACK_TIMEOUT);
  }

  /** Retry a message that previously failed. */
  retryMessage(tempId: string): void {
    const message = this._messages.find((m) => m.tempId === tempId);
    if (!message) {
      return;
    }
    const next: Message = {
      ...message,
      status: 'sending',
      errorMessage: undefined,
    };
    this._messages = this._messages.map((m) =>
      m.tempId === tempId ? next : m,
    );
    this.setMessages(this._messages);
    this.handleSendMessage(next, false);
  }

  // --------------------------------------------------------------------------
  // Public API (mirrors the web widget's `_teletypeWidget.*`)
  // --------------------------------------------------------------------------

  /** Attach visitor data (name/email/phone/payload). */
  setPersonData(info: AdditionalPersonInfo): void {
    this.personAdditionalInfo = { ...this.personAdditionalInfo, ...info };
    if (this.personId) {
      void this.sendPersonData();
    }
  }

  /** Inject one or more bot greeting messages locally. */
  greetingMessages(messages: string[], fromBot = true): void {
    if (this.greetingSent) {
      return;
    }
    this.greetingSent = true;
    const operatorAvatar = !fromBot ? this._operators[0]?.avatar : undefined;
    messages.forEach((text) => {
      this.handleIncomingMessage(
        {
          message: text,
          tempId: guid(),
          serviceMessage: true,
          avatar: operatorAvatar,
          from: { avatar: operatorAvatar },
        },
        false,
      );
    });
  }

  /** Prefill the composer. UI listens to `draftChanged`. */
  setMessage(text: string): void {
    this._draft = text;
    this.emitter.emit('draftChanged', text);
  }

  /** Open the chat UI. */
  show(): void {
    this.setOpened(true);
  }

  /** Close the chat UI. */
  hide(): void {
    this.setOpened(false);
  }

  toggle(): void {
    this.setOpened(!this._opened);
  }

  private setOpened(value: boolean): void {
    if (this._opened === value) {
      return;
    }
    this._opened = value;
    this.storage.set(STORAGE_KEYS.popupState, value);
    this.emitter.emit('openChanged', value);
    if (value) {
      // Opening the chat clears the unread counter immediately (locally),
      // independent of the server SEEN round-trip emitted below.
      this._messages = this._messages.map((m) =>
        !m.isOwn && m.unread ? { ...m, unread: false, seen: true } : m,
      );
      this.setMessages(this._messages);

      this.ensureConnected();
      this.storage.set(STORAGE_KEYS.widgetInteracted, true);
      void this.api
        .getIp()
        .then((res) => {
          this.socket.emit(
            WsEvent.PERSON_OPENED_WIDGET,
            snakeKeys({
              // Protocol key: the backend expects `channel_id` for this event
              // (already snake_case, so snakeKeys leaves it untouched).
              channel_id: this.externalId,
              ipAddress: res?.data,
              personId: this.personId || null,
              appealId: this._appealId || null,
              data: {},
            }),
          );
        })
        .catch(() => undefined);
      this.markSeen();
      this.emitter.emit('opened', undefined);
    } else {
      this.emitter.emit('closed', undefined);
    }
  }

  // --------------------------------------------------------------------------
  // Ancillary actions
  // --------------------------------------------------------------------------

  private async sendPersonData(): Promise<void> {
    try {
      const ip = await this.api.getIp().catch(() => ({ data: '' }));
      const info: Record<string, unknown> = {
        ...this.device,
        ipAddress: ip.data,
      };
      const personData: Record<string, unknown> = {
        widgetId: this.externalId,
        personId: this.personId,
        data: { ...info, ...this.personAdditionalInfo },
      };
      this.socket.emit(WsEvent.SET_PERSON_DATA, snakeKeys(personData));
    } catch {
      // best-effort
    }
  }

  private setUserData(data: Record<string, unknown>): void {
    if (this.personId) {
      this.socket.emit(
        WsEvent.SET_USER_DATA,
        snakeKeys({ personId: this.personId, data }),
      );
    } else {
      this.personData = data;
    }
  }

  /** Send a rating for the current appeal (10..50). */
  rateAppeal(value: ConversationRating, formTempId?: string): void {
    this.socket.emit(
      WsEvent.PERSON_RATE_APPEAL,
      snakeKeys({ appealId: this._appealId, data: { value } }),
    );
    if (formTempId) {
      const idx = this._messages.findIndex((m) => m.tempId === formTempId);
      if (idx > -1) {
        this._messages[idx] = { ...this._messages[idx], ratingValue: value };
        this.setMessages([...this._messages]);
      }
    }
    this.emitter.emit('dialogRated', { id: formTempId || '', formValue: value });
  }

  /** Report that a messenger channel button was tapped. */
  clickChannel(channel: ChannelMessenger): void {
    this.emitter.emit('channelClicked', channel);
    void this.api
      .getIp()
      .then((res) => {
        this.socket.emit(
          WsEvent.PERSON_CLICK_WIDGET_CHANNEL,
          snakeKeys({
            widgetId: this.externalId,
            personId: this.personId || null,
            appealId: this._appealId || null,
            widgetChannelId: channel.id,
            data: { value: channel.name, ipAddress: res?.data },
          }),
        );
      })
      .catch(() => undefined);
  }

  /** Mark all inbound messages of the current appeal as seen. */
  markSeen(): void {
    if (this._appealId) {
      this.socket.emit(WsEvent.SEEN, snakeKeys({ appealId: this._appealId }));
    }
  }

  startTyping(message = ''): void {
    if (this.socket.connected) {
      this.socket.emit(WsEvent.PERSON_TYPING, {
        appealId: this._appealId,
        message,
      });
    }
  }

  stopTyping(): void {
    if (this.socket.connected) {
      this.socket.emit(WsEvent.PERSON_STOP_TYPING, {
        appealId: this._appealId,
      });
    }
  }

  /** Notify the backend of an in-app navigation (screen change). */
  notifyLocationChange(location: string): void {
    void this.api.notifyLocationChange(location).catch(() => undefined);
  }

  private createRatingForm(): void {
    this.handleIncomingMessage(
      {
        tempId: guid(),
        formType: 'rating',
        serviceMessage: true,
      },
      false,
    );
  }

  // --------------------------------------------------------------------------
  // State plumbing
  // --------------------------------------------------------------------------

  private setAppealId(appealId: string): void {
    this._appealId = appealId;
    this.storage.set(STORAGE_KEYS.appealId, appealId);
  }

  private setOperatorTyping(value: boolean): void {
    if (this.operatorTypingTimeout) {
      clearTimeout(this.operatorTypingTimeout);
      this.operatorTypingTimeout = null;
    }
    if (this._operatorTyping !== value) {
      this._operatorTyping = value;
      this.emitter.emit('operatorTyping', value);
    }
  }

  private setMessages(messages: Message[], _fromHistory = false): void {
    // De-dupe by id (sent) and tempId (pending), then sort by date.
    const sent = uniqueBy(
      messages.filter((m) => (m.id || !m.isOwn) && !m.serviceMessage),
      (m) => m.id || m.tempId,
    );
    const pending = uniqueBy(
      messages.filter((m) => !m.id && m.formType !== 'contactButtons'),
      (m) => m.tempId,
    );
    const merged = [...sent, ...pending].sort((a, b) => {
      const at = a.date ? Date.parse(a.date.date) : 0;
      const bt = b.date ? Date.parse(b.date.date) : 0;
      return at - bt;
    });

    let unread = 0;
    merged.forEach((m) => {
      if (!m.isOwn && m.unread) {
        unread++;
      }
    });

    this._messages = merged;
    this.setUnreadCount(unread);
    this.publishMessages();
  }

  private setUnreadCount(count: number): void {
    if (this._unreadCount !== count) {
      this._unreadCount = count;
      this.emitter.emit('unreadCountChanged', count);
    }
  }

  private publishMessages(): void {
    this.emitter.emit('messagesChanged', this._messages);
  }

  private pushPending(message: Message): void {
    this.pendingMessages.push(message);
    this.savePending();
  }

  private removePending(tempId: string): void {
    const idx = this.pendingMessages.findIndex(
      (m) => !m.fromInvite && m.tempId === tempId,
    );
    if (idx > -1) {
      this.pendingMessages.splice(idx, 1);
      this.savePending();
    }
  }

  private savePending(): void {
    this.storage.set(
      STORAGE_KEYS.pendingMessages,
      this.pendingMessages.filter((m) => m.messageType === 'text'),
    );
  }

  /** Tear down socket + timers. Call from the host app on unmount/logout. */
  destroy(): void {
    Object.values(this.receivedTimeouts).forEach(clearTimeout);
    this.receivedTimeouts = {};
    if (this.operatorTypingTimeout) {
      clearTimeout(this.operatorTypingTimeout);
    }
    this.socket.off();
    this.socket.disconnect();
    this.emitter.removeAllListeners();
    this.initialized = false;
    this.listenersBound = false;
  }
}

function isUsableConfigResponse(
  response: ConfigResponse | null | undefined,
): response is ConfigResponse {
  if (!response || response.success === false) {
    return false;
  }
  const data = response.data;
  if (!data || Array.isArray(data) || typeof data !== 'object') {
    return false;
  }
  return Boolean(data.projectId || data.name);
}

function uniqueBy<T>(arr: T[], keyFn: (item: T) => string): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  arr.forEach((item) => {
    const key = keyFn(item);
    if (!seen.has(key)) {
      seen.add(key);
      out.push(item);
    }
  });
  return out;
}
