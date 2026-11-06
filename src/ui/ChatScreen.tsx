import React, { useEffect, useMemo, useState } from 'react';
import {
  Dimensions,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  useTeletype,
  useTeletypeState,
  useTeletypeStrings,
  useLocale,
} from '../react/hooks';
import { MessageList } from './MessageList';
import { Composer } from './Composer';
import { TeletypeTheme, mergeTheme } from './theme';
import { Message, ConversationRating } from '../types/message';
import { ChatSafeAreaProvider, useChatSafeAreaInsets } from './safeArea';
import { ModalSendFile } from './ModalSendFile';
import { asPickedAttachment, PickedAttachment } from './attachments';

export interface ChatScreenProps {
  /** Theme overrides. */
  theme?: Partial<TeletypeTheme>;
  /** Show the close button in the header. */
  showClose?: boolean;
  /** Called when the header close button is pressed. */
  onClose?: () => void;
  /** Composer placeholder text. */
  placeholder?: string;
  /** Custom header title. Overrides the provider `title` (default `'Онлайн чат'`). */
  title?: string;
  /** Custom renderer for a message row. */
  renderMessage?: (message: Message) => React.ReactElement | null;
  /**
   * Called when the composer attachment button is pressed. Pick a file and
   * **return** it (`{ uri, name, type, size? }`) so the SDK can show the
   * send-confirmation sheet. Returning nothing keeps the legacy behaviour
   * where the host calls `client.uploadFile(...)` itself.
   */
  onAttachmentPress?: () =>
    | void
    | Promise<void | PickedAttachment | PickedAttachment[] | null | undefined>;
  /**
   * Extra top inset. When omitted, the device safe-area top is used
   * (notch / status bar). Pass `0` only if the host already pads the screen.
   */
  topInset?: number;
  /**
   * Extra bottom inset. When omitted, the device safe-area bottom is used
   * (home indicator). Pass `0` only if the host already pads the screen.
   */
  bottomInset?: number;
}

function useAndroidKeyboardOverlap(): number {
  const [overlap, setOverlap] = useState(0);
  useEffect(() => {
    if (Platform.OS !== 'android') {
      return;
    }
    let keyboardTop: number | null = null;

    const recompute = () => {
      if (keyboardTop == null) {
        setOverlap(0);
        return;
      }
      const windowH = Dimensions.get('window').height;
      setOverlap(Math.max(0, Math.round(windowH - keyboardTop)));
    };

    const show = Keyboard.addListener('keyboardDidShow', (e) => {
      keyboardTop = e.endCoordinates.screenY;
      recompute();
    });
    const hide = Keyboard.addListener('keyboardDidHide', () => {
      keyboardTop = null;
      setOverlap(0);
    });
    const dim = Dimensions.addEventListener('change', recompute);
    return () => {
      show.remove();
      hide.remove();
      dim.remove();
    };
  }, []);
  return overlap;
}

/**
 * Full-screen chat surface. Mount it as a regular host / navigation screen
 * (not inside a React Native `<Modal>`) so document pickers and other native
 * sheets can present on top of it.
 */
export function ChatScreen(props: ChatScreenProps): React.ReactElement {
  return (
    <ChatSafeAreaProvider>
      <ChatScreenInner {...props} />
    </ChatSafeAreaProvider>
  );
}

function ChatScreenInner(props: ChatScreenProps): React.ReactElement {
  const {
    theme: themeOverrides,
    showClose = true,
    onClose,
    placeholder,
    title,
    renderMessage,
    onAttachmentPress,
    topInset,
    bottomInset,
  } = props;

  const client = useTeletype();
  const state = useTeletypeState();
  const strings = useTeletypeStrings();
  const language = useLocale();
  const insets = useChatSafeAreaInsets();
  const [pendingFile, setPendingFile] = useState<PickedAttachment | null>(null);

  const handleAttachment = async () => {
    if (!onAttachmentPress) {
      return;
    }
    const result = await onAttachmentPress();
    const file = asPickedAttachment(result);
    if (file) {
      Keyboard.dismiss();
      setPendingFile(file);
    }
  };

  const theme = useMemo(
    () => mergeTheme(themeOverrides, state.primaryColor),
    [themeOverrides, state.primaryColor],
  );

  const headerTitle =
    typeof title === 'string'
      ? title
      : typeof state.title === 'string'
        ? state.title
        : '';
  const paddingTop = 12 + (topInset ?? insets.top);
  const paddingBottom = bottomInset ?? insets.bottom;
  const keyboardOverlap = useAndroidKeyboardOverlap();
  // Android edge-to-edge ignores adjustResize, so the IME overlays the
  // composer unless we lift the screen by the uncovered keyboard overlap.
  // When the keyboard is open it covers the nav bar — drop that inset.
  const composerBottomInset = keyboardOverlap > 0 ? 0 : paddingBottom;

  const handleRate = (value: ConversationRating, tempId: string) =>
    client.rateAppeal(value, tempId);

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.backgroundColor,
          paddingBottom: keyboardOverlap,
        },
      ]}
    >
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        <View
          style={[
            styles.header,
            { backgroundColor: theme.primaryColor, paddingTop },
          ]}
        >
          {showClose ? (
            <TouchableOpacity
              onPress={() => (onClose ? onClose() : client.hide())}
              style={styles.backButton}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              accessibilityRole="button"
              accessibilityLabel="Back"
            >
              <Text style={[styles.backIcon, { color: theme.headerTextColor }]}>
                ‹
              </Text>
            </TouchableOpacity>
          ) : null}
          <Text
            numberOfLines={1}
            style={[styles.headerTitle, { color: theme.headerTextColor }]}
          >
            {headerTitle}
          </Text>
        </View>

        <MessageList
          messages={state.messages}
          theme={theme}
          strings={strings}
          language={language}
          chatBackground={state.chatBackground}
          operatorTyping={state.operatorTyping}
          onRate={handleRate}
          onRetry={(tempId) => client.retryMessage(tempId)}
          renderMessage={renderMessage}
        />

        <Composer
          theme={theme}
          placeholder={placeholder ?? strings.composerPlaceholder}
          value={state.draft || undefined}
          onChangeText={(t) => client.setMessage(t)}
          onSend={(text) => {
            client.sendMessage(text);
            client.setMessage('');
          }}
          onTyping={(t) => client.startTyping(t)}
          onStopTyping={() => client.stopTyping()}
          onAttachmentPress={onAttachmentPress ? handleAttachment : undefined}
          bottomInset={composerBottomInset}
        />
      </KeyboardAvoidingView>

      {pendingFile ? (
        <ModalSendFile
          file={pendingFile}
          theme={theme}
          strings={strings}
          onClose={() => setPendingFile(null)}
          onSend={(picked) => {
            setPendingFile(null);
            void client.uploadFile(picked).catch(() => {
              // Failure is already written onto the preview message.
            });
          }}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingBottom: 12,
    minHeight: 52,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backIcon: { fontSize: 38, fontWeight: '300', lineHeight: 40, marginTop: -3 },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    marginLeft: 2,
  },
});
