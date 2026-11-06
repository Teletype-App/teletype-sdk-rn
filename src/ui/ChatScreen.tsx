import React, { useMemo } from 'react';
import {
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
import { useChatSafeAreaInsets } from './safeArea';

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
  /** Called when the composer attachment button is pressed. */
  onAttachmentPress?: () => void | Promise<void>;
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

/**
 * Full-screen chat surface. Drop it into any screen/modal. Reads everything
 * from the surrounding `<TeletypeProvider>`.
 *
 * Prefer wrapping with `<ChatSafeAreaProvider>` (done automatically by
 * `<ChatWidget>`) so notch / home-indicator insets are applied correctly.
 */
export function ChatScreen(props: ChatScreenProps): React.ReactElement {
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

  const theme = useMemo(
    () => mergeTheme(themeOverrides, state.primaryColor),
    [themeOverrides, state.primaryColor],
  );

  const headerTitle = title ?? state.title;
  const paddingTop = 12 + (topInset ?? insets.top);
  const paddingBottom = bottomInset ?? insets.bottom;

  const handleRate = (value: ConversationRating, tempId: string) =>
    client.rateAppeal(value, tempId);

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.backgroundColor }]}
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
        onAttachmentPress={onAttachmentPress}
        bottomInset={paddingBottom}
      />
    </KeyboardAvoidingView>
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
