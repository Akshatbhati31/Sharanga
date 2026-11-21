import { ProfileService } from './profileService';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { ACTIVITY_CATALOG, type ActivityCatalogItem } from './activityCatalog';
import type { ChildProfile } from '../types/auth';

export type DestinationId =
  | 'phonics_garden'
  | 'word_workshop'
  | 'reading_forest'
  | 'story_castle'
  | 'vocabulary_island'
  | 'alphabet_forest'
  | 'sound_safari'
  | 'word_wonderland'
  | 'spelling_castle'
  | 'rhyme_river'
  | 'storybook_kingdom';

export interface DestinationSetting {
  enabled: boolean;
  requiredPoints: number;
}

export interface DestinationDefinition {
  id: DestinationId;
  name: string;
  icon: string;
  tagline: string;
  description: string;
  themeColor: string;
  accentBg: string;
  defaultRequiredPoints: number;
  activityIds: string[];
}

export interface DestinationAccessStatus {
  destinationId: DestinationId;
  name: string;
  icon: string;
  status: 'unlocked' | 'locked' | 'disabled';
  enabled: boolean;
  requiredPoints: number;
  currentPoints: number;
  pointsRemaining: number;
  percentToUnlock: number;
  allowed: boolean;
  message?: string;
  activities: ActivityCatalogItem[];
}

export interface CollectibleSticker {
  id: string;
  name: string;
  icon: string;
  description: string;
  earned: boolean;
  unlockedAtPoints: number;
  destinationId?: DestinationId;
}

export interface DailyQuest {
  id: string;
  title: string;
  icon: string;
  targetCount: number;
  currentCount: number;
  completed: boolean;
  rewardPoints: number;
}

export interface AdventureChildState {
  childId: string;
  childName: string;
  avatar: string;
  happyPoints: number;
  destinations: Record<DestinationId, DestinationAccessStatus>;
  unlockedCount: number;
  totalDestinations: number;
  stickers: CollectibleSticker[];
  dailyQuests: DailyQuest[];
  mascotReaction: {
    mascot: string;
    text: string;
    emotion: 'happy' | 'encouraging' | 'celebrating' | 'curious';
  };
}

