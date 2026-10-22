import type {
  ChildProfile,
  ChildLearningData,
} from '../types/auth';
import { StorageService } from './storageService';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { i18n } from '../i18n';

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

  private async notifyListeners(parentId?: string): Promise<void> {
    const session = this.storage.getSession();
    const effectiveParentId = parentId || session.userId;
    let profiles: ChildProfile[] = [];

    if (effectiveParentId) {
      try {
        profiles = await this.getChildren(effectiveParentId);
      } catch {
        profiles = this.storage.getRawProfiles().filter(p => p.parentId === effectiveParentId);
      }
    }

    for (const listener of this.profileListeners) {
      try {
        listener(profiles, this.activeChild);
      } catch (err) {
        console.error('Error in profile state listener:', err);
      }
    }
  }

  public async getChildren(parentId: string): Promise<ChildProfile[]> {
    const sb = supabase;
    const isDemoParent = parentId === 'parent-demo-1' || !isSupabaseConfigured() || !sb;
    if (isDemoParent) {
      const all = this.storage.getRawProfiles();
      return all.filter(p => p.parentId === parentId);
    }

    // Live Supabase query guarded by Row Level Security
    try {
      const { data, error } = await sb
        .from('child_profiles')
        .select('*')
        .eq('parent_id', parentId)
        .order('created_at', { ascending: true });

      if (error) {
        console.warn('Supabase getChildren query error:', error.message);
        const all = this.storage.getRawProfiles();
        return all.filter(p => p.parentId === parentId);
      }

      if (data) {
        const mappedProfiles: ChildProfile[] = data.map(row => {
          const lp = row.learning_preferences || {};
          return {
            id: row.id,
            parentId: row.parent_id,
            name: row.display_name,
            grade: lp.grade || 'Class 3 · Growing reader',
            preferredLanguage: i18n.codeToSupportedLanguage(row.preferred_language) || 'English',
            avatar: lp.avatar || '👧🏽',
            preferences: lp.preferences || {
              readingSpeed: 'normal',
              dyslexiaFont: false,
              highContrast: false,
              soundEffects: true,
              autoReadAloud: false,
            },
            createdAt: row.created_at,
          };
        });

        // Update local cache for fast synchronous access
        const existingAll = this.storage.getRawProfiles().filter(p => p.parentId !== parentId);
        this.storage.saveRawProfiles([...existingAll, ...mappedProfiles]);

        // Also fetch and cache learning progress for each child
        for (const child of mappedProfiles) {
          this.syncChildProgressFromDb(child.id).catch(() => {});
        }

        return mappedProfiles;
      }
    } catch (err) {
      console.error('Exception fetching children from Supabase:', err);
    }

    const all = this.storage.getRawProfiles();
    return all.filter(p => p.parentId === parentId);
  }

  public async getChild(id: string): Promise<ChildProfile | null> {
    const sb = supabase;
    if (isSupabaseConfigured() && sb && !id.startsWith('child-demo-') && !id.startsWith('child-aanya') && !id.startsWith('child-kabir')) {
      try {
        const { data, error } = await sb
          .from('child_profiles')
          .select('*')
          .eq('id', id)
          .maybeSingle();

        if (!error && data) {
          const lp = data.learning_preferences || {};
          return {
            id: data.id,
            parentId: data.parent_id,
            name: data.display_name,
            grade: lp.grade || 'Class 3 · Growing reader',
            preferredLanguage: i18n.codeToSupportedLanguage(data.preferred_language) || 'English',
            avatar: lp.avatar || '👧🏽',
            preferences: lp.preferences || {
              readingSpeed: 'normal',
              dyslexiaFont: false,
              highContrast: false,
              soundEffects: true,
              autoReadAloud: false,
            },
            createdAt: data.created_at,
          };
        }
      } catch (err) {
        console.warn('Error fetching single child from Supabase:', err);
      }
    }

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

    const session = this.storage.getSession();
    const effectiveParentId = parentId || session.userId;
    if (!effectiveParentId) {
      throw new Error('Authenticated parent account required to save child profile.');
    }

    const sb = supabase;
    const isDemoParent = effectiveParentId === 'parent-demo-1' || !isSupabaseConfigured() || !sb;
    const langCode = i18n.supportedLanguageToCode(data.preferredLanguage || 'en');
    const supportedLang = i18n.codeToSupportedLanguage(langCode);

    if (!isDemoParent) {
      try {
        const { data: newRow, error } = await sb
          .from('child_profiles')
          .insert({
            parent_id: effectiveParentId,
            display_name: data.name.trim(),
            preferred_language: langCode,
            learning_preferences: {
              grade: data.grade || 'Class 3 · Growing reader',
              avatar: data.avatar || '👧🏽',
              preferences: data.preferences || {
                readingSpeed: 'normal',
                dyslexiaFont: false,
                highContrast: false,
                soundEffects: true,
                autoReadAloud: false,
              },
            },
          })
          .select()
          .single();

        if (error) {
          throw new Error(error.message);
        }

        const lp = newRow.learning_preferences || {};
        const newChild: ChildProfile = {
          id: newRow.id,
          parentId: newRow.parent_id,
          name: newRow.display_name,
          grade: lp.grade || data.grade,
          preferredLanguage: i18n.codeToSupportedLanguage(newRow.preferred_language) || supportedLang,
          avatar: lp.avatar || data.avatar,
          preferences: lp.preferences || data.preferences,
          createdAt: newRow.created_at,
        };

        // Initialize progress record in Supabase
        try {
          await sb.from('learning_progress').insert({
            child_id: newChild.id,
            activity_or_skill_id: 'welcome-reading',
            completion_status: 'completed',
            score: 100,
            accuracy: 75.00,
            attempts: 1,
            hints_used: 0,
            duration_seconds: 60,
          });
        } catch (progErr) {
          console.warn('Error seeding initial learning progress row:', progErr);
        }

        // Cache locally
        const all = this.storage.getRawProfiles();
        all.push(newChild);
        this.storage.saveRawProfiles(all);

        // Initialize local progress record
        const progressMap = this.storage.getRawProgress();
        progressMap[newChild.id] = {
          childId: newChild.id,
          practiceMinutes: 1,
          wordsLearned: 5,
          fluencyWpm: 25,
          accuracyPercent: 75,
          happyPoints: 100,
          streakDays: 1,
          practiceWins: 1,
          mistakes: [{ word: 'b / d', note: 'Letter mirror challenge', count: 1 }],
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
          weeklyAccuracy: [60, 65, 70, 72, 75, 75, 75],
        };
        this.storage.saveRawProgress(progressMap);

        await this.notifyListeners(parentId);
        return newChild;
      } catch (err: any) {
        console.error('Failed to create child profile in Supabase:', err);
        throw err;
      }
    }

    // Local / Demo Mode profile creation
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

    const progressMap = this.storage.getRawProgress();
    progressMap[newChild.id] = {
      childId: newChild.id,
      practiceMinutes: 0,
      wordsLearned: 0,
      fluencyWpm: 20,
      accuracyPercent: 70,
      happyPoints: 100,
      streakDays: 1,
      practiceWins: 0,
      mistakes: [{ word: 'b / d', note: 'Letter mirror challenge', count: 1 }],
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

    await this.notifyListeners(parentId);
    return newChild;
  }

  public async updateChild(id: string, updates: Partial<ChildProfile>): Promise<ChildProfile> {
    const current = await this.getChild(id);
    if (!current) {
      throw new Error('Child profile not found.');
    }

    const sb = supabase;
    const isDemo = id.startsWith('child-demo-') || id.startsWith('child-aanya') || id.startsWith('child-kabir') || !isSupabaseConfigured() || !sb;

    if (!isDemo) {
      try {
        const mergedPreferences = {
          grade: updates.grade !== undefined ? updates.grade : current.grade,
          avatar: updates.avatar !== undefined ? updates.avatar : current.avatar,
          preferences: updates.preferences !== undefined ? updates.preferences : current.preferences,
        };

        const dbPayload: any = {
          learning_preferences: mergedPreferences,
        };
        if (updates.name) dbPayload.display_name = updates.name.trim();
        if (updates.preferredLanguage) {
          dbPayload.preferred_language = i18n.supportedLanguageToCode(updates.preferredLanguage);
        }

        const { data: updatedRow, error } = await sb
          .from('child_profiles')
          .update(dbPayload)
          .eq('id', id)
          .select()
          .single();

        if (error) {
          throw new Error(error.message);
        }

        const lp = updatedRow.learning_preferences || {};
        const updated: ChildProfile = {
          id: updatedRow.id,
          parentId: updatedRow.parent_id,
          name: updatedRow.display_name,
          grade: lp.grade || current.grade,
          preferredLanguage: i18n.codeToSupportedLanguage(updatedRow.preferred_language) || current.preferredLanguage,
          avatar: lp.avatar || current.avatar,
          preferences: lp.preferences || current.preferences,
          createdAt: updatedRow.created_at,
        };

        // Update local cache
        const all = this.storage.getRawProfiles();
        const idx = all.findIndex(p => p.id === id);
        if (idx !== -1) {
          all[idx] = updated;
          this.storage.saveRawProfiles(all);
        }

        if (this.activeChild && this.activeChild.id === id) {
          this.activeChild = updated;
        }

        await this.notifyListeners(updated.parentId);
        return updated;
      } catch (err: any) {
        console.error('Failed to update child profile in Supabase:', err);
        throw err;
      }
    }

    const all = this.storage.getRawProfiles();
    const index = all.findIndex(p => p.id === id);
    if (index === -1) {
      throw new Error('Child profile not found.');
    }

    const updatedLang = updates.preferredLanguage
      ? (i18n.codeToSupportedLanguage(updates.preferredLanguage) || updates.preferredLanguage)
      : current.preferredLanguage;

    const updated: ChildProfile = {
      ...current,
      ...updates,
      preferredLanguage: updatedLang,
      id: current.id,
      parentId: current.parentId,
    };

    all[index] = updated;
    this.storage.saveRawProfiles(all);

    if (this.activeChild && this.activeChild.id === id) {
      this.activeChild = updated;
    }

    await this.notifyListeners(updated.parentId);
    return updated;
  }

  public async deleteChild(id: string): Promise<boolean> {
    const current = await this.getChild(id);
    if (!current) return false;

    const sb = supabase;
    const isDemo = id.startsWith('child-demo-') || id.startsWith('child-aanya') || id.startsWith('child-kabir') || !isSupabaseConfigured() || !sb;

    if (!isDemo) {
      try {
        const { error } = await sb
          .from('child_profiles')
          .delete()
          .eq('id', id);

        if (error) {
          console.error('Supabase delete error:', error.message);
          throw new Error(error.message);
        }
      } catch (err: any) {
        console.error('Failed to delete child profile from Supabase:', err);
        throw err;
      }
    }

    const all = this.storage.getRawProfiles();
    const index = all.findIndex(p => p.id === id);
    if (index !== -1) {
      all.splice(index, 1);
      this.storage.saveRawProfiles(all);
    }

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

    await this.notifyListeners(current.parentId);
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

  private async syncChildProgressFromDb(childId: string): Promise<void> {
    const sb = supabase;
    if (!isSupabaseConfigured() || !sb) return;

    try {
      const { data, error } = await sb
        .from('learning_progress')
        .select('*')
        .eq('child_id', childId)
        .order('completed_at', { ascending: false });

      if (error || !data || data.length === 0) return;

      let totalPoints = 0;
      let totalDurationSec = 0;
      let totalAccuracy = 0;

      data.forEach(row => {
        totalPoints += row.score || 0;
        totalDurationSec += row.duration_seconds || 0;
        totalAccuracy += Number(row.accuracy || 70);
      });

      const avgAccuracy = Math.round(totalAccuracy / data.length);
      const practiceMins = Math.max(1, Math.round(totalDurationSec / 60));

      const progressMap = this.storage.getRawProgress();
      const current = progressMap[childId] || this.getDefaultProgress(childId);

      progressMap[childId] = {
        ...current,
        happyPoints: Math.max(current.happyPoints, totalPoints),
        practiceMinutes: Math.max(current.practiceMinutes, practiceMins),
        accuracyPercent: avgAccuracy || current.accuracyPercent,
      };
      this.storage.saveRawProgress(progressMap);
    } catch (err) {
      console.warn('Error syncing child progress from DB:', err);
    }
  }

  private getDefaultProgress(childId: string): ChildLearningData {
    return {
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
  }

  public getChildProgress(childId: string): ChildLearningData {
    const progressMap = this.storage.getRawProgress();
    if (progressMap[childId]) {
      return progressMap[childId];
    }

    const fallback = this.getDefaultProgress(childId);
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

    // Save learning progress event to Supabase if live
    const sb = supabase;
    if (
      isSupabaseConfigured() &&
      sb &&
      !childId.startsWith('child-demo-') &&
      !childId.startsWith('child-aanya') &&
      !childId.startsWith('child-kabir')
    ) {
      Promise.resolve(
        sb.from('learning_progress').insert({
          child_id: childId,
          activity_or_skill_id: 'progress_milestone',
          completion_status: 'completed',
          score: updates.happyPoints || 10,
          accuracy: updates.accuracyPercent || 80,
          attempts: 1,
          hints_used: 0,
          duration_seconds: (updates.practiceMinutes || 1) * 60,
        })
      )
        .then(() => {})
        .catch((err: unknown) => {
          console.warn('Failed to insert learning_progress into Supabase:', err);
        });
    }

    return updated;
  }
}
