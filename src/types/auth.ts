// Types for DyslexiMate Authentication & Child Profile Management

export type SupportedLanguage = 'English' | 'Hindi' | 'Odia' | 'Punjabi' | 'Tamil' | 'Bengali';
export type AppLanguageCode = 'en' | 'hi' | 'or' | 'pa' | 'ta';

export interface ReadingPreferences {
  readingSpeed: 'slow' | 'normal' | 'fast';
  dyslexiaFont: boolean;
  highContrast: boolean;
  soundEffects: boolean;
  autoReadAloud: boolean;
}

export interface ChildProfile {
  id: string;
  parentId: string;
  name: string;
  grade: string;
  preferredLanguage: SupportedLanguage;
  avatar: string;
  preferences: ReadingPreferences;
  createdAt: string;
}

export interface ChildMistake {
  word: string;
  note: string;
  count: number;
}

export interface ChildActivity {
  id: string;
  title: string;
  subtitle: string;
  tag: string;
  icon: string;
  bg: string;
}

export interface ChildLearningData {
  childId: string;
  practiceMinutes: number;
  wordsLearned: number;
  fluencyWpm: number;
  accuracyPercent: number;
  happyPoints: number;
  streakDays: number;
  practiceWins: number;
  mistakes: ChildMistake[];
  recentActivities: ChildActivity[];
  weeklyAccuracy: number[]; // 7 days Mon-Sun (e.g. [55, 62, 68, 70, 75, 76, 82])
}

export interface ParentUser {
  id: string;
  fullName: string;
  email: string;
  hasPin: boolean; // Indicates if parent has set up a 4-digit PIN
  termsAccepted: boolean;
  interfaceLanguage?: AppLanguageCode;
  createdAt: string;
}

export type ActivityCategory =
  | 'practice_game'
  | 'voice_spelling'
  | 'story_reading'
  | 'letter_mirror'
  | 'general_learning';

export interface ActivityLogRecord {
  id: string;
  parentId: string;
  childId: string;
  category: ActivityCategory;
  activityTitle: string;
  startTime: string; // ISO date string
  endTime: string;   // ISO date string
  durationSeconds: number;
}

export interface ActivitySummaryReport {
  childId: string;
  childName: string;
  period: 'today' | '7days' | '30days';
  totalActiveSeconds: number;
  totalSessions: number;
  averageSessionSeconds: number;
  mostUsedActivity: string;
  lastActivityTime: string | null;
  categoryBreakdown: Record<ActivityCategory, { seconds: number; sessions: number }>;
  dailyBreakdown: Array<{ date: string; dayLabel: string; seconds: number }>;
}

export interface AuthSession {
  user: ParentUser | null;
  activeChild: ChildProfile | null;
  mode: 'demo' | 'production';
  token?: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  fullName: string;
  email: string;
  password: string;
  confirmPassword: string;
  acceptTerms: boolean;
  interfaceLanguage?: AppLanguageCode;
  initialChild?: {
    name: string;
    grade: string;
    preferredLanguage: SupportedLanguage;
    avatar: string;
  };
}

export interface AuthResponse {
  success: boolean;
  user?: ParentUser;
  error?: string;
  message?: string;
}

