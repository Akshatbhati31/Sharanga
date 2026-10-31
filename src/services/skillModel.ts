import type {
  SkillDefinition,
  ChildSkillState,
  LearningAttempt,
  NextAction,
} from '../types/adaptive';

/**
 * Standard registry of skills for DyslexiMate's skill-based progression model.
 * Organized into 10 structured domains with prerequisites.
 */
export const SKILL_REGISTRY: SkillDefinition[] = [
  // 1. Letter Recognition & Letter-Sound Association
  {
    id: 'skill_letter_sounds_basic',
    category: 'letter_recognition',
    name: 'Letter-Sound Association (Basic)',
    description: 'Recognize single alphabet letters and identify their primary phonetic sounds.',
    level: 1,
    prerequisites: [],
    languages: ['English', 'Hindi', 'Odia', 'Punjabi', 'Tamil', 'Bengali'],
    suggestedActivities: ['act_letter_sound_match', 'act_first_sound_safari'],
  },
  {
    id: 'skill_letter_sounds_vowels',
    category: 'letter_recognition',
    name: 'Short Vowel Sounds',
    description: 'Differentiate short vowel sounds (a, e, i, o, u) with auditory discrimination.',
    level: 1,
    prerequisites: ['skill_letter_sounds_basic'],
    languages: ['English', 'Hindi', 'Odia', 'Punjabi', 'Tamil', 'Bengali'],
    suggestedActivities: ['act_vowel_valley', 'act_vowel_sound_pop'],
  },

  // 2. Commonly Confused Letters and Words (Crucial for Dyslexia)
  {
    id: 'skill_confused_letters_bd',
    category: 'confused_letters',
    name: 'Letter Mirror: b vs d',
    description: 'Distinguish visual orientation and directionality of mirror letters b and d.',
    level: 2,
    prerequisites: ['skill_letter_sounds_basic'],
    languages: ['English', 'Hindi', 'Odia', 'Punjabi', 'Tamil', 'Bengali'],
    suggestedActivities: ['act_mirror_bd', 'act_baseball_bat_donut'],
  },
  {
    id: 'skill_confused_letters_pq',
    category: 'confused_letters',
    name: 'Letter Mirror: p vs q',
    description: 'Identify differences in tail direction and circle placement for p and q.',
    level: 2,
    prerequisites: ['skill_letter_sounds_basic'],
    languages: ['English', 'Hindi', 'Odia', 'Punjabi', 'Tamil', 'Bengali'],
    suggestedActivities: ['act_mirror_pq', 'act_parachute_queen'],
  },
  {
    id: 'skill_confused_words_reversals',
    category: 'confused_letters',
    name: 'Word Reversals (was/saw, no/on)',
    description: 'Recognize word order and left-to-right tracking to prevent reading reversals.',
    level: 2,
    prerequisites: ['skill_letter_sounds_basic'],
    languages: ['English', 'Hindi', 'Odia', 'Punjabi', 'Tamil', 'Bengali'],
    suggestedActivities: ['act_tracking_train', 'act_reversal_catcher'],
  },

  // 3. Phonemic Awareness
  {
    id: 'skill_phonemic_isolation',
    category: 'phonemic_awareness',
    name: 'Initial & Final Sound Isolation',
    description: 'Isolate the beginning and ending sounds in spoken words without reading text.',
    level: 1,
    prerequisites: ['skill_letter_sounds_basic'],
    languages: ['English', 'Hindi', 'Odia', 'Punjabi', 'Tamil', 'Bengali'],
    suggestedActivities: ['act_sound_detective', 'act_ending_bell'],
  },
  {
    id: 'skill_rhyming_patterns',
    category: 'phonemic_awareness',
    name: 'Rhyming Word Patterns',
    description: 'Identify words that share ending sound patterns (e.g., cat, bat, hat).',
    level: 2,
    prerequisites: ['skill_phonemic_isolation'],
    languages: ['English', 'Hindi', 'Odia', 'Punjabi', 'Tamil', 'Bengali'],
    suggestedActivities: ['act_rhyme_rocket', 'act_rhyme_match'],
  },

  // 4. Sound Blending & Segmentation
  {
    id: 'skill_cvc_blending',
    category: 'sound_blending',
    name: 'CVC Sound Blending',
    description: 'Blend consonant-vowel-consonant sounds into simple whole words (e.g., s-u-n -> sun).',
    level: 2,
    prerequisites: ['skill_letter_sounds_basic', 'skill_letter_sounds_vowels'],
    languages: ['English', 'Hindi', 'Odia', 'Punjabi', 'Tamil', 'Bengali'],
    suggestedActivities: ['act_blend_bridge', 'act_sound_zipper'],
  },
  {
    id: 'skill_consonant_blends',
    category: 'sound_blending',
    name: 'Consonant Digraphs & Blends (sh, ch, th)',
    description: 'Blend digraphs and two-consonant blends at the beginning or end of words.',
    level: 3,
    prerequisites: ['skill_cvc_blending'],
    languages: ['English', 'Hindi', 'Odia', 'Punjabi', 'Tamil', 'Bengali'],
    suggestedActivities: ['act_digraph_diver', 'act_blend_safari'],
  },

  // 5. Syllables & Word Decoding
  {
    id: 'skill_syllable_clapping',
    category: 'syllable_decoding',
    name: 'Syllable Chunking & Clapping',
    description: 'Break multi-syllabic words into bite-sized chunks using rhythm and vocal breaks.',
    level: 2,
    prerequisites: ['skill_phonemic_isolation'],
    languages: ['English', 'Hindi', 'Odia', 'Punjabi', 'Tamil', 'Bengali'],
    suggestedActivities: ['act_syllable_drums', 'act_chunk_builder'],
  },

  // 6. Spelling & Word Construction
  {
    id: 'skill_spelling_phonetic',
    category: 'spelling_construction',
    name: 'Phonetic Spelling Construction',
    description: 'Construct words letter by letter using voice and visual sound boxes.',
    level: 2,
    prerequisites: ['skill_cvc_blending'],
    languages: ['English', 'Hindi', 'Odia', 'Punjabi', 'Tamil', 'Bengali'],
    suggestedActivities: ['act_say_it_spell_it', 'act_letter_blocks'],
  },

  // 7. Vocabulary & Sight Words
  {
    id: 'skill_sight_words_high_freq',
    category: 'vocabulary',
    name: 'High-Frequency Sight Words',
    description: 'Recognize essential non-phonetic sight words with instant visual familiarity.',
    level: 2,
    prerequisites: ['skill_letter_sounds_basic'],
    languages: ['English', 'Hindi', 'Odia', 'Punjabi', 'Tamil', 'Bengali'],
    suggestedActivities: ['act_sight_word_splash', 'act_word_lanterns'],
  },

  // 8. Reading Fluency
  {
    id: 'skill_sentence_fluency',
    category: 'reading_fluency',
    name: 'Paced Sentence Reading',
    description: 'Read short decodable sentences with steady pacing, highlighted words, and gentle rhythm.',
    level: 3,
    prerequisites: ['skill_cvc_blending', 'skill_sight_words_high_freq'],
    languages: ['English', 'Hindi', 'Odia', 'Punjabi', 'Tamil', 'Bengali'],
    suggestedActivities: ['act_karaoke_reader', 'act_river_pacing'],
  },

  // 9. Reading Comprehension
  {
    id: 'skill_story_comprehension',
    category: 'reading_comprehension',
    name: 'Illustrated Story Comprehension',
    description: 'Answer friendly questions about main ideas, characters, and events from short stories.',
    level: 3,
    prerequisites: ['skill_sentence_fluency'],
    languages: ['English', 'Hindi', 'Odia', 'Punjabi', 'Tamil', 'Bengali'],
    suggestedActivities: ['act_sunny_kite_story', 'act_mina_river_story'],
  },

  // 10. Listening & Pronunciation Support
  {
    id: 'skill_listening_pronunciation',
    category: 'listening_pronunciation',
    name: 'Audio-Assisted Pronunciation',
    description: 'Listen to clear acoustic pronunciations and practice voicing phonemes with immediate coaching.',
    level: 1,
    prerequisites: ['skill_letter_sounds_basic'],
    languages: ['English', 'Hindi', 'Odia', 'Punjabi', 'Tamil', 'Bengali'],
    suggestedActivities: ['act_voice_coach', 'act_echo_read'],
  },
];

