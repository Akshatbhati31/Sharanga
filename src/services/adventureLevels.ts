import type { ChildProfile, ChildLearningData } from '../types/auth';
import type { ChildSkillState } from '../types/adaptive';

export type DestinationKey =
  | 'alphabet_forest'
  | 'sound_safari'
  | 'word_wonderland'
  | 'spelling_castle'
  | 'rhyme_river'
  | 'storybook_kingdom';

export interface MilestoneReward {
  levelNumber: number;
  title: string;
  icon: string;
  bonusPoints: number;
  badgeName: string;
  badgeIcon: string;
}

export interface AdventureDestinationMeta {
  key: DestinationKey;
  name: string;
  icon: string;
  tagline: string;
  themeColor: string;
  accentBg: string;
  darkAccentBg: string;
  levelNumbers: number[];
}

export interface AdventureLevelDef {
  levelNumber: number;
  id: string;
  destinationKey: DestinationKey;
  destinationName: string;
  destinationIcon: string;
  title: string;
  skillId: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  icon: string;
  objective: string;
  description: string;
  rewardPoints: number;
  milestone?: MilestoneReward;
  xPercent: number; // For S-curve candy-crush winding path
}

export interface LevelWithStatus extends AdventureLevelDef {
  status: 'completed' | 'current' | 'locked';
  stars: number; // 0, 1, 2, 3
  accuracyPercent: number;
  attemptsCount: number;
}

export const ADVENTURE_DESTINATIONS_META: Record<DestinationKey, AdventureDestinationMeta> = {
  alphabet_forest: {
    key: 'alphabet_forest',
    name: 'Alphabet Forest',
    icon: '🌲',
    tagline: 'Letter sounds & mirror discoveries',
    themeColor: '#059669',
    accentBg: '#ecfdf5',
    darkAccentBg: '#064e3b',
    levelNumbers: [1, 2, 3],
  },
  sound_safari: {
    key: 'sound_safari',
    name: 'Sound Safari',
    icon: '🦁',
    tagline: 'Phonemic awareness & sound blending',
    themeColor: '#d97706',
    accentBg: '#fffbeb',
    darkAccentBg: '#78350f',
    levelNumbers: [4, 5, 6],
  },
  word_wonderland: {
    key: 'word_wonderland',
    name: 'Word Wonderland',
    icon: '🍭',
    tagline: 'Digraphs, blends & sight words',
    themeColor: '#db2777',
    accentBg: '#fdf2f8',
    darkAccentBg: '#831843',
    levelNumbers: [7, 8, 9],
  },
  spelling_castle: {
    key: 'spelling_castle',
    name: 'Spelling Castle',
    icon: '🏰',
    tagline: 'Syllables & phonetic construction',
    themeColor: '#7c3aed',
    accentBg: '#f5f3ff',
    darkAccentBg: '#4c1d95',
    levelNumbers: [10, 11, 12],
  },
  rhyme_river: {
    key: 'rhyme_river',
    name: 'Rhyme River',
    icon: '🌊',
    tagline: 'Rhyme patterns & rhythm reading',
    themeColor: '#0284c7',
    accentBg: '#f0f9ff',
    darkAccentBg: '#0c4a6e',
    levelNumbers: [13, 14],
  },
  storybook_kingdom: {
    key: 'storybook_kingdom',
    name: 'Storybook Kingdom',
    icon: '👑',
    tagline: 'Grand tale comprehension & crown quest',
    themeColor: '#ea580c',
    accentBg: '#fff7ed',
    darkAccentBg: '#7c2d12',
    levelNumbers: [15],
  },
};