export const ADVENTURE_DESTINATIONS: Record<DestinationId, DestinationDefinition> = {
  phonics_garden: {
    id: 'phonics_garden',
    name: 'Phonics Garden',
    icon: '🌸',
    tagline: 'Bloom with letter sounds & mirrors',
    description: 'Wander among singing blossoms, match letter sounds, and solve curious b vs d mirror riddles.',
    themeColor: '#10b981',
    accentBg: '#ecfdf5',
    defaultRequiredPoints: 0,
    activityIds: ['act_letter_sound_match', 'act_bd_mirror', 'act_listening_practice'],
  },
  word_workshop: {
    id: 'word_workshop',
    name: 'Word Workshop',
    icon: '🔨',
    tagline: 'Craft words from sounds & blends',
    description: 'Hammer and assemble 3-letter blends, snap missing vowels into place, and construct sturdy words.',
    themeColor: '#f59e0b',
    accentBg: '#fffbeb',
    defaultRequiredPoints: 50,
    activityIds: ['act_sound_blending', 'act_word_building', 'act_missing_letter'],
  },
  reading_forest: {
    id: 'reading_forest',
    name: 'Reading Forest',
    icon: '🌲',
    tagline: 'Venture through rhyming groves',
    description: 'Listen to the rhyming canopy, clap out syllable rhythms, and discover hidden sight-word pathways.',
    themeColor: '#059669',
    accentBg: '#f0fdf4',
    defaultRequiredPoints: 100,
    activityIds: ['act_rhyming_words', 'act_syllable_splitting', 'act_word_recognition'],
  },
  story_castle: {
    id: 'story_castle',
    name: 'Story Castle',
    icon: '🏰',
    tagline: 'Ascend towers of illustrated tales',
    description: 'Explore grand castle libraries, read passages with gentle voice assistance, and conquer comprehension quests.',
    themeColor: '#8b5cf6',
    accentBg: '#f5f3ff',
    defaultRequiredPoints: 150,
    activityIds: ['act_reading_comprehension'],
  },
  vocabulary_island: {
    id: 'vocabulary_island',
    name: 'Vocabulary Island',
    icon: '🏝️',
    tagline: 'Chart uncharted word treasures',
    description: 'Unearth buried sentence fluency treasures, conquer voice spelling trials, and master rich descriptive vocabulary.',
    themeColor: '#0284c7',
    accentBg: '#f0f9ff',
    defaultRequiredPoints: 200,
    activityIds: ['act_vocabulary_builder', 'act_spelling_practice'],
  },
  alphabet_forest: {
    id: 'alphabet_forest',
    name: 'Alphabet Forest',
    icon: '🌲',
    tagline: 'Letter sounds & mirror discoveries',
    description: 'Wander under singing canopy trees, match vibrant letter sounds, and conquer curious mirror b vs d riddles.',
    themeColor: '#059669',
    accentBg: '#ecfdf5',
    defaultRequiredPoints: 0,
    activityIds: ['act_letter_sound_match', 'act_bd_mirror', 'act_listening_practice'],
  },
  sound_safari: {
    id: 'sound_safari',
    name: 'Sound Safari',
    icon: '🦁',
    tagline: 'Phonemic awareness & sound blending',
    description: 'Track acoustic footprints through golden grasslands and zip sounds together with friendly safari guides.',
    themeColor: '#d97706',
    accentBg: '#fffbeb',
    defaultRequiredPoints: 50,
    activityIds: ['act_sound_blending', 'act_missing_letter'],
  },
  word_wonderland: {
    id: 'word_wonderland',
    name: 'Word Wonderland',
    icon: '🍭',
    tagline: 'Digraphs, blends & sight words',
    description: 'Spin through candy-colored clouds to spot twinkling sight words and solve word reversal puzzles.',
    themeColor: '#db2777',
    accentBg: '#fdf2f8',
    defaultRequiredPoints: 100,
    activityIds: ['act_word_building', 'act_word_recognition'],
  },
  spelling_castle: {
    id: 'spelling_castle',
    name: 'Spelling Castle',
    icon: '🏰',
    tagline: 'Syllables & phonetic construction',
    description: 'Scale majestic towers by clapping out word rhythm beats and assembling royal spelling blocks.',
    themeColor: '#7c3aed',
    accentBg: '#f5f3ff',
    defaultRequiredPoints: 150,
    activityIds: ['act_syllable_splitting', 'act_spelling_practice'],
  },
  rhyme_river: {
    id: 'rhyme_river',
    name: 'Rhyme River',
    icon: '🌊',
    tagline: 'Rhyme patterns & rhythm reading',
    description: 'Float downstream along crystal currents, hopping between rhyming lily pads and sailing reading ferries.',
    themeColor: '#0284c7',
    accentBg: '#f0f9ff',
    defaultRequiredPoints: 200,
    activityIds: ['act_rhyming_words', 'act_vocabulary_builder'],
  },
  storybook_kingdom: {
    id: 'storybook_kingdom',
    name: 'Storybook Kingdom',
    icon: '👑',
    tagline: 'Grand tale comprehension & crown quest',
    description: 'Reach the pinnacle palace! Read glorious illustrated tales and wear the celebrated DyslexiMate crown.',
    themeColor: '#ea580c',
    accentBg: '#fff7ed',
    defaultRequiredPoints: 250,
    activityIds: ['act_reading_comprehension'],
  },
};

export const DESTINATION_ORDER: DestinationId[] = [
  'phonics_garden',
  'word_workshop',
  'reading_forest',
  'story_castle',
  'vocabulary_island',
];

