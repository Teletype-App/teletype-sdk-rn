export { ChatWidget } from './ChatWidget';
export type { ChatWidgetProps } from './ChatWidget';
export { ChatScreen } from './ChatScreen';
export type { ChatScreenProps } from './ChatScreen';
export { ChatButton, CHAT_BUTTON_SCALES, DEFAULT_BUTTON_COLOR } from './ChatButton';
export type {
  ChatButtonProps,
  ChatButtonScale,
  ChatButtonPosition,
} from './ChatButton';
export { ChatButtonSvg } from './svg';
export type { ChatButtonSvgProps } from './svg';
export { MessageList } from './MessageList';
export { ScrollButton } from './ScrollButton';
export type { ScrollButtonProps } from './ScrollButton';
export { MessageBubble } from './MessageBubble';
export { Composer } from './Composer';
export { TypingIndicator } from './TypingIndicator';
export { OperatorsHeader } from './OperatorsHeader';
export { ChatSafeAreaProvider, useChatSafeAreaInsets } from './safeArea';
export type { EdgeInsets } from './safeArea';
export { defaultTheme, mergeTheme } from './theme';
export type { TeletypeTheme } from './theme';
export {
  CHAT_BACKGROUNDS,
  CHAT_BACKGROUND_SOURCES,
  CHAT_BACKGROUND_THUMBS,
  CHAT_BACKGROUND_PICKER,
  DEFAULT_CHAT_BACKGROUND,
  chatBackgroundSource,
  isChatBackground,
} from './backgrounds';
export type { ChatBackground } from './backgrounds';
export { ModalSendFile } from './ModalSendFile';
export type { PickedAttachment } from './attachments';
export {
  MessageTypeImage,
  MessageTypeVideo,
  MessageTypeAudio,
  MessageTypeFile,
  MediaControl,
  ensureCachedFile,
  getCachedFilePath,
  saveFileToDevice,
  openWithSystemApp,
  canDownloadLocally,
  resolveMediaKind,
  formatDuration,
  getExt,
  attachmentUrl,
  attachmentName,
} from './media';
export type { MediaKind } from './media';
// `formatBytes` is already exported from `./core` — re-export the media copy
// under a distinct name only if a consumer needs the UI helper.