export const ADVENTURE_LEVELS: AdventureLevelDef[] = [
  // Destination 1: Alphabet Forest
  {
    levelNumber: 1,
    id: 'lvl_1_letter_sounds',
    destinationKey: 'alphabet_forest',
    destinationName: 'Alphabet Forest',
    destinationIcon: '🌲',
    title: 'Letter Blossom Basics',
    skillId: 'skill_letter_sounds_basic',
    difficulty: 'beginner',
    icon: '🌱',
    objective: 'Match letters with their cheerful acoustic sounds and friendly clues.',
    description: 'Welcome to Alphabet Forest! Listen to joyful sound notes and spot the right letter blossom.',
    rewardPoints: 15,
    xPercent: 50,
  },
  {
    levelNumber: 2,
    id: 'lvl_2_short_vowels',
    destinationKey: 'alphabet_forest',
    destinationName: 'Alphabet Forest',
    destinationIcon: '🌲',
    title: 'Sunny Vowel Glade',
    skillId: 'skill_letter_sounds_vowels',
    difficulty: 'beginner',
    icon: '☀️',
    objective: 'Distinguish the 5 short vowel sounds (a, e, i, o, u) with musical ear training.',
    description: 'Listen to the forest choir and discover the vowel sounds hidden in sunny tree branches.',
    rewardPoints: 15,
    xPercent: 72,
  },
  {
    levelNumber: 3,
    id: 'lvl_3_mirror_bd',
    destinationKey: 'alphabet_forest',
    destinationName: 'Alphabet Forest',
    destinationIcon: '🌲',
    title: 'Mirror Tree (b vs d)',
    skillId: 'skill_confused_letters_bd',
    difficulty: 'beginner',
    icon: '🦋',
    objective: 'Master lowercase b and d using the bat-and-ball direction trick.',
    description: 'Solve the curious mirror mystery so b and d never trick your eyes again!',
    rewardPoints: 20,
    xPercent: 62,
    milestone: {
      levelNumber: 3,
      title: 'Forest Treasure Chest',
      icon: '🎁',
      bonusPoints: 25,
      badgeName: 'Forest Seedling',
      badgeIcon: '🌲',
    },
  },

  // Destination 2: Sound Safari
  {
    levelNumber: 4,
    id: 'lvl_4_sound_isolation',
    destinationKey: 'sound_safari',
    destinationName: 'Sound Safari',
    destinationIcon: '🦁',
    title: 'Whispering Pawprints',
    skillId: 'skill_phonemic_isolation',
    difficulty: 'beginner',
    icon: '🐾',
    objective: 'Isolate beginning and ending sounds in spoken safari animal words.',
    description: 'Listen closely to the gentle rustle in the grass and catch the first sound in every word.',
    rewardPoints: 20,
    xPercent: 32,
  },
  {
    levelNumber: 5,
    id: 'lvl_5_cvc_blending',
    destinationKey: 'sound_safari',
    destinationName: 'Sound Safari',
    destinationIcon: '🦁',
    title: 'Safari CVC Blending',
    skillId: 'skill_cvc_blending',
    difficulty: 'beginner',
    icon: '🦁',
    objective: 'Blend 3 individual sounds into completeWords (e.g. s + u + n = sun).',
    description: 'Guide the friendly lion cub across stepping stones by zipping letter sounds together.',
    rewardPoints: 20,
    xPercent: 24,
  },
  {
    levelNumber: 6,
    id: 'lvl_6_mirror_pq',
    destinationKey: 'sound_safari',
    destinationName: 'Sound Safari',
    destinationIcon: '🦁',
    title: 'Mirror Riddle (p vs q)',
    skillId: 'skill_confused_letters_pq',
    difficulty: 'intermediate',
    icon: '🦜',
    objective: 'Distinguish the tails and circles of lowercase p and q.',
    description: 'Help the colourful parrot spot whether the tail points left or right in the safari canopy.',
    rewardPoints: 25,
    xPercent: 44,
    milestone: {
      levelNumber: 6,
      title: 'Safari Golden Compass',
      icon: '🧭',
      bonusPoints: 35,
      badgeName: 'Safari Scout',
      badgeIcon: '🦁',
    },
  },

  // Destination 3: Word Wonderland
  {
    levelNumber: 7,
    id: 'lvl_7_digraph_path',
    destinationKey: 'word_wonderland',
    destinationName: 'Word Wonderland',
    destinationIcon: '🍭',
    title: 'Rainbow Digraph Trail',
    skillId: 'skill_consonant_blends',
    difficulty: 'intermediate',
    icon: '🌈',
    objective: 'Blend two-letter consonant buddies like sh, ch, and th.',
    description: 'Step onto the rainbow bridge where letters join hands to make brand new friendly sounds!',
    rewardPoints: 25,
    xPercent: 74,
  },
  {
    levelNumber: 8,
    id: 'lvl_8_word_reversals',
    destinationKey: 'word_wonderland',
    destinationName: 'Word Wonderland',
    destinationIcon: '🍭',
    title: 'Word Flip Carousel',
    skillId: 'skill_confused_words_reversals',
    difficulty: 'intermediate',
    icon: '🍭',
    objective: 'Track left-to-right to distinguish reversals like was vs saw, no vs on.',
    description: 'Spin the candy carousel and read from left to right so words never turn backwards.',
    rewardPoints: 25,
    xPercent: 64,
  },
  {
    levelNumber: 9,
    id: 'lvl_9_sight_words',
    destinationKey: 'word_wonderland',
    destinationName: 'Word Wonderland',
    destinationIcon: '🍭',
    title: 'Sparkling Sight Words',
    skillId: 'skill_sight_words_high_freq',
    difficulty: 'intermediate',
    icon: '✨',
    objective: 'Spot high-frequency sight words with instant visual familiarity.',
    description: 'Collect twinkling star gems by recognizing common words in the blink of an eye!',
    rewardPoints: 30,
    xPercent: 36,
    milestone: {
      levelNumber: 9,
      title: 'Wonderland Crystal Wand',
      icon: '🪄',
      bonusPoints: 40,
      badgeName: 'Word Wizard',
      badgeIcon: '🧙‍♂️',
    },
  },

  // Destination 4: Spelling Castle
  {
    levelNumber: 10,
    id: 'lvl_10_syllable_clapping',
    destinationKey: 'spelling_castle',
    destinationName: 'Spelling Castle',
    destinationIcon: '🏰',
    title: 'Clapping Drawbridge',
    skillId: 'skill_syllable_clapping',
    difficulty: 'intermediate',
    icon: '👏',
    objective: 'Clap out word rhythm beats and decode words chunk by chunk.',
    description: 'Lower the castle drawbridge by clapping out the musical syllables of castle guard words.',
    rewardPoints: 30,
    xPercent: 32,
  },
  {
    levelNumber: 11,
    id: 'lvl_11_phonetic_spelling',
    destinationKey: 'spelling_castle',
    destinationName: 'Spelling Castle',
    destinationIcon: '🏰',
    title: 'Royal Sound Blocks',
    skillId: 'skill_spelling_phonetic',
    difficulty: 'intermediate',
    icon: '🧱',
    objective: 'Construct words letter by letter using voice and sound boxes.',
    description: 'Fit the golden stones together to spell triumphant words for the royal library.',
    rewardPoints: 30,
    xPercent: 56,
  },
  {
    levelNumber: 12,
    id: 'lvl_12_echo_speech',
    destinationKey: 'spelling_castle',
    destinationName: 'Spelling Castle',
    destinationIcon: '🏰',
    title: 'Echo Chamber Speech',
    skillId: 'skill_listening_pronunciation',
    difficulty: 'intermediate',
    icon: '🗣️',
    objective: 'Practice clear auditory listening and speech pronunciation with gentle coaching.',
    description: 'Listen to the castle echo and voice each sound clearly with gentle encouraging hints.',
    rewardPoints: 35,
    xPercent: 74,
    milestone: {
      levelNumber: 12,
      title: 'Royal Knight Banner',
      icon: '🛡️',
      bonusPoints: 45,
      badgeName: 'Castle Knight',
      badgeIcon: '⭐',
    },
  },

  // Destination 5: Rhyme River
  {
    levelNumber: 13,
    id: 'lvl_13_rhyme_patterns',
    destinationKey: 'rhyme_river',
    destinationName: 'Rhyme River',
    destinationIcon: '🌊',
    title: 'River Lily Rhymes',
    skillId: 'skill_rhyming_patterns',
    difficulty: 'intermediate',
    icon: '🪷',
    objective: 'Identify words that share magical ending sound patterns.',
    description: 'Hop from lily pad to lily pad by choosing words that rhyme like cat, bat, and hat.',
    rewardPoints: 35,
    xPercent: 42,
  },
  {
    levelNumber: 14,
    id: 'lvl_14_sentence_fluency',
    destinationKey: 'rhyme_river',
    destinationName: 'Rhyme River',
    destinationIcon: '🌊',
    title: 'Paced River Ferry',
    skillId: 'skill_sentence_fluency',
    difficulty: 'advanced',
    icon: '⛵',
    objective: 'Read short decodable sentences with steady pacing and gentle rhythm.',
    description: 'Sail the calm river waters while reading sentence stories with the visual reading ruler.',
    rewardPoints: 40,
    xPercent: 26,
    milestone: {
      levelNumber: 14,
      title: 'Golden River Oar',
      icon: '🚣',
      bonusPoints: 50,
      badgeName: 'River Navigator',
      badgeIcon: '🌊',
    },
  },

  // Destination 6: Storybook Kingdom
  {
    levelNumber: 15,
    id: 'lvl_15_story_comprehension',
    destinationKey: 'storybook_kingdom',
    destinationName: 'Storybook Kingdom',
    destinationIcon: '👑',
    title: 'Crown Story Quest',
    skillId: 'skill_story_comprehension',
    difficulty: 'advanced',
    icon: '👑',
    objective: 'Read an illustrated fairytale and answer celebratory comprehension questions.',
    description: 'Reach the pinnacle of the kingdom! Read the grand tale and earn your golden DyslexiMate crown!',
    rewardPoints: 50,
    xPercent: 50,
    milestone: {
      levelNumber: 15,
      title: 'Grand DyslexiMate Trophy',
      icon: '🏆',
      bonusPoints: 100,
      badgeName: 'Story Master',
      badgeIcon: '👑',
    },
  },
];

