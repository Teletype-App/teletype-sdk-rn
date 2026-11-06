import { Message } from './message';
import { WidgetConfigData, ChannelMessenger } from './config';

/**
 * Additional person (visitor) data that can be attached to the conversation.
 * Mirrors `AdditionalPersonInfo` from the web widget public API.
 */
export interface AdditionalPersonInfo {
  name?: string;
  email?: string;
  avatar?: string;
  phone?: string;
  payload?: { [key: string]: string };
}

/**
 * Public SDK events. These are the React Native equivalents of the
 * `teletype.*` DOM events fired by the web widget.
 */
export interface TeletypeEventMap {
  /** Fired once the widget config/history are loaded and the client is usable. */
  ready: void;
  /** Chat UI opened. */
  opened: void;
  /** Chat UI closed. */
  closed: void;
  /** The visitor started a brand new dialog (first message of a session). */
  dialogStarted: Message;
  /** A new appeal (ticket) was opened on the backend. */
  appealStarted: Message;
  /** The visitor sent a message. */
  messageSent: Message;
  /** A message was received from an operator/bot. */
  messageReceived: Message;
  /** The operator closed the dialog. */
  dialogClosed: { status: number } & Record<string, unknown>;
  /** The visitor rated the dialog. */
  dialogRated: { id: string; formValue: string };
  /** The visitor tapped a messenger channel button. */
  channelClicked: ChannelMessenger;
  /** The full message list changed. Useful for custom UIs. */
  messagesChanged: Message[];
  /** Number of unread inbound messages changed. */
  unreadCountChanged: number;
  /** Operator typing state changed. */
  operatorTyping: boolean;
  /** Connection state changed. */
  connectionChanged: 'connected' | 'disconnected';
  /** Programmatic composer prefill via `setMessage()`. */
  draftChanged: string;
  /** UI open/close state changed. */
  openChanged: boolean;
  /** Widget config resolved. */
  config: WidgetConfigData;
  /** The active UI language changed (payload is the two-letter language code). */
  localeChanged: string;
  /** Chat title, primary color, or background changed. */
  appearanceChanged: void;
  /** An error occurred. */
  error: Error;
}

export type TeletypeEventName = keyof TeletypeEventMap;
export type TeletypeEventListener<K extends TeletypeEventName> = (
  payload: TeletypeEventMap[K],
) => void;
