/**
 * WebSocket event names used by the Teletype backend (socket.io v2).
 * Kept byte-for-byte identical to the web widget so the same server works.
 */
export enum WsEvent {
  CONNECT = 'connect',
  DISCONNECT = 'disconnect',
  INIT_DATA_TO_PERSON = 'init data to person',
  AUTH_PERSON = 'auth person',
  MESSAGE_FROM_CLIENT = 'message from client',
  MESSAGE_FROM_PERSON = 'web widget message from person',
  AUTH_SUCCESS = 'auth success',
  OPERATOR_TYPING = 'operator typing',
  RECEIVED = 'received',
  SEEN = 'seen',
  PERSON_TYPING = 'person typing',
  PERSON_STOP_TYPING = 'person stop typing',
  OPERATOR_STOP_TYPING = 'operator stop typing',
  OPERATOR_STATUS_CHANGE = 'operator status change',
  PERSON_CLICK_WIDGET_CHANNEL = 'person click widget channel',
  PERSON_RATE_APPEAL = 'person rate appeal',
  APPEAL_STATUS_CHANGE = 'appeal status change',
  PERSON_OPENED_WIDGET = 'person opened widget',
  SET_PERSON_DATA = 'set person data',
  SET_USER_DATA = 'set user data',
}

/** Appeal status reported by `appeal status change`. 2 === closed by operator. */
export const APPEAL_STATUS_CLOSED = 2;

/** ms without an operator "typing" event before we hide the indicator. */
export const INPUT_TYPING_TIMEOUT = 60000;
/** ms of visitor inactivity before we emit "person stop typing". */
export const OUTPUT_TYPING_TIMEOUT = 10000;

/** How long to wait for a `received` ack before flagging a message failed. */
export const RECEIVED_ACK_TIMEOUT = 10000;

/** Config cache lifetime (ms). Matches the web widget (10 minutes). */
export const CONFIG_LIFETIME = 1000 * 60 * 10;

/** Maximum allowed attachment size in bytes (20 MB), matching the web widget. */
export const MAX_UPLOAD_BYTES = 20 * 1024 * 1024;

/** Accent color for the launcher button and chat header. */
export const DEFAULT_PRIMARY_COLOR = '#0084ff';

/** Chat header title when none is passed to the provider. */
export const DEFAULT_CHAT_TITLE = 'Онлайн чат';

export const STORAGE_KEYS = {
  personId: 'person_id',
  appealId: 'appeal_id',
  config: 'config',
  configSaveTime: 'config-save-time',
  popupState: 'popup-state',
  widgetInteracted: 'widget-interacted',
  pendingMessages: 'pendingMessages',
} as const;
