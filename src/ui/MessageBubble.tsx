import React from 'react';
import {
  Image,
  Linking,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Message, ConversationRating } from '../types/message';
import { TeletypeTheme } from './theme';
import { TeletypeStrings } from '../i18n/strings';
import { formatRelativeTime } from '../i18n/time';
import { extractUrls } from '../core/utils';
import {
  MessageTypeAudio,
  MessageTypeFile,
  MessageTypeImage,
  MessageTypeVideo,
  resolveMediaKind,
} from './media';

interface Props {
  message: Message;
  theme: TeletypeTheme;
  strings: TeletypeStrings;
  language: string;
  onRate?: (value: ConversationRating, tempId: string) => void;
  onRetry?: (tempId: string) => void;
}

const RATINGS: Array<{ value: ConversationRating; emoji: string }> = [
  { value: ConversationRating.UNSATISFACTORY, emoji: '😡' },
  { value: ConversationRating.BAD, emoji: '🙁' },
  { value: ConversationRating.SATISFACTORY, emoji: '😐' },
  { value: ConversationRating.GOOD, emoji: '🙂' },
  { value: ConversationRating.EXCELLENT, emoji: '😍' },
];

const TAIL_RADIUS = 6;

function Linkified({
  text,
  color,
}: {
  text: string;
  color: string;
}): React.ReactElement {
  const urls = extractUrls(text);
  if (urls.length === 0) {
    return <Text style={{ color }}>{text}</Text>;
  }
  const parts: React.ReactNode[] = [];
  let rest = text;
  urls.forEach((u, i) => {
    const idx = rest.indexOf(u.url);
    if (idx > 0) {
      parts.push(<Text key={`t${i}`}>{rest.slice(0, idx)}</Text>);
    }
    parts.push(
      <Text
        key={`l${i}`}
        style={styles.link}
        onPress={() => Linking.openURL(u.url).catch(() => undefined)}
      >
        {u.url}
      </Text>,
    );
    rest = rest.slice(idx + u.url.length);
  });
  if (rest) {
    parts.push(<Text key="tail">{rest}</Text>);
  }
  return <Text style={{ color }}>{parts}</Text>;
}