export const DEFAULT_DESTINATION_SETTINGS: Record<DestinationId, DestinationSetting> = Object.freeze({
  alphabet_forest: Object.freeze({ enabled: true, requiredPoints: 0 }),
  sound_safari: Object.freeze({ enabled: true, requiredPoints: 50 }),
  word_wonderland: Object.freeze({ enabled: true, requiredPoints: 100 }),
  spelling_castle: Object.freeze({ enabled: true, requiredPoints: 150 }),
  rhyme_river: Object.freeze({ enabled: true, requiredPoints: 200 }),
  storybook_kingdom: Object.freeze({ enabled: true, requiredPoints: 250 }),
  phonics_garden: Object.freeze({ enabled: true, requiredPoints: 0 }),
  word_workshop: Object.freeze({ enabled: true, requiredPoints: 50 }),
  reading_forest: Object.freeze({ enabled: true, requiredPoints: 100 }),
  story_castle: Object.freeze({ enabled: true, requiredPoints: 150 }),
  vocabulary_island: Object.freeze({ enabled: true, requiredPoints: 200 }),
}) as Record<DestinationId, DestinationSetting>;

const STORAGE_KEY_SETTINGS = 'dysleximate_adventure_settings_v1';

export class AdventureService {
  private static instance: AdventureService;
  private profileService: ProfileService;

  private constructor() {
    this.profileService = ProfileService.getInstance();
  }

  public static getInstance(): AdventureService {
    if (!AdventureService.instance) {
      AdventureService.instance = new AdventureService();
    }
    return AdventureService.instance;
  }

  /**
   * Retrieves child-specific adventure destination settings.
   * Merges persisted custom settings with initial defaults.
   */
  public async getChildSettings(childId: string): Promise<Record<DestinationId, DestinationSetting>> {
    if (!childId) {
      return this.getFreshDefaults();
    }

    // 1. Try reading from Supabase child_profiles.learning_preferences if connected (exclude local demo profiles)
    if (isSupabaseConfigured() && supabase && !childId.startsWith('child-demo-') && !childId.startsWith('child-aanya') && !childId.startsWith('child-kabir')) {
      try {
        const { data, error } = await supabase
          .from('child_profiles')
          .select('learning_preferences')
          .eq('id', childId)
          .maybeSingle();

        if (!error && data && data.learning_preferences) {
          const lp = data.learning_preferences as Record<string, unknown>;
          if (lp.adventureSettings && typeof lp.adventureSettings === 'object') {
            return this.mergeWithDefaults(lp.adventureSettings as Record<string, DestinationSetting>);
          }
        }
      } catch (err) {
        console.warn('AdventureService: Could not load settings from Supabase, falling back to local cache:', err);
      }
    }

    // 2. Read from local storage
    if (typeof localStorage !== 'undefined') {
      try {
        const raw = localStorage.getItem(STORAGE_KEY_SETTINGS);
        if (raw) {
          const allSettings = JSON.parse(raw) as Record<string, Record<string, DestinationSetting>>;
          if (allSettings[childId]) {
            return this.mergeWithDefaults(allSettings[childId]);
          }
        }
      } catch {
        // Fall back to defaults
      }
    }

    return this.getFreshDefaults();
  }

  public getFreshDefaults(): Record<DestinationId, DestinationSetting> {
    const copy: Record<DestinationId, DestinationSetting> = {} as any;
    for (const id of Object.keys(DEFAULT_DESTINATION_SETTINGS) as DestinationId[]) {
      copy[id] = { ...DEFAULT_DESTINATION_SETTINGS[id] };
    }
    return copy;
  }

