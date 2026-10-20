import type {
  ParentUser,
  ChildProfile,
  ChildLearningData,
  ActivityLogRecord,
} from '../types/auth';

const STORAGE_KEYS = {
  USERS: 'dysleximate_demo_parents_v2',
  PROFILES: 'dysleximate_demo_profiles_v1',
  PROGRESS: 'dysleximate_demo_progress_v1',
  ACTIVITIES: 'dysleximate_demo_activities_v1',
  SESSION: 'dysleximate_demo_session_v1',
};

// Internal interface for stored user with password & PIN hashes (never plaintext)
export interface StoredParentUser extends ParentUser {
  passwordHash: string;
  pinHash?: string;
  failedPinAttempts?: number;
  pinLockoutUntil?: number; // timestamp in ms
}

// Simulated password hasher using Web Crypto SHA-256 with distinct salt
export async function hashPassword(password: string): Promise<string> {
  const salt = 'dysleximate_demo_salt_2026';
  const encoder = new TextEncoder();
  const data = encoder.encode(password + salt);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Simulated PIN hasher using Web Crypto SHA-256 with dedicated salt
export async function hashPin(pin: string): Promise<string> {
  const salt = 'dysleximate_pin_salt_secure_2026';
  const encoder = new TextEncoder();
  const data = encoder.encode(pin + salt);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export class StorageService {
  private static instance: StorageService;

  private constructor() {
    this.seedInitialDemoData();
  }

  public static getInstance(): StorageService {
    if (!StorageService.instance) {
      StorageService.instance = new StorageService();
    }
    return StorageService.instance;
  }

  private async seedInitialDemoData(): Promise<void> {
    const existingUsers = this.getRawUsers();
    if (existingUsers.length === 0) {
      const demoHash = await hashPassword('Password123!');
      const demoPinHash = await hashPin('1234');

      const defaultParent: StoredParentUser = {
        id: 'parent-demo-1',
        fullName: 'Sunita Sharma',
        email: 'parent@dysleximate.demo',
        passwordHash: demoHash,
        pinHash: demoPinHash,
        hasPin: true,
        failedPinAttempts: 0,
        termsAccepted: true,
        createdAt: new Date().toISOString(),
      };
      this.saveRawUsers([defaultParent]);

      const defaultChildren: ChildProfile[] = [
        {
          id: 'child-aanya-1',
          parentId: 'parent-demo-1',
          name: 'Aanya Sharma',
          grade: 'Class 4 · Little reader',
          preferredLanguage: 'English',
          avatar: '👧🏽',
          preferences: {
            readingSpeed: 'normal',
            dyslexiaFont: false,
            highContrast: false,
            soundEffects: true,
            autoReadAloud: false,
          },
          createdAt: new Date().toISOString(),
        },
        {
          id: 'child-kabir-2',
          parentId: 'parent-demo-1',
          name: 'Kabir Sharma',
          grade: 'Class 2 · Early reader',
          preferredLanguage: 'Hindi',
          avatar: '👦🏻',
          preferences: {
            readingSpeed: 'slow',
            dyslexiaFont: true,
            highContrast: false,
            soundEffects: true,
            autoReadAloud: true,
          },
          createdAt: new Date().toISOString(),
        },
      ];
      this.saveRawProfiles(defaultChildren);

      const defaultProgressMap: Record<string, ChildLearningData> = {
        'child-aanya-1': {
          childId: 'child-aanya-1',
          practiceMinutes: 42,
          wordsLearned: 28,
          fluencyWpm: 36,
          accuracyPercent: 78,
          happyPoints: 240,
          streakDays: 4,
          practiceWins: 6,
          mistakes: [
            { word: 'b / d', note: 'Letter mix-ups (Try the mirror game)', count: 4 },
            { word: 'ship', note: 'Sounding out "sh" (Listen, then say it)', count: 3 },
            { word: 'plant', note: 'Blending sounds (Break it into parts)', count: 2 },
          ],
          recentActivities: [
            { id: 'act-1', title: 'Letter mirror: b and d', subtitle: 'Spot the difference · 3 min', tag: 'Easy', icon: '🔤', bg: '#fff1d2' },
            { id: 'act-2', title: "Listen & read: Sunny's kite", subtitle: 'Read-aloud story · 5 min', tag: 'Story', icon: '🎧', bg: '#e8f3ff' },
            { id: 'act-3', title: 'Say it, spell it!', subtitle: 'Voice spelling · 2 min', tag: 'Play', icon: '🗣️', bg: '#f3edff' },
          ],
          weeklyAccuracy: [55, 62, 68, 70, 75, 76, 82],
        },
        'child-kabir-2': {
          childId: 'child-kabir-2',
          practiceMinutes: 25,
          wordsLearned: 16,
          fluencyWpm: 24,
          accuracyPercent: 72,
          happyPoints: 180,
          streakDays: 2,
          practiceWins: 3,
          mistakes: [
            { word: 'घर / पर', note: 'Rhyming confusion', count: 3 },
            { word: 'किताब', note: 'Beginning vowel sounds', count: 2 },
          ],
          recentActivities: [
            { id: 'act-4', title: 'हिन्दी शब्द मिलान (Hindi Word Match)', subtitle: 'Picture match · 4 min', tag: 'Fun', icon: '🎨', bg: '#fff1d2' },
            { id: 'act-5', title: 'Elephant Mina story', subtitle: 'Read-along · 5 min', tag: 'Story', icon: '🐘', bg: '#e8f3ff' },
          ],
          weeklyAccuracy: [50, 58, 64, 66, 68, 70, 72],
        },
      };
      this.saveRawProgress(defaultProgressMap);

      // Seed initial realistic activity tracking records for demonstration
      const now = Date.now();
      const sampleActivities: ActivityLogRecord[] = [
        // Today
        {
          id: 'act-log-1',
          parentId: 'parent-demo-1',
          childId: 'child-aanya-1',
          category: 'practice_game',
          activityTitle: 'Picture Word Match: ship',
          startTime: new Date(now - 1000 * 60 * 35).toISOString(),
          endTime: new Date(now - 1000 * 60 * 25).toISOString(),
          durationSeconds: 600, // 10 min
        },
        {
          id: 'act-log-2',
          parentId: 'parent-demo-1',
          childId: 'child-aanya-1',
          category: 'story_reading',
          activityTitle: "Sunny and the little kite",
          startTime: new Date(now - 1000 * 60 * 20).toISOString(),
          endTime: new Date(now - 1000 * 60 * 12).toISOString(),
          durationSeconds: 480, // 8 min
        },
        {
          id: 'act-log-3',
          parentId: 'parent-demo-1',
          childId: 'child-aanya-1',
          category: 'voice_spelling',
          activityTitle: 'Say it, spell it! (Voice practice)',
          startTime: new Date(now - 1000 * 60 * 10).toISOString(),
          endTime: new Date(now - 1000 * 60 * 6).toISOString(),
          durationSeconds: 240, // 4 min
        },
        // Yesterday (1 day ago)
        {
          id: 'act-log-4',
          parentId: 'parent-demo-1',
          childId: 'child-aanya-1',
          category: 'letter_mirror',
          activityTitle: 'Letter mirror: b and d',
          startTime: new Date(now - 1000 * 60 * 60 * 25).toISOString(),
          endTime: new Date(now - 1000 * 60 * 60 * 25 + 1000 * 300).toISOString(),
          durationSeconds: 300, // 5 min
        },
        {
          id: 'act-log-5',
          parentId: 'parent-demo-1',
          childId: 'child-aanya-1',
          category: 'story_reading',
          activityTitle: 'Mina and the river',
          startTime: new Date(now - 1000 * 60 * 60 * 24).toISOString(),
          endTime: new Date(now - 1000 * 60 * 60 * 24 + 1000 * 420).toISOString(),
          durationSeconds: 420, // 7 min
        },
        // 3 days ago
        {
          id: 'act-log-6',
          parentId: 'parent-demo-1',
          childId: 'child-aanya-1',
          category: 'practice_game',
          activityTitle: 'Picture Word Match: tree & dish',
          startTime: new Date(now - 1000 * 60 * 60 * 72).toISOString(),
          endTime: new Date(now - 1000 * 60 * 60 * 72 + 1000 * 480).toISOString(),
          durationSeconds: 480, // 8 min
        },
        // Kabir's activity
        {
          id: 'act-log-7',
          parentId: 'parent-demo-1',
          childId: 'child-kabir-2',
          category: 'practice_game',
          activityTitle: 'हिन्दी शब्द मिलान (नाव, घर, फल)',
          startTime: new Date(now - 1000 * 60 * 50).toISOString(),
          endTime: new Date(now - 1000 * 60 * 40).toISOString(),
          durationSeconds: 600, // 10 min
        },
        {
          id: 'act-log-8',
          parentId: 'parent-demo-1',
          childId: 'child-kabir-2',
          category: 'story_reading',
          activityTitle: 'Mina and the river (Hindi Read-along)',
          startTime: new Date(now - 1000 * 60 * 30).toISOString(),
          endTime: new Date(now - 1000 * 60 * 25).toISOString(),
          durationSeconds: 300, // 5 min
        },
      ];
      this.saveRawActivities(sampleActivities);
    }
  }

  // --- Users ---
  public getRawUsers(): StoredParentUser[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.USERS);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  public saveRawUsers(users: StoredParentUser[]): void {
    try {
      localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
    } catch (e) {
      console.warn('LocalStorage save failed:', e);
    }
  }

  // --- Profiles ---
  public getRawProfiles(): ChildProfile[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.PROFILES);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  public saveRawProfiles(profiles: ChildProfile[]): void {
    try {
      localStorage.setItem(STORAGE_KEYS.PROFILES, JSON.stringify(profiles));
    } catch (e) {
      console.warn('LocalStorage save failed:', e);
    }
  }

  // --- Progress ---
  public getRawProgress(): Record<string, ChildLearningData> {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.PROGRESS);
      return data ? JSON.parse(data) : {};
    } catch {
      return {};
    }
  }

  public saveRawProgress(progressMap: Record<string, ChildLearningData>): void {
    try {
      localStorage.setItem(STORAGE_KEYS.PROGRESS, JSON.stringify(progressMap));
    } catch (e) {
      console.warn('LocalStorage save failed:', e);
    }
  }

  // --- Activities ---
  public getRawActivities(): ActivityLogRecord[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.ACTIVITIES);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  public saveRawActivities(activities: ActivityLogRecord[]): void {
    try {
      localStorage.setItem(STORAGE_KEYS.ACTIVITIES, JSON.stringify(activities));
    } catch (e) {
      console.warn('LocalStorage save failed:', e);
    }
  }

  public saveActivity(record: ActivityLogRecord): void {
    const list = this.getRawActivities();
    list.push(record);
    this.saveRawActivities(list);
  }

  public getActivitiesForChild(childId: string): ActivityLogRecord[] {
    const list = this.getRawActivities();
    return list.filter(a => a.childId === childId);
  }

  // --- Session ---
  public getSession(): { userId: string | null; activeChildId: string | null } {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.SESSION);
      return data ? JSON.parse(data) : { userId: null, activeChildId: null };
    } catch {
      return { userId: null, activeChildId: null };
    }
  }

  public saveSession(userId: string | null, activeChildId: string | null): void {
    try {
      localStorage.setItem(STORAGE_KEYS.SESSION, JSON.stringify({ userId, activeChildId }));
    } catch (e) {
      console.warn('LocalStorage save failed:', e);
    }
  }

  public clearSession(): void {
    try {
      localStorage.removeItem(STORAGE_KEYS.SESSION);
    } catch (e) {
      console.warn('LocalStorage clear failed:', e);
    }
  }
}
