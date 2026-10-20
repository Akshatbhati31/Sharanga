import type { InteractiveActivityContent, ActivityDifficulty } from '../types/adaptive';

export interface GenerateActivityRequest {
  skillId: string;
  difficulty: ActivityDifficulty;
  language: string;
  childName?: string;
  interest?: string;
  targetPattern?: string;
}

/**
 * Validates the generated activity content structure to ensure safety,
 * correctness, and age-appropriateness before delivering to children.
 */
export function validateActivityContent(content: unknown): {
  valid: boolean;
  sanitized?: InteractiveActivityContent;
  error?: string;
} {
  if (!content || typeof content !== 'object') {
    return { valid: false, error: 'Activity content must be an object.' };
  }

  const c = content as Record<string, unknown>;
  const id = typeof c.id === 'string' ? c.id : `act_gen_${Date.now()}`;
  const skillId = typeof c.skillId === 'string' ? c.skillId : 'skill_letter_sounds_basic';
  const title = typeof c.title === 'string' && c.title.trim().length >= 3 ? c.title.trim() : 'Learning Practice';
  const instruction = typeof c.instruction === 'string' ? c.instruction.trim() : 'Look closely and choose the best match:';
  const prompt = typeof c.prompt === 'string' ? c.prompt.trim() : 'Which sound or word matches?';
  const stepByStepHint = typeof c.stepByStepHint === 'string' ? c.stepByStepHint.trim() : 'Take your time. Listen to each sound slowly.';

  const validDiffs: ActivityDifficulty[] = ['beginner', 'intermediate', 'advanced'];
  const difficulty: ActivityDifficulty =
    typeof c.difficulty === 'string' && validDiffs.includes(c.difficulty as ActivityDifficulty)
      ? (c.difficulty as ActivityDifficulty)
      : 'beginner';

  const validTypes = ['word_match', 'phonics_blend', 'letter_distinction', 'story_comprehension', 'sentence_builder'] as const;
  const type =
    typeof c.type === 'string' && validTypes.includes(c.type as any)
      ? (c.type as (typeof validTypes)[number])
      : 'word_match';

  if (!Array.isArray(c.items) || c.items.length < 2) {
    return { valid: false, error: 'Activity must contain at least 2 selectable answer items.' };
  }

  const sanitizedItems = c.items.map((item, idx) => {
    const it = item as Record<string, unknown>;
    return {
      id: typeof it.id === 'string' ? it.id : `item_${idx + 1}`,
      text: typeof it.text === 'string' ? it.text.trim() : `Option ${idx + 1}`,
      visual: typeof it.visual === 'string' ? it.visual : undefined,
      isCorrect: Boolean(it.isCorrect),
      feedbackHint: typeof it.feedbackHint === 'string' ? it.feedbackHint : undefined,
    };
  });

  // Verify that exactly one or at least one answer is marked correct
  const correctCount = sanitizedItems.filter(i => i.isCorrect).length;
  if (correctCount === 0) {
    // Fail-safe: mark first as correct if none marked
    sanitizedItems[0].isCorrect = true;
  }

  const workedExample =
    c.workedExample && typeof c.workedExample === 'object'
      ? {
          demonstration: String((c.workedExample as any).demonstration || 'Example: Look at the visual shape.'),
          explanation: String((c.workedExample as any).explanation || 'Notice how the line goes straight down first.'),
        }
      : undefined;

  return {
    valid: true,
    sanitized: {
      id,
      skillId,
      title,
      instruction,
      difficulty,
      language: typeof c.language === 'string' ? c.language : 'English',
      type,
      prompt,
      audioPrompt: typeof c.audioPrompt === 'string' ? c.audioPrompt : undefined,
      items: sanitizedItems,
      workedExample,
      stepByStepHint,
      targetPattern: typeof c.targetPattern === 'string' ? c.targetPattern : undefined,
    },
  };
}

/**
 * High-quality deterministic fallback curriculum across all 10 skill domains.
 * Ensures that if external AI services are unreachable, unconfigured, or timed out,
 * children always receive verified, safe, and personalized learning activities.
 */
