import type {
  LearningPath,
  ChildSkillState,
  LearningAttempt,
  MilestoneProgress,
} from '../types/adaptive';
import type { ChildProfile } from '../types/auth';
import {
  SKILL_REGISTRY,
  createInitialSkillState,
  updateSkillStateWithAttempt,
  getSkillDefinition,
} from './skillModel';
import {
  RecommendationEngine,
  getLocalizedSkillTitle,
  getLocalizedSkillObjective,
  getLocalizedSkillDescription,
} from './recommendationEngine';
import { StorageService } from './storageService';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

const STORAGE_KEYS = {
  SKILL_STATES: 'dysleximate_skill_states_v1',
  LEARNING_PATHS: 'dysleximate_learning_paths_v1',
  ATTEMPTS: 'dysleximate_learning_attempts_v1',
};

export class LearningPathService {
  private static instance: LearningPathService;
  private recommendationEngine: RecommendationEngine;
  private storage: StorageService;

  private constructor() {
    this.recommendationEngine = RecommendationEngine.getInstance();
    this.storage = StorageService.getInstance();
  }

  public static getInstance(): LearningPathService {
    if (!LearningPathService.instance) {
      LearningPathService.instance = new LearningPathService();
    }
    return LearningPathService.instance;
  }

  // -------------------------------------------------------------
  // 1. Skill States Management (Local + Supabase Sync)
  // -------------------------------------------------------------
  public async getChildSkillStates(childId: string): Promise<Record<string, ChildSkillState>> {
    // Check Supabase if configured
    if (isSupabaseConfigured() && supabase) {
      try {
        const { data, error } = await supabase
          .from('child_skill_states')
          .select('*')
          .eq('child_id', childId);

        if (!error && data && data.length > 0) {
          const map: Record<string, ChildSkillState> = {};
          data.forEach(row => {
            map[row.skill_id] = {
              skillId: row.skill_id,
              childId: row.child_id,
              currentLevel: row.current_level,
              estimatedMastery: Number(row.estimated_mastery),
              confidence: Number(row.confidence),
              recentAccuracy: Number(row.recent_accuracy),
              attemptsCount: row.attempts_count,
              consecutiveSuccesses: row.consecutive_successes,
              consecutiveStruggles: row.consecutive_struggles,
              lastPracticed: row.last_practiced,
              recommendedNextAction: row.recommended_next_action,
              missedPatterns: row.missed_patterns || [],
              isProvisional: row.is_provisional,
            };
          });
          return map;
        }
      } catch (err) {
        console.warn('Falling back to local skill state:', err);
      }
    }

    // Fallback to local storage
    const all = this.getLocalSkillStates();
    const childStates = all[childId] || {};

    // Ensure all standard skills exist in the state map
    SKILL_REGISTRY.forEach(skill => {
      if (!childStates[skill.id]) {
        childStates[skill.id] = createInitialSkillState(childId, skill.id);
      }
    });

    return childStates;
  }

  public async saveChildSkillState(state: ChildSkillState): Promise<void> {
    // 1. Save locally
    const all = this.getLocalSkillStates();
    if (!all[state.childId]) all[state.childId] = {};
    all[state.childId][state.skillId] = state;
    this.saveLocalSkillStates(all);

    // 2. Sync to Supabase if available
    if (isSupabaseConfigured() && supabase) {
      try {
        await supabase.from('child_skill_states').upsert(
          {
            child_id: state.childId,
            skill_id: state.skillId,
            current_level: state.currentLevel,
            estimated_mastery: state.estimatedMastery,
            confidence: state.confidence,
            recent_accuracy: state.recentAccuracy,
            attempts_count: state.attemptsCount,
            consecutive_successes: state.consecutiveSuccesses,
            consecutive_struggles: state.consecutiveStruggles,
            last_practiced: state.lastPracticed,
            recommended_next_action: state.recommendedNextAction,
            missed_patterns: state.missedPatterns,
            is_provisional: state.isProvisional,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'child_id,skill_id' }
        );
      } catch (err) {
        console.warn('Could not upsert skill state to Supabase:', err);
      }
    }
  }