  /**
   * Saves child-specific adventure settings.
   * Enforces:
   * 1. Valid parent ownership of child.
   * 2. Non-negative integer requirements.
   * 3. Boolean enabled flag.
   */
  public async saveChildSettings(
    parentId: string,
    childId: string,
    newSettings: Partial<Record<DestinationId, Partial<DestinationSetting>>>
  ): Promise<Record<DestinationId, DestinationSetting>> {
    if (!parentId || !childId) {
      throw new Error('Parent ID and Child ID are required to save adventure settings.');
    }

    // Verify parent ownership
    const child = await this.profileService.getChild(childId);
    if (!child) {
      throw new Error(`Child profile ${childId} was not found.`);
    }

    if (child.parentId !== parentId) {
      throw new Error('Unauthorized: You can only configure adventure settings for your own children.');
    }

    const current = await this.getChildSettings(childId);
    const sanitized: Record<DestinationId, DestinationSetting> = {} as any;
    for (const id of DESTINATION_ORDER) {
      sanitized[id] = {
        enabled: current[id]?.enabled ?? DEFAULT_DESTINATION_SETTINGS[id].enabled,
        requiredPoints: current[id]?.requiredPoints ?? DEFAULT_DESTINATION_SETTINGS[id].requiredPoints,
      };
    }

    for (const id of DESTINATION_ORDER) {
      const incoming = newSettings[id];
      if (incoming) {
        if (incoming.enabled !== undefined) {
          sanitized[id].enabled = Boolean(incoming.enabled);
        }
        if (incoming.requiredPoints !== undefined) {
          const pts = Number(incoming.requiredPoints);
          if (!Number.isFinite(pts) || !Number.isInteger(pts) || pts < 0) {
            throw new Error(`Invalid required Happy Points for ${ADVENTURE_DESTINATIONS[id].name}: must be a non-negative whole number.`);
          }
          sanitized[id].requiredPoints = pts;
        }
      }
    }

    // 1. Save to local storage
    if (typeof localStorage !== 'undefined') {
      try {
        const raw = localStorage.getItem(STORAGE_KEY_SETTINGS);
        const allSettings = raw ? (JSON.parse(raw) as Record<string, Record<string, DestinationSetting>>) : {};
        allSettings[childId] = sanitized;
        localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(allSettings));
      } catch (err) {
        console.warn('AdventureService: Could not save settings to localStorage:', err);
      }
    }

    // 2. Persist to Supabase if available
    if (isSupabaseConfigured() && supabase && !childId.startsWith('child-demo-') && !childId.startsWith('child-aanya') && !childId.startsWith('child-kabir')) {
      try {
        const { data } = await supabase
          .from('child_profiles')
          .select('learning_preferences')
          .eq('id', childId)
          .maybeSingle();

        const lp = (data?.learning_preferences as Record<string, unknown>) || {};
        lp.adventureSettings = sanitized;

        await supabase
          .from('child_profiles')
          .update({
            learning_preferences: lp,
            updated_at: new Date().toISOString(),
          })
          .eq('id', childId);
      } catch (err) {
        console.warn('AdventureService: Could not persist settings to Supabase:', err);
      }
    }