export function MessageBubble({
  message,
  theme,
  strings,
  language,
  onRate,
  onRetry,
}: Props): React.ReactElement | null {
  const isOwn = !!message.isOwn;

  // Rating form
  if (message.formType === 'rating') {
    return (
      <View style={[styles.row, styles.rowLeft]}>
        <View
          style={[
            styles.bubble,
            styles.formBubble,
            {
              backgroundColor: theme.operatorBubbleColor,
              borderRadius: theme.bubbleRadius,
            },
          ]}
        >
          <Text style={[styles.formTitle, { color: theme.operatorTextColor }]}>
            {strings.ratingTitle}
          </Text>
          <View style={styles.ratingRow}>
            {RATINGS.map((r) => (
              <TouchableOpacity
                key={r.value}
                disabled={!!message.ratingValue}
                onPress={() => onRate?.(r.value, message.tempId)}
                style={[
                  styles.ratingItem,
                  message.ratingValue === r.value && {
                    backgroundColor: theme.primaryColor,
                  },
                ]}
              >
                <Text style={styles.ratingEmoji}>{r.emoji}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>
    );
  }

  const mediaKind = resolveMediaKind(message);
  const isMedia = mediaKind != null;
  const isVisualMedia = mediaKind === 'image' || mediaKind === 'video';

  const bubbleColor = isOwn ? theme.ownBubbleColor : theme.operatorBubbleColor;
  const textColor = isOwn ? theme.ownTextColor : theme.operatorTextColor;
  const emojiOnly = message.emojiOnly && message.messageType === 'text';

  const time = formatRelativeTime(message.date?.date, language, strings);
  const statusLabel = (): string => {
    if (!isOwn) {
      return time;
    }
    if (message.errorMessage) {
      if (message.errorMessage === 'fileSizeError') {
        return strings.fileSizeError;
      }
      if (message.errorMessage === 'fileFormatNotAllowed') {
        return strings.fileFormatNotAllowed;
      }
      return strings.uploadFailed;
    }
    if (
      typeof message.progress === 'number' &&
      message.progress < 100 &&
      !message.errorMessage
    ) {
      return `${strings.uploading} (${message.progress}%)`;
    }
    if (message.status === 'sending') {
      return strings.messageSending;
    }
    if (message.status === 'failed') {
      return strings.messageFailed;
    }
    const state = message.seen ? strings.messageSeen : strings.messageDelivered;
    return time ? `${time}. ${state}` : state;
  };
  const failed = isOwn && message.status === 'failed' && !message.errorMessage;
  const uploading =
    isOwn &&
    typeof message.progress === 'number' &&
    message.progress < 100 &&
    !message.errorMessage;

  const tailStyle = emojiOnly || isVisualMedia
    ? null
    : isOwn
      ? { borderBottomRightRadius: TAIL_RADIUS }
      : { borderBottomLeftRadius: TAIL_RADIUS };

  const renderBody = (): React.ReactNode => {
    if (mediaKind === 'image') {
      return (
        <MessageTypeImage
          message={message}
          theme={theme}
          strings={strings}
          isOwn={isOwn}
        />
      );
    }
    if (mediaKind === 'video') {
      return (
        <MessageTypeVideo
          message={message}
          theme={theme}
          strings={strings}
          isOwn={isOwn}
        />
      );
    }
    if (mediaKind === 'audio') {
      return (
        <MessageTypeAudio
          message={message}
          theme={theme}
          strings={strings}
          isOwn={isOwn}
        />
      );
    }
    if (mediaKind === 'file') {
      return (
        <MessageTypeFile
          message={message}
          theme={theme}
          strings={strings}
          isOwn={isOwn}
        />
      );
    }
    if (emojiOnly) {
      return <Text style={styles.emojiText}>{message.message}</Text>;
    }
    return <Linkified text={message.message || ''} color={textColor} />;
  };

  return (
    <View style={[styles.row, isOwn ? styles.rowRight : styles.rowLeft]}>
      {!isOwn && (message.avatar || message.from?.avatar) ? (
        <Image
          source={{ uri: message.avatar || message.from?.avatar }}
          style={styles.avatar}
        />
      ) : (
        !isOwn && <View style={styles.avatarPlaceholder} />
      )}

      <View
        style={[
          styles.bubbleWrap,
          isVisualMedia && styles.bubbleWrapMedia,
          isOwn ? styles.bubbleWrapOwn : styles.bubbleWrapOther,
        ]}
      >
        <View
          style={[
            styles.bubble,
            emojiOnly && styles.emojiBubble,
            isVisualMedia && styles.mediaBubble,
            isMedia && !isVisualMedia && styles.fileBubble,
            {
              backgroundColor:
                emojiOnly || isVisualMedia ? 'transparent' : bubbleColor,
              borderRadius: theme.bubbleRadius,
            },
            tailStyle,
          ]}
        >
          {renderBody()}
          {uploading ? (
            <View style={styles.uploadOverlay} pointerEvents="none">
              <Text style={styles.uploadText}>{`${message.progress}%`}</Text>
            </View>
          ) : null}
        </View>

        <View style={[styles.meta, isOwn ? styles.metaRight : styles.metaLeft]}>
          {failed ? (
            <TouchableOpacity onPress={() => onRetry?.(message.tempId)}>
              <Text style={[styles.metaText, { color: theme.badgeColor }]}>
                {strings.messageFailed}
              </Text>
            </TouchableOpacity>
          ) : (
            <Text style={[styles.metaText, { color: theme.mutedColor }]}>
              {statusLabel()}
            </Text>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    alignSelf: 'stretch',
    width: '100%',
    flexDirection: 'row',
    marginVertical: 5,
    alignItems: 'flex-end',
  },
  rowRight: {
    justifyContent: 'flex-end',
    paddingLeft: 48,
    paddingRight: 8,
  },
  rowLeft: {
    justifyContent: 'flex-start',
    paddingLeft: 12,
    paddingRight: 48,
  },
  bubbleWrap: { maxWidth: '78%' },
  bubbleWrapMedia: { maxWidth: 250 },
  bubbleWrapOwn: { alignItems: 'flex-end' },
  bubbleWrapOther: { alignItems: 'flex-start' },
  bubble: {
    paddingHorizontal: 15,
    paddingVertical: 11,
    overflow: 'hidden',
  },
  mediaBubble: {
    paddingHorizontal: 0,
    paddingVertical: 0,
    overflow: 'hidden',
  },
  fileBubble: {
    paddingHorizontal: 0,
    paddingVertical: 0,
  },
  emojiBubble: { paddingHorizontal: 4, paddingVertical: 2 },
  emojiText: { fontSize: 44 },
  formBubble: { maxWidth: 300 },
  formTitle: { fontSize: 14, fontWeight: '600', marginBottom: 10 },
  ratingRow: { flexDirection: 'row', justifyContent: 'space-between' },
  ratingItem: { padding: 6, borderRadius: 20 },
  ratingEmoji: { fontSize: 26 },
  link: { textDecorationLine: 'underline' },
  avatar: { width: 34, height: 34, borderRadius: 17, marginRight: 8 },
  avatarPlaceholder: { width: 34, height: 34, marginRight: 8 },
  meta: { marginTop: 5, flexDirection: 'row', paddingHorizontal: 4 },
  metaRight: { justifyContent: 'flex-end' },
  metaLeft: { justifyContent: 'flex-start' },
  metaText: { fontSize: 12.5 },
  uploadOverlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: '#00000080',
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
