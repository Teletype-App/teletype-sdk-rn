import React from 'react';
import { ChatButton, ChatButtonProps } from './ChatButton';
import { TeletypeTheme } from './theme';

export interface ChatWidgetProps {
  /** Theme applied to the floating launcher button. */
  theme?: Partial<TeletypeTheme>;
  /** Hide the floating launcher button (open the chat programmatically). */
  hideButton?: boolean;
  /** Props forwarded to the floating button. */
  buttonProps?: Omit<ChatButtonProps, 'theme'>;
}

/**
 * Floating launcher button with an unread badge. The chat surface is **not**
 * presented here — the host should push `<ChatScreen />` as a regular
 * navigation screen when `client.show()` / `state.opened` is true.
 *
 * ```tsx
 * const { opened } = useTeletypeState();
 * if (opened) {
 *   return <ChatScreen onAttachmentPress={pickFile} />;
 * }
 * return (
 *   <>
 *     <Home />
 *     <ChatWidget buttonProps={{ position: 'right', scale: 100 }} />
 *   </>
 * );
 * ```
 */
export function ChatWidget(props: ChatWidgetProps): React.ReactElement | null {
  const { theme, hideButton, buttonProps } = props;
  if (hideButton) {
    return null;
  }
  return <ChatButton theme={theme} {...buttonProps} />;
}
