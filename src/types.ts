export type PageKey = 'overview' | 'accessibility' | 'communication' | 'ai' | 'handtalk' | 'reports' | 'profile';
export type ColorVision = 'normal' | 'protanopia' | 'deuteranopia' | 'tritanopia';

export interface AccessibilityPrefs {
  highContrast: boolean;
  largeText: boolean;
  largeTargets: boolean;
  reduceMotion: boolean;
  calmMode: boolean;
  elderlyMode: boolean;
  captions: boolean;
  voiceReading: boolean;
  simpleLanguage: boolean;
  soundEnabled: boolean;
  advanceNotices: boolean;
  colorVision: ColorVision;
}

export interface ActivityItem {
  id: string;
  title: string;
  area: string;
  time: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  time: string;
}
