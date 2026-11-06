import { Operator } from './operator';

export type MessageType =
  | 'text'
  | 'typing'
  | 'attachment'
  | 'image'
  | 'gif'
  | 'audio'
  | 'video';

export type MessageStatus = 'sending' | 'sent' | 'failed';

export type FormType =
  | 'rating'
  | 'boolean'
  | 'faq'
  | 'input'
  | 'contact'
  | 'contactButtons';

export enum ConversationRating {
  UNSATISFACTORY = '10',
  BAD = '20',
  SATISFACTORY = '30',
  GOOD = '40',
  EXCELLENT = '50',
}

export interface DateObject {
  date: string;
  timezone: string;
}

export interface BotButton {
  label: string;
  value: string;
}

export interface ContactForm {
  method: 'phone' | 'email';
  value?: string;
  valid?: boolean;
  placeholder?: string;
}

export interface MessageFrom {
  avatar?: string;
  avatarDefault?: string;
  id?: string;
  isOnline?: boolean;
  isOperator?: boolean;
  messenger?: string;
  name?: string;
}

/**
 * A single chat message. Mirrors the shape used by the Teletype web widget so
 * the same backend payloads can be consumed without transformation.
 */
export interface Message {
  /** Server-assigned id. Absent while the message is still pending. */
  id?: string;
  /** Client-generated temporary id used to reconcile the `received` ack. */
  tempId: string;
  appealId?: string;

  message?: string;
  originalMessage?: string;

  attachment?: string;
  attachmentUrl?: string;
  attachmentPreviewUrl?: string;
  attachmentId?: string;

  isOwn?: boolean;
  date?: DateObject;
  dateToDisplay?: string;

  avatar?: string;
  avatarDefault?: string;

  messageType?: MessageType;
  emojiOnly?: boolean;
  progress?: number;

  buttons?: (BotButton | BotButton[])[];

  isForm?: boolean;
  formId?: string;
  formType?: FormType;
  ratingValue?: ConversationRating;
  contactForm?: ContactForm;

  operator?: Operator;
  from?: MessageFrom;

  fromInvite?: boolean;
  serviceMessage?: boolean;

  errorMessage?: string;
  width?: number;
  height?: number;

  unread?: boolean;
  seen?: boolean;
  status?: MessageStatus;
  size?: number;
  cited?: unknown;
}
