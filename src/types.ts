export interface DialogItem {
  english: string[];
  korean: string[];
  pattern?: string;
  difficulty?: string;
}

export interface Conversation {
  title: string;
  dialogs: DialogItem[];
}

export type ScreenType = 'HOME' | 'STUDY' | 'SETTINGS';

export interface TopicInfo {
  key: string;
  title: string;
  desc: string;
  icon: string;
  color: string;
}
