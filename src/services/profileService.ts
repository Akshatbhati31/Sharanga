import type {
  ChildProfile,
  ChildLearningData,
} from '../types/auth';
import { StorageService } from './storageService';

export interface IProfileService {
  getChildren(parentId: string): Promise<ChildProfile[]>;
  getChild(id: string): Promise<ChildProfile | null>;
  createChild(
    parentId: string,
    data: Omit<ChildProfile, 'id' | 'parentId' | 'createdAt'>
  ): Promise<ChildProfile>;
  updateChild(id: string, updates: Partial<ChildProfile>): Promise<ChildProfile>;
  deleteChild(id: string): Promise<boolean>;
  getActiveChild(): ChildProfile | null;
  setActiveChild(child: ChildProfile | null): void;
  getChildProgress(childId: string): ChildLearningData;
  updateChildProgress(childId: string, updates: Partial<ChildLearningData>): ChildLearningData;
  onProfileStateChanged(
    listener: (profiles: ChildProfile[], activeChild: ChildProfile | null) => void
  ): () => void;
}

export class ProfileService implements IProfileService {
  private static instance: ProfileService;
  private storage: StorageService;
  private activeChild: ChildProfile | null = null;
  private profileListeners: Array<
    (profiles: ChildProfile[], activeChild: ChildProfile | null) => void
  > = [];

  private constructor() {
    this.storage = StorageService.getInstance();
    this.restoreActiveChild();
  }

  public static getInstance(): ProfileService {
    if (!ProfileService.instance) {
      ProfileService.instance = new ProfileService();
    }
    return ProfileService.instance;
  }

  private restoreActiveChild(): void {
    const session = this.storage.getSession();
    if (session.activeChildId) {
      const profiles = this.storage.getRawProfiles();
      const found = profiles.find(p => p.id === session.activeChildId);
      if (found) {
        this.activeChild = found;
      }
    }
  }

  public onProfileStateChanged(
    listener: (profiles: ChildProfile[], activeChild: ChildProfile | null) => void
  ): () => void {
    this.profileListeners.push(listener);
    const session = this.storage.getSession();
    const profiles = session.userId
      ? this.storage.getRawProfiles().filter(p => p.parentId === session.userId)
      : [];
    listener(profiles, this.activeChild);
    return () => {
      this.profileListeners = this.profileListeners.filter(l => l !== listener);
    };
  }

  private notifyListeners(parentId?: string): void {
    const session = this.storage.getSession();
    const effectiveParentId = parentId || session.userId;
    const profiles = effectiveParentId
      ? this.storage.getRawProfiles().filter(p => p.parentId === effectiveParentId)
      : [];

    for (const listener of this.profileListeners) {
      try {
        listener(profiles, this.activeChild);
      } catch (err) {
        console.error('Error in profile state listener:', err);
      }
    }
  }

  public async getChildren(parentId: string): Promise<ChildProfile[]> {
    // Only return profiles owned by this parent
    const all = this.storage.getRawProfiles();
    return all.filter(p => p.parentId === parentId);
  }

  public async getChild(id: string): Promise<ChildProfile | null> {
    const all = this.storage.getRawProfiles();
    return all.find(p => p.id === id) || null;
  }

  public async createChild(
    parentId: string,
    data: Omit<ChildProfile, 'id' | 'parentId' | 'createdAt'>
  ): Promise<ChildProfile> {
    if (!data.name || data.name.trim().length === 0) {
      throw new Error("Child's name is required.");
    }

    const newChild: ChildProfile = {
      id: 'child-' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6),
      parentId,
      name: data.name.trim(),
      grade: data.grade || 'Class 3 · Growing reader',
      preferredLanguage: data.preferredLanguage || 'English',
      avatar: data.avatar || '👧🏽',
      preferences: data.preferences || {
        readingSpeed: 'normal',
        dyslexiaFont: false,
        highContrast: false,
        soundEffects: true,
        autoReadAloud: false,
      },
      createdAt: new Date().toISOString(),
    };

