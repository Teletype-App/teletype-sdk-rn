import React, { useRef } from 'react';
import { FlatList, StyleSheet, View, ListRenderItemInfo } from 'react-native';
import { Message, ConversationRating } from '../types/message';
import { MessageBubble } from './MessageBubble';
import { TypingIndicator } from './TypingIndicator';
import { TeletypeTheme } from './theme';
import { TeletypeStrings } from '../i18n/strings';

interface Props {
  messages: Message[];
  theme: TeletypeTheme;
  strings: TeletypeStrings;
  language: string;
  operatorTyping?: boolean;
  onRate?: (value: ConversationRating, tempId: string) => void;
  onRetry?: (tempId: string) => void;
  renderMessage?: (message: Message) => React.ReactElement | null;
}

export function MessageList({
  messages,
  theme,
  strings,
  language,
  operatorTyping,
  onRate,
  onRetry,
  renderMessage,
}: Props): React.ReactElement {
  const listRef = useRef<FlatList<Message>>(null);

  const renderItem = ({ item }: ListRenderItemInfo<Message>) => {
    if (renderMessage) {
      return renderMessage(item);
    }
    return (
      <MessageBubble
        message={item}
        theme={theme}
        strings={strings}
        language={language}
        onRate={onRate}
        onRetry={onRetry}
      />
    );
  };

  return (
    <FlatList
      ref={listRef}
      style={[styles.list, { backgroundColor: theme.backgroundColor }]}
      contentContainerStyle={styles.content}
      data={messages}
      keyExtractor={(item, index) => item.id || item.tempId || String(index)}
      renderItem={renderItem}
      onContentSizeChange={() =>
        listRef.current?.scrollToEnd({ animated: true })
      }
      ListFooterComponent={
        operatorTyping ? (
          <View style={styles.footer}>
            <TypingIndicator theme={theme} />
          </View>
        ) : null
      }
      keyboardShouldPersistTaps="handled"
    />
  );
}

const styles = StyleSheet.create({
  list: { flex: 1 },
  content: { paddingBottom: 10 },
  footer: { paddingBottom: 6 },
});