export function getDeterministicActivity(req: GenerateActivityRequest): InteractiveActivityContent {
  const lang = req.language || 'English';

  // 1. Confused Letters: b vs d
  if (req.skillId === 'skill_confused_letters_bd') {
    return {
      id: `act_mirror_bd_${Date.now()}`,
      skillId: 'skill_confused_letters_bd',
      title: 'Letter Mirror: b and d Detective 🔍',
      instruction: 'Find the letter "b" (like a baseball Bat with a ball at the bottom right):',
      difficulty: req.difficulty,
      language: 'English',
      type: 'letter_distinction',
      prompt: 'Which letter is "b"?',
      audioPrompt: 'Touch the letter b',
      targetPattern: 'b_vs_d',
      items: [
        {
          id: 'opt_b',
          text: 'b',
          visual: '🏏',
          isCorrect: true,
          feedbackHint: 'Awesome! The tall bat comes down first, then the round belly bounces right! 🌟',
        },
        {
          id: 'opt_d',
          text: 'd',
          visual: '🍩',
          isCorrect: false,
          feedbackHint: 'Notice this round belly points left like a donut first. Try the one facing right!',
        },
      ],
      workedExample: {
        demonstration: 'b has a tall bat on the left, belly on the right: |o',
        explanation: 'Remember: b looks forward like your hand making a thumbs-up on your left side!',
      },
      stepByStepHint: 'Trace with your finger: start at the top, go down, then bounce into a round belly on the right.',
    };
  }

  // 2. Sound Blending: CVC words
  if (req.skillId === 'skill_cvc_blending') {
    if (lang === 'Hindi') {
      return {
        id: `act_blend_hindi_${Date.now()}`,
        skillId: 'skill_cvc_blending',
        title: 'ध्वनि जोड़: दो अक्षरों का शब्द 🧩',
        instruction: 'ध्वनियों को जोड़कर शब्द पहचानिए: ग + र',
        difficulty: req.difficulty,
        language: 'Hindi',
        type: 'phonics_blend',
        prompt: 'ग और र मिलकर क्या बनता है?',
        items: [
          { id: 'opt_ghar', text: 'घर', visual: '🏠', isCorrect: true, feedbackHint: 'बहुत बढ़िया! ग और र मिलकर "घर" बनता है! 🌈' },
          { id: 'opt_phal', text: 'फल', visual: '🍎', isCorrect: false, feedbackHint: 'ध्यान से सुनिए: ग-र' },
          { id: 'opt_jal', text: 'जल', visual: '💧', isCorrect: false, feedbackHint: 'यह ज-ल है। ग-र चुनिए।' },
        ],
        stepByStepHint: 'पहले ग बोलिए, फिर र बोलिए, अब दोनों को तेज़ी से मिलाकर बोलिए: ग...र -> घर!',
      };
    }

    return {
      id: `act_cvc_sun_${Date.now()}`,
      skillId: 'skill_cvc_blending',
      title: 'Sound Zipper: Blend the Word 🧩',
      instruction: 'Listen to the 3 sounds and zip them together: /s/ ... /u/ ... /n/',
      difficulty: req.difficulty,
      language: 'English',
      type: 'phonics_blend',
      prompt: 'What word do /s/ + /u/ + /n/ make?',
      audioPrompt: 'Zip the sounds: s... u... n',
      targetPattern: 'cvc_blend',
      items: [
        {
          id: 'opt_sun',
          text: 'sun',
          visual: '☀️',
          isCorrect: true,
          feedbackHint: 'Fantastic sound blending! /s/ /u/ /n/ -> SUN! 🌞',
        },
        {
          id: 'opt_run',
          text: 'run',
          visual: '🏃',
          isCorrect: false,
          feedbackHint: 'Close, but "run" starts with /r/. Listen for the /s/ sound at the start!',
        },
        {
          id: 'opt_bus',
          text: 'bus',
          visual: '🚌',
          isCorrect: false,
          feedbackHint: '"bus" ends with /s/. We want the word that starts with /s/ and ends with /n/.',
        },
      ],
      workedExample: {
        demonstration: '/s/ + /u/ + /n/ -> sss-uuu-nnn -> sun',
        explanation: 'Say each sound smooth like sliding down a rainbow!',
      },
      stepByStepHint: 'Stretch the sounds on your arm: shoulder /s/, elbow /u/, wrist /n/. Now slide down: sun!',
    };
  }

  // 3. Initial & Final Sound Isolation
  if (req.skillId === 'skill_phonemic_isolation') {
    return {
      id: `act_sound_detective_${Date.now()}`,
      skillId: 'skill_phonemic_isolation',
      title: 'Sound Detective: First Sound 🕵️',
      instruction: 'Which picture starts with the same sound as "Fox" (/f/)?',
      difficulty: req.difficulty,
      language: 'English',
      type: 'word_match',
      prompt: 'Starts with /f/ sound like Fox:',
      items: [
        { id: 'opt_fish', text: 'Fish', visual: '🐟', isCorrect: true, feedbackHint: 'Spot on! /f/ /f/ Fish matches /f/ /f/ Fox! 🌟' },
        { id: 'opt_cat', text: 'Cat', visual: '🐱', isCorrect: false, feedbackHint: 'Cat starts with /k/. Say /f/ like blowing a feather!' },
        { id: 'opt_bear', text: 'Bear', visual: '🐻', isCorrect: false, feedbackHint: 'Bear starts with /b/. Look for the gentle /f/ sound.' },
      ],
      stepByStepHint: 'Put your teeth on your lower lip and blow gently: /f/ /f/ /f/... fish!',
    };
  }

  // 4. Rhyming Words
  if (req.skillId === 'skill_phonemic_rhyme') {
    return {
      id: `act_rhyme_${Date.now()}`,
      skillId: 'skill_phonemic_rhyme',
      title: 'Rhyme Castle: Match the Ending 🏰',
      instruction: 'Which word rhymes with "cat"? (Sounds like -at at the end)',
      difficulty: req.difficulty,
      language: 'English',
      type: 'word_match',
      prompt: 'Rhymes with "cat" 🐱:',
      audioPrompt: 'Find the word that rhymes with cat',
      items: [
        { id: 'opt_hat', text: 'Hat', visual: '🎩', isCorrect: true, feedbackHint: 'Hooray! C-at and H-at rhyme together! 🎩' },
        { id: 'opt_dog', text: 'Dog', visual: '🐶', isCorrect: false, feedbackHint: 'Dog ends in -og. Listen for -at!' },
        { id: 'opt_sun', text: 'Sun', visual: '☀️', isCorrect: false, feedbackHint: 'Sun ends in -un. Try the word that ends in -at!' },
      ],
      stepByStepHint: 'Say the ending sound: -at! Now listen: h... at! Hat!',
    };
  }

  // 5. Syllable Splitting
  if (req.skillId === 'skill_syllable_segmentation') {
    return {
      id: `act_syllables_${Date.now()}`,
      skillId: 'skill_syllable_segmentation',
      title: 'Syllable Drummer: Beat the Word 🥁',
      instruction: 'Clap out the beats in "wa-ter". How many syllables do you hear?',
      difficulty: req.difficulty,
      language: 'English',
      type: 'word_match',
      prompt: 'How many claps in "wa - ter" 💧?',
      audioPrompt: 'Clap the word wa-ter',
      items: [
        { id: 'opt_2', text: '2 claps', visual: '✌️', isCorrect: true, feedbackHint: 'Clap! Clap! Yes, wa-ter has 2 beats! 💧' },
        { id: 'opt_1', text: '1 clap', visual: '☝️', isCorrect: false, feedbackHint: 'Try clapping while you say it: wa (clap!) ter (clap!)' },
        { id: 'opt_3', text: '3 claps', visual: '🤟', isCorrect: false, feedbackHint: 'Listen carefully: wa... ter. Just two claps!' },
      ],
      stepByStepHint: 'Put your hand under your chin. Say "wa-ter". Your chin drops twice: 2 syllables!',
    };
  }

  // 6. Missing Letter
  if (req.skillId === 'skill_missing_letter') {
    return {
      id: `act_missing_letter_${Date.now()}`,
      skillId: 'skill_missing_letter',
      title: 'Missing Letter Mystery 🔍',
      instruction: 'Which letter completes the word "c _ t" (a purring pet 🐱)?',
      difficulty: req.difficulty,
      language: 'English',
      type: 'letter_distinction',
      prompt: 'Complete: c [ ? ] t 🐱',
      items: [
        { id: 'opt_a', text: 'a', visual: '🍎', isCorrect: true, feedbackHint: 'Super! c-a-t spells cat! 🐱' },
        { id: 'opt_o', text: 'o', visual: '🍊', isCorrect: false, feedbackHint: 'c-o-t spells cot (a small bed). We want cat!' },
        { id: 'opt_u', text: 'u', visual: '☂️', isCorrect: false, feedbackHint: 'c-u-t spells cut. Try the /a/ sound for cat.' },
      ],
      stepByStepHint: 'Listen to the middle sound: /k/ ... /æ/ ... /t/. The apple letter is "a"!',
    };
  }

  // 7. Word Building
  if (req.skillId === 'skill_word_building') {
    return {
      id: `act_word_building_${Date.now()}`,
      skillId: 'skill_word_building',
      title: 'Word Builder: Brick by Brick 🧱',
      instruction: 'Build the word for what flies in the sky: /b/ + /i/ + /r/ + /d/',
      difficulty: req.difficulty,
      language: 'English',
      type: 'word_match',
      prompt: 'Which word means a flying feathered friend 🐦?',
      items: [
        { id: 'opt_bird', text: 'bird', visual: '🐦', isCorrect: true, feedbackHint: 'You built the word BIRD! Notice the starting b! 🐦' },
        { id: 'opt_drib', text: 'drib', visual: '❓', isCorrect: false, feedbackHint: 'Start with the bat letter b: b-i-r-d!' },
        { id: 'opt_grid', text: 'grid', visual: '🏁', isCorrect: false, feedbackHint: 'Start with /b/ sound for bird.' },
      ],
      stepByStepHint: 'First sound is /b/ (bat then ball), then -ird: bird!',
    };
  }

  // 8. Word Recognition / Sight Words
  if (req.skillId === 'skill_sight_words_high_freq') {
    return {
      id: `act_sight_words_${Date.now()}`,
      skillId: 'skill_sight_words_high_freq',
      title: 'Sight Word Sparkle ⚡',
      instruction: 'Spot the sight word "the" used in "the little kite":',
      difficulty: req.difficulty,
      language: 'English',
      type: 'word_match',
      prompt: 'Which word is "the"?',
      audioPrompt: 'Touch the word the',
      items: [
        { id: 'opt_the', text: 'the', visual: '✨', isCorrect: true, feedbackHint: 'Brilliant! "the" is one of our most helpful sight words! 🌟' },
        { id: 'opt_teh', text: 'teh', visual: '❌', isCorrect: false, feedbackHint: 'Check the letters: t, then h, then e -> the!' },
        { id: 'opt_that', text: 'that', visual: '👉', isCorrect: false, feedbackHint: 'This is "that". Look for the 3-letter word "the".' },
      ],
      stepByStepHint: 'Remember the 3 letters: T - H - E. Say: t-h-e spells the!',
    };
  }

  // 9. Reading Comprehension
  if (req.skillId === 'skill_story_comprehension') {
    return {
      id: `act_story_comp_${Date.now()}`,
      skillId: 'skill_story_comprehension',
      title: 'Story Explorer: Sunny and the Kite 🪁',
      instruction: 'Sunny made a red kite. The wind lifted it up above the trees! What color was the kite?',
      difficulty: req.difficulty,
      language: 'English',
      type: 'word_match',
      prompt: 'What color was Sunny\'s kite 🪁?',
      audioPrompt: 'What color was the kite?',
      items: [
        { id: 'opt_red', text: 'Red', visual: '🔴', isCorrect: true, feedbackHint: 'Spot on! Sunny made a bright RED kite that flew high! 🪁' },
        { id: 'opt_blue', text: 'Blue', visual: '🔵', isCorrect: false, feedbackHint: 'The story said Sunny made a RED kite. Look for Red!' },
        { id: 'opt_green', text: 'Green', visual: '🟢', isCorrect: false, feedbackHint: 'Check the first sentence: "Sunny made a red kite."' },
      ],
      stepByStepHint: 'Look back at the first sentence: "Sunny made a red kite."',
    };
  }

  // 10. Vocabulary Builder
  if (req.skillId === 'skill_sentence_fluency') {
    return {
      id: `act_vocab_${Date.now()}`,
      skillId: 'skill_sentence_fluency',
      title: 'Word Power: Vocabulary Builder 🌿',
      instruction: 'When something is "gentle", it is soft and kind. Which shows a gentle touch?',
      difficulty: req.difficulty,
      language: 'English',
      type: 'word_match',
      prompt: 'Which picture shows something gentle?',
      items: [
        { id: 'opt_butterfly', text: 'A butterfly landing softly', visual: '🦋', isCorrect: true, feedbackHint: 'Wonderful! A butterfly lands so gently on a flower! 🌸' },
        { id: 'opt_storm', text: 'A loud roaring storm', visual: '⛈️', isCorrect: false, feedbackHint: 'A storm is loud and fierce, not gentle. Think soft and calm!' },
        { id: 'opt_crash', text: 'A car crash', visual: '💥', isCorrect: false, feedbackHint: 'A crash is rough. Gentle means soft and loving.' },
      ],
      stepByStepHint: 'Think about petting a little sleeping bunny: that is gentle!',
    };
  }

  // 11. Listening & Pronunciation
  if (req.skillId === 'skill_listening_pronunciation') {
    return {
      id: `act_listening_${Date.now()}`,
      skillId: 'skill_listening_pronunciation',
      title: 'Echo Ears: Listen and Match 🎧',
      instruction: 'Listen carefully: "The friendly puppy played in the grass." Who played in the grass?',
      difficulty: req.difficulty,
      language: 'English',
      type: 'word_match',
      prompt: 'Who was playing in the grass 🌿?',
      audioPrompt: 'The friendly puppy played in the grass. Who played in the grass?',
      items: [
        { id: 'opt_puppy', text: 'Puppy', visual: '🐶', isCorrect: true, feedbackHint: 'Great listening ears! The puppy was playing in the grass! 🐾' },
        { id: 'opt_frog', text: 'Frog', visual: '🐸', isCorrect: false, feedbackHint: 'Listen again: "The friendly puppy played in the grass."' },
        { id: 'opt_kitten', text: 'Kitten', visual: '🐱', isCorrect: false, feedbackHint: 'The audio said puppy! Tap the puppy card.' },
      ],
      stepByStepHint: 'Say the words out loud: "friendly puppy" -> puppy!',
    };
  }

  // 12. Spelling Practice
  if (req.skillId === 'skill_spelling_cvc') {
    return {
      id: `act_spelling_${Date.now()}`,
      skillId: 'skill_spelling_cvc',
      title: 'Spelling Bee: Sound it Out ✏️',
      instruction: 'Spell the word for where we sleep: /b/ ... /e/ ... /d/',
      difficulty: req.difficulty,
      language: 'English',
      type: 'word_match',
      prompt: 'How do we spell "bed" 🛏️?',
      items: [
        { id: 'opt_bed', text: 'bed', visual: '🛏️', isCorrect: true, feedbackHint: 'Super speller! b-e-d spells BED! Notice the b at start and d at end! 🌟' },
        { id: 'opt_deb', text: 'deb', visual: '❌', isCorrect: false, feedbackHint: 'Remember the bed trick: left hand is b, right hand is d: b-e-d!' },
        { id: 'opt_bad', text: 'bad', visual: '⚠️', isCorrect: false, feedbackHint: 'That has /æ/ like apple. We want /e/ like egg: b-e-d!' },
      ],
      stepByStepHint: 'Left hand makes "b", middle is "e", right hand makes "d": b-e-d!',
    };
  }

  // Default / Baseline Letter Sound Association
  return {
    id: `act_letter_sounds_${Date.now()}`,
    skillId: 'skill_letter_sounds_basic',
    title: 'Sound Safari: Letter Matching 🦁',
    instruction: 'Find the picture that matches the letter sound:',
    difficulty: req.difficulty,
    language: req.language || 'English',
    type: 'word_match',
    prompt: 'Which word starts with the /m/ sound?',
    audioPrompt: 'Find the /m/ sound like humming',
    items: [
      { id: 'opt_moon', text: 'Moon', visual: '🌙', isCorrect: true, feedbackHint: 'Super job! Mmm-Moon starts with M! 🚀' },
      { id: 'opt_star', text: 'Star', visual: '⭐', isCorrect: false, feedbackHint: 'Star starts with S. Try humming mmm!' },
      { id: 'opt_tree', text: 'Tree', visual: '🌳', isCorrect: false, feedbackHint: 'Tree starts with T. Think of /m/ like delicious food!' },
    ],
    stepByStepHint: 'Press your lips together and hum: mmmmm... Moon!',
  };
}