  // -------------------------------------------------------------
  // 2. Learning Attempts Recording
  // -------------------------------------------------------------
  public async recordAttempt(attempt: LearningAttempt): Promise<{
    updatedSkillState: ChildSkillState;
    updatedPath: LearningPath;
  }> {
    // 1. Persist attempt locally
    const attempts = this.getLocalAttempts();
    attempts.push(attempt);
    this.saveLocalAttempts(attempts);

    // 2. Persist to Supabase if connected
    if (isSupabaseConfigured() && supabase) {
      try {
        await supabase.from('learning_progress').insert({
          child_id: attempt.childId,
          activity_or_skill_id: attempt.activityId,
          completion_status: 'completed',
          score: attempt.score,
          accuracy: Math.round(attempt.accuracy * 100),
          attempts: attempt.attemptsRequired,
          hints_used: attempt.hintsRequested,
          duration_seconds: attempt.durationSeconds,
          completed_at: attempt.completedAt,
        });
      } catch (err) {
        console.warn('Could not log progress to Supabase:', err);
      }
    }

    // 3. Update skill mastery & confidence
    const states = await this.getChildSkillStates(attempt.childId);
    const currentState = states[attempt.skillId] || createInitialSkillState(attempt.childId, attempt.skillId);
    const updatedSkillState = updateSkillStateWithAttempt(currentState, attempt);
    await this.saveChildSkillState(updatedSkillState);

    // 4. Regenerate and persist updated Learning Path
    // Fetch child profile from storage or mock
    const childProfiles = this.storage.getRawProfiles();
    const child = childProfiles.find(c => c.id === attempt.childId) || {
      id: attempt.childId,
      parentId: 'parent-demo-1',
      name: 'Learner',
      grade: 'Class 2',
      preferredLanguage: 'English' as const,
      avatar: '👧🏽',
      preferences: {
        readingSpeed: 'normal' as const,
        dyslexiaFont: true,
        highContrast: false,
        soundEffects: true,
        autoReadAloud: false,
      },
      createdAt: new Date().toISOString(),
    };

    const updatedPath = await this.generatePath(child, attempt.activityId);
    return { updatedSkillState, updatedPath };
  }

  // -------------------------------------------------------------
  // 3. Learning Path Generation & Evolution
  // -------------------------------------------------------------
  public async getOrGeneratePath(child: ChildProfile): Promise<LearningPath> {
    const existing = await this.getStoredPath(child.id);
    const targetLang = child.preferredLanguage || 'English';

    // If an existing path has at least 3 recommendations, preserve the path and its skill identities
    if (existing && existing.recommendations && existing.recommendations.length >= 3) {
      if (existing.language !== targetLang) {
        existing.language = targetLang;
        existing.recommendations = existing.recommendations.map(rec => ({
          ...rec,
          title: getLocalizedSkillTitle(rec.targetSkillId, targetLang, rec.title),
          learningObjective: getLocalizedSkillObjective(rec.targetSkillId, targetLang, rec.learningObjective),
          description: getLocalizedSkillDescription(rec.targetSkillId, targetLang, rec.description),
        }));
        if (existing.reviewQueue) {
          existing.reviewQueue = existing.reviewQueue.map(rec => ({
            ...rec,
            title: getLocalizedSkillTitle(rec.targetSkillId, targetLang, rec.title),
            learningObjective: getLocalizedSkillObjective(rec.targetSkillId, targetLang, rec.learningObjective),
            description: getLocalizedSkillDescription(rec.targetSkillId, targetLang, rec.description),
          }));
        }
        await this.saveStoredPath(existing);
      }
      return existing;
    }

    return this.generatePath(child);
  }