    return sanitized;
  }

  /**
   * Evaluates destination access for a child.
   * Pulls authoritative Happy Points from ProfileService and checks enabled + points threshold.
   */
  public async checkDestinationAccess(
    childId: string,
    destinationId: DestinationId
  ): Promise<DestinationAccessStatus> {
    const dest = ADVENTURE_DESTINATIONS[destinationId];
    if (!dest) {
      throw new Error(`Unknown destination: ${destinationId}`);
    }

    const settings = await this.getChildSettings(childId);
    const setting = settings[destinationId] || DEFAULT_DESTINATION_SETTINGS[destinationId];

    // Fetch authoritative Happy Points directly from progress records (never trusted from client input)
    const progress = this.profileService.getChildProgress(childId);
    const currentPoints = progress.happyPoints || 0;

    const activities = dest.activityIds
      .map(id => ACTIVITY_CATALOG.find(a => a.id === id))
      .filter((a): a is ActivityCatalogItem => a !== undefined);

    if (!setting.enabled) {
      return {
        destinationId,
        name: dest.name,
        icon: dest.icon,
        status: 'disabled',
        enabled: false,
        requiredPoints: setting.requiredPoints,
        currentPoints,
        pointsRemaining: Math.max(0, setting.requiredPoints - currentPoints),
        percentToUnlock: 0,
        allowed: false,
        message: 'This destination is resting (disabled by your parent). Ask your parent to enable it in Adventure Settings.',
        activities,
      };
    }

    if (currentPoints < setting.requiredPoints) {
      const remaining = setting.requiredPoints - currentPoints;
      const pct = setting.requiredPoints > 0 ? Math.min(100, Math.round((currentPoints / setting.requiredPoints) * 100)) : 100;
      return {
        destinationId,
        name: dest.name,
        icon: dest.icon,
        status: 'locked',
        enabled: true,
        requiredPoints: setting.requiredPoints,
        currentPoints,
        pointsRemaining: remaining,
        percentToUnlock: pct,
        allowed: false,
        message: `Keep practicing! You need ${remaining} more Happy Points to unlock ${dest.name} (${currentPoints}/${setting.requiredPoints} ⭐).`,
        activities,
      };
    }

    return {
      destinationId,
      name: dest.name,
      icon: dest.icon,
      status: 'unlocked',
      enabled: true,
      requiredPoints: setting.requiredPoints,
      currentPoints,
      pointsRemaining: 0,
      percentToUnlock: 100,
      allowed: true,
      message: `✨ Unlocked! You have reached ${setting.requiredPoints} Happy Points.`,
      activities,
    };
  }

  /**
   * Assembles the complete state of the My Adventure journey for a child.
   */
  public async getAdventureState(child: ChildProfile): Promise<AdventureChildState> {
    const progress = this.profileService.getChildProgress(child.id);
    const points = progress.happyPoints || 0;

    const destinationsMap: Record<DestinationId, DestinationAccessStatus> = {} as any;
    let unlockedCount = 0;

    for (const id of DESTINATION_ORDER) {
      const status = await this.checkDestinationAccess(child.id, id);
      destinationsMap[id] = status;
      if (status.status === 'unlocked') {
        unlockedCount += 1;
      }
    }

    const stickers: CollectibleSticker[] = [
      {
        id: 'stk_phonics',
        name: 'Seedling Sprouter',
        icon: '🌸',
        description: 'Unlocked Phonics Garden',
        earned: destinationsMap.phonics_garden.status === 'unlocked',
        unlockedAtPoints: destinationsMap.phonics_garden.requiredPoints,
        destinationId: 'phonics_garden',
      },
      {
        id: 'stk_workshop',
        name: 'Master Builder',
        icon: '🔨',
        description: 'Unlocked Word Workshop',
        earned: destinationsMap.word_workshop.status === 'unlocked',
        unlockedAtPoints: destinationsMap.word_workshop.requiredPoints,
        destinationId: 'word_workshop',
      },
      {
        id: 'stk_forest',
        name: 'Forest Pathfinder',
        icon: '🌲',
        description: 'Unlocked Reading Forest',
        earned: destinationsMap.reading_forest.status === 'unlocked',
        unlockedAtPoints: destinationsMap.reading_forest.requiredPoints,
        destinationId: 'reading_forest',
      },
      {
        id: 'stk_castle',
        name: 'Castle Scholar',
        icon: '🏰',
        description: 'Unlocked Story Castle',
        earned: destinationsMap.story_castle.status === 'unlocked',
        unlockedAtPoints: destinationsMap.story_castle.requiredPoints,
        destinationId: 'story_castle',
      },
      {
        id: 'stk_island',
        name: 'Island Explorer',
        icon: '🏝️',
        description: 'Unlocked Vocabulary Island',
        earned: destinationsMap.vocabulary_island.status === 'unlocked',
        unlockedAtPoints: destinationsMap.vocabulary_island.requiredPoints,
        destinationId: 'vocabulary_island',
      },
      {
        id: 'stk_century',
        name: 'Century Reader',
        icon: '⭐',
        description: 'Accumulated 100+ Happy Points',
        earned: points >= 100,
        unlockedAtPoints: 100,
      },
      {
        id: 'stk_champion',
        name: 'Grand Adventurer',
        icon: '🏆',
        description: 'Unlocked all 5 learning destinations',
        earned: unlockedCount === 5,
        unlockedAtPoints: 200,
      },
    ];

    const dailyQuests: DailyQuest[] = [
      {
        id: 'quest_practice',
        title: 'Complete a Practice Activity',
        icon: '🎮',
        targetCount: 1,
        currentCount: progress.practiceWins > 0 ? 1 : 0,
        completed: progress.practiceWins > 0,
        rewardPoints: 10,
      },
      {
        id: 'quest_minutes',
        title: 'Practice for 10 Minutes',
        icon: '⏱️',
        targetCount: 10,
        currentCount: Math.min(10, progress.practiceMinutes),
        completed: progress.practiceMinutes >= 10,
        rewardPoints: 15,
      },
      {
        id: 'quest_points',
        title: 'Reach 50+ Happy Points',
        icon: '✦',
        targetCount: 50,
        currentCount: Math.min(50, points),
        completed: points >= 50,
        rewardPoints: 20,
      },
    ];

    let mascotReaction: {
      mascot: string;
      text: string;
      emotion: 'happy' | 'encouraging' | 'celebrating' | 'curious';
    } = {
      mascot: '🦊',
      text: `Hello ${child.name}! Welcome to your reading adventure map. Explore each destination to earn stars!`,
      emotion: 'happy',
    };

    if (unlockedCount === 5) {
      mascotReaction = {
        mascot: '🦊',
        text: `Phenomenal reading, ${child.name}! All 5 adventure destinations are unlocked! You are a true Grand Adventurer! 🏆`,
        emotion: 'celebrating',
      };
    } else if (destinationsMap.vocabulary_island.status === 'unlocked') {
      mascotReaction = {
        mascot: '🦉',
        text: `You have sailed all the way to Vocabulary Island! Treasure troves of new words await your discovery! 🏝️`,
        emotion: 'celebrating',
      };
    } else if (destinationsMap.story_castle.status === 'unlocked') {
      mascotReaction = {
        mascot: '🦁',
        text: `The grand Story Castle gates are open! Step inside the royal library to read wonderful tales! 🏰`,
        emotion: 'encouraging',
      };
    } else if (destinationsMap.reading_forest.status === 'unlocked') {
      mascotReaction = {
        mascot: '🦉',
        text: `Welcome to the Reading Forest! Listen to the rhyming trees and follow the syllable streams! 🌲`,
        emotion: 'encouraging',
      };
    } else if (destinationsMap.word_workshop.status === 'unlocked') {
      mascotReaction = {
        mascot: '🦊',
        text: `Word Workshop is open! Let us hammer out new blend sounds and construct words together! 🔨`,
        emotion: 'happy',
      };
    } else {
      mascotReaction = {
        mascot: '🌸',
        text: `Welcome to Phonics Garden! Let us plant the seeds of letters and watch your reading grow! 🌱`,
        emotion: 'happy',
      };
    }

    return {
      childId: child.id,
      childName: child.name,
      avatar: child.avatar,
      happyPoints: points,
      destinations: destinationsMap,
      unlockedCount,
      totalDestinations: DESTINATION_ORDER.length,
      stickers,
      dailyQuests,
      mascotReaction,
    };
  }

  private mergeWithDefaults(saved: Record<string, DestinationSetting>): Record<DestinationId, DestinationSetting> {
    const result = this.getFreshDefaults();
    for (const id of DESTINATION_ORDER) {
      if (saved && saved[id]) {
        result[id] = {
          enabled: saved[id].enabled !== undefined ? Boolean(saved[id].enabled) : DEFAULT_DESTINATION_SETTINGS[id].enabled,
          requiredPoints:
            typeof saved[id].requiredPoints === 'number' && saved[id].requiredPoints >= 0
              ? Math.floor(saved[id].requiredPoints)
              : DEFAULT_DESTINATION_SETTINGS[id].requiredPoints,
        };
      }
    }
    return result;
  }
}