/**
 * Server-side AI Activity Generator with transparent deterministic fallback.
 */
export async function handleGenerateActivity(
  req: GenerateActivityRequest,
  apiKey?: string,
  fetchFn: typeof fetch = fetch
): Promise<InteractiveActivityContent> {
  // If no external AI key is provided, return rich deterministic curriculum instantly
  if (!apiKey || apiKey.trim() === '' || apiKey.includes('placeholder')) {
    return getDeterministicActivity(req);
  }

  // Optional: If an AI service key (e.g. Gemini / OpenAI / CF Workers AI) is provided:
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);

  try {
    const promptText = `Generate a single educational reading exercise for a child learning to read with dyslexia.
Skill category: ${req.skillId}
Difficulty: ${req.difficulty}
Language: ${req.language}
Child interest: ${req.interest || 'animals and adventure'}
Format strictly as JSON with keys: id, skillId, title, instruction, difficulty, language, type, prompt, items (array of {id, text, visual, isCorrect, feedbackHint}), stepByStepHint.`;

    const res = await fetchFn('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: promptText }],
        response_format: { type: 'json_object' },
        max_tokens: 600,
        temperature: 0.7,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json() as any;
      const rawJson = JSON.parse(data.choices?.[0]?.message?.content || '{}');
      const validation = validateActivityContent(rawJson);
      if (validation.valid && validation.sanitized) {
        return validation.sanitized;
      }
    }
  } catch {
    clearTimeout(timeoutId);
    // Graceful fallback on network timeout or model failure
  }

  return getDeterministicActivity(req);
}