    const all = this.storage.getRawProfiles();
    all.push(newChild);
    this.storage.saveRawProfiles(all);

    // Initialize progress record for this new child
    const progressMap = this.storage.getRawProgress();
    progressMap[newChild.id] = {
      childId: newChild.id,
      practiceMinutes: 0,
      wordsLearned: 0,
      fluencyWpm: 20,
      accuracyPercent: 70,
      happyPoints: 100, // Welcome gift points!
      streakDays: 1,
      practiceWins: 0,
      mistakes: [
        { word: 'b / d', note: 'Letter mirror challenge', count: 1 },
      ],
      recentActivities: [
        {
          id: 'welcome-act',
          title: 'Welcome to DyslexiMate!',
          subtitle: 'Profile created · Start your first game',
          tag: 'New',
          icon: '🌱',
          bg: '#e8f5ef',
        },
      ],
      weeklyAccuracy: [60, 62, 65, 70, 70, 72, 75],
    };
    this.storage.saveRawProgress(progressMap);

    this.notifyListeners(parentId);
    return newChild;
  }

  public async updateChild(id: string, updates: Partial<ChildProfile>): Promise<ChildProfile> {
    const all = this.storage.getRawProfiles();
    const index = all.findIndex(p => p.id === id);
    if (index === -1) {
      throw new Error('Child profile not found.');
    }

    const current = all[index];
    const updated: ChildProfile = {
      ...current,
      ...updates,
      id: current.id, // prevent changing ID
      parentId: current.parentId, // prevent changing parent ownership
    };

    all[index] = updated;
    this.storage.saveRawProfiles(all);

    // If active child was updated, reflect it
    if (this.activeChild && this.activeChild.id === id) {
      this.activeChild = updated;
    }

    this.notifyListeners(updated.parentId);
    return updated;
  }

  public async deleteChild(id: string): Promise<boolean> {
    const all = this.storage.getRawProfiles();
    const index = all.findIndex(p => p.id === id);
    if (index === -1) return false;

    const child = all[index];
    const parentId = child.parentId;
    all.splice(index, 1);
    this.storage.saveRawProfiles(all);

    // Remove progress data
    const progressMap = this.storage.getRawProgress();
    delete progressMap[id];
    this.storage.saveRawProgress(progressMap);

    // Reset active child if this was active
    if (this.activeChild && this.activeChild.id === id) {
      this.activeChild = null;
      const session = this.storage.getSession();
      this.storage.saveSession(session.userId, null);
    }

    this.notifyListeners(parentId);
    return true;
  }

  public getActiveChild(): ChildProfile | null {
    return this.activeChild;
  }

  public setActiveChild(child: ChildProfile | null): void {
    this.activeChild = child;
    const session = this.storage.getSession();
    this.storage.saveSession(session.userId, child ? child.id : null);
    this.notifyListeners();
  }

  public getChildProgress(childId: string): ChildLearningData {
    const progressMap = this.storage.getRawProgress();
    if (progressMap[childId]) {
      return progressMap[childId];
    }

    // Default fallback progress
    const fallback: ChildLearningData = {
      childId,
      practiceMinutes: 10,
      wordsLearned: 5,
      fluencyWpm: 25,
      accuracyPercent: 75,
      happyPoints: 120,
      streakDays: 1,
      practiceWins: 1,
      mistakes: [],
      recentActivities: [],
      weeklyAccuracy: [60, 65, 70, 72, 75, 75, 78],
    };
    progressMap[childId] = fallback;
    this.storage.saveRawProgress(progressMap);
    return fallback;
  }

  public updateChildProgress(
    childId: string,
    updates: Partial<ChildLearningData>
  ): ChildLearningData {
    const progressMap = this.storage.getRawProgress();
    const current = this.getChildProgress(childId);
    const updated: ChildLearningData = {
      ...current,
      ...updates,
      childId,
    };
    progressMap[childId] = updated;
    this.storage.saveRawProgress(progressMap);
    return updated;
  }
}
