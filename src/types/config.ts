import { Operator } from './operator';

export interface InvitationCondition {
  condition: string;
  conditionAction: string;
  target?: string;
}

export interface InvitationRules {
  messages?: Array<Record<string, unknown>>;
  conditions?: Array<InvitationCondition>;
  index?: number;
  shown?: boolean;
  iteration?: number;
  isEnabled: string | boolean;
}

export interface ChannelMessenger {
  id?: string;
  name: string;
  desktopUrl?: string;
  mobileUrl?: string;
  [key: string]: string | undefined;
}

export interface WorkRange {
  day: string;
  from: string;
  to: string;
}

export interface WidgetConfigData {
  name: string;
  projectName: string;
  projectId: string;
  language: string | null;
  backgroundColor: string | null;
  backgroundImage: string | null;
  position: string | null;
  enabledChat: boolean;
  soundEnabled?: boolean;
  pro?: {
    paidTariff: boolean;
    paidLinkDisable: boolean;
  };
  operators: Operator[];
  channels: ChannelMessenger[];
  rules: InvitationRules[];
  workRange?: WorkRange[];
  holidays?: unknown[];
  timezone?: string;
  showLink: boolean;
  buttonTextEnabled?: boolean;
}

export interface ApiEnvelope<T> {
  success: boolean;
  error: Array<string>;
  data: T;
  datetime?: string;
}

export type ConfigResponse = ApiEnvelope<WidgetConfigData>;
export type HistoryResponse = ApiEnvelope<import('./message').Message[]>;
export type UploadFileResponse = ApiEnvelope<{
  attachment?: string;
  attachmentId?: string;
  attachmentUrl?: string;
  [key: string]: unknown;
}> & { errors?: unknown };