  public async generatePath(child: ChildProfile, lastActivityId?: string): Promise<LearningPath> {
    const skillStates = await this.getChildSkillStates(child.id);
    const existingPath = await this.getStoredPath(child.id);
    const previousVersion = existingPath?.version || 0;

    // Categorize skills based on mastery and attempts
    const demonstratedSkills: string[] = [];
    const practicingSkills: string[] = [];
    const prioritySkills: string[] = [];

    Object.values(skillStates).forEach(state => {
      if (state.estimatedMastery >= 0.75 && state.confidence >= 0.6) {
        demonstratedSkills.push(state.skillId);
      } else if (state.consecutiveStruggles >= 2 || state.missedPatterns.length >= 2) {
        prioritySkills.push(state.skillId);
      } else if (state.attemptsCount > 0) {
        practicingSkills.push(state.skillId);
      }
    });

    // Generate Adaptive Recommendations
    const recommendations = this.recommendationEngine.generateRecommendations(
      child,
      skillStates,
      lastActivityId
    );

    // Define current short-term learning goals
    const currentGoals: string[] = [];
    if (prioritySkills.length > 0) {
      const topStruggle = getSkillDefinition(prioritySkills[0]);
      if (topStruggle) {
        currentGoals.push(`Reinforce ${topStruggle.name} with supportive visual anchors.`);
      }
    }
    if (recommendations.length > 0) {
      currentGoals.push(`Master ${recommendations[0].skillName} via interactive discovery.`);
    }
    if (currentGoals.length === 0) {
      currentGoals.push('Complete daily reading adventure challenge.');
    }

    // Milestones tracking
    const milestones: MilestoneProgress[] = [
      {
        id: 'milestone_sound_explorer',
        title: 'Sound Explorer 🏅',
        description: 'Complete 3 letter-sound discovery exercises.',
        targetSkillIds: ['skill_letter_sounds_basic', 'skill_letter_sounds_vowels'],
        progressPercent: Math.min(100, Math.round(((skillStates['skill_letter_sounds_basic']?.attemptsCount || 0) / 3) * 100)),
        completed: (skillStates['skill_letter_sounds_basic']?.attemptsCount || 0) >= 3,
        badgeIcon: '🧭',
      },
      {
        id: 'milestone_mirror_master',
        title: 'Letter Mirror Detective 🔍',
        description: 'Master distinction between b, d, and mirror letters.',
        targetSkillIds: ['skill_confused_letters_bd', 'skill_confused_letters_pq'],
        progressPercent: Math.min(100, Math.round((skillStates['skill_confused_letters_bd']?.estimatedMastery || 0) * 100)),
        completed: (skillStates['skill_confused_letters_bd']?.estimatedMastery || 0) >= 0.8,
        badgeIcon: '🪞',
      },
      {
        id: 'milestone_word_builder',
        title: 'CVC Word Builder 🏗️',
        description: 'Blend sounds into 5 complete words.',
        targetSkillIds: ['skill_cvc_blending', 'skill_spelling_phonetic'],
        progressPercent: Math.min(100, Math.round((skillStates['skill_cvc_blending']?.estimatedMastery || 0) * 100)),
        completed: (skillStates['skill_cvc_blending']?.estimatedMastery || 0) >= 0.75,
        badgeIcon: '🧱',
      },
    ];

    // Build plain-language explanation of why this path exists
    let explanation = '';
    const totalAttempts = Object.values(skillStates).reduce((acc, s) => acc + s.attemptsCount, 0);

    if (totalAttempts < 3) {
      explanation = `Provisional Learning Path: Welcome ${child.name}! Because we are just getting started, your journey begins with gentle baseline activities to calibrate your reading pacing and letter confidence.`;
    } else if (prioritySkills.length > 0) {
      const pDef = getSkillDefinition(prioritySkills[0]);
      explanation = `Adapted for Support: We noticed recent confusion in ${pDef?.name || 'sound patterns'}, so we have scaffolded extra visual hints and supportive pacing before advancing.`;
    } else if (demonstratedSkills.length >= 2) {
      explanation = `Advancing Path: ${child.name} has demonstrated strong confidence across ${demonstratedSkills.length} core reading skills. The path is stepping up into decoding and fluency exercises!`;
    } else {
      explanation = `Balanced Practice Path: Tailored to steady reading wins with a healthy variety of phonics, spelling games, and read-aloud stories.`;
    }

    const path: LearningPath = {
      id: `path_${child.id}`,
      childId: child.id,
      language: child.preferredLanguage || 'English',
      version: previousVersion + 1,
      createdAt: existingPath?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isProvisional: totalAttempts < 3,
      currentGoals,
      demonstratedSkills,
      practicingSkills,
      prioritySkills,
      recommendations,
      reviewQueue: recommendations.filter(r => r.recommendationType === 'review'),
      milestones,
      explanation,
      progressionConditions: {
        advanceThreshold: 0.8,
        remediationThreshold: 0.55,
        reviewIntervalDays: 3,
      },
    };

    await this.saveStoredPath(path);
    return path;
  }

  // -------------------------------------------------------------
  // 4. Persistence Helpers (Local + Supabase)
  // -------------------------------------------------------------
  private async getStoredPath(childId: string): Promise<LearningPath | null> {
    if (isSupabaseConfigured() && supabase) {
      try {
        const { data, error } = await supabase
          .from('child_learning_paths')
          .select('*')
          .eq('child_id', childId)
          .single();

        if (!error && data) {
          return {
            id: data.id,
            childId: data.child_id,
            version: data.version,
            createdAt: data.created_at,
            updatedAt: data.updated_at,
            isProvisional: data.is_provisional,
            currentGoals: data.current_goals || [],
            demonstratedSkills: data.demonstrated_skills || [],
            practicingSkills: data.practicing_skills || [],
            prioritySkills: data.priority_skills || [],
            recommendations: data.recommendations || [],
            reviewQueue: data.review_queue || [],
            milestones: data.milestones || [],
            explanation: data.explanation || '',
            progressionConditions: data.progression_conditions || {
              advanceThreshold: 0.8,
              remediationThreshold: 0.55,
              reviewIntervalDays: 3,
            },
          };
        }
      } catch (err) {
        console.warn('Falling back to local learning path:', err);
      }
    }

    const localPaths = this.getLocalPaths();
    return localPaths[childId] || null;
  }

