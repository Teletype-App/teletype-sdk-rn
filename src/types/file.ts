import { MessageType } from './message';

/**
 * A local file picked on the device. Follows the React Native FormData
 * convention (`{ uri, name, type }`) plus an optional size in bytes.
 */
export interface LocalFile {
  uri: string;
  name: string;
  type: string;
  size?: number;
  width?: number;
  height?: number;
  /** Generated image cover for a video (not the video file itself). */
  previewUri?: string;
}

/**
 * Result of a successful `POST widget-attachment/<channel_id>` upload,
 * ready to be sent as a chat message via `sendAttachment`.
 */
export interface UploadedAttachment {
  attachment: string;
  attachmentId: string;
  attachmentUrl: string;
  type: MessageType;
  width?: number;
  height?: number;
  size?: number;
}
