import { useContext, useEffect, useReducer, useRef, useCallback } from 'react';
import { TeletypeContext } from './context';
import { TeletypeClient, TeletypeState } from '../core/TeletypeClient';
import {
  TeletypeEventName,
  TeletypeEventListener,
} from '../types/events';
import { Message } from '../types/message';
import { TeletypeStrings } from '../i18n/strings';

/** Access the raw `TeletypeClient`. Throws if used outside a provider. */
export function useTeletype(): TeletypeClient {
  const client = useContext(TeletypeContext);
  if (!client) {
    throw new Error(
      '[teletype] useTeletype must be used within a <TeletypeProvider>.',
    );
  }
  return client;
}

const STATE_EVENTS: TeletypeEventName[] = [
  'ready',
  'messagesChanged',
  'unreadCountChanged',
  'operatorTyping',
  'connectionChanged',
  'openChanged',
  'config',
  'draftChanged',
  'localeChanged',
  'appearanceChanged',
];

/**
 * Subscribe to the full client state. Re-renders whenever any state-affecting
 * event fires. Returns an immutable snapshot.
 */
export function useTeletypeState(): TeletypeState {
  const client = useTeletype();
  const [, forceRender] = useReducer((n: number) => n + 1, 0);
  const snapshotRef = useRef<TeletypeState>(client.state);

  useEffect(() => {
    const rerender = () => {
      snapshotRef.current = client.state;
      forceRender();
    };
    const unsubs = STATE_EVENTS.map((event) =>
      client.on(event, rerender as TeletypeEventListener<typeof event>),
    );
    // Sync once in case state changed between render and effect.
    rerender();
    return () => unsubs.forEach((u) => u());
  }, [client]);

  return snapshotRef.current;
}

/** Convenience selector for just the message list. */
export function useMessages(): Message[] {
  return useTeletypeState().messages;
}

/** Convenience selector for the unread count (e.g. a badge). */
export function useUnreadCount(): number {
  return useTeletypeState().unreadCount;
}

/**
 * Resolved UI strings for the active language. Re-renders when the locale
 * changes (`client.setLocale(...)`). Use it to localize custom UIs.
 */
export function useTeletypeStrings(): TeletypeStrings {
  return useTeletypeState().strings;
}

/** Active two-letter UI language code (e.g. `'ru'`). */
export function useLocale(): string {
  return useTeletypeState().locale;
}

/** Subscribe to a single SDK event imperatively. */
export function useTeletypeEvent<K extends TeletypeEventName>(
  event: K,
  listener: TeletypeEventListener<K>,
): void {
  const client = useTeletype();
  const saved = useRef(listener);
  saved.current = listener;

  useEffect(() => {
    const handler: TeletypeEventListener<K> = (payload) =>
      saved.current(payload);
    return client.on(event, handler);
  }, [client, event]);
}

/**
 * Actions bundle for building custom UIs. Stable references.
 */
export function useTeletypeActions() {
  const client = useTeletype();
  return {
    send: useCallback((text: string) => client.sendMessage(text), [client]),
    show: useCallback(() => client.show(), [client]),
    hide: useCallback(() => client.hide(), [client]),
    toggle: useCallback(() => client.toggle(), [client]),
    setMessage: useCallback(
      (text: string) => client.setMessage(text),
      [client],
    ),
    setPersonData: useCallback(
      (info: Parameters<TeletypeClient['setPersonData']>[0]) =>
        client.setPersonData(info),
      [client],
    ),
    greetingMessages: useCallback(
      (messages: string[]) => client.greetingMessages(messages),
      [client],
    ),
    startTyping: useCallback(
      (text?: string) => client.startTyping(text),
      [client],
    ),
    stopTyping: useCallback(() => client.stopTyping(), [client]),
    retryMessage: useCallback(
      (tempId: string) => client.retryMessage(tempId),
      [client],
    ),
    markSeen: useCallback(() => client.markSeen(), [client]),
  };
}
