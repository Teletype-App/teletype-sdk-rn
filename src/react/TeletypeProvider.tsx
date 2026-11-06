import React, {
  useEffect,
  useMemo,
  useRef,
  PropsWithChildren,
} from 'react';
import { TeletypeClient, TeletypeConfig } from '../core/TeletypeClient';
import { TeletypeContext } from './context';

export interface TeletypeProviderProps extends TeletypeConfig {
  /**
   * Provide a pre-constructed client instead of config. Useful when you need to
   * hold the client outside React (e.g. for push-notification handling).
   */
  client?: TeletypeClient;
  /** Called once the client instance exists (before `init()` resolves). */
  onReady?: (client: TeletypeClient) => void;
  /** Automatically call `client.init()` on mount. Default true. */
  autoInit?: boolean;
}

/**
 * Provides a single `TeletypeClient` to the component tree. All hooks and UI
 * components resolve their client from here.
 *
 * ```tsx
 * <TeletypeProvider
 *   teletypeExternalId="YOUR_EXTERNAL_ID"
 *   title="Онлайн чат"
 *   primaryColor="#0084ff"
 *   chatBackground="white"
 * >
 *   <Root />
 * </TeletypeProvider>
 * ```
 */
export function TeletypeProvider(
  props: PropsWithChildren<TeletypeProviderProps>,
): React.ReactElement {
  const {
    children,
    client: externalClient,
    onReady,
    autoInit = true,
    title,
    primaryColor,
    chatBackground,
    teletypeExternalId,
    mode,
    environment,
    storage,
    soundEnabled,
    socketOptions,
    locale,
    translations,
    device,
  } = props;

  const resolvedTitle = typeof title === 'string' ? title : undefined;

  const clientRef = useRef<TeletypeClient | null>(null);
  if (!clientRef.current) {
    const config: TeletypeConfig = {
      teletypeExternalId,
      mode,
      environment,
      storage,
      soundEnabled,
      socketOptions,
      locale,
      translations,
      device,
      title: resolvedTitle,
      primaryColor,
      chatBackground,
    };
    clientRef.current = externalClient ?? new TeletypeClient(config);
  }

  const client = clientRef.current;

  useEffect(() => {
    onReady?.(client);
    if (autoInit) {
      void client.init();
    }
    return () => {
      // Only tear down clients we own.
      if (!externalClient) {
        client.destroy();
        clientRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (resolvedTitle !== undefined) {
      client.setTitle(resolvedTitle);
    }
  }, [client, resolvedTitle]);

  useEffect(() => {
    if (primaryColor !== undefined) {
      client.setPrimaryColor(primaryColor);
    }
  }, [client, primaryColor]);

  useEffect(() => {
    if (chatBackground !== undefined) {
      client.setChatBackground(chatBackground);
    }
  }, [client, chatBackground]);

  const value = useMemo(() => client, [client]);

  return (
    <TeletypeContext.Provider value={value}>
      {children}
    </TeletypeContext.Provider>
  );
}