/**
 * Finds a skill definition by ID.
 */
export function getSkillDefinition(skillId: string): SkillDefinition | undefined {
  return SKILL_REGISTRY.find(s => s.id === skillId);
}

/**
 * Generates an initial default skill state for a new child.
 * Marked as provisional until enough attempts are gathered.
 */
export function createInitialSkillState(childId: string, skillId: string): ChildSkillState {
  const def = getSkillDefinition(skillId);
  return {
    skillId,
    childId,
    currentLevel: def?.level || 1,
    estimatedMastery: 0.1, // Low baseline estimate
    confidence: 0.1, // Low confidence initially (provisional)
    recentAccuracy: 0.0,
    attemptsCount: 0,
    consecutiveSuccesses: 0,
    consecutiveStruggles: 0,
    lastPracticed: null,
    recommendedNextAction: 'introduce',
    missedPatterns: [],
    isProvisional: true,
  };
}

/**
 * Updates a child's skill state after a completed learning attempt.
 * Uses explainable mastery rules with conservative adjustments.
 */
export function updateSkillStateWithAttempt(
  currentState: ChildSkillState,
  attempt: LearningAttempt
): ChildSkillState {
  const attemptsCount = currentState.attemptsCount + 1;
  const accuracy = Math.max(0, Math.min(1, attempt.accuracy));

  // Weight recent attempt: Exponential Moving Average (alpha = 0.35)
  const prevAcc = currentState.recentAccuracy || accuracy;
  const recentAccuracy = Math.round((prevAcc * 0.65 + accuracy * 0.35) * 100) / 100;

  // Confidence grows with attempt count and decays with long idle gaps
  // 1 attempt: ~0.3, 3 attempts: ~0.6, 5+ attempts: ~0.85+
  const confidence = Math.min(0.95, Math.round((1 - Math.exp(-attemptsCount / 2.8)) * 100) / 100);

  // Success / Struggle streak tracking
  let consecutiveSuccesses = currentState.consecutiveSuccesses;
  let consecutiveStruggles = currentState.consecutiveStruggles;

  if (accuracy >= 0.75) {
    consecutiveSuccesses += 1;
    consecutiveStruggles = 0;
  } else if (accuracy <= 0.55) {
    consecutiveStruggles += 1;
    consecutiveSuccesses = 0;
  } else {
    // Neutral attempt: soft decay
    consecutiveSuccesses = Math.max(0, consecutiveSuccesses - 1);
    consecutiveStruggles = Math.max(0, consecutiveStruggles - 1);
  }

  // Mastery calculation: combines recent accuracy, streak, and accounts for hints needed
  // If child needed many hints to answer, mastery increases cautiously
  const hintDiscount = Math.min(0.2, attempt.hintsRequested * 0.04);
  const effectiveAccuracy = Math.max(0, accuracy - hintDiscount);

  let estimatedMastery = currentState.estimatedMastery * 0.55 + effectiveAccuracy * 0.45;
  if (consecutiveSuccesses >= 2) {
    estimatedMastery = Math.min(1.0, estimatedMastery + 0.06);
  }
  estimatedMastery = Math.round(estimatedMastery * 100) / 100;

  // Determine next action
  let recommendedNextAction: NextAction = 'practice';
  if (estimatedMastery >= 0.8 && confidence >= 0.6) {
    recommendedNextAction = 'mastered';
  } else if (consecutiveStruggles >= 2) {
    recommendedNextAction = 'reinforce';
  } else if (attemptsCount === 1 && accuracy >= 0.85) {
    recommendedNextAction = 'practice';
  } else if (attemptsCount === 0) {
    recommendedNextAction = 'introduce';
  }

  // Accumulate missed patterns without duplicates
  const missedPatterns = Array.from(
    new Set([...currentState.missedPatterns, ...attempt.missedItems])
  ).slice(-8); // Keep last 8 unique patterns

  // Level progression
  let currentLevel = currentState.currentLevel;
  if (estimatedMastery >= 0.85 && confidence >= 0.65 && consecutiveSuccesses >= 2) {
    currentLevel = Math.min(5, currentLevel + 1);
  } else if (consecutiveStruggles >= 3 && currentLevel > 1) {
    currentLevel = Math.max(1, currentLevel - 1);
  }

  return {
    ...currentState,
    currentLevel,
    estimatedMastery,
    confidence,
    recentAccuracy,
    attemptsCount,
    consecutiveSuccesses,
    consecutiveStruggles,
    lastPracticed: attempt.completedAt,
    recommendedNextAction,
    missedPatterns,
    isProvisional: attemptsCount < 3,
  };
}