export interface AdventureMapState {
  levels: LevelWithStatus[];
  currentLevel: LevelWithStatus;
  totalStars: number;
  maxPossibleStars: number;
  completedCount: number;
  highestUnlockedLevelNumber: number;
  currentDestination: AdventureDestinationMeta;
  activeChildHappyPoints: number;
}

export function computeAdventureMapState(
  _child: ChildProfile,
  skillStates: Record<string, ChildSkillState>,
  progress: ChildLearningData
): AdventureMapState {
  let highestUnlockedNumber = 1;

  // Derive unlocked levels based on actual child progress & attempts
  const happyPoints = progress.happyPoints || 0;
  // Baseline unlock from Happy Points: every 18 happy points opens at least 1 more level
  const pointsUnlockedTier = Math.min(15, Math.floor(happyPoints / 18) + 1);

  const levelsWithStatus: LevelWithStatus[] = ADVENTURE_LEVELS.map(def => {
    const skillState = skillStates[def.skillId];
    const recentSkillActivity = progress.recentActivities?.find(
      a => a.id === def.skillId || a.title.toLowerCase().includes(def.title.toLowerCase())
    );

    const attemptsCount = (skillState?.attemptsCount || 0) + (recentSkillActivity ? 1 : 0);
    const accuracyPercent = skillState
      ? Math.round(skillState.recentAccuracy * 100)
      : (recentSkillActivity ? 90 : 0);

    const isMasteredOrAdvanced =
      skillState && (skillState.estimatedMastery >= 0.8 || skillState.consecutiveSuccesses >= 2);
    const isCompleted =
      attemptsCount > 0 || isMasteredOrAdvanced || (def.levelNumber < pointsUnlockedTier);

    let stars = 0;
    if (isCompleted) {
      if (accuracyPercent >= 85 || isMasteredOrAdvanced || def.levelNumber < pointsUnlockedTier) {
        stars = 3;
      } else if (accuracyPercent >= 70) {
        stars = 2;
      } else {
        stars = 1;
      }
    }

    return {
      ...def,
      status: isCompleted ? 'completed' : 'locked',
      stars,
      accuracyPercent,
      attemptsCount,
    };
  });

  // Calculate actual level unlocking based on completion progression
  for (let i = 0; i < levelsWithStatus.length; i++) {
    const lvl = levelsWithStatus[i];
    if (lvl.status === 'completed') {
      highestUnlockedNumber = Math.max(highestUnlockedNumber, Math.min(15, lvl.levelNumber + 1));
    }
  }

  // Ensure points tier is also respected
  highestUnlockedNumber = Math.max(highestUnlockedNumber, pointsUnlockedTier, 1);

  let currentLevelFound = false;
  for (const lvl of levelsWithStatus) {
    if (lvl.levelNumber <= highestUnlockedNumber) {
      if (lvl.status !== 'completed' && !currentLevelFound) {
        lvl.status = 'current';
        currentLevelFound = true;
      } else if (lvl.status !== 'completed') {
        lvl.status = 'locked';
      }
    } else {
      lvl.status = 'locked';
    }
  }

  // If all completed, current is level 15
  if (!currentLevelFound) {
    const last = levelsWithStatus[levelsWithStatus.length - 1];
    if (last) last.status = 'current';
  }

  const currentLevel = levelsWithStatus.find(l => l.status === 'current') || levelsWithStatus[0];
  const totalStars = levelsWithStatus.reduce((sum, l) => sum + l.stars, 0);
  const completedCount = levelsWithStatus.filter(l => l.status === 'completed').length;
  const currentDestination = ADVENTURE_DESTINATIONS_META[currentLevel.destinationKey];

  return {
    levels: levelsWithStatus,
    currentLevel,
    totalStars,
    maxPossibleStars: levelsWithStatus.length * 3,
    completedCount,
    highestUnlockedLevelNumber: highestUnlockedNumber,
    currentDestination,
    activeChildHappyPoints: happyPoints,
  };
}