  private async saveStoredPath(path: LearningPath): Promise<void> {
    // 1. Save local
    const localPaths = this.getLocalPaths();
    localPaths[path.childId] = path;
    this.saveLocalPaths(localPaths);

    // 2. Save Supabase if configured
    if (isSupabaseConfigured() && supabase) {
      try {
        await supabase.from('child_learning_paths').upsert(
          {
            child_id: path.childId,
            version: path.version,
            is_provisional: path.isProvisional,
            current_goals: path.currentGoals,
            demonstrated_skills: path.demonstratedSkills,
            practicing_skills: path.practicingSkills,
            priority_skills: path.prioritySkills,
            recommendations: path.recommendations,
            review_queue: path.reviewQueue,
            milestones: path.milestones,
            explanation: path.explanation,
            progression_conditions: path.progressionConditions,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'child_id' }
        );
      } catch (err) {
        console.warn('Could not upsert learning path to Supabase:', err);
      }
    }
  }

  // -------------------------------------------------------------
  // 5. Local Storage Storage Accessors
  // -------------------------------------------------------------
  private getLocalSkillStates(): Record<string, Record<string, ChildSkillState>> {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.SKILL_STATES);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  }

  private saveLocalSkillStates(states: Record<string, Record<string, ChildSkillState>>): void {
    try {
      localStorage.setItem(STORAGE_KEYS.SKILL_STATES, JSON.stringify(states));
    } catch (err) {
      console.warn('Local storage write error for skill states:', err);
    }
  }

  private getLocalPaths(): Record<string, LearningPath> {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.LEARNING_PATHS);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  }

  private saveLocalPaths(paths: Record<string, LearningPath>): void {
    try {
      localStorage.setItem(STORAGE_KEYS.LEARNING_PATHS, JSON.stringify(paths));
    } catch (err) {
      console.warn('Local storage write error for learning paths:', err);
    }
  }

  private getLocalAttempts(): LearningAttempt[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.ATTEMPTS);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  private saveLocalAttempts(attempts: LearningAttempt[]): void {
    try {
      localStorage.setItem(STORAGE_KEYS.ATTEMPTS, JSON.stringify(attempts));
    } catch (err) {
      console.warn('Local storage write error for attempts:', err);
    }
  }

  /**
   * Retrieves all recorded learning attempts for a specific child,
   * querying Supabase learning_progress if configured and combining with local attempts.
   */
  public async getChildAttempts(childId: string): Promise<LearningAttempt[]> {
    const local = this.getLocalAttempts().filter(a => a.childId === childId);

    if (isSupabaseConfigured() && supabase) {
      try {
        const { data, error } = await supabase
          .from('learning_progress')
          .select('*')
          .eq('child_id', childId)
          .order('completed_at', { ascending: true });

        if (!error && data && data.length > 0) {
          const remoteAttempts: LearningAttempt[] = data.map(row => {
            const acc = (row.accuracy || 0) / 100;
            const totalQ = row.attempts || 1;
            const correct = Math.round(acc * totalQ);
            return {
              id: row.id,
              childId: row.child_id,
              activityId: row.activity_or_skill_id,
              skillId: row.activity_or_skill_id,
              activityType: 'practice',
              score: row.score || 0,
              accuracy: acc,
              totalQuestions: totalQ,
              correctAnswers: correct,
              incorrectAnswers: Math.max(0, totalQ - correct),
              attemptsRequired: row.attempts || 1,
              hintsRequested: row.hints_used || 0,
              correctedAfterHint: 0,
              durationSeconds: row.duration_seconds || 30,
              missedItems: [],
              completedAt: row.completed_at,
            };
          });

          const localIds = new Set(local.map(l => l.id));
          remoteAttempts.forEach(r => {
            if (!localIds.has(r.id)) {
              local.push(r);
            }
          });
        }
      } catch (err) {
        console.warn('Could not fetch learning progress from Supabase:', err);
      }
    }

    return local.sort(
      (a, b) => new Date(a.completedAt).getTime() - new Date(b.completedAt).getTime()
    );
  }

  /**
   * Clears attempts and reset path (for testing or reset commands only).
   */
  public resetChildData(childId: string): void {
    const states = this.getLocalSkillStates();
    delete states[childId];
    this.saveLocalSkillStates(states);

    const paths = this.getLocalPaths();
    delete paths[childId];
    this.saveLocalPaths(paths);
  }
}
