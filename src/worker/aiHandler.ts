import type { InteractiveActivityContent, ActivityDifficulty } from '../types/adaptive.ts';

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
export function validateActivityContent(
  content: unknown,
  targetLanguage?: string
): {
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

  // Verify that at least one answer is marked correct
  const correctCount = sanitizedItems.filter(i => i.isCorrect).length;
  if (correctCount === 0) {
    sanitizedItems[0].isCorrect = true;
  }

  // Multilingual script and vocabulary validation
  const effectiveLang = (targetLanguage || (typeof c.language === 'string' ? c.language : 'English')).trim().toLowerCase();
  const allText = [
    title,
    instruction,
    prompt,
    stepByStepHint,
    ...sanitizedItems.map(i => `${i.text} ${i.feedbackHint || ''}`),
  ].join(' ');

  const isHi = effectiveLang.startsWith('hi') || effectiveLang.includes('hindi');
  const isOr = effectiveLang.startsWith('or') || effectiveLang.includes('odia') || effectiveLang.includes('oriya');
  const isPa = effectiveLang.startsWith('pa') || effectiveLang.includes('punjabi') || effectiveLang.includes('gurmukhi');
  const isTa = effectiveLang.startsWith('ta') || effectiveLang.includes('tamil');

  if (isHi) {
    if (!/[\u0900-\u097F]/.test(allText)) {
      return { valid: false, error: 'Activity for Hindi must contain authentic Devanagari script.' };
    }
    const englishOptions = sanitizedItems.filter(i => /^[A-Za-z0-9\s.,!?'"-]+$/.test(i.text.trim()));
    if (englishOptions.length > 0) {
      return { valid: false, error: 'Hindi activity contains English option choices.' };
    }
  } else if (isOr) {
    if (!/[\u0B00-\u0B7F]/.test(allText)) {
      return { valid: false, error: 'Activity for Odia must contain authentic Odia script.' };
    }
    const englishOptions = sanitizedItems.filter(i => /^[A-Za-z0-9\s.,!?'"-]+$/.test(i.text.trim()));
    if (englishOptions.length > 0) {
      return { valid: false, error: 'Odia activity contains English option choices.' };
    }
  } else if (isPa) {
    if (!/[\u0A00-\u0A7F]/.test(allText)) {
      return { valid: false, error: 'Activity for Punjabi must contain authentic Gurmukhi script.' };
    }
    const englishOptions = sanitizedItems.filter(i => /^[A-Za-z0-9\s.,!?'"-]+$/.test(i.text.trim()));
    if (englishOptions.length > 0) {
      return { valid: false, error: 'Punjabi activity contains English option choices.' };
    }
  } else if (isTa) {
    if (!/[\u0B80-\u0BFF]/.test(allText)) {
      return { valid: false, error: 'Activity for Tamil must contain authentic Tamil script.' };
    }
    const englishOptions = sanitizedItems.filter(i => /^[A-Za-z0-9\s.,!?'"-]+$/.test(i.text.trim()));
    if (englishOptions.length > 0) {
      return { valid: false, error: 'Tamil activity contains English option choices.' };
    }
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
      language: typeof c.language === 'string' ? c.language : (targetLanguage || 'English'),
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
 * Fully multilingual across English, Hindi (Devanagari), Odia (Odia script),
 * Punjabi (Gurmukhi), and Tamil (Tamil script).
 */
export function getDeterministicActivity(req: GenerateActivityRequest): InteractiveActivityContent {
  const rawLang = (req.language || 'English').trim().toLowerCase();
  const isHindi = rawLang.startsWith('hi') || rawLang.includes('hindi');
  const isOdia = rawLang.startsWith('or') || rawLang.includes('odia') || rawLang.includes('oriya');
  const isPunjabi = rawLang.startsWith('pa') || rawLang.includes('punjabi') || rawLang.includes('gurmukhi');
  const isTamil = rawLang.startsWith('ta') || rawLang.includes('tamil');

  // 1. Confused Letters
  if (req.skillId === 'skill_confused_letters_bd') {
    if (isHindi) {
      return {
        id: `act_mirror_bd_hi_${Date.now()}`,
        skillId: 'skill_confused_letters_bd',
        title: 'अक्षर पहचान: ब और भ 🔍',
        instruction: 'अक्षर "ब" की पहचान कीजिए (जिसके बीच में तिरछी रेखा होती है):',
        difficulty: req.difficulty,
        language: 'Hindi',
        type: 'letter_distinction',
        prompt: 'इनमें से कौन-सा अक्षर "ब" है?',
        audioPrompt: 'अक्षर ब को पहचानिए',
        targetPattern: 'ba_vs_bha',
        items: [
          { id: 'opt_ba', text: 'ब', visual: '🐐', isCorrect: true, feedbackHint: 'बहुत अच्छा! यह अक्षर "ब" है (बकरी)! 🌟' },
          { id: 'opt_bha', text: 'भ', visual: '🐻', isCorrect: false, feedbackHint: 'यह "भ" (भालू) है। गोल पेट में तिरछी रेखा वाला "ब" चुनें।' },
        ],
        stepByStepHint: 'पहले डंडा खींचिए, फिर गोल पेट बनाकर बीच में तिरछी रेखा काटिए: ब!',
      };
    }
    if (isOdia) {
      return {
        id: `act_mirror_bd_or_${Date.now()}`,
        skillId: 'skill_confused_letters_bd',
        title: 'ଅକ୍ଷର ଚିହ୍ନଟ: ବ ଏବଂ ଧ 🔍',
        instruction: 'ଅକ୍ଷର "ବ" କୁ ଚିହ୍ନଟ କରନ୍ତୁ:',
        difficulty: req.difficulty,
        language: 'Odia',
        type: 'letter_distinction',
        prompt: 'ଏଗୁଡ଼ିକ ମଧ୍ୟରୁ କେଉଁଟି "ବ" ଅଟେ?',
        audioPrompt: 'ଅକ୍ଷର ବ କୁ ସ୍ପର୍ଶ କରନ୍ତୁ',
        targetPattern: 'ba_vs_dha',
        items: [
          { id: 'opt_ba', text: 'ବ', visual: '🐸', isCorrect: true, feedbackHint: 'ଚମତ୍କାର! ଏହା ଅକ୍ଷର "ବ" (ବେଙ୍ଗ) ଅଟେ! 🌟' },
          { id: 'opt_dha', text: 'ଧ', visual: '🏹', isCorrect: false, feedbackHint: 'ଏହା "ଧ" (ଧନୁ) ଅଟେ। "ବ" କୁ ବାଛନ୍ତୁ।' },
        ],
        stepByStepHint: 'ଗୋଲ କରି ଉପରକୁ ଉଠାଇ ବୁଲାନ୍ତୁ: ବ!',
      };
    }
    if (isPunjabi) {
      return {
        id: `act_mirror_bd_pa_${Date.now()}`,
        skillId: 'skill_confused_letters_bd',
        title: 'ਅੱਖਰ ਪਛਾਣ: ਬ ਅਤੇ ਭ 🔍',
        instruction: 'ਅੱਖਰ "ਬ" ਦੀ ਪਛਾਣ ਕਰੋ:',
        difficulty: req.difficulty,
        language: 'Punjabi',
        type: 'letter_distinction',
        prompt: 'ਇਹਨਾਂ ਵਿੱਚੋਂ ਕਿਹੜਾ ਅੱਖਰ "ਬ" ਹੈ?',
        audioPrompt: 'ਅੱਖਰ ਬ ਨੂੰ ਛੂਹੋ',
        targetPattern: 'ba_vs_bha',
        items: [
          { id: 'opt_ba', text: 'ਬ', visual: '🦆', isCorrect: true, feedbackHint: 'ਬਹੁਤ ਵਧੀਆ! ਇਹ ਅੱਖਰ "ਬ" (ਬੱਤਖ) ਹੈ! 🌟' },
          { id: 'opt_bha', text: 'ਭ', visual: '🐻', isCorrect: false, feedbackHint: 'ਇਹ "ਭ" (ਭਾਲੂ) ਹੈ। ਸਹੀ "ਬ" ਚੁਣੋ।' },
        ],
        stepByStepHint: 'ਧਿਆਨ ਨਾਲ ਦੇਖੋ: ਬ ਦੀ ਬਣਤਰ ਸਾਫ਼ ਅਤੇ ਸਿੱਧੀ ਹੈ!',
      };
    }
    if (isTamil) {
      return {
        id: `act_mirror_bd_ta_${Date.now()}`,
        skillId: 'skill_confused_letters_bd',
        title: 'எழுத்து வேறுபாடு: ர மற்றும் ற 🔍',
        instruction: 'இடையின "ர" எழுத்தைக் கண்டறியவும்:',
        difficulty: req.difficulty,
        language: 'Tamil',
        type: 'letter_distinction',
        prompt: 'இவற்றில் எது "ர" எழுத்து?',
        audioPrompt: 'ர எழுத்தைத் தொடவும்',
        targetPattern: 'ra_vs_rra',
        items: [
          { id: 'opt_ra', text: 'ர', visual: '🚆', isCorrect: true, feedbackHint: 'அருமை! இது "ர" (ரயில்) எழுத்து! 🌟' },
          { id: 'opt_rra', text: 'ற', visual: '🐦', isCorrect: false, feedbackHint: 'இது வல்லின "ற" (பறவை). மென்மையான "ர" ஐத் தேர்ந்தெடுக்கவும்.' },
        ],
        stepByStepHint: 'மேலிருந்து கீழ் வந்து வளையும் எளிய வடிவம்: ர!',
      };
    }

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
        { id: 'opt_b', text: 'b', visual: '🏏', isCorrect: true, feedbackHint: 'Awesome! The tall bat comes down first, then the round belly bounces right! 🌟' },
        { id: 'opt_d', text: 'd', visual: '🍩', isCorrect: false, feedbackHint: 'Notice this round belly points left like a donut first. Try the one facing right!' },
      ],
      workedExample: {
        demonstration: 'b has a tall bat on the left, belly on the right: |o',
        explanation: 'Remember: b looks forward like your hand making a thumbs-up on your left side!',
      },
      stepByStepHint: 'Trace with your finger: start at the top, go down, then bounce into a round belly on the right.',
    };
  }

  // 1b. Confused Letters: p vs q
  if (req.skillId === 'skill_confused_letters_pq') {
    if (isHindi) {
      return {
        id: `act_pq_hi_${Date.now()}`,
        skillId: 'skill_confused_letters_pq',
        title: 'अक्षर पहचान: प और फ 🔍',
        instruction: 'अक्षर "प" की पहचान कीजिए (जिसमें नीचे लटकती रेखा नहीं होती):',
        difficulty: req.difficulty,
        language: req.language || 'Hindi',
        type: 'letter_distinction',
        prompt: 'इनमें से कौन-सा अक्षर "प" है?',
        audioPrompt: 'अक्षर प को पहचानिए',
        targetPattern: 'pa_vs_pha',
        items: [
          { id: 'opt_pa', text: 'प', visual: '🪁', isCorrect: true, feedbackHint: 'बहुत बढ़िया! यह अक्षर "प" (पतंग) है! 🌟' },
          { id: 'opt_pha', text: 'फ', visual: '🍎', isCorrect: false, feedbackHint: 'यह "फ" (फल) है। सीधा डंडा और मुड़ाव वाला "प" चुनें।' },
        ],
        stepByStepHint: 'पहले सीधा डंडा और कटोरी जैसा घुमाव: प!',
      };
    }
    if (isOdia) {
      return {
        id: `act_pq_or_${Date.now()}`,
        skillId: 'skill_confused_letters_pq',
        title: 'ଅକ୍ଷର ଚିହ୍ନଟ: ପ ଏବଂ ଫ 🔍',
        instruction: 'ଅକ୍ଷର "ପ" କୁ ଚିହ୍ନଟ କରନ୍ତୁ:',
        difficulty: req.difficulty,
        language: req.language || 'Odia',
        type: 'letter_distinction',
        prompt: 'ଏଗୁଡ଼ିକ ମଧ୍ୟରୁ କେଉଁଟି "ପ" ଅଟେ?',
        audioPrompt: 'ଅକ୍ଷର ପ କୁ ସ୍ପର୍ଶ କରନ୍ତୁ',
        targetPattern: 'pa_vs_pha',
        items: [
          { id: 'opt_pa', text: 'ପ', visual: '🪁', isCorrect: true, feedbackHint: 'ଚମତ୍କାର! ଏହା ଅକ୍ଷର "ପ" (ପତଙ୍ଗ) ଅଟେ! 🌟' },
          { id: 'opt_pha', text: 'ଫ', visual: '🍎', isCorrect: false, feedbackHint: 'ଏହା "ଫ" (ଫଳ) ଅଟେ। "ପ" କୁ ବାଛନ୍ତୁ।' },
        ],
        stepByStepHint: 'ବାମରୁ ଆରମ୍ଭ କରି ତଳକୁ ଆଣି ଡାହାଣକୁ ଉଠାନ୍ତୁ: ପ!',
      };
    }
    if (isPunjabi) {
      return {
        id: `act_pq_pa_${Date.now()}`,
        skillId: 'skill_confused_letters_pq',
        title: 'ਅੱਖਰ ਪਛਾਣ: ਪ ਅਤੇ ਧ 🔍',
        instruction: 'ਅੱਖਰ "ਪ" ਦੀ ਪਛਾਣ ਕਰੋ (ਉੱਪਰੋਂ ਖੁੱਲ੍ਹਾ ਨਹੀਂ):',
        difficulty: req.difficulty,
        language: req.language || 'Punjabi',
        type: 'letter_distinction',
        prompt: 'ਇਹਨਾਂ ਵਿੱਚੋਂ ਕਿਹੜਾ ਅੱਖਰ "ਪ" ਹੈ?',
        audioPrompt: 'ਅੱਖਰ ਪ ਨੂੰ ਛੂਹੋ',
        targetPattern: 'pa_vs_dha',
        items: [
          { id: 'opt_pa', text: 'ਪ', visual: '🪁', isCorrect: true, feedbackHint: 'ਬਹੁਤ ਵਧੀਆ! ਇਹ ਅੱਖਰ "ਪ" (ਪਤੰਗ) ਹੈ! 🌟' },
          { id: 'opt_dha', text: 'ਧ', visual: '🏹', isCorrect: false, feedbackHint: 'ਇਹ "ਧ" (ਧਨੁੱਖ) ਹੈ। ਸਹੀ "ਪ" ਚੁਣੋ।' },
        ],
        stepByStepHint: 'ਖੱਬੇ ਤੋਂ ਸ਼ੁਰੂ ਕਰੋ ਅਤੇ ਹੇਠਾਂ ਗੋਲ ਕਰਕੇ ਸੱਜੇ ਲਿਜਾਓ: ਪ!',
      };
    }
    if (isTamil) {
      return {
        id: `act_pq_ta_${Date.now()}`,
        skillId: 'skill_confused_letters_pq',
        title: 'எழுத்து அடையாளம்: ப மற்றும் ம 🔍',
        instruction: 'எழுத்து "ப" வை அடையாளம் காணவும்:',
        difficulty: req.difficulty,
        language: req.language || 'Tamil',
        type: 'letter_distinction',
        prompt: 'இவற்றில் "ப" எழுத்து எது?',
        audioPrompt: 'ப எழுத்தைத் தொடவும்',
        targetPattern: 'pa_vs_ma',
        items: [
          { id: 'opt_pa', text: 'ப', visual: '🪁', isCorrect: true, feedbackHint: 'அருமை! இது "ப" (பட்டம்) எழுத்து! 🌟' },
          { id: 'opt_ma', text: 'ம', visual: '🌳', isCorrect: false, feedbackHint: 'இது "ம" (மரம்). வளைவில்லாத "ப" தேர்ந்தெடுக்கவும்.' },
        ],
        stepByStepHint: 'மேலிருந்து கீழே வந்து படுக்கைக்கோடு போட்டு மேலே செல்லுங்கள்: ப!',
      };
    }

    return {
      id: `act_pq_en_${Date.now()}`,
      skillId: 'skill_confused_letters_pq',
      title: 'Letter Mirror: p vs q 🔍',
      instruction: 'Find the letter "p" (tail hangs down on the left):',
      difficulty: req.difficulty,
      language: req.language || 'English',
      type: 'letter_distinction',
      prompt: 'Which letter is "p"?',
      audioPrompt: 'Touch the letter p',
      targetPattern: 'p_vs_q',
      items: [
        { id: 'opt_p', text: 'p', visual: '🍕', isCorrect: true, feedbackHint: 'Super job! "p" has a downward tail on the left! 🍕' },
        { id: 'opt_q', text: 'q', visual: '👑', isCorrect: false, feedbackHint: '"q" has its tail on the right side.' },
      ],
      stepByStepHint: 'Trace down first on the left, then bounce up and around: p!',
    };
  }

  // 1c. Confused Words / Reversals (was/saw, no/on)
  if (req.skillId === 'skill_confused_words_reversals') {
    if (isHindi) {
      return {
        id: `act_rev_hi_${Date.now()}`,
        skillId: 'skill_confused_words_reversals',
        title: 'शब्द दिशा: सब बनाम बस 🔄',
        instruction: 'बाएँ से दाएँ पढ़कर बताइए कि "बस" कौन-सा है:',
        difficulty: req.difficulty,
        language: req.language || 'Hindi',
        type: 'word_match',
        prompt: 'इनमें से कौन-सा शब्द "बस" (गाड़ी) है 🚌?',
        audioPrompt: 'बस शब्द को चुनिए',
        items: [
          { id: 'opt_bas', text: 'बस', visual: '🚌', isCorrect: true, feedbackHint: 'बहुत बढ़िया! पहले ब, फिर स: बस! 🚌' },
          { id: 'opt_sab', text: 'सब', visual: '👥', isCorrect: false, feedbackHint: 'यह "सब" है। बाएँ से दाएँ पढ़िए: ब-स!' },
        ],
        stepByStepHint: 'बाएँ से दाएँ देखिए: पहले ब, फिर स = बस!',
      };
    }
    if (isOdia) {
      return {
        id: `act_rev_or_${Date.now()}`,
        skillId: 'skill_confused_words_reversals',
        title: 'ଶବ୍ଦ ଦିଗ: ବସ ବନାମ ସବ 🔄',
        instruction: 'ବାମରୁ ଡାହାଣ ପଢ଼ି "ବସ" ଚିହ୍ନଟ କରନ୍ତୁ:',
        difficulty: req.difficulty,
        language: req.language || 'Odia',
        type: 'word_match',
        prompt: 'ଏଥିମଧ୍ୟରୁ "ବସ" (ଗାଡ଼ି) ଶବ୍ଦ କେଉଁଟି 🚌?',
        audioPrompt: 'ବସ ଶବ୍ଦଟି ବାଛନ୍ତୁ',
        items: [
          { id: 'opt_bas', text: 'ବସ', visual: '🚌', isCorrect: true, feedbackHint: 'ଅତି ଉତ୍ତମ! ବାମରୁ ଡାହାଣ: ବ-ସ = ବସ! 🚌' },
          { id: 'opt_sab', text: 'ସବ', visual: '👥', isCorrect: false, feedbackHint: 'ଏହା "ସବ" ଅଟେ। "ବସ" କୁ ବାଛନ୍ତୁ।' },
        ],
        stepByStepHint: 'ବାମରୁ ଡାହାଣ ଲକ୍ଷ୍ୟ କରନ୍ତୁ: ବ ଏବଂ ସ = ବସ!',
      };
    }
    if (isPunjabi) {
      return {
        id: `act_rev_pa_${Date.now()}`,
        skillId: 'skill_confused_words_reversals',
        title: 'ਸ਼ਬਦ ਦਿਸ਼ਾ: ਬੱਸ ਬਨਾਮ ਸੱਬ 🔄',
        instruction: 'ਖੱਬੇ ਤੋਂ ਸੱਜੇ ਪੜ੍ਹ ਕੇ "ਬੱਸ" ਦੀ ਪਛਾਣ ਕਰੋ:',
        difficulty: req.difficulty,
        language: req.language || 'Punjabi',
        type: 'word_match',
        prompt: 'ਇਹਨਾਂ ਵਿੱਚੋਂ "ਬੱਸ" (ਗੱਡੀ) ਸ਼ਬਦ ਕਿਹੜਾ ਹੈ 🚌?',
        audioPrompt: 'ਬੱਸ ਸ਼ਬਦ ਚੁਣੋ',
        items: [
          { id: 'opt_bas', text: 'ਬੱਸ', visual: '🚌', isCorrect: true, feedbackHint: 'ਬਹੁਤ ਵਧੀਆ! ਖੱਬੇ ਤੋਂ ਸੱਜੇ: ਬ-ੱਸ = ਬੱਸ! 🚌' },
          { id: 'opt_sab', text: 'ਸੱਬ', visual: '👥', isCorrect: false, feedbackHint: 'ਇਹ "ਸੱਬ" ਹੈ। ਸਹੀ "ਬੱਸ" ਚੁਣੋ।' },
        ],
        stepByStepHint: 'ਖੱਬੇ ਤੋਂ ਸੱਜੇ ਟਰੈਕ ਕਰੋ: ਬ ਫਿਰ ੱਸ = ਬੱਸ!',
      };
    }
    if (isTamil) {
      return {
        id: `act_rev_ta_${Date.now()}`,
        skillId: 'skill_confused_words_reversals',
        title: 'சொல் வரிசை: கல் மற்றும் லக் 🔄',
        instruction: 'இடமிருந்து வலமாகப் படித்து "கல்" சொல்லைக் கண்டறியவும்:',
        difficulty: req.difficulty,
        language: req.language || 'Tamil',
        type: 'word_match',
        prompt: 'இவற்றில் "கல்" என்ற சொல் எது 🪨?',
        audioPrompt: 'கல் சொல்லைத் தேர்ந்தெடுக்கவும்',
        items: [
          { id: 'opt_kal', text: 'கல்', visual: '🪨', isCorrect: true, feedbackHint: 'அருமை! இடமிருந்து வலம்: க-ல் = கல்! 🪨' },
          { id: 'opt_lak', text: 'லக்', visual: '❌', isCorrect: false, feedbackHint: 'இது "லக்". "கல்" தேர்ந்தெடுக்கவும்.' },
        ],
        stepByStepHint: 'இடமிருந்து வலமாகப் பார்க்கவும்: க பிறகு ல் = கல்!',
      };
    }

    return {
      id: `act_rev_en_${Date.now()}`,
      skillId: 'skill_confused_words_reversals',
      title: 'Word Tracking: was vs saw 🔄',
      instruction: 'Track left-to-right to find the word "was":',
      difficulty: req.difficulty,
      language: req.language || 'English',
      type: 'word_match',
      prompt: 'Which word says "was"?',
      audioPrompt: 'Find the word was',
      items: [
        { id: 'opt_was', text: 'was', visual: '📖', isCorrect: true, feedbackHint: 'Terrific! Left to right: w-a-s spells "was"! 🌟' },
        { id: 'opt_saw', text: 'saw', visual: '🪚', isCorrect: false, feedbackHint: 'That says "saw". Read left to right: w-a-s.' },
      ],
      stepByStepHint: 'Slide your finger from left to right: w... a... s: was!',
    };
  }

  // 2. Sound Blending / CVC
  if (req.skillId === 'skill_cvc_blending') {
    if (isHindi) {
      return {
        id: `act_blend_hindi_${Date.now()}`,
        skillId: 'skill_cvc_blending',
        title: 'ध्वनि जोड़: दो अक्षरों का शब्द 🧩',
        instruction: 'ध्वनियों को जोड़कर शब्द पहचानिए: घ + र',
        difficulty: req.difficulty,
        language: 'Hindi',
        type: 'phonics_blend',
        prompt: 'घ और र मिलकर क्या बनता है?',
        items: [
          { id: 'opt_ghar', text: 'घर', visual: '🏠', isCorrect: true, feedbackHint: 'बहुत बढ़िया! घ और र मिलकर "घर" बनता है! 🌈' },
          { id: 'opt_phal', text: 'फल', visual: '🍎', isCorrect: false, feedbackHint: 'ध्यान से सुनिए: घ-र' },
          { id: 'opt_jal', text: 'जल', visual: '💧', isCorrect: false, feedbackHint: 'यह ज-ल है। घ-र चुनिए।' },
        ],
        stepByStepHint: 'पहले घ बोलिए, फिर र बोलिए, अब दोनों को मिलाकर बोलिए: घर!',
      };
    }
    if (isOdia) {
      return {
        id: `act_blend_or_${Date.now()}`,
        skillId: 'skill_cvc_blending',
        title: 'ଧ୍ୱନି ଯୋଡ଼: ଦୁଇ ଅକ୍ଷର ଶବ୍ଦ 🧩',
        instruction: 'ଧ୍ୱନି ଯୋଡ଼ି ଶବ୍ଦ ଚିହ୍ନଟ କରନ୍ତୁ: ଘ + ର',
        difficulty: req.difficulty,
        language: 'Odia',
        type: 'phonics_blend',
        prompt: 'ଘ ଏବଂ ର ମିଶିଲେ କଣ ହୁଏ?',
        items: [
          { id: 'opt_ghar', text: 'ଘର', visual: '🏠', isCorrect: true, feedbackHint: 'ଅତି ଉତ୍ତମ! ଘ ଏବଂ ର ମିଶି "ଘର" ହୁଏ! 🌈' },
          { id: 'opt_phal', text: 'ଫଳ', visual: '🍎', isCorrect: false, feedbackHint: 'ଏହା ଫ-ଳ। ଘ-ର ବାଛନ୍ତୁ।' },
          { id: 'opt_jal', text: 'ଜଳ', visual: '💧', isCorrect: false, feedbackHint: 'ଏହା ଜ-ଳ। ଘ-ର ବାଛନ୍ତୁ।' },
        ],
        stepByStepHint: 'ପ୍ରଥମେ ଘ କୁହନ୍ତୁ, ପରେ ର କୁହନ୍ତୁ, ଏକାଠି ମିଶାଇ କୁହନ୍ତୁ: ଘର!',
      };
    }
    if (isPunjabi) {
      return {
        id: `act_blend_pa_${Date.now()}`,
        skillId: 'skill_cvc_blending',
        title: 'ਧੁਨੀ ਜੋੜ: ਦੋ ਅੱਖਰੀ ਸ਼ਬਦ 🧩',
        instruction: 'ਧੁਨੀਆਂ ਜੋੜ ਕੇ ਸ਼ਬਦ ਬਣਾਓ: ਘ + ਰ',
        difficulty: req.difficulty,
        language: 'Punjabi',
        type: 'phonics_blend',
        prompt: 'ਘ ਅਤੇ ਰ ਮਿਲ ਕੇ ਕੀ ਬਣਦਾ ਹੈ?',
        items: [
          { id: 'opt_ghar', text: 'ਘਰ', visual: '🏠', isCorrect: true, feedbackHint: 'ਸ਼ਾਬਾਸ਼! ਘ ਅਤੇ ਰ ਮਿਲ ਕੇ "ਘਰ" ਬਣਦਾ ਹੈ! 🌈' },
          { id: 'opt_phal', text: 'ਫਲ', visual: '🍎', isCorrect: false, feedbackHint: 'ਧਿਆਨ ਨਾਲ ਸੁਣੋ: ਘ-ਰ' },
          { id: 'opt_jal', text: 'ਜਲ', visual: '💧', isCorrect: false, feedbackHint: 'ਇਹ ਜ-ਲ ਹੈ। ਘ-ਰ ਚੁਣੋ।' },
        ],
        stepByStepHint: 'ਪਹਿਲਾਂ ਘ ਬੋਲੋ, ਫਿਰ ਰ ਬੋਲੋ, ਮਿਲਾ ਕੇ ਬੋਲੋ: ਘਰ!',
      };
    }
    if (isTamil) {
      return {
        id: `act_blend_ta_${Date.now()}`,
        skillId: 'skill_cvc_blending',
        title: 'ஒலி இணைத்தல்: சொல் உருவாக்கம் 🧩',
        instruction: 'ஒலிகளை இணைத்துச் சொல்லைக் கண்டறியவும்: ப + ல்',
        difficulty: req.difficulty,
        language: 'Tamil',
        type: 'phonics_blend',
        prompt: 'ப மற்றும் ல் சேர்ந்தால் என்ன சொல்?',
        items: [
          { id: 'opt_pal', text: 'பல்', visual: '🦷', isCorrect: true, feedbackHint: 'அருமை! ப மற்றும் ல் சேர்ந்தால் "பல்"! 🌈' },
          { id: 'opt_kal', text: 'கல்', visual: '🪨', isCorrect: false, feedbackHint: 'இது க-ல். ப-ல் தேர்ந்தெடுக்கவும்.' },
          { id: 'opt_pazham', text: 'பழம்', visual: '🍎', isCorrect: false, feedbackHint: 'இது பழம். ப-ல் தேர்ந்தெடுக்கவும்.' },
        ],
        stepByStepHint: 'முதலில் ப சொல்லுங்கள், பின் ல் சொல்லுங்கள்: பல்!',
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
      items: [
        { id: 'opt_sun', text: 'sun', visual: '☀️', isCorrect: true, feedbackHint: 'Fantastic sound blending! /s/ /u/ /n/ -> SUN! 🌞' },
        { id: 'opt_run', text: 'run', visual: '🏃', isCorrect: false, feedbackHint: 'Close, but "run" starts with /r/.' },
        { id: 'opt_bus', text: 'bus', visual: '🚌', isCorrect: false, feedbackHint: '"bus" ends with /s/.' },
      ],
      stepByStepHint: 'Stretch the sounds on your arm: shoulder /s/, elbow /u/, wrist /n/. Now slide down: sun!',
    };
  }

  // 2b. Consonant Blends & Digraphs
  if (req.skillId === 'skill_consonant_blends') {
    if (isHindi) {
      return {
        id: `act_blend_sh_hi_${Date.now()}`,
        skillId: 'skill_consonant_blends',
        title: 'संयुक्ताक्षर: /त्र/ 🔱',
        instruction: 'किस शब्द में "त्र" संयुक्ताक्षर है:',
        difficulty: req.difficulty,
        language: req.language || 'Hindi',
        type: 'word_match',
        prompt: 'किस शब्द में "त्र" संयुक्ताक्षर है?',
        audioPrompt: 'त्रिशूल शब्द को पहचानिए',
        items: [
          { id: 'opt_trishul', text: 'त्रिशूल', visual: '🔱', isCorrect: true, feedbackHint: 'बहुत खूब! त्रिशूल में "त्र" संयुक्ताक्षर है! 🔱' },
          { id: 'opt_kamal', text: 'कमल', visual: '🪷', isCorrect: false, feedbackHint: 'कमल में कोई संयुक्ताक्षर नहीं है।' },
        ],
        stepByStepHint: 'त और र मिलकर त्र बनता है: त्रिशूल!',
      };
    }
    if (isOdia) {
      return {
        id: `act_blend_sh_or_${Date.now()}`,
        skillId: 'skill_consonant_blends',
        title: 'ଯୁକ୍ତାକ୍ଷର: /ତ୍ର/ 🇮🇳',
        instruction: 'କେଉଁ ଶବ୍ଦରେ "ତ୍ର" ଯୁକ୍ତାକ୍ଷର ରହିଛି:',
        difficulty: req.difficulty,
        language: req.language || 'Odia',
        type: 'word_match',
        prompt: 'କେଉଁ ଶବ୍ଦରେ "ତ୍ର" ଯୁକ୍ତାକ୍ଷର ଅଛି?',
        audioPrompt: 'ତ୍ରିରଙ୍ଗା ଶବ୍ଦ ଚିହ୍ନଟ କରନ୍ତୁ',
        items: [
          { id: 'opt_triranga', text: 'ତ୍ରିରଙ୍ଗା', visual: '🇮🇳', isCorrect: true, feedbackHint: 'ଅତି ସୁନ୍ଦର! ତ୍ରିରଙ୍ଗାରେ "ତ୍ର" ଯୁକ୍ତାକ୍ଷର ଅଛି! 🇮🇳' },
          { id: 'opt_kamala', text: 'କମଳ', visual: '🪷', isCorrect: false, feedbackHint: 'କମଳରେ କୌଣସି ଯୁକ୍ତାକ୍ଷର ନାହିଁ।' },
        ],
        stepByStepHint: 'ତ ଏବଂ ର ମିଶି ତ୍ର ହୁଏ: ତ୍ରିରଙ୍ଗା!',
      };
    }
    if (isPunjabi) {
      return {
        id: `act_blend_sh_pa_${Date.now()}`,
        skillId: 'skill_consonant_blends',
        title: 'ਸੰਯੁਕਤ ਧੁਨੀ: /ਤ੍ਰ/ 🔱',
        instruction: 'ਕਿਹੜੇ ਸ਼ਬਦ ਵਿੱਚ "ਤ੍ਰ" ਧੁਨੀ ਹੈ:',
        difficulty: req.difficulty,
        language: req.language || 'Punjabi',
        type: 'word_match',
        prompt: 'ਕਿਹੜੇ ਸ਼ਬਦ ਵਿੱਚ "ਤ੍ਰ" ਧੁਨੀ ਹੈ?',
        audioPrompt: 'ਤ੍ਰਿਸ਼ੂਲ ਸ਼ਬਦ ਚੁਣੋ',
        items: [
          { id: 'opt_trishul', text: 'ਤ੍ਰਿਸ਼ੂਲ', visual: '🔱', isCorrect: true, feedbackHint: 'ਬਹੁਤ ਵਧੀਆ! ਤ੍ਰਿਸ਼ੂਲ ਵਿੱਚ "ਤ੍ਰ" ਧੁਨੀ ਹੈ! 🔱' },
          { id: 'opt_kamal', text: 'ਕਮਲ', visual: '🪷', isCorrect: false, feedbackHint: 'ਕਮਲ ਵਿੱਚ ਸੰਯੁਕਤ ਧੁਨੀ ਨਹੀਂ ਹੈ।' },
        ],
        stepByStepHint: 'ਤ ਅਤੇ ਰ ਰਲ ਕੇ ਤ੍ਰ ਬਣਦਾ ਹੈ: ਤ੍ਰਿਸ਼ੂਲ!',
      };
    }
    if (isTamil) {
      return {
        id: `act_blend_sh_ta_${Date.now()}`,
        skillId: 'skill_consonant_blends',
        title: 'கூட்டு மெய்யொலி: /த்ர/ 🍇',
        instruction: 'எந்தச் சொல்லில் "திரா" ஒலி வருகிறது:',
        difficulty: req.difficulty,
        language: req.language || 'Tamil',
        type: 'word_match',
        prompt: 'எந்தச் சொல்லில் "திரா" கூட்டு ஒலி உள்ளது?',
        audioPrompt: 'திராட்சை சொல்லைத் தேர்ந்தெடுக்கவும்',
        items: [
          { id: 'opt_grapes', text: 'திராட்சை', visual: '🍇', isCorrect: true, feedbackHint: 'அருமை! திராட்சையில் கூட்டு ஒலி உள்ளது! 🍇' },
          { id: 'opt_apple', text: 'ஆப்பிள்', visual: '🍎', isCorrect: false, feedbackHint: 'திராட்சை சொல்லைத் தேர்ந்தெடுக்கவும்.' },
        ],
        stepByStepHint: 'த் + ரா = திரா: திராட்சை!',
      };
    }

    return {
      id: `act_blend_sh_en_${Date.now()}`,
      skillId: 'skill_consonant_blends',
      title: 'Digraph Safari: /sh/ Sound 🚢',
      instruction: 'Find the word starting with the quiet /sh/ sound:',
      difficulty: req.difficulty,
      language: req.language || 'English',
      type: 'word_match',
      prompt: 'Which word starts with /sh/?',
      audioPrompt: 'Find the word that starts with sh',
      items: [
        { id: 'opt_ship', text: 'Ship', visual: '🚢', isCorrect: true, feedbackHint: 'Super! Shhh-ip starts with /sh/! 🚢' },
        { id: 'opt_boat', text: 'Boat', visual: '⛵', isCorrect: false, feedbackHint: 'Boat starts with /b/.' },
      ],
      stepByStepHint: 'Put your finger to your lips: shhhhh... Ship!',
    };
  }

  // 2c. Vowel Sounds
  if (req.skillId === 'skill_letter_sounds_vowels') {
    if (isHindi) {
      return {
        id: `act_vow_hi_${Date.now()}`,
        skillId: 'skill_letter_sounds_vowels',
        title: 'स्वर ध्वनि: /अ/ 🍎',
        instruction: 'कौन-सा शब्द "अ" स्वर से शुरू होता है:',
        difficulty: req.difficulty,
        language: req.language || 'Hindi',
        type: 'word_match',
        prompt: 'कौन-सा शब्द "अ" स्वर से शुरू होता है?',
        audioPrompt: 'अ से अनार पहचानिए',
        items: [
          { id: 'opt_anar', text: 'अनार', visual: '🍎', isCorrect: true, feedbackHint: 'बहुत बढ़िया! अ से अनार! 🍎' },
          { id: 'opt_kela', text: 'केला', visual: '🍌', isCorrect: false, feedbackHint: 'केला "क" से शुरू होता है।' },
          { id: 'opt_aam', text: 'आम', visual: '🥭', isCorrect: false, feedbackHint: 'आम "आ" से शुरू होता है।' },
        ],
        stepByStepHint: 'गले से छोटी स्वर ध्वनि निकालिए: अ... अनार!',
      };
    }
    if (isOdia) {
      return {
        id: `act_vow_or_${Date.now()}`,
        skillId: 'skill_letter_sounds_vowels',
        title: 'ସ୍ୱର ଧ୍ୱନି: /ଅ/ 🍈',
        instruction: 'କେଉଁ ଶବ୍ଦଟି "ଅ" ସ୍ୱରରୁ ଆରମ୍ଭ ହେଉଛି:',
        difficulty: req.difficulty,
        language: req.language || 'Odia',
        type: 'word_match',
        prompt: 'କେଉଁ ଶବ୍ଦଟି "ଅ" ସ୍ୱରରୁ ଆରମ୍ଭ ହୁଏ?',
        audioPrompt: 'ଅ ରୁ ଅମୃତଭଣ୍ଡା ବାଛନ୍ତୁ',
        items: [
          { id: 'opt_amruta', text: 'ଅମୃତଭଣ୍ଡା', visual: '🍈', isCorrect: true, feedbackHint: 'ଚମତ୍କାର! ଅ ରୁ ଅମୃତଭଣ୍ଡା! 🍈' },
          { id: 'opt_kadali', text: 'କଦଳୀ', visual: '🍌', isCorrect: false, feedbackHint: 'କଦଳୀ "କ" ରୁ ଆରମ୍ଭ ହୁଏ।' },
          { id: 'opt_aamba', text: 'ଆମ୍ବ', visual: '🥭', isCorrect: false, feedbackHint: 'ଆମ୍ବ "ଆ" ରୁ ଆରମ୍ଭ ହୁଏ।' },
        ],
        stepByStepHint: 'କଣ୍ଠରୁ ଧ୍ୱନି ବାହାର କରନ୍ତୁ: ଅ... ଅମୃତଭଣ୍ଡା!',
      };
    }
    if (isPunjabi) {
      return {
        id: `act_vow_pa_${Date.now()}`,
        skillId: 'skill_letter_sounds_vowels',
        title: 'ਸਵਰ ਧੁਨੀ: /ਅ/ 🍎',
        instruction: 'ਕਿਹੜਾ ਸ਼ਬਦ "ਅ" ਸਵਰ ਨਾਲ ਸ਼ੁਰੂ ਹੁੰਦਾ ਹੈ:',
        difficulty: req.difficulty,
        language: req.language || 'Punjabi',
        type: 'word_match',
        prompt: 'ਕਿਹੜਾ ਸ਼ਬਦ "ਅ" ਸਵਰ ਨਾਲ ਸ਼ੁਰੂ ਹੁੰਦਾ ਹੈ?',
        audioPrompt: 'ਅ ਤੋਂ ਅਨਾਰ ਚੁਣੋ',
        items: [
          { id: 'opt_anar', text: 'ਅਨਾਰ', visual: '🍎', isCorrect: true, feedbackHint: 'ਬਹੁਤ ਵਧੀਆ! ਅ ਤੋਂ ਅਨਾਰ! 🍎' },
          { id: 'opt_kela', text: 'ਕੇਲਾ', visual: '🍌', isCorrect: false, feedbackHint: 'ਕੇਲਾ "ਕ" ਨਾਲ ਸ਼ੁਰੂ ਹੁੰਦਾ ਹੈ।' },
          { id: 'opt_amb', text: 'ਅੰਬ', visual: '🥭', isCorrect: false, feedbackHint: 'ਇਹ ਟਿੱਪੀ ਵਾਲਾ ਅੰਬ ਹੈ।' },
        ],
        stepByStepHint: 'ਸੰਘ ਵਿੱਚੋਂ ਛੋਟੀ ਆਵਾਜ਼ ਕੱਢੋ: ਅ... ਅਨਾਰ!',
      };
    }
    if (isTamil) {
      return {
        id: `act_vow_ta_${Date.now()}`,
        skillId: 'skill_letter_sounds_vowels',
        title: 'உயிர் ஒலி: /அ/ 🐿️',
        instruction: 'எந்தச் சொல் "அ" உயிர் ஒலியில் தொடங்குகிறது:',
        difficulty: req.difficulty,
        language: req.language || 'Tamil',
        type: 'word_match',
        prompt: 'எந்தச் சொல் "அ" உயிர் ஒலியில் தொடங்குகிறது?',
        audioPrompt: 'அ ஒலியில் அணில் சொல்லைத் தேர்ந்தெடுக்கவும்',
        items: [
          { id: 'opt_anil', text: 'அணில்', visual: '🐿️', isCorrect: true, feedbackHint: 'அருமை! அ-அணில் "அ" ஒலியில் தொடங்குகிறது! 🐿️' },
          { id: 'opt_poonai', text: 'பூனை', visual: '🐱', isCorrect: false, feedbackHint: 'பூனை "பூ" ஒலியில் தொடங்குகிறது.' },
          { id: 'opt_aadu', text: 'ஆடு', visual: '🐐', isCorrect: false, feedbackHint: 'ஆடு நெடில் "ஆ" ஒலியில் தொடங்குகிறது.' },
        ],
        stepByStepHint: 'வாயைத் திறந்து ஒலியுங்கள்: அ... அணில்!',
      };
    }

    return {
      id: `act_vow_en_${Date.now()}`,
      skillId: 'skill_letter_sounds_vowels',
      title: 'Vowel Valley: Short /a/ 🍎',
      instruction: 'Find the picture with the short /a/ vowel sound:',
      difficulty: req.difficulty,
      language: req.language || 'English',
      type: 'word_match',
      prompt: 'Which word has the short /a/ sound like "apple"?',
      audioPrompt: 'Find the short a sound',
      items: [
        { id: 'opt_apple', text: 'Apple', visual: '🍎', isCorrect: true, feedbackHint: 'Awesome! A-a-apple has the short /a/ sound! 🍎' },
        { id: 'opt_star', text: 'Star', visual: '⭐', isCorrect: false, feedbackHint: 'Star has the /ar/ sound.' },
        { id: 'opt_tree', text: 'Tree', visual: '🌳', isCorrect: false, feedbackHint: 'Tree has the long /e/ sound.' },
      ],
      stepByStepHint: 'Open your mouth and drop your chin: /a/ /a/ /a/... Apple!',
    };
  }

  // 3. Initial & Final Sound Isolation
  if (req.skillId === 'skill_phonemic_isolation') {
    if (isHindi) {
      return {
        id: `act_iso_hi_${Date.now()}`,
        skillId: 'skill_phonemic_isolation',
        title: 'प्रथम ध्वनि पहचान 🕵️',
        instruction: 'कौन-सा चित्र "फ" ध्वनि से शुरू होता है?',
        difficulty: req.difficulty,
        language: 'Hindi',
        type: 'word_match',
        prompt: '"फ" ध्वनि से शुरू होने वाला शब्द:',
        items: [
          { id: 'opt_flower', text: 'फूल', visual: '🌸', isCorrect: true, feedbackHint: 'शाबाश! फ-फूल "फ" से शुरू होता है! 🌟' },
          { id: 'opt_cat', text: 'बिल्ली', visual: '🐱', isCorrect: false, feedbackHint: 'बिल्ली "ब" से शुरू होती है।' },
          { id: 'opt_bear', text: 'भालू', visual: '🐻', isCorrect: false, feedbackHint: 'भालू "भ" से शुरू होता है।' },
        ],
        stepByStepHint: 'होंठों से फूंक मारते हुए बोलिए: फ़... फूल!',
      };
    }
    if (isOdia) {
      return {
        id: `act_iso_or_${Date.now()}`,
        skillId: 'skill_phonemic_isolation',
        title: 'ପ୍ରଥମ ଧ୍ୱନି ଚିହ୍ନଟ 🕵️',
        instruction: 'କେଉଁ ଛବିଟି "ଫ" ଧ୍ୱନିରୁ ଆରମ୍ଭ ହେଉଛି?',
        difficulty: req.difficulty,
        language: 'Odia',
        type: 'word_match',
        prompt: '"ଫ" ଧ୍ୱନିରୁ ଆରମ୍ଭ ହେଉଥିବା ଶବ୍ଦ:',
        items: [
          { id: 'opt_flower', text: 'ଫୁଲ', visual: '🌸', isCorrect: true, feedbackHint: 'ବଢ଼ିଆ! ଫ-ଫୁଲ "ଫ" ରୁ ଆରମ୍ଭ ହୁଏ! 🌟' },
          { id: 'opt_cat', text: 'ବିଲେଇ', visual: '🐱', isCorrect: false, feedbackHint: 'ବିଲେଇ "ବ" ରୁ ଆରମ୍ଭ ହୁଏ।' },
        ],
        stepByStepHint: 'ଧୀରେ କୁହନ୍ତୁ: ଫ... ଫୁଲ!',
      };
    }
    if (isPunjabi) {
      return {
        id: `act_iso_pa_${Date.now()}`,
        skillId: 'skill_phonemic_isolation',
        title: 'ਪਹਿਲੀ ਧੁਨੀ ਪਛਾਣ 🕵️',
        instruction: 'ਕਿਹੜੀ ਤਸਵੀਰ "ਫ" ਧੁਨੀ ਨਾਲ ਸ਼ੁਰੂ ਹੁੰਦੀ ਹੈ?',
        difficulty: req.difficulty,
        language: 'Punjabi',
        type: 'word_match',
        prompt: '"ਫ" ਧੁਨੀ ਨਾਲ ਸ਼ੁਰੂ ਹੋਣ ਵਾਲਾ ਸ਼ਬਦ:',
        items: [
          { id: 'opt_flower', text: 'ਫੁੱਲ', visual: '🌸', isCorrect: true, feedbackHint: 'ਬਹੁਤ ਵਧੀਆ! ਫ-ਫੁੱਲ "ਫ" ਨਾਲ ਸ਼ੁਰੂ ਹੁੰਦਾ ਹੈ! 🌟' },
          { id: 'opt_cat', text: 'ਬਿੱਲੀ', visual: '🐱', isCorrect: false, feedbackHint: 'ਬਿੱਲੀ "ਬ" ਨਾਲ ਸ਼ੁਰੂ ਹੁੰਦੀ ਹੈ।' },
        ],
        stepByStepHint: 'ਹੌਲੀ ਬੋਲੋ: ਫ... ਫੁੱਲ!',
      };
    }
    if (isTamil) {
      return {
        id: `act_iso_ta_${Date.now()}`,
        skillId: 'skill_phonemic_isolation',
        title: 'முதல் ஒலி அறிதல் 🕵️',
        instruction: 'எந்தப் படம் "ப" ஒலியில் தொடங்குகிறது?',
        difficulty: req.difficulty,
        language: 'Tamil',
        type: 'word_match',
        prompt: '"ப" ஒலியில் தொடங்கும் சொல்:',
        items: [
          { id: 'opt_kite', text: 'பட்டம்', visual: '🪁', isCorrect: true, feedbackHint: 'அற்புதம்! ப-பட்டம் "ப" ஒலியில் தொடங்குகிறது! 🌟' },
          { id: 'opt_cat', text: 'பூனை', visual: '🐱', isCorrect: false, feedbackHint: 'இது "பூ" ஒலி. குறில் "ப" ஐத் தேர்ந்தெடுக்கவும்.' },
        ],
        stepByStepHint: 'உதடுகளை ஒட்டவைத்துச் சொல்லுங்கள்: ப... பட்டம்!',
      };
    }

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
        { id: 'opt_bear', text: 'Bear', visual: '🐻', isCorrect: false, feedbackHint: 'Bear starts with /b/.' },
      ],
      stepByStepHint: 'Put your teeth on your lower lip and blow gently: /f/ /f/ /f/... fish!',
    };
  }

  // 4. Rhyming Patterns
  if (req.skillId === 'skill_phonemic_rhyme' || req.skillId === 'skill_rhyming_patterns') {
    if (isHindi) {
      return {
        id: `act_rhyme_hi_${Date.now()}`,
        skillId: 'skill_phonemic_rhyme',
        title: 'तुकबंदी मिलान 🏰',
        instruction: '"जल" के साथ कौन-सा शब्द तुक मिलाता है?',
        difficulty: req.difficulty,
        language: 'Hindi',
        type: 'word_match',
        prompt: '"जल" (पानी) से मिलता-जुलता शब्द 💧:',
        items: [
          { id: 'opt_phal', text: 'फल', visual: '🍎', isCorrect: true, feedbackHint: 'शाबाश! जल और फल एक जैसी ध्वनि पर खत्म होते हैं! 🍎' },
          { id: 'opt_ghar', text: 'घर', visual: '🏠', isCorrect: false, feedbackHint: 'घर "र" पर खत्म होता है, "ल" पर नहीं।' },
        ],
        stepByStepHint: 'अंतिम ध्वनि सुनिए: ज-ल... फ-ल!',
      };
    }
    if (isOdia) {
      return {
        id: `act_rhyme_or_${Date.now()}`,
        skillId: 'skill_phonemic_rhyme',
        title: 'ଛନ୍ଦ ଶବ୍ଦ ମେଳ 🏰',
        instruction: '"ଜଳ" ସହିତ କେଉଁ ଶବ୍ଦର ଛନ୍ଦ ମିଳୁଛି?',
        difficulty: req.difficulty,
        language: 'Odia',
        type: 'word_match',
        prompt: '"ଜଳ" ସହିତ ଛନ୍ଦଯୁକ୍ତ ଶବ୍ଦ 💧:',
        items: [
          { id: 'opt_phal', text: 'ଫଳ', visual: '🍎', isCorrect: true, feedbackHint: 'ଚମତ୍କାର! ଜଳ ଏବଂ ଫଳ ସମାନ ଶେଷ ଧ୍ୱନି ବିଶିଷ୍ଟ! 🍎' },
          { id: 'opt_ghar', text: 'ଘର', visual: '🏠', isCorrect: false, feedbackHint: 'ଘର ଶେଷରେ "ର" ଅଛି।' },
        ],
        stepByStepHint: 'ଶେଷ ଧ୍ୱନି ଶୁଣନ୍ତୁ: ଜ-ଳ... ଫ-ଳ!',
      };
    }
    if (isPunjabi) {
      return {
        id: `act_rhyme_pa_${Date.now()}`,
        skillId: 'skill_phonemic_rhyme',
        title: 'ਤੁਕਬੰਦੀ ਮੇਲ 🏰',
        instruction: '"ਜਲ" ਨਾਲ ਕਿਹੜਾ ਸ਼ਬਦ ਤੁਕ ਮਿਲਾਉਂਦਾ ਹੈ?',
        difficulty: req.difficulty,
        language: 'Punjabi',
        type: 'word_match',
        prompt: '"ਜਲ" ਨਾਲ ਰਲਦਾ-ਮਿਲਦਾ ਸ਼ਬਦ 💧:',
        items: [
          { id: 'opt_phal', text: 'ਫਲ', visual: '🍎', isCorrect: true, feedbackHint: 'ਬੱਲੇ! ਜਲ ਅਤੇ ਫਲ ਦੀ ਤੁਕ ਮਿਲਦੀ ਹੈ! 🍎' },
          { id: 'opt_ghar', text: 'ਘਰ', visual: '🏠', isCorrect: false, feedbackHint: 'ਘਰ ਦੇ ਅੰਤ ਵਿੱਚ "ਰ" ਹੈ।' },
        ],
        stepByStepHint: 'ਆਖਰੀ ਆਵਾਜ਼ ਸੁਣੋ: ਜ-ਲ... ਫ-ਲ!',
      };
    }
    if (isTamil) {
      return {
        id: `act_rhyme_ta_${Date.now()}`,
        skillId: 'skill_phonemic_rhyme',
        title: 'எதுகை மோனை சொல் பொருத்தம் 🏰',
        instruction: '"காடு" என்ற சொல்லோடு எதுகை பொருந்தும் சொல் எது?',
        difficulty: req.difficulty,
        language: 'Tamil',
        type: 'word_match',
        prompt: '"காடு" உடன் ஒத்த ஓசையுடைய சொல் 🌲:',
        items: [
          { id: 'opt_koodu', text: 'கூடு', visual: '🪹', isCorrect: true, feedbackHint: 'அற்புதம்! காடு மற்றும் கூடு ஒரே ஓசையில் முடிகின்றன! 🪹' },
          { id: 'opt_veedu', text: 'வீடு', visual: '🏠', isCorrect: false, feedbackHint: 'காடு - கூடு ஓசையை ஒப்பிட்டுப் பாருங்கள்.' },
        ],
        stepByStepHint: 'இறுதி ஓசையைக் கவனியுங்கள்: கா-டு... கூ-டு!',
      };
    }

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
        { id: 'opt_dog', text: 'Dog', visual: '🐶', isCorrect: false, feedbackHint: 'Dog ends in -og.' },
      ],
      stepByStepHint: 'Say the ending sound: -at! Now listen: h... at! Hat!',
    };
  }

  // 5. Syllable Splitting
  if (req.skillId === 'skill_syllable_segmentation' || req.skillId === 'skill_syllable_clapping') {
    if (isHindi) {
      return {
        id: `act_syl_hi_${Date.now()}`,
        skillId: 'skill_syllable_segmentation',
        title: 'शब्द ताल: ताली बजाओ 🥁',
        instruction: '"पा-नी" बोलते समय कितनी बार ताली बजेगी?',
        difficulty: req.difficulty,
        language: 'Hindi',
        type: 'word_match',
        prompt: '"पा - नी" में कितनी ताल 💧?',
        items: [
          { id: 'opt_2', text: '2 ताल', visual: '✌️', isCorrect: true, feedbackHint: 'शाबाश! पा (ताली!) नी (ताली!) -> 2 ताल! 💧' },
          { id: 'opt_1', text: '1 ताल', visual: '☝️', isCorrect: false, feedbackHint: 'पा... नी, दो टुकड़े हैं।' },
        ],
        stepByStepHint: 'बोलते हुए ताली बजाइए: पा-नी!',
      };
    }
    if (isOdia) {
      return {
        id: `act_syl_or_${Date.now()}`,
        skillId: 'skill_syllable_segmentation',
        title: 'ଶବ୍ଦ ତାଳ: ତାଳି ବଜାନ୍ତୁ 🥁',
        instruction: '"ପା-ଣି" କହିବା ବେଳେ କେତୋଟି ତାଳି ବାଜିବ?',
        difficulty: req.difficulty,
        language: 'Odia',
        type: 'word_match',
        prompt: '"ପା - ଣି" ରେ କେତୋଟି ତାଳି 💧?',
        items: [
          { id: 'opt_2', text: '୨ ଟି ତାଳି', visual: '✌️', isCorrect: true, feedbackHint: 'ବାଃ! ପା (ତାଳି!) ଣି (ତାଳି!) -> ୨ ଟି ତାଳି! 💧' },
          { id: 'opt_1', text: '୧ ଟି ତାଳି', visual: '☝️', isCorrect: false, feedbackHint: 'ପା-ଣି ଦୁଇଟି ଭାଗ।' },
        ],
        stepByStepHint: 'ଧୀରେ କହି ତାଳି ବଜାନ୍ତୁ: ପା... ଣି!',
      };
    }
    if (isPunjabi) {
      return {
        id: `act_syl_pa_${Date.now()}`,
        skillId: 'skill_syllable_segmentation',
        title: 'ਸ਼ਬਦ ਤਾਲ: ਤਾੜੀ ਮਾਰੋ 🥁',
        instruction: '"ਪਾ-ਣੀ" ਬੋਲਣ ਸਮੇਂ ਕਿੰਨੀਆਂ ਤਾੜੀਆਂ ਵੱਜਣਗੀਆਂ?',
        difficulty: req.difficulty,
        language: 'Punjabi',
        type: 'word_match',
        prompt: '"ਪਾ - ਣੀ" ਵਿੱਚ ਕਿੰਨੀਆਂ ਤਾੜੀਆਂ 💧?',
        items: [
          { id: 'opt_2', text: '2 ਤਾੜੀਆਂ', visual: '✌️', isCorrect: true, feedbackHint: 'ਸ਼ਾਬਾਸ਼! ਪਾ-ਣੀ ਵਿੱਚ 2 ਤਾੜੀਆਂ ਹਨ! 💧' },
          { id: 'opt_1', text: '1 ਤਾੜੀ', visual: '☝️', isCorrect: false, feedbackHint: 'ਦੋ ਵਾਰ ਬੋਲ ਕੇ ਦੇਖੋ: ਪਾ... ਣੀ।' },
        ],
        stepByStepHint: 'ਤਾੜੀ ਮਾਰ ਕੇ ਬੋਲੋ: ਪਾ-ਣੀ!',
      };
    }
    if (isTamil) {
      return {
        id: `act_syl_ta_${Date.now()}`,
        skillId: 'skill_syllable_segmentation',
        title: 'சொல் அசை பிரித்தல் 🥁',
        instruction: '"தண்-ணீர்" சொல்லில் எத்தனை அசைகள் உள்ளன?',
        difficulty: req.difficulty,
        language: 'Tamil',
        type: 'word_match',
        prompt: '"தண் - ணீர்" சொல்லில் எத்தனை துடிப்புகள் 💧?',
        items: [
          { id: 'opt_2', text: '2 துடிப்புகள்', visual: '✌️', isCorrect: true, feedbackHint: 'அருமை! தண்-ணீர் சொல்லில் 2 துடிப்புகள் உள்ளன! 💧' },
          { id: 'opt_1', text: '1 துடிப்பு', visual: '☝️', isCorrect: false, feedbackHint: 'தண்-ணீர் இரண்டு பாகங்களாக ஒலிக்கிறது.' },
        ],
        stepByStepHint: 'கைதட்டிச் சொல்லுங்கள்: தண்... ணீர்!',
      };
    }

    return {
      id: `act_syllables_${Date.now()}`,
      skillId: 'skill_syllable_segmentation',
      title: 'Syllable Drummer: Beat the Word 🥁',
      instruction: 'Clap out the beats in "wa-ter". How many syllables do you hear?',
      difficulty: req.difficulty,
      language: 'English',
      type: 'word_match',
      prompt: 'How many claps in "wa - ter" 💧?',
      items: [
        { id: 'opt_2', text: '2 claps', visual: '✌️', isCorrect: true, feedbackHint: 'Clap! Clap! Yes, wa-ter has 2 beats! 💧' },
        { id: 'opt_1', text: '1 clap', visual: '☝️', isCorrect: false, feedbackHint: 'Try clapping while you say it: wa-ter.' },
      ],
      stepByStepHint: 'Put your hand under your chin. Say "wa-ter". Your chin drops twice: 2 syllables!',
    };
  }

  // 6. Missing Letter
  if (req.skillId === 'skill_missing_letter') {
    if (isHindi) {
      return {
        id: `act_mis_hi_${Date.now()}`,
        skillId: 'skill_missing_letter',
        title: 'लापता अक्षर खोजें 🔍',
        instruction: 'शब्द पूरा करने के लिए सही अक्षर चुनें: क _ ल (फूल 🪷):',
        difficulty: req.difficulty,
        language: 'Hindi',
        type: 'letter_distinction',
        prompt: 'क [ ? ] ल 🪷',
        items: [
          { id: 'opt_ma', text: 'म', visual: '🌸', isCorrect: true, feedbackHint: 'शाबाश! क-म-ल से बना कमल! 🪷' },
          { id: 'opt_ra', text: 'र', visual: '❌', isCorrect: false, feedbackHint: 'क-र-ल नहीं होता। म चुनिए।' },
        ],
        stepByStepHint: 'बीच का अक्षर पहचानिए: क... म... ल!',
      };
    }
    if (isOdia) {
      return {
        id: `act_mis_or_${Date.now()}`,
        skillId: 'skill_missing_letter',
        title: 'ହଜିଯାଇଥିବା ଅକ୍ଷର ଖୋଜନ୍ତୁ 🔍',
        instruction: 'ଶବ୍ଦ ପୂରଣ କରନ୍ତୁ: କ _ ଳ (ପଦ୍ମ ଫୁଲ 🪷):',
        difficulty: req.difficulty,
        language: 'Odia',
        type: 'letter_distinction',
        prompt: 'କ [ ? ] ଳ 🪷',
        items: [
          { id: 'opt_ma', text: 'ମ', visual: '🌸', isCorrect: true, feedbackHint: 'ଅତି ସୁନ୍ଦର! କ-ମ-ଳ ହେଲା କମଳ! 🪷' },
          { id: 'opt_ra', text: 'ର', visual: '❌', isCorrect: false, feedbackHint: 'କ-ମ-ଳ ବାଛନ୍ତୁ।' },
        ],
        stepByStepHint: 'ମଝି ଅକ୍ଷରଟି କୁହନ୍ତୁ: କ... ମ... ଳ!',
      };
    }
    if (isPunjabi) {
      return {
        id: `act_mis_pa_${Date.now()}`,
        skillId: 'skill_missing_letter',
        title: 'ਗੁਆਚਿਆ ਅੱਖਰ ਲੱਭੋ 🔍',
        instruction: 'ਸ਼ਬਦ ਪੂਰਾ ਕਰੋ: ਕ _ ਲ (ਫੁੱਲ 🪷):',
        difficulty: req.difficulty,
        language: 'Punjabi',
        type: 'letter_distinction',
        prompt: 'ਕ [ ? ] ਲ 🪷',
        items: [
          { id: 'opt_ma', text: 'ਮ', visual: '🌸', isCorrect: true, feedbackHint: 'ਬਹੁਤ ਵਧੀਆ! ਕ-ਮ-ਲ ਬਣਿਆ ਕਮਲ! 🪷' },
          { id: 'opt_ra', text: 'ਰ', visual: '❌', isCorrect: false, feedbackHint: 'ਕ-ਮ-ਲ ਚੁਣੋ।' },
        ],
        stepByStepHint: 'ਵਿਚਕਾਰਲਾ ਅੱਖਰ ਲੱਭੋ: ਮ!',
      };
    }
    if (isTamil) {
      return {
        id: `act_mis_ta_${Date.now()}`,
        skillId: 'skill_missing_letter',
        title: 'விடுபட்ட எழுத்து அறிதல் 🔍',
        instruction: 'சொல்லை நிறைவு செய்க: ப _ ம் (சுவையான பழம் 🍎):',
        difficulty: req.difficulty,
        language: 'Tamil',
        type: 'letter_distinction',
        prompt: 'ப [ ? ] ம் 🍎',
        items: [
          { id: 'opt_zha', text: 'ழ', visual: '🍎', isCorrect: true, feedbackHint: 'அற்புதம்! ப-ழ-ம் பழம் ஆனது! 🍎' },
          { id: 'opt_la', text: 'ல', visual: '❌', isCorrect: false, feedbackHint: 'சிறப்பு ழகரம் "ழ" வைத் தேர்ந்தெடுக்கவும்.' },
        ],
        stepByStepHint: 'நாவை மடக்கி உச்சரியுங்கள்: ழ... பழம்!',
      };
    }

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
        { id: 'opt_o', text: 'o', visual: '🍊', isCorrect: false, feedbackHint: 'c-o-t spells cot.' },
      ],
      stepByStepHint: 'Listen to the middle sound: /k/ ... /æ/ ... /t/. The apple letter is "a"!',
    };
  }

  // 7. Word Building
  if (req.skillId === 'skill_word_building') {
    if (isHindi) {
      return {
        id: `act_wb_hi_${Date.now()}`,
        skillId: 'skill_word_building',
        title: 'शब्द निर्माण 🧱',
        instruction: 'ध्वनियों को जोड़कर शब्द बनाएं: क + ल + म',
        difficulty: req.difficulty,
        language: 'Hindi',
        type: 'word_match',
        prompt: 'लिखने वाली वस्तु का नाम ✍️:',
        items: [
          { id: 'opt_kalam', text: 'कलम', visual: '✍️', isCorrect: true, feedbackHint: 'वाह! क-ल-म से बना कलम! 🌟' },
          { id: 'opt_kamal', text: 'कमल', visual: '🪷', isCorrect: false, feedbackHint: 'यह कमल है। लिखने वाली कलम चुनें।' },
        ],
        stepByStepHint: 'क, ल, म को क्रम से बोलिए: कलम!',
      };
    }
    if (isOdia) {
      return {
        id: `act_wb_or_${Date.now()}`,
        skillId: 'skill_word_building',
        title: 'ଶବ୍ଦ ଗଠନ 🧱',
        instruction: 'ଅକ୍ଷର ଯୋଡ଼ି ଶବ୍ଦ ତିଆରି କରନ୍ତୁ: କ + ଳ + ମ',
        difficulty: req.difficulty,
        language: 'Odia',
        type: 'word_match',
        prompt: 'ଲେଖିବା ଜିନିଷ ✍️:',
        items: [
          { id: 'opt_kalam', text: 'କଲମ', visual: '✍️', isCorrect: true, feedbackHint: 'ବଢ଼ିଆ! କ-ଲ-ମ ମିଶି କଲମ ହେଲା! 🌟' },
          { id: 'opt_kamal', text: 'କମଳ', visual: '🪷', isCorrect: false, feedbackHint: 'ଏହା କମଳ।' },
        ],
        stepByStepHint: 'ଅକ୍ଷରଗୁଡ଼ିକୁ ମିଳାଇ କୁହନ୍ତୁ: କଲମ!',
      };
    }
    if (isPunjabi) {
      return {
        id: `act_wb_pa_${Date.now()}`,
        skillId: 'skill_word_building',
        title: 'ਸ਼ਬਦ ਉਸਾਰੀ 🧱',
        instruction: 'ਅੱਖਰ ਜੋੜ ਕੇ ਸ਼ਬਦ ਬਣਾਓ: ਕ + ਲ + ਮ',
        difficulty: req.difficulty,
        language: 'Punjabi',
        type: 'word_match',
        prompt: 'ਲਿਖਣ ਵਾਲੀ ਕਲਮ ✍️:',
        items: [
          { id: 'opt_kalam', text: 'ਕਲਮ', visual: '✍️', isCorrect: true, feedbackHint: 'ਸ਼ਾਬਾਸ਼! ਕ-ਲ-ਮ ਤੋਂ ਬਣੀ ਕਲਮ! 🌟' },
          { id: 'opt_kamal', text: 'ਕਮਲ', visual: '🪷', isCorrect: false, feedbackHint: 'ਇਹ ਕਮਲ ਹੈ।' },
        ],
        stepByStepHint: 'ਕ੍ਰਮ ਵਿੱਚ ਬੋਲੋ: ਕਲਮ!',
      };
    }
    if (isTamil) {
      return {
        id: `act_wb_ta_${Date.now()}`,
        skillId: 'skill_word_building',
        title: 'சொல் ஆக்கம் 🧱',
        instruction: 'எழுத்துகளை இணைத்துச் சொல் உருவாக்குக: ம + ல + ர்',
        difficulty: req.difficulty,
        language: 'Tamil',
        type: 'word_match',
        prompt: 'அழகான பூவைக் குறிக்கும் சொல் 🌸:',
        items: [
          { id: 'opt_malar', text: 'மலர்', visual: '🌸', isCorrect: true, feedbackHint: 'அருமை! ம-ல-ர் சேர்ந்தால் மலர்! 🌟' },
          { id: 'opt_maram', text: 'மரம்', visual: '🌳', isCorrect: false, feedbackHint: 'இது மரம். மலரைத் தேர்ந்தெடுக்கவும்.' },
        ],
        stepByStepHint: 'ஒன்றாகச் சொல்லுங்கள்: ம-ல-ர் -> மலர்!',
      };
    }

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
        { id: 'opt_bird', text: 'bird', visual: '🐦', isCorrect: true, feedbackHint: 'You built the word BIRD! 🐦' },
        { id: 'opt_drib', text: 'drib', visual: '❓', isCorrect: false, feedbackHint: 'Start with /b/ sound.' },
      ],
      stepByStepHint: 'First sound is /b/, then -ird: bird!',
    };
  }

  // 8. Sight Words / High Frequency
  if (req.skillId === 'skill_sight_words_high_freq') {
    if (isHindi) {
      return {
        id: `act_sw_hi_${Date.now()}`,
        skillId: 'skill_sight_words_high_freq',
        title: 'सामान्य शब्द पहचान ⚡',
        instruction: 'वाक्यों में अक्सर आने वाला शब्द "और" पहचानिए:',
        difficulty: req.difficulty,
        language: 'Hindi',
        type: 'word_match',
        prompt: '"और" शब्द कौन-सा है?',
        items: [
          { id: 'opt_aur', text: 'और', visual: '✨', isCorrect: true, feedbackHint: 'शानदार! "और" एक बहुत उपयोगी शब्द है! 🌟' },
          { id: 'opt_aurat', text: 'औरत', visual: '👩', isCorrect: false, feedbackHint: 'यह औरत है। "और" चुनें।' },
        ],
        stepByStepHint: 'औ की मात्रा और र: और!',
      };
    }
    if (isOdia) {
      return {
        id: `act_sw_or_${Date.now()}`,
        skillId: 'skill_sight_words_high_freq',
        title: 'ଦୃଷ୍ଟି ଶବ୍ଦ ପରିଚୟ ⚡',
        instruction: 'ବାରମ୍ବାର ବ୍ୟବହୃତ ଶବ୍ଦ "ଏବଂ" କୁ ଚିହ୍ନନ୍ତୁ:',
        difficulty: req.difficulty,
        language: 'Odia',
        type: 'word_match',
        prompt: '"ଏବଂ" ଶବ୍ଦଟି କେଉଁଟି?',
        items: [
          { id: 'opt_ebang', text: 'ଏବଂ', visual: '✨', isCorrect: true, feedbackHint: 'ସଠିକ୍! "ଏବଂ" ଏକ ସାଧାରଣ ଶବ୍ଦ ଅଟେ! 🌟' },
          { id: 'opt_eka', text: 'ଏକ', visual: '☝️', isCorrect: false, feedbackHint: 'ଏହା ଏକ।' },
        ],
        stepByStepHint: 'ଏ - ବ - ଂ: ଏବଂ!',
      };
    }
    if (isPunjabi) {
      return {
        id: `act_sw_pa_${Date.now()}`,
        skillId: 'skill_sight_words_high_freq',
        title: 'ਆਮ ਸ਼ਬਦ ਪਛਾਣ ⚡',
        instruction: 'ਆਮ ਵਰਤਿਆ ਜਾਣ ਵਾਲਾ ਸ਼ਬਦ "ਅਤੇ" ਪਛਾਣੋ:',
        difficulty: req.difficulty,
        language: 'Punjabi',
        type: 'word_match',
        prompt: '"ਅਤੇ" ਸ਼ਬਦ ਕਿਹੜਾ ਹੈ?',
        items: [
          { id: 'opt_ate', text: 'ਅਤੇ', visual: '✨', isCorrect: true, feedbackHint: 'ਕਮਾਲ! "ਅਤੇ" ਬਹੁਤ ਮਹੱਤਵਪੂਰਨ ਸ਼ਬਦ ਹੈ! 🌟' },
          { id: 'opt_ajj', text: 'ਅੱਜ', visual: '📅', isCorrect: false, feedbackHint: 'ਇਹ ਅੱਜ ਹੈ।' },
        ],
        stepByStepHint: 'ਅ - ਤੇ: ਅਤੇ!',
      };
    }
    if (isTamil) {
      return {
        id: `act_sw_ta_${Date.now()}`,
        skillId: 'skill_sight_words_high_freq',
        title: 'பார்வைச் சொல் அறிதல் ⚡',
        instruction: 'அடிக்கடி வரும் சொல்லான "மற்றும்" ஐக் கண்டறியவும்:',
        difficulty: req.difficulty,
        language: 'Tamil',
        type: 'word_match',
        prompt: '"மற்றும்" என்ற சொல் எது?',
        items: [
          { id: 'opt_matrum', text: 'மற்றும்', visual: '✨', isCorrect: true, feedbackHint: 'அருமை! "மற்றும்" பயனுள்ள சொல்! 🌟' },
          { id: 'opt_man', text: 'மண்', visual: '🪴', isCorrect: false, feedbackHint: 'இது மண்.' },
        ],
        stepByStepHint: 'ம-ற்-று-ம்: மற்றும்!',
      };
    }

    return {
      id: `act_sight_words_${Date.now()}`,
      skillId: 'skill_sight_words_high_freq',
      title: 'Sight Word Sparkle ⚡',
      instruction: 'Spot the sight word "the" used in "the little kite":',
      difficulty: req.difficulty,
      language: 'English',
      type: 'word_match',
      prompt: 'Which word is "the"?',
      items: [
        { id: 'opt_the', text: 'the', visual: '✨', isCorrect: true, feedbackHint: 'Brilliant! "the" is one of our most helpful sight words! 🌟' },
        { id: 'opt_teh', text: 'teh', visual: '❌', isCorrect: false, feedbackHint: 'Check the letters: t, then h, then e.' },
      ],
      stepByStepHint: 'Remember the 3 letters: T - H - E. Say: the!',
    };
  }

  // 9. Reading Comprehension
  if (req.skillId === 'skill_story_comprehension') {
    if (isHindi) {
      return {
        id: `act_comp_hi_${Date.now()}`,
        skillId: 'skill_story_comprehension',
        title: 'कहानी बोध: सनी की पतंग 🪁',
        instruction: 'सनी ने एक लाल पतंग बनाई। हवा उसे पेड़ों से ऊपर ले गई! पतंग का रंग क्या था?',
        difficulty: req.difficulty,
        language: 'Hindi',
        type: 'word_match',
        prompt: 'सनी की पतंग का रंग क्या था 🪁?',
        items: [
          { id: 'opt_red', text: 'लाल', visual: '🔴', isCorrect: true, feedbackHint: 'बिल्कुल सही! सनी की पतंग लाल रंग की थी! 🪁' },
          { id: 'opt_blue', text: 'नीला', visual: '🔵', isCorrect: false, feedbackHint: 'कहानी में लाल पतंग लिखी है।' },
        ],
        stepByStepHint: 'वाक्य फिर से पढ़िए: "सनी ने एक लाल पतंग बनाई।"',
      };
    }
    if (isOdia) {
      return {
        id: `act_comp_or_${Date.now()}`,
        skillId: 'skill_story_comprehension',
        title: 'ଗପ ବୋଧ: ସନିର ଗୁଡ଼ି 🪁',
        instruction: 'ସନି ଏକ ନାଲି ଗୁଡ଼ି ତିଆରି କଲା। ପବନ ତାକୁ ଗଛ ଉପରକୁ ଉଡ଼ାଇଲା! ଗୁଡ଼ିର ରଙ୍ଗ କଣ ଥିଲା?',
        difficulty: req.difficulty,
        language: 'Odia',
        type: 'word_match',
        prompt: 'ସନିର ଗୁଡ଼ି କେଉଁ ରଙ୍ଗର ଥିଲା 🪁?',
        items: [
          { id: 'opt_red', text: 'ନାଲି', visual: '🔴', isCorrect: true, feedbackHint: 'ସଠିକ୍! ସନିର ଗୁଡ଼ି ନାଲି ରଙ୍ଗର ଥିଲା! 🪁' },
          { id: 'opt_blue', text: 'ନୀଳ', visual: '🔵', isCorrect: false, feedbackHint: 'ଗପରେ ନାଲି ଗୁଡ଼ି ଲେଖାଅଛି।' },
        ],
        stepByStepHint: 'ପ୍ରଥମ ଧାଡ଼ି ଦେଖନ୍ତୁ: "ନାଲି ଗୁଡ଼ି।"',
      };
    }
    if (isPunjabi) {
      return {
        id: `act_comp_pa_${Date.now()}`,
        skillId: 'skill_story_comprehension',
        title: 'ਕਹਾਣੀ ਸਮਝ: ਸੰਨੀ ਦੀ ਪਤੰਗ 🪁',
        instruction: 'ਸੰਨੀ ਨੇ ਇੱਕ ਲਾਲ ਪਤੰਗ ਬਣਾਈ। ਹਵਾ ਉਸਨੂੰ ਰੁੱਖਾਂ ਤੋਂ ਉੱਚਾ ਲੈ ਗਈ! ਪਤੰਗ ਦਾ ਰੰਗ ਕੀ ਸੀ?',
        difficulty: req.difficulty,
        language: 'Punjabi',
        type: 'word_match',
        prompt: 'ਸੰਨੀ ਦੀ ਪਤੰਗ ਦਾ ਰੰਗ ਕੀ ਸੀ 🪁?',
        items: [
          { id: 'opt_red', text: 'ਲਾਲ', visual: '🔴', isCorrect: true, feedbackHint: 'ਸਹੀ ਉੱਤਰ! ਸੰਨੀ ਦੀ ਪਤੰਗ ਲਾਲ ਸੀ! 🪁' },
          { id: 'opt_blue', text: 'ਨੀਲਾ', visual: '🔵', isCorrect: false, feedbackHint: 'ਕਹਾਣੀ ਵਿੱਚ ਲਾਲ ਪਤੰਗ ਹੈ।' },
        ],
        stepByStepHint: 'ਪਹਿਲਾ ਵਾਕ ਪੜ੍ਹੋ: "ਇੱਕ ਲਾਲ ਪਤੰਗ ਬਣਾਈ।"',
      };
    }
    if (isTamil) {
      return {
        id: `act_comp_ta_${Date.now()}`,
        skillId: 'skill_story_comprehension',
        title: 'கதைப் புரிதல்: சன்னியின் பட்டம் 🪁',
        instruction: 'சன்னி ஒரு சிவப்புப் பட்டம் செய்தாள். காற்று அதை மரங்களுக்கு மேல் உயர்த்தியது! பட்டத்தின் நிறம் என்ன?',
        difficulty: req.difficulty,
        language: 'Tamil',
        type: 'word_match',
        prompt: 'சன்னியின் பட்டம் என்ன நிறம் 🪁?',
        items: [
          { id: 'opt_red', text: 'சிவப்பு', visual: '🔴', isCorrect: true, feedbackHint: 'சரியான பதில்! சன்னியின் பட்டம் சிவப்பு நிறம்! 🪁' },
          { id: 'opt_blue', text: 'நீலம்', visual: '🔵', isCorrect: false, feedbackHint: 'கதையில் சிவப்புப் பட்டம் என்றுள்ளது.' },
        ],
        stepByStepHint: 'முதல் வரியைப் படியுங்கள்: "ஒரு சிவப்புப் பட்டம் செய்தாள்."',
      };
    }

    return {
      id: `act_story_comp_${Date.now()}`,
      skillId: 'skill_story_comprehension',
      title: 'Story Explorer: Sunny and the Kite 🪁',
      instruction: 'Sunny made a red kite. The wind lifted it up above the trees! What color was the kite?',
      difficulty: req.difficulty,
      language: 'English',
      type: 'word_match',
      prompt: 'What color was Sunny\'s kite 🪁?',
      items: [
        { id: 'opt_red', text: 'Red', visual: '🔴', isCorrect: true, feedbackHint: 'Spot on! Sunny made a bright RED kite that flew high! 🪁' },
        { id: 'opt_blue', text: 'Blue', visual: '🔵', isCorrect: false, feedbackHint: 'The story said Sunny made a RED kite.' },
      ],
      stepByStepHint: 'Look back at the first sentence: "Sunny made a red kite."',
    };
  }

  // 10. Sentence Fluency / Vocabulary
  if (req.skillId === 'skill_sentence_fluency') {
    if (isHindi) {
      return {
        id: `act_fl_hi_${Date.now()}`,
        skillId: 'skill_sentence_fluency',
        title: 'शब्द अर्थ: कोमल स्पर्श 🌿',
        instruction: '"कोमल" का अर्थ बहुत नरम और प्यारा होता है। कौन-सा चित्र कोमल स्पर्श दिखाता है?',
        difficulty: req.difficulty,
        language: 'Hindi',
        type: 'word_match',
        prompt: 'कोमल चीज़ कौन-सी है?',
        items: [
          { id: 'opt_butterfly', text: 'तितली का फूल पर बैठना', visual: '🦋', isCorrect: true, feedbackHint: 'बहुत खूब! तितली फूल पर बहुत कोमलता से बैठती है! 🌸' },
          { id: 'opt_storm', text: 'तेज़ तूफ़ਾਨ', visual: '⛈️', isCorrect: false, feedbackHint: 'तूफ़ान तेज़ और कठोर होता है।' },
        ],
        stepByStepHint: 'सोचिए फूल की पंखुड़ियों जैसा क्या है: तितली!',
      };
    }
    if (isOdia) {
      return {
        id: `act_fl_or_${Date.now()}`,
        skillId: 'skill_sentence_fluency',
        title: 'ଶବ୍ଦ ଅର୍ଥ: କୋମଳ ସ୍ପର୍ଶ 🌿',
        instruction: '"କୋମଳ" ର ଅର୍ଥ ନରମ ଓ ସ୍ନେହଭରା। କେଉଁ ଛବିଟି କୋମଳତା ଦର୍ଶାଉଛି?',
        difficulty: req.difficulty,
        language: 'Odia',
        type: 'word_match',
        prompt: 'କୋମଳ ବସ୍ତୁ କେଉଁଟି?',
        items: [
          { id: 'opt_butterfly', text: 'ଫୁଲ ଉପରେ ପ୍ରଜାପତି', visual: '🦋', isCorrect: true, feedbackHint: 'ଅତି ସୁନ୍ଦର! ପ୍ରଜାପତି ଫୁଲ ଉପରେ କୋମଳ ଭାବେ ବସେ! 🌸' },
          { id: 'opt_storm', text: 'ପ୍ରବଳ ଝଡ଼', visual: '⛈️', isCorrect: false, feedbackHint: 'ଝଡ଼ କଠୋର ଅଟେ।' },
        ],
        stepByStepHint: 'ନରମ ଓ ଶାନ୍ତ ଜିନିଷ ଚିନ୍ତା କରନ୍ତୁ: ପ୍ରଜାପତି!',
      };
    }
    if (isPunjabi) {
      return {
        id: `act_fl_pa_${Date.now()}`,
        skillId: 'skill_sentence_fluency',
        title: 'ਸ਼ਬਦ ਅਰਥ: ਕੋਮਲ ਛੋਹ 🌿',
        instruction: '"ਕੋਮਲ" ਦਾ ਅਰਥ ਨਰਮ ਅਤੇ ਪਿਆਰਾ ਹੁੰਦਾ ਹੈ। ਕਿਹੜੀ ਤਸਵੀਰ ਕੋਮਲਤਾ ਦਰਸਾਉਂਦੀ ਹੈ?',
        difficulty: req.difficulty,
        language: 'Punjabi',
        type: 'word_match',
        prompt: 'ਕੋਮਲ ਚੀਜ਼ ਕਿਹੜੀ ਹੈ?',
        items: [
          { id: 'opt_butterfly', text: 'ਫੁੱਲ ਉੱਤੇ ਤਿੱਤਲੀ', visual: '🦋', isCorrect: true, feedbackHint: 'ਸ਼ਾਬਾਸ਼! ਤਿੱਤਲੀ ਬਹੁਤ ਕੋਮਲ ਹੁੰਦੀ ਹੈ! 🌸' },
          { id: 'opt_storm', text: 'ਭਾਰੀ ਤੂਫ਼ਾਨ', visual: '⛈️', isCorrect: false, feedbackHint: 'ਤੂਫ਼ਾਨ ਤੇਜ਼ ਹੁੰਦਾ ਹੈ।' },
        ],
        stepByStepHint: 'ਨਰਮ ਅਤੇ ਸ਼ਾਂਤ ਸੋਚੋ: ਤਿੱਤਲੀ!',
      };
    }
    if (isTamil) {
      return {
        id: `act_fl_ta_${Date.now()}`,
        skillId: 'skill_sentence_fluency',
        title: 'சொல் பொருள்: மென்மையான தொடுதல் 🌿',
        instruction: '"மென்மையான" என்றால் மிகவும் இதமானது. எது மென்மையை உணர்த்துகிறது?',
        difficulty: req.difficulty,
        language: 'Tamil',
        type: 'word_match',
        prompt: 'மென்மையான செயல் எது?',
        items: [
          { id: 'opt_butterfly', text: 'பூவின் மீது வண்ணத்துப்பூச்சி', visual: '🦋', isCorrect: true, feedbackHint: 'அருமை! வண்ணத்துப்பூச்சி மிகவும் மென்மையாக அமரும்! 🌸' },
          { id: 'opt_storm', text: 'கடும் புயல்', visual: '⛈️', isCorrect: false, feedbackHint: 'புயல் கடினமானது.' },
        ],
        stepByStepHint: 'இதமான அமைதியான அழகைச் சிந்தியுங்கள்: வண்ணத்துப்பூச்சி!',
      };
    }

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
        { id: 'opt_storm', text: 'A loud roaring storm', visual: '⛈️', isCorrect: false, feedbackHint: 'A storm is loud and fierce, not gentle.' },
      ],
      stepByStepHint: 'Think about petting a little sleeping bunny: that is gentle!',
    };
  }

  // 11. Listening & Pronunciation
  if (req.skillId === 'skill_listening_pronunciation') {
    if (isHindi) {
      return {
        id: `act_lp_hi_${Date.now()}`,
        skillId: 'skill_listening_pronunciation',
        title: 'सुनो और पहचानो 🎧',
        instruction: 'ध्यान से सुनिए: "घास में एक प्यारा पिल्ला खेल रहा था।" घास में कौन खेल रहा था?',
        difficulty: req.difficulty,
        language: 'Hindi',
        type: 'word_match',
        prompt: 'घास में कौन खेल रहा था 🌿?',
        audioPrompt: 'घास में एक प्यारा पिल्ला खेल रहा था।',
        items: [
          { id: 'opt_puppy', text: 'पिल्ला', visual: '🐶', isCorrect: true, feedbackHint: 'बहुत बढ़िया श्रवण! घास में पिल्ला था! 🐾' },
          { id: 'opt_frog', text: 'मेंढक', visual: '🐸', isCorrect: false, feedbackHint: 'ऑडियो में पिल्ला कहा गया था।' },
        ],
        stepByStepHint: 'वाक्य ध्यान से सुनिए: "प्यारा पिल्ला।"',
      };
    }
    if (isOdia) {
      return {
        id: `act_lp_or_${Date.now()}`,
        skillId: 'skill_listening_pronunciation',
        title: 'ଶୁଣନ୍ତୁ ଏବଂ ଚିହ୍ନନ୍ତୁ 🎧',
        instruction: 'ଧ୍ୟାନରେ ଶୁଣନ୍ତୁ: "ଘାସରେ ଗୋଟିଏ ଛୋଟ କୁକୁର ଛୁଆ ଖେଳୁଥିଲା।" ଘାସରେ କିଏ ଖେଳୁଥିଲା?',
        difficulty: req.difficulty,
        language: 'Odia',
        type: 'word_match',
        prompt: 'ଘାସରେ କିଏ ଖେଳୁଥିଲା 🌿?',
        audioPrompt: 'ଘାସରେ ଗୋଟିଏ ଛୋଟ କୁକୁର ଛୁଆ ଖେଳୁଥିଲା।',
        items: [
          { id: 'opt_puppy', text: 'କୁକୁର ଛୁଆ', visual: '🐶', isCorrect: true, feedbackHint: 'ଅତି ଉତ୍ତମ ଶ୍ରବଣ! କୁକୁର ଛୁଆ ଖେଳୁଥିଲା! 🐾' },
          { id: 'opt_frog', text: 'ବେଙ୍ଗ', visual: '🐸', isCorrect: false, feedbackHint: 'କୁକୁର ଛୁଆ ଶବ୍ଦ କୁହାଯାଇଥିଲା।' },
        ],
        stepByStepHint: 'ଶୁଣି କୁହନ୍ତୁ: କୁକୁର ଛୁଆ!',
      };
    }
    if (isPunjabi) {
      return {
        id: `act_lp_pa_${Date.now()}`,
        skillId: 'skill_listening_pronunciation',
        title: 'ਸੁਣੋ ਅਤੇ ਪਛਾਣੋ 🎧',
        instruction: 'ਧਿਆਨ ਨਾਲ ਸੁਣੋ: "ਘਾਹ ਵਿੱਚ ਇੱਕ ਨਿੱਕਾ ਕਤੂਰਾ ਖੇਡ ਰਿਹਾ ਸੀ।" ਘਾਹ ਵਿੱਚ ਕੌਣ ਸੀ?',
        difficulty: req.difficulty,
        language: 'Punjabi',
        type: 'word_match',
        prompt: 'ਘਾਹ ਵਿੱਚ ਕੌਣ ਖੇਡ ਰਿਹਾ ਸੀ 🌿?',
        audioPrompt: 'ਘਾਹ ਵਿੱਚ ਇੱਕ ਨਿੱਕਾ ਕਤੂਰਾ ਖੇਡ ਰਿਹਾ ਸੀ।',
        items: [
          { id: 'opt_puppy', text: 'ਕਤੂਰਾ', visual: '🐶', isCorrect: true, feedbackHint: 'ਬਹੁਤ ਵਧੀਆ ਸੁਣਿਆ! ਘਾਹ ਵਿੱਚ ਕਤੂਰਾ ਸੀ! 🐾' },
          { id: 'opt_frog', text: 'ਡੱਡੂ', visual: '🐸', isCorrect: false, feedbackHint: 'ਕਤੂਰਾ ਸ਼ਬਦ ਕਿਹਾ ਗਿਆ ਸੀ।' },
        ],
        stepByStepHint: 'ਸੁਣ ਕੇ ਬੋਲੋ: ਕਤੂਰਾ!',
      };
    }
    if (isTamil) {
      return {
        id: `act_lp_ta_${Date.now()}`,
        skillId: 'skill_listening_pronunciation',
        title: 'கேட்டு அறிதல் 🎧',
        instruction: 'கவனமாகக் கேளுங்கள்: "புல்வெளியில் ஒரு சுட்டி நாய்க்குட்டி விளையாடியது." புல்வெளியில் விளையாடியது யார்?',
        difficulty: req.difficulty,
        language: 'Tamil',
        type: 'word_match',
        prompt: 'புல்வெளியில் விளையாடியது யார் 🌿?',
        audioPrompt: 'புல்வெளியில் ஒரு சுட்டி நாய்க்குட்டி விளையாடியது.',
        items: [
          { id: 'opt_puppy', text: 'நாய்க்குட்டி', visual: '🐶', isCorrect: true, feedbackHint: 'அருமையான கவனிப்பு! நாய்க்குட்டி விளையாடியது! 🐾' },
          { id: 'opt_frog', text: 'தவளை', visual: '🐸', isCorrect: false, feedbackHint: 'நாய்க்குட்டி என்று ஒலித்தது.' },
        ],
        stepByStepHint: 'மீண்டும் கேளுங்கள்: சுட்டி நாய்க்குட்டி!',
      };
    }

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
        { id: 'opt_frog', text: 'Frog', visual: '🐸', isCorrect: false, feedbackHint: 'Listen again.' },
      ],
      stepByStepHint: 'Say the words out loud: "friendly puppy" -> puppy!',
    };
  }

  // 12. Spelling Practice
  if (req.skillId === 'skill_spelling_cvc' || req.skillId === 'skill_spelling_phonetic') {
    if (isHindi) {
      return {
        id: `act_sp_hi_${Date.now()}`,
        skillId: 'skill_spelling_cvc',
        title: 'ध्वनि वर्तनी: नल ✏️',
        instruction: 'पानी के नल की वर्तनी क्या है: /न/ ... /ल/',
        difficulty: req.difficulty,
        language: 'Hindi',
        type: 'word_match',
        prompt: '"नल" (पानी का नल) कैसे लिखा जाता है 🚰?',
        items: [
          { id: 'opt_nal', text: 'नल', visual: '🚰', isCorrect: true, feedbackHint: 'शाबाश! न-ल से नल बना! 🌟' },
          { id: 'opt_lan', text: 'लन', visual: '❌', isCorrect: false, feedbackHint: 'पहले न, फिर ल: नल!' },
        ],
        stepByStepHint: 'न और ल को मिलाइए: नल!',
      };
    }
    if (isOdia) {
      return {
        id: `act_sp_or_${Date.now()}`,
        skillId: 'skill_spelling_cvc',
        title: 'ଧ୍ୱନି ବନାନ: ନଳ ✏️',
        instruction: 'ପାଣି ନଳର ବନାନ କରନ୍ତୁ: /ନ/ ... /ଳ/',
        difficulty: req.difficulty,
        language: 'Odia',
        type: 'word_match',
        prompt: '"ନଳ" କିପରି ଲେଖାଯାଏ 🚰?',
        items: [
          { id: 'opt_nal', text: 'ନଳ', visual: '🚰', isCorrect: true, feedbackHint: 'ଅତି ଉତ୍ତମ! ନ-ଳ ମିଶି ନଳ ହେଲା! 🌟' },
          { id: 'opt_lan', text: 'ଳନ', visual: '❌', isCorrect: false, feedbackHint: 'ପ୍ରଥମେ ନ, ପରେ ଳ: ନଳ!' },
        ],
        stepByStepHint: 'ନ ଏବଂ ଳ ମିଶାନ୍ତୁ: ନଳ!',
      };
    }
    if (isPunjabi) {
      return {
        id: `act_sp_pa_${Date.now()}`,
        skillId: 'skill_spelling_cvc',
        title: 'ਧੁਨੀ ਸਪੈਲਿੰਗ: ਜਲ ✏️',
        instruction: 'ਪਾਣੀ (ਜਲ) ਦੇ ਸਪੈਲਿੰਗ ਕੀ ਹਨ: /ਜ/ ... /ਲ/',
        difficulty: req.difficulty,
        language: 'Punjabi',
        type: 'word_match',
        prompt: '"ਜਲ" ਕਿਵੇਂ ਲਿਖਿਆ ਜਾਂਦਾ ਹੈ 💧?',
        items: [
          { id: 'opt_jal', text: 'ਜਲ', visual: '💧', isCorrect: true, feedbackHint: 'ਬਹੁਤ ਖ਼ੂਬ! ਜ-ਲ ਤੋਂ ਜਲ ਬਣਿਆ! 🌟' },
          { id: 'opt_laj', text: 'ਲਜ', visual: '❌', isCorrect: false, feedbackHint: 'ਪਹਿਲਾਂ ਜ, ਫਿਰ ਲ: ਜਲ!' },
        ],
        stepByStepHint: 'ਜ ਅਤੇ ਲ ਜੋੜੋ: ਜਲ!',
      };
    }
    if (isTamil) {
      return {
        id: `act_sp_ta_${Date.now()}`,
        skillId: 'skill_spelling_cvc',
        title: 'எழுத்துக் கூட்டுதல்: கல் ✏️',
        instruction: 'பாறை (கல்) சொல்லின் எழுத்துகள் எவை: /க/ ... /ல்/',
        difficulty: req.difficulty,
        language: 'Tamil',
        type: 'word_match',
        prompt: '"கல்" எப்படி எழுதப்படுகிறது 🪨?',
        items: [
          { id: 'opt_kal', text: 'கல்', visual: '🪨', isCorrect: true, feedbackHint: 'அருமை! க-ல் கல்! 🌟' },
          { id: 'opt_lak', text: 'ல்க', visual: '❌', isCorrect: false, feedbackHint: 'முதலில் க, பின் ல்: கல்!' },
        ],
        stepByStepHint: 'க மற்றும் ல் சேர்க்க: கல்!',
      };
    }

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
      ],
      stepByStepHint: 'Left hand makes "b", middle is "e", right hand makes "d": b-e-d!',
    };
  }

  // Default / Baseline Letter Sound Association (Basic)
  if (isHindi) {
    return {
      id: `act_ls_hi_${Date.now()}`,
      skillId: 'skill_letter_sounds_basic',
      title: 'अक्षर ध्वनि मिलान 🦁',
      instruction: 'चित्र देखकर बताइए कि कौन-सा शब्द "म" ध्वनि से शुरू होता है:',
      difficulty: req.difficulty,
      language: req.language || 'Hindi',
      type: 'word_match',
      prompt: '"म" ध्वनि से शुरू होने वाला शब्द कौन-सा है?',
      audioPrompt: 'म से शुरू होने वाला शब्द पहचानिए',
      items: [
        { id: 'opt_fish', text: 'मछली', visual: '🐟', isCorrect: true, feedbackHint: 'बहुत बढ़िया! म-म-मछली "म" से शुरू होती है! 🚀' },
        { id: 'opt_tree', text: 'पेड़', visual: '🌳', isCorrect: false, feedbackHint: 'पेड़ "प" से शुरू होता है। म से मछली चुनें।' },
        { id: 'opt_star', text: 'तारा', visual: '⭐', isCorrect: false, feedbackHint: 'तारा "त" से शुरू होता है।' },
      ],
      stepByStepHint: 'होंठों को मिलाकर गुनगुनाएं: मम्मम... मछली!',
    };
  }
  if (isOdia) {
    return {
      id: `act_ls_or_${Date.now()}`,
      skillId: 'skill_letter_sounds_basic',
      title: 'ଅକ୍ଷର ଧ୍ୱନି ମେଳ 🦁',
      instruction: 'କେଉଁ ଶବ୍ଦଟି "ମ" ଧ୍ୱନିରୁ ଆରମ୍ଭ ହେଉଛି:',
      difficulty: req.difficulty,
      language: req.language || 'Odia',
      type: 'word_match',
      prompt: '"ମ" ଧ୍ୱନିରୁ ଆରମ୍ଭ ହେଉଥିବା ଶବ୍ଦଟି କେଉଁଟି?',
      audioPrompt: 'ମ ରୁ ଆରମ୍ଭ ହେଉଥିବା ଶବ୍ଦ ବାଛନ୍ତୁ',
      items: [
        { id: 'opt_fish', text: 'ମାଛ', visual: '🐟', isCorrect: true, feedbackHint: 'ଅତି ଉତ୍ତମ! ମ-ମ-ମାଛ "ମ" ରୁ ଆରମ୍ଭ ହୁଏ! 🚀' },
        { id: 'opt_tree', text: 'ଗଛ', visual: '🌳', isCorrect: false, feedbackHint: 'ଗଛ "ଗ" ରୁ ଆରମ୍ଭ ହୁଏ।' },
        { id: 'opt_star', text: 'ତାରା', visual: '⭐', isCorrect: false, feedbackHint: 'ତାରା "ତ" ରୁ ଆରମ୍ଭ ହୁଏ।' },
      ],
      stepByStepHint: 'ଓଠ ଯୋଡ଼ି ଉଚ୍ଚାରଣ କରନ୍ତୁ: ମ... ମାଛ!',
    };
  }
  if (isPunjabi) {
    return {
      id: `act_ls_pa_${Date.now()}`,
      skillId: 'skill_letter_sounds_basic',
      title: 'ਅੱਖਰ ਧੁਨੀ ਮੇਲ 🦁',
      instruction: 'ਕਿਹੜਾ ਸ਼ਬਦ "ਮ" ਧੁਨੀ ਨਾਲ ਸ਼ੁਰੂ ਹੁੰਦਾ ਹੈ:',
      difficulty: req.difficulty,
      language: req.language || 'Punjabi',
      type: 'word_match',
      prompt: '"ਮ" ਧੁਨੀ ਨਾਲ ਸ਼ੁਰੂ ਹੋਣ ਵਾਲਾ ਸ਼ਬਦ ਕਿਹੜਾ ਹੈ?',
      audioPrompt: 'ਮ ਨਾਲ ਸ਼ੁਰੂ ਹੋਣ ਵਾਲਾ ਸ਼ਬਦ ਚੁਣੋ',
      items: [
        { id: 'opt_fish', text: 'ਮੱਛੀ', visual: '🐟', isCorrect: true, feedbackHint: 'ਬਹੁਤ ਵਧੀਆ! ਮ-ਮ-ਮੱਛੀ "ਮ" ਨਾਲ ਸ਼ੁਰੂ ਹੁੰਦੀ ਹੈ! 🚀' },
        { id: 'opt_tree', text: 'ਰੁੱਖ', visual: '🌳', isCorrect: false, feedbackHint: 'ਰੁੱਖ "ਰ" ਨਾਲ ਸ਼ੁਰੂ ਹੁੰਦਾ ਹੈ।' },
        { id: 'opt_star', text: 'ਤਾਰਾ', visual: '⭐', isCorrect: false, feedbackHint: 'ਤਾਰਾ "ਤ" ਨਾਲ ਸ਼ੁਰੂ ਹੁੰਦਾ ਹੈ।' },
      ],
      stepByStepHint: 'ਹੌਲੀ ਬੋਲੋ: ਮ... ਮੱਛੀ!',
    };
  }
  if (isTamil) {
    return {
      id: `act_ls_ta_${Date.now()}`,
      skillId: 'skill_letter_sounds_basic',
      title: 'எழுத்து ஒலி பொருத்தம் 🦁',
      instruction: 'எந்தச் சொல் "ம" ஒலியில் தொடங்குகிறது:',
      difficulty: req.difficulty,
      language: req.language || 'Tamil',
      type: 'word_match',
      prompt: '"ம" ஒலியில் தொடங்கும் சொல் எது?',
      audioPrompt: 'ம ஒலியில் தொடங்கும் சொல்லைத் தேர்ந்தெடுக்கவும்',
      items: [
        { id: 'opt_fish', text: 'மீன்', visual: '🐟', isCorrect: true, feedbackHint: 'அருமை! ம-மீன் "ம" ஒலியில் தொடங்குகிறது! 🚀' },
        { id: 'opt_house', text: 'வீடு', visual: '🏠', isCorrect: false, feedbackHint: 'வீடு "வீ" ஒலியில் தொடங்குகிறது. ம-மீன் தேர்ந்தெடுக்கவும்.' },
        { id: 'opt_bird', text: 'பறவை', visual: '🐦', isCorrect: false, feedbackHint: 'பறவை "ப" ஒலியில் தொடங்குகிறது.' },
      ],
      stepByStepHint: 'உதடுகளை ஒட்டவைத்து ஒலியுங்கள்: ம்... மீன்!',
    };
  }

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
      { id: 'opt_tree', text: 'Tree', visual: '🌳', isCorrect: false, feedbackHint: 'Tree starts with T.' },
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
  const resolvedKey =
    (apiKey && apiKey.trim() !== '' && !apiKey.includes('placeholder'))
      ? apiKey.trim()
      : (typeof process !== 'undefined' && process.env?.GEMINI_API_KEY && !process.env.GEMINI_API_KEY.includes('placeholder'))
        ? process.env.GEMINI_API_KEY.trim()
        : undefined;

  // If no external Gemini API key is provided, return rich deterministic curriculum instantly
  if (!resolvedKey) {
    return getDeterministicActivity(req);
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 9000);

  const configuredModel =
    typeof process !== 'undefined' && process.env?.GEMINI_MODEL
      ? process.env.GEMINI_MODEL.trim()
      : 'gemini-2.5-flash';

  const modelsToTry = [configuredModel, 'gemini-2.0-flash', 'gemini-1.5-flash'].filter(
    (m, idx, arr) => arr.indexOf(m) === idx
  );

  const promptText = `You are an expert pediatric reading specialist for children with dyslexia.
Generate a single engaging, educational reading practice exercise.
Skill category: ${req.skillId}
Difficulty: ${req.difficulty}
Language: ${req.language || 'English'}
${req.childName ? `Child name: ${req.childName}` : ''}
${req.interest ? `Child interest: ${req.interest}` : 'Interest: animals, nature, and adventure'}
${req.targetPattern ? `Target pattern: ${req.targetPattern}` : ''}

Strict requirements:
- Use encouraging, positive, dyslexia-friendly language.
- Use the authentic native script for the chosen language (Devanagari for Hindi, Odia script for Odia, Gurmukhi for Punjabi, Tamil script for Tamil, Latin script for English).
- Do not transliterate non-English words into English alphabet; use native script characters.
- Distinguish letters and sounds clearly.
- Provide between 2 and 4 answer choices in "items", with at least one item marked with isCorrect: true.
- Each item MUST have: id (string), text (string), visual (emoji or single symbol), isCorrect (boolean), feedbackHint (supportive explanation).
- Provide a stepByStepHint guiding the child gently.
- Return ONLY a valid JSON object matching this schema:
{
  "id": "act_gemini_${Date.now()}",
  "skillId": "${req.skillId}",
  "title": "string",
  "instruction": "string",
  "difficulty": "${req.difficulty}",
  "language": "${req.language || 'English'}",
  "type": "word_match",
  "prompt": "string",
  "items": [
    {
      "id": "opt_1",
      "text": "string",
      "visual": "emoji",
      "isCorrect": true,
      "feedbackHint": "string"
    },
    {
      "id": "opt_2",
      "text": "string",
      "visual": "emoji",
      "isCorrect": false,
      "feedbackHint": "string"
    }
  ],
  "stepByStepHint": "string"
}`;

  for (const model of modelsToTry) {
    try {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(resolvedKey)}`;

      const res = await fetchFn(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: promptText }],
            },
          ],
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 1024,
            responseMimeType: 'application/json',
          },
        }),
        signal: controller.signal,
      });

      if (!res.ok) {
        continue;
      }

      const data = (await res.json()) as any;
      const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!rawText) continue;

      let cleanJson = rawText.trim();
      if (cleanJson.startsWith('```json')) {
        cleanJson = cleanJson.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      } else if (cleanJson.startsWith('```')) {
        cleanJson = cleanJson.replace(/^```\s*/, '').replace(/\s*```$/, '');
      }

      const parsed = JSON.parse(cleanJson);
      const validation = validateActivityContent(parsed, req.language);
      if (validation.valid && validation.sanitized) {
        clearTimeout(timeoutId);
        return validation.sanitized;
      }
    } catch {
      // Try next model or fallback
    }
  }

  clearTimeout(timeoutId);
  return getDeterministicActivity(req);
}
