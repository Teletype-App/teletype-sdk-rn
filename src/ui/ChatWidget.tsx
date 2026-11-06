import React from 'react';
import { Modal, StyleSheet, View } from 'react-native';
import { useTeletype, useTeletypeState } from '../react/hooks';
import { ChatButton, ChatButtonProps } from './ChatButton';
import { ChatScreen, ChatScreenProps } from './ChatScreen';
import { ChatSafeAreaProvider } from './safeArea';
import { TeletypeTheme } from './theme';

export interface ChatWidgetProps {
  /** Theme applied to both the button and the chat surface. */
  theme?: Partial<TeletypeTheme>;
  /** Hide the floating launcher button (open the chat programmatically). */
  hideButton?: boolean;
  /** Props forwarded to the floating button. */
  buttonProps?: Omit<ChatButtonProps, 'theme'>;
  /** Props forwarded to the chat screen. */
  screenProps?: Omit<ChatScreenProps, 'theme' | 'onClose'>;
  /** How the chat surface is presented. Default 'modal'. */
  presentation?: 'modal' | 'fullScreen';
}

/**
 * All-in-one embeddable widget: a floating launcher button plus a modal chat
 * surface, wired to the client's open/close state. This is the closest
 * equivalent to dropping the `<script>` snippet on a website.
 *
 * ```tsx
 * <TeletypeProvider teletypeExternalId="YOUR_EXTERNAL_ID">
 *   <YourApp />
 *   <ChatWidget buttonProps={{ position: 'right', scale: 100 }} />
 * </TeletypeProvider>
 * ```
 */
export function ChatWidget(props: ChatWidgetProps): React.ReactElement {
  const client = useTeletype();
  const state = useTeletypeState();
  const { theme, hideButton, buttonProps, screenProps } = props;
  const { onAttachmentPress, ...restScreenProps } = screenProps || {};

  const handleAttachment = onAttachmentPress
    ? async () => {
        try {
          await onAttachmentPress();
        } finally {
          // iOS: presenting the document picker over RN `<Modal>` dismisses
          // the chat. Re-open it after the picker (or upload) finishes.
          client.show();
        }
      }
    : undefined;

  return (
    <>
      {!hideButton ? <ChatButton theme={theme} {...buttonProps} /> : null}

      <Modal
        visible={state.opened}
        animationType="slide"
        presentationStyle="overFullScreen"
        onRequestClose={() => client.hide()}
        statusBarTranslucent
      >
        <ChatSafeAreaProvider>
          <View style={styles.modal}>
            <ChatScreen
              theme={theme}
              onClose={() => client.hide()}
              {...restScreenProps}
              onAttachmentPress={handleAttachment}
            />
          </View>
        </ChatSafeAreaProvider>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  modal: { flex: 1, backgroundColor: '#fff' },
});
