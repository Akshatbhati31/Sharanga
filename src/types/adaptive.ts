// Types for DyslexiMate Adaptive AI Personalization Engine

export type SkillCategory =
  | 'letter_recognition'
  | 'phonemic_awareness'
  | 'sound_blending'
  | 'syllable_decoding'
  | 'confused_letters'
  | 'spelling_construction'
  | 'vocabulary'
  | 'reading_fluency'
  | 'reading_comprehension'
  | 'listening_pronunciation';

export type RecommendationType = 'baseline' | 'new' | 'review' | 'remediation';

export type ActivityDifficulty = 'beginner' | 'intermediate' | 'advanced';

export type NextAction = 'introduce' | 'practice' | 'reinforce' | 'review' | 'mastered';

export interface SkillDefinition {
  id: string;
  category: SkillCategory;
  name: string;
  description: string;
  level: number; // 1 (introductory) to 5 (advanced)
  prerequisites: string[]; // skill IDs that should be attempted or mastered first
  languages: ('English' | 'Hindi' | 'Odia' | 'Punjabi' | 'Tamil' | 'Bengali')[];
  suggestedActivities: string[];
}

export interface ChildSkillState {
  skillId: string;
  childId: string;
  currentLevel: number;
  estimatedMastery: number; // 0.0 to 1.0 (e.g. 0.85 = 85% mastery)
  confidence: number; // 0.0 to 1.0 (based on sample size & recency)
  recentAccuracy: number; // 0.0 to 1.0 based on last 3-5 attempts
  attemptsCount: number;
  consecutiveSuccesses: number;
  consecutiveStruggles: number;
  lastPracticed: string | null; // ISO timestamp
  recommendedNextAction: NextAction;
  missedPatterns: string[]; // recurring errors e.g. ['b_vs_d', 'sh_ch']
  isProvisional: boolean; // true if insufficient data (< 3 attempts)
}

export interface LearningAttempt {
  id: string;
  childId: string;
  activityId: string;
  skillId: string;
  activityType: string;
  score: number; // 0-100
  accuracy: number; // 0.0 - 1.0
  totalQuestions: number;
  correctAnswers: number;
  incorrectAnswers: number;
  attemptsRequired: number;
  hintsRequested: number;
  correctedAfterHint: number;
  durationSeconds: number;
  missedItems: string[];
  completedAt: string; // ISO timestamp
  feedbackNotes?: string;
}

export interface AdaptiveRecommendation {
  id: string;
  activityId: string;
  targetSkillId: string;
  skillName: string;
  category: SkillCategory;
  title: string;
  description: string;
  learningObjective: string;
  difficulty: ActivityDifficulty;
  estimatedMinutes: number;
  prerequisites: string[];
  recommendationType: RecommendationType;
  reason: string; // Plain-language explanation for child & parent
  pedagogicalRationale: string; // Detailed educational logic
  actionIcon: string;
  actionBg: string;
}

export interface MilestoneProgress {
  id: string;
  title: string;
  description: string;
  targetSkillIds: string[];
  progressPercent: number; // 0 - 100
  completed: boolean;
  badgeIcon: string;
  unlockedAt?: string;
}

export interface LearningPath {
  id: string;
  childId: string;
  language?: string;
  version: number;
  createdAt: string;
  updatedAt: string;
  isProvisional: boolean; // True for new children on baseline
  currentGoals: string[];
  demonstratedSkills: string[]; // skill IDs with mastery >= 0.75 and confidence >= 0.6
  practicingSkills: string[]; // skill IDs actively in progress
  prioritySkills: string[]; // skill IDs with recent struggles needing remediation
  recommendations: AdaptiveRecommendation[];
  reviewQueue: AdaptiveRecommendation[];
  milestones: MilestoneProgress[];
  explanation: string; // Plain-language explanation of why this path was selected
  progressionConditions: {
    advanceThreshold: number; // e.g. 0.80 accuracy across 2 attempts
    remediationThreshold: number; // e.g. < 0.60 accuracy triggers supportive hints
    reviewIntervalDays: number; // e.g. 4 days
  };
}

export interface InteractiveActivityContent {
  id: string;
  skillId: string;
  title: string;
  instruction: string;
  difficulty: ActivityDifficulty;
  language: string;
  type: 'word_match' | 'phonics_blend' | 'letter_distinction' | 'story_comprehension' | 'sentence_builder';
  prompt: string;
  audioPrompt?: string;
  items: Array<{
    id: string;
    text: string;
    visual?: string;
    isCorrect: boolean;
    feedbackHint?: string;
  }>;
  workedExample?: {
    demonstration: string;
    explanation: string;
  };
  stepByStepHint: string;
  targetPattern?: string;
}
