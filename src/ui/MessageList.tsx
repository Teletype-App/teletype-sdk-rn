import React, { useEffect, useRef, useState } from 'react';
import {
  FlatList,
  ImageBackground,
  Keyboard,
  NativeScrollEvent,
  NativeSyntheticEvent,
  StyleSheet,
  Text,
  View,
  ListRenderItemInfo,
} from 'react-native';
import { Message, ConversationRating } from '../types/message';
import { ChatBackground } from '../types/appearance';
import { MessageBubble } from './MessageBubble';
import { TypingIndicator } from './TypingIndicator';
import { TeletypeTheme } from './theme';
import { TeletypeStrings } from '../i18n/strings';
import { ScrollButton } from './ScrollButton';
import { Icon, Icons } from './icons';
import { chatBackgroundSource } from './backgrounds';

interface Props {
  messages: Message[];
  theme: TeletypeTheme;
  strings: TeletypeStrings;
  language: string;
  chatBackground?: ChatBackground;
  operatorTyping?: boolean;
  onRate?: (value: ConversationRating, tempId: string) => void;
  onRetry?: (tempId: string) => void;
  renderMessage?: (message: Message) => React.ReactElement | null;
}

const NEAR_BOTTOM = 200;

/**
 * Chat transcript. Scroll-to-bottom chevron matches teletype-mobile
 * `ChatBoxMiddle` + `ScrollButton`: hide near the latest messages or when
 * scrolling to older ones; show while heading back down. A badge counts
 * inbound messages that arrived while the user was scrolled away.
 */
export function MessageList({
  messages,
  theme,
  strings,
  language,
  chatBackground = 'white',
  operatorTyping,
  onRate,
  onRetry,
  renderMessage,
}: Props): React.ReactElement {
  const listRef = useRef<FlatList<Message>>(null);
  const offsetRef = useRef(0);
  const nearBottomRef = useRef(true);
  const prevLengthRef = useRef(messages.length);
  const [scrollDirection, setScrollDirection] = useState<'up' | 'down' | null>(
    null,
  );
  const [newIncoming, setNewIncoming] = useState(0);

  const scrollToBottom = () => {
    setNewIncoming(0);
    nearBottomRef.current = true;
    setScrollDirection('down');
    listRef.current?.scrollToEnd({ animated: true });
  };

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset, layoutMeasurement, contentSize } = event.nativeEvent;
    const offsetY = contentOffset.y;
    const distanceFromEnd =
      contentSize.height - layoutMeasurement.height - offsetY;

    if (distanceFromEnd <= NEAR_BOTTOM) {
      setScrollDirection('down');
      nearBottomRef.current = true;
      setNewIncoming(0);
    } else if (offsetY > offsetRef.current) {
      setScrollDirection('up');
      nearBottomRef.current = false;
    } else if (offsetY < offsetRef.current) {
      setScrollDirection('down');
      nearBottomRef.current = false;
    }
    offsetRef.current = offsetY;
  };

  useEffect(() => {
    const prev = prevLengthRef.current;
    prevLengthRef.current = messages.length;
    if (messages.length <= prev) {
      return;
    }
    const added = messages.slice(prev);
    const last = messages[messages.length - 1];
    if (last?.isOwn || nearBottomRef.current) {
      setNewIncoming(0);
      requestAnimationFrame(() => {
        listRef.current?.scrollToEnd({ animated: true });
      });
      return;
    }
    const incoming = added.filter((m) => !m.isOwn).length;
    if (incoming > 0) {
      setNewIncoming((n) => n + incoming);
    }
  }, [messages]);

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

  const pattern = chatBackgroundSource(chatBackground);
  const listBg = pattern ? 'transparent' : '#ffffff';

  return (
    <View style={[styles.container, { backgroundColor: listBg }]}>
      {pattern ? (
        <ImageBackground
          source={pattern}
          style={StyleSheet.absoluteFill}
          imageStyle={styles.backgroundImage}
          resizeMode="cover"
        />
      ) : null}
      <FlatList
        ref={listRef}
        style={[styles.list, { backgroundColor: listBg }]}
        contentContainerStyle={styles.content}
        data={messages}
        keyExtractor={(item, index) => item.id || item.tempId || String(index)}
        renderItem={renderItem}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        onScrollBeginDrag={() => Keyboard.dismiss()}
        keyboardShouldPersistTaps="handled"
        ListFooterComponent={
          operatorTyping ? (
            <View style={styles.footer}>
              <TypingIndicator theme={theme} />
            </View>
          ) : null
        }
      />

      <View style={styles.scrollButtonWrap} pointerEvents="box-none">
        {newIncoming > 0 ? (
          <View
            style={styles.scrollButtonBadge}
          >
            <Text style={styles.scrollButtonBadgeText} numberOfLines={1}>
              {newIncoming > 99 ? '99+' : newIncoming}
            </Text>
          </View>
        ) : null}
        <ScrollButton
          action={scrollToBottom}
          direct={scrollDirection}
          forceVisible={newIncoming > 0}
          style={styles.scrollButtonPos}
          bColor="#f7f7f7d9"
          buttonContent={
            <Icon
              name="chevron-down"
              type={Icons.Octicons}
              size={22}
              color="#00000054"
              fallback="▾"
            />
          }
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
  },
  backgroundImage: {
    width: '100%',
    height: '100%',
    transform: [{ scale: 1.05 }],
  },
  list: { flex: 1 },
  content: { paddingBottom: 10 },
  footer: { paddingBottom: 6 },
  scrollButtonWrap: {
    position: 'absolute',
    right: 20,
    bottom: 15,
    width: 38,
    height: 38,
  },
  scrollButtonPos: {
    right: 0,
    bottom: 0,
  },
  scrollButtonBadge: {
    position: 'absolute',
    top: -7,
    right: -7,
    zIndex: 1,
    minWidth: 20,
    height: 20,
    paddingHorizontal: 5,
    backgroundColor: '#0A86F9',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
  },
  scrollButtonBadgeText: {
    fontSize: 12,
    lineHeight: 14,
    fontWeight: '500',
    color: '#fff',
  },
});
