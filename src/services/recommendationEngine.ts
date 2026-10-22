import type {
  AdaptiveRecommendation,
  ChildSkillState,
  ActivityDifficulty,
  RecommendationType,
} from '../types/adaptive';
import { SKILL_REGISTRY, getSkillDefinition } from './skillModel';
import type { ChildProfile } from '../types/auth';

export function getLocalizedSkillTitle(skillId: string, language: string, fallback: string): string {
  const raw = (language || 'English').trim().toLowerCase();
  const isHi = raw.startsWith('hi') || raw.includes('hindi');
  const isOr = raw.startsWith('or') || raw.includes('odia') || raw.includes('oriya');
  const isPa = raw.startsWith('pa') || raw.includes('punjabi') || raw.includes('gurmukhi');
  const isTa = raw.startsWith('ta') || raw.includes('tamil');
  const isEn = raw.startsWith('en') || raw.includes('english');

  if (isEn) {
    const enTitles: Record<string, string> = {
      skill_letter_sounds_basic: 'Letter-Sound Association (Basic)',
      skill_letter_sounds_vowels: 'Short Vowel Sounds',
      skill_confused_letters_bd: 'Letter Mirror: b vs d',
      skill_confused_letters_pq: 'Letter Mirror: p vs q',
      skill_confused_words_reversals: 'Word Reversals (was/saw, no/on)',
      skill_cvc_blending: 'CVC Sound Blending',
      skill_consonant_blends: 'Consonant Digraphs & Blends (sh, ch, th)',
      skill_phonemic_isolation: 'Initial & Final Sound Isolation',
      skill_rhyming_patterns: 'Rhyming Word Patterns',
      skill_syllable_clapping: 'Syllable Chunking & Clapping',
      skill_spelling_phonetic: 'Phonetic Spelling Construction',
      skill_sight_words_high_freq: 'High-Frequency Sight Words',
      skill_sentence_fluency: 'Paced Sentence Reading',
      skill_story_comprehension: 'Illustrated Story Comprehension',
      skill_listening_pronunciation: 'Audio-Assisted Pronunciation',
    };
    return enTitles[skillId] || fallback;
  }

  if (isHi) {
    const titles: Record<string, string> = {
      skill_letter_sounds_basic: 'अक्षर ध्वनि मिलान (बुनियादी)',
      skill_letter_sounds_vowels: 'ह्रस्व स्वर ध्वनियाँ 🎵',
      skill_confused_letters_bd: 'अक्षर पहचान: ब और भ 🔍',
      skill_confused_letters_pq: 'अक्षर पहचान: प और फ 🔍',
      skill_confused_words_reversals: 'शब्द दिशा: सब बनाम बस 🔄',
      skill_cvc_blending: 'ध्वनि मिलान: सरल शब्द 🧩',
      skill_consonant_blends: 'संयुक्त व्यंजन एवं ध्वनियाँ 🌟',
      skill_phonemic_isolation: 'पहली व अंतिम ध्वनि पहचान 🕵️',
      skill_rhyming_patterns: 'तुकबंदी शब्द मिलान 🚀',
      skill_syllable_clapping: 'शब्दांश कूद एवं ताली 🐸',
      skill_spelling_phonetic: 'ध्वन्यात्मक शब्द रचना ✏️',
      skill_sight_words_high_freq: 'जादुई उच्च-आवृत्ति शब्द ✨',
      skill_sentence_fluency: 'सुलभ वाक्य पठन 🚆',
      skill_story_comprehension: 'चित्रित कहानी समझ 📖',
      skill_listening_pronunciation: 'श्रव्य-सहायक उच्चारण 🎧',
    };
    return titles[skillId] || fallback;
  }
  if (isOr) {
    const titles: Record<string, string> = {
      skill_letter_sounds_basic: 'ଅକ୍ଷର ଧ୍ୱନି ମେଳ (ପ୍ରାଥମିକ)',
      skill_letter_sounds_vowels: 'ହ୍ରସ୍ୱ ସ୍ୱର ଧ୍ୱନି 🎵',
      skill_confused_letters_bd: 'ଅକ୍ଷର ଚିହ୍ନଟ: ବ ଏବଂ ଧ 🔍',
      skill_confused_letters_pq: 'ଅକ୍ଷର ଚିହ୍ନଟ: ପ ଏବଂ ଫ 🔍',
      skill_confused_words_reversals: 'ଶବ୍ଦ ଦିଗ: ବସ ବନାମ ସବ 🔄',
      skill_cvc_blending: 'ଧ୍ୱନି ମିଶ୍ରଣ: ସରଳ ଶବ୍ଦ 🧩',
      skill_consonant_blends: 'ଯୁକ୍ତାକ୍ଷର ଧ୍ୱନି 🌟',
      skill_phonemic_isolation: 'ପ୍ରଥମ ଓ ଶେଷ ଧ୍ୱନି ଚିହ୍ନଟ 🕵️',
      skill_rhyming_patterns: 'ପ୍ରାସ ଶବ୍ଦ ମେଳ 🚀',
      skill_syllable_clapping: 'ଶବ୍ଦ ଖଣ୍ଡ ତାଳି 🐸',
      skill_spelling_phonetic: 'ଧ୍ୱନ୍ୟାତ୍ମକ ବନାନ ରଚନା ✏️',
      skill_sight_words_high_freq: 'ଉଚ୍ଚ-ଆବୃତ୍ତି ଦୃଷ୍ଟି ଶବ୍ଦ ✨',
      skill_sentence_fluency: 'ସୁଗମ ବାକ୍ୟ ପଠନ 🚆',
      skill_story_comprehension: 'ଗଳ୍ପ ଅବବୋଧ 📖',
      skill_listening_pronunciation: 'ଶ୍ରବ୍ୟ-ସହାୟକ ଉଚ୍ଚାରଣ 🎧',
    };
    return titles[skillId] || fallback;
  }
  if (isPa) {
    const titles: Record<string, string> = {
      skill_letter_sounds_basic: 'ਅੱਖਰ ਧੁਨੀ ਮੇਲ (ਮੁੱਢਲਾ)',
      skill_letter_sounds_vowels: 'ਲਘੂ ਸਵਰ ਧੁਨੀਆਂ 🎵',
      skill_confused_letters_bd: 'ਅੱਖਰ ਪਛਾਣ: ਬ ਅਤੇ ਭ 🔍',
      skill_confused_letters_pq: 'ਅੱਖਰ ਪਛਾਣ: ਪ ਅਤੇ ਫ 🔍',
      skill_confused_words_reversals: 'ਸ਼ਬਦ ਦਿਸ਼ਾ: ਬੱਸ ਬਨਾਮ ਸੱਬ 🔄',
      skill_cvc_blending: 'ਧੁਨੀ ਮਿਲਾਪ: ਸਧਾਰਨ ਸ਼ਬਦ 🧩',
      skill_consonant_blends: 'ਸੰਯੁਕਤ ਅੱਖਰ ਧੁਨੀਆਂ 🌟',
      skill_phonemic_isolation: 'ਪਹਿਲੀ ਅਤੇ ਆਖਰੀ ਧੁਨੀ ਪਛਾਣ 🕵️',
      skill_rhyming_patterns: 'ਤੁਕਾਂਤ ਸ਼ਬਦ ਮੇਲ 🚀',
      skill_syllable_clapping: 'ਸ਼ਬਦ ਟੁਕੜੇ ਤਾੜੀ 🐸',
      skill_spelling_phonetic: 'ਧੁਨੀ-ਅਧਾਰਿਤ ਸ਼ਬਦ ਜੋੜ ✏️',
      skill_sight_words_high_freq: 'ਅਕਸਰ ਵਰਤੇ ਜਾਣ ਵਾਲੇ ਸ਼ਬਦ ✨',
      skill_sentence_fluency: 'ਸਹਿਜ ਵਾਕ ਪੜ੍ਹਨਾ 🚆',
      skill_story_comprehension: 'ਕਹਾਣੀ ਸਮਝ 📖',
      skill_listening_pronunciation: 'ਸੁਣਨ-ਸਹਾਇਕ ਉਚਾਰਨ 🎧',
    };
    return titles[skillId] || fallback;
  }
  if (isTa) {
    const titles: Record<string, string> = {
      skill_letter_sounds_basic: 'எழுத்து ஒலி பொருத்தம் (அடிப்படை)',
      skill_letter_sounds_vowels: 'குறில் உயிர் ஒலிகள் 🎵',
      skill_confused_letters_bd: 'எழுத்து வேறுபாடு: ர மற்றும் ற 🔍',
      skill_confused_letters_pq: 'எழுத்து வேறுபாடு: ண மற்றும் ன 🔍',
      skill_confused_words_reversals: 'சொல் திசை: கல் மற்றும் லக 🔄',
      skill_cvc_blending: 'ஒலி சேர்த்தல்: எளிய சொல் 🧩',
      skill_consonant_blends: 'கூட்டெழுத்து ஒலிகள் 🌟',
      skill_phonemic_isolation: 'முதல் மற்றும் இறுதி ஒலி அறிதல் 🕵️',
      skill_rhyming_patterns: 'ஒத்த ஓசைச் சொற்கள் 🚀',
      skill_syllable_clapping: 'அசை பிரித்துக் கைதட்டல் 🐸',
      skill_spelling_phonetic: 'ஒலிமுறை எழுத்துக் கூட்டுதல் ✏️',
      skill_sight_words_high_freq: 'அடிக்கடி வரும் சொற்கள் ✨',
      skill_sentence_fluency: 'சீரான வாக்கிய வாசிப்பு 🚆',
      skill_story_comprehension: 'படக் கதை புரிதல் 📖',
      skill_listening_pronunciation: 'ஒலி-உதவி உச்சரிப்பு 🎧',
    };
    return titles[skillId] || fallback;
  }

  return fallback;
}

export function getLocalizedSkillObjective(skillId: string, language: string, fallback: string): string {
  const raw = (language || 'English').trim().toLowerCase();
  const isHi = raw.startsWith('hi') || raw.includes('hindi');
  const isOr = raw.startsWith('or') || raw.includes('odia') || raw.includes('oriya');
  const isPa = raw.startsWith('pa') || raw.includes('punjabi') || raw.includes('gurmukhi');
  const isTa = raw.startsWith('ta') || raw.includes('tamil');
  const isEn = raw.startsWith('en') || raw.includes('english');

  if (isEn) {
    const enObj: Record<string, string> = {
      skill_letter_sounds_basic: 'Develop mastery in letter-sound association (basic) through interactive play.',
      skill_letter_sounds_vowels: 'Develop mastery in short vowel sounds through interactive play.',
      skill_confused_letters_bd: 'Develop mastery in letter mirror: b vs d through interactive play.',
      skill_confused_letters_pq: 'Develop mastery in letter mirror: p vs q through interactive play.',
      skill_confused_words_reversals: 'Develop mastery in word tracking without reversals through interactive play.',
      skill_cvc_blending: 'Develop mastery in CVC sound blending through interactive play.',
      skill_listening_pronunciation: 'Develop mastery in audio-assisted pronunciation through interactive play.',
    };
    return enObj[skillId] || fallback;
  }
  if (isHi) {
    const hiObj: Record<string, string> = {
      skill_letter_sounds_basic: 'पारस्परिक खेल के माध्यम से अक्षर-ध्वनि संबंध में निपुणता विकसित करें।',
      skill_letter_sounds_vowels: 'पारस्परिक खेल के माध्यम से ह्रस्व स्वर ध्वनियों में निपुणता विकसित करें।',
      skill_confused_letters_bd: 'पारस्परिक खेल के माध्यम से दर्पण अक्षरों की पहचान में निपुणता विकसित करें।',
      skill_confused_letters_pq: 'पारस्परिक खेल के माध्यम से दर्पण अक्षरों की पहचान में निपुणता विकसित करें।',
      skill_cvc_blending: 'पारस्परिक खेल के माध्यम से ध्वनि सम्मिश्रण में निपुणता विकसित करें।',
      skill_listening_pronunciation: 'पारस्परिक खेल के माध्यम से स्पष्ट उच्चारण में निपुणता विकसित करें।',
    };
    return hiObj[skillId] || fallback;
  }
  if (isOr) {
    const orObj: Record<string, string> = {
      skill_letter_sounds_basic: 'ପାରସ୍ପରିକ ଖେଳ ମାଧ୍ୟମରେ ଅକ୍ଷର-ଧ୍ୱନି ମେଳରେ ଦକ୍ଷତା ହାସଲ କରନ୍ତୁ।',
      skill_letter_sounds_vowels: 'ପାରସ୍ପରିକ ଖେଳ ମାଧ୍ୟମରେ ହ୍ରସ୍ୱ ସ୍ୱର ଧ୍ୱନିରେ ଦକ୍ଷତା ହାସଲ କରନ୍ତୁ।',
      skill_confused_letters_bd: 'ପାରସ୍ପରିକ ଖେଳ ମାଧ୍ୟମରେ ଦର୍ପଣ ଅକ୍ଷର ଚିହ୍ନଟରେ ଦକ୍ଷତା ହାସଲ କରନ୍ତୁ।',
      skill_confused_letters_pq: 'ପାରସ୍ପରିକ ଖେଳ ମାଧ୍ୟମରେ ଦର୍ପଣ ଅକ୍ଷର ଚିହ୍ନଟରେ ଦକ୍ଷତା ହାସଲ କରନ୍ତୁ।',
      skill_cvc_blending: 'ପାରସ୍ପରିକ ଖେଳ ମାଧ୍ୟମରେ ଧ୍ୱନି ମିଶ୍ରଣରେ ଦକ୍ଷତା ହାସଲ କରନ୍ତୁ।',
      skill_listening_pronunciation: 'ପାରସ୍ପରିକ ଖେଳ ମାଧ୍ୟମରେ ଉଚ୍ଚାରଣ ଦକ୍ଷତା ହାସଲ କରନ୍ତୁ।',
    };
    return orObj[skillId] || fallback;
  }
  if (isPa) {
    const paObj: Record<string, string> = {
      skill_letter_sounds_basic: 'ਇੰਟਰਐਕਟਿਵ ਖੇਡ ਰਾਹੀਂ ਅੱਖਰ-ਧੁਨੀ ਸੰਬੰਧ ਵਿੱਚ ਮੁਹਾਰਤ ਹਾਸਲ ਕਰੋ।',
      skill_letter_sounds_vowels: 'ਇੰਟਰਐਕਟਿਵ ਖੇਡ ਰਾਹੀਂ ਲਘੂ ਸਵਰ ਧੁਨੀਆਂ ਵਿੱਚ ਮੁਹਾਰਤ ਹਾਸਲ ਕਰੋ।',
      skill_confused_letters_bd: 'ਇੰਟਰਐਕਟਿਵ ਖੇਡ ਰਾਹੀਂ ਦਰਪਣ ਅੱਖਰਾਂ ਦੀ ਪਛਾਣ ਵਿੱਚ ਮੁਹਾਰਤ ਹਾਸਲ ਕਰੋ।',
      skill_confused_letters_pq: 'ਇੰਟਰਐਕਟਿਵ ਖੇਡ ਰਾਹੀਂ ਦਰਪਣ ਅੱਖਰਾਂ ਦੀ ਪਛਾਣ ਵਿੱਚ ਮੁਹਾਰਤ ਹਾਸਲ ਕਰੋ।',
      skill_cvc_blending: 'ਇੰਟਰਐਕਟਿਵ ਖੇਡ ਰਾਹੀਂ ਧੁਨੀ ਮਿਲਾਪ ਵਿੱਚ ਮੁਹਾਰਤ ਹਾਸਲ ਕਰੋ।',
      skill_listening_pronunciation: 'ਇੰਟਰਐਕਟਿਵ ਖੇਡ ਰਾਹੀਂ ਸਹੀ ਉਚਾਰਨ ਵਿੱਚ ਮੁਹਾਰਤ ਹਾਸਲ ਕਰੋ।',
    };
    return paObj[skillId] || fallback;
  }
  if (isTa) {
    const taObj: Record<string, string> = {
      skill_letter_sounds_basic: 'ஊடாடும் விளையாட்டு மூலம் எழுத்து-ஒலி தொடர்பில் தேர்ச்சி பெறுங்கள்.',
      skill_letter_sounds_vowels: 'ஊடாடும் விளையாட்டு மூலம் குறில் உயிர் ஒலிகளில் தேர்ச்சி பெறுங்கள்.',
      skill_confused_letters_bd: 'ஊடாடும் விளையாட்டு மூலம் எழுத்து வேறுபாட்டில் தேர்ச்சி பெறுங்கள்.',
      skill_confused_letters_pq: 'ஊடாடும் விளையாட்டு மூலம் எழுத்து வேறுபாட்டில் தேர்ச்சி பெறுங்கள்.',
      skill_cvc_blending: 'ஊடாடும் விளையாட்டு மூலம் ஒலி சேர்த்தலில் தேர்ச்சி பெறுங்கள்.',
      skill_listening_pronunciation: 'ஊடாடும் விளையாட்டு மூலம் தெளிவான உச்சரிப்பில் தேர்ச்சி பெறுங்கள்.',
    };
    return taObj[skillId] || fallback;
  }

  return fallback;
}

export function getLocalizedSkillDescription(skillId: string, language: string, fallback: string): string {
  const raw = (language || 'English').trim().toLowerCase();
  const isHi = raw.startsWith('hi') || raw.includes('hindi');
  const isOr = raw.startsWith('or') || raw.includes('odia') || raw.includes('oriya');
  const isPa = raw.startsWith('pa') || raw.includes('punjabi') || raw.includes('gurmukhi');
  const isTa = raw.startsWith('ta') || raw.includes('tamil');

  if (isHi) {
    const hiDesc: Record<string, string> = {
      skill_letter_sounds_basic: 'वर्णमाला के अक्षरों को पहचानें और उनकी प्राथमिक ध्वनियों को समझें।',
      skill_letter_sounds_vowels: 'श्रवण विभेदन के साथ ह्रस्व स्वर ध्वनियों को पहचानें।',
      skill_confused_letters_bd: 'दर्पण अक्षरों की दृश्य दिशा और बनावट में अंतर स्पष्ट करें।',
      skill_confused_letters_pq: 'दर्पण अक्षरों की दृश्य दिशा और बनावट में अंतर स्पष्ट करें।',
    };
    return hiDesc[skillId] || fallback;
  }
  if (isOr) {
    const orDesc: Record<string, string> = {
      skill_letter_sounds_basic: 'ବର୍ଣ୍ଣମାଳାର ଅକ୍ଷରଗୁଡ଼ିକୁ ଚିହ୍ନଟ କରନ୍ତୁ ଏବଂ ସେଗୁଡ଼ିକର ଧ୍ୱନି ବୁଝନ୍ତୁ।',
      skill_letter_sounds_vowels: 'ଶ୍ରବଣ ବିଭେଦନ ସହିତ ହ୍ରସ୍ୱ ସ୍ୱର ଧ୍ୱନି ଚିହ୍ନନ୍ତୁ।',
      skill_confused_letters_bd: 'ଦର୍ପଣ ଅକ୍ଷରଗୁଡ଼ିକର ଦିଗ ଏବଂ ଆକୃତି ମଧ୍ୟରେ ଫରକ ବୁଝନ୍ତୁ।',
      skill_confused_letters_pq: 'ଦର୍ପଣ ଅକ୍ଷରଗୁଡ଼ିକର ଦିଗ ଏବଂ ଆକୃତି ମଧ୍ୟରେ ଫରକ ବୁଝନ୍ତୁ।',
    };
    return orDesc[skillId] || fallback;
  }
  if (isPa) {
    const paDesc: Record<string, string> = {
      skill_letter_sounds_basic: 'ਵਰਣਮਾਲਾ ਦੇ ਅੱਖਰਾਂ ਨੂੰ ਪਛਾਣੋ ਅਤੇ ਉਹਨਾਂ ਦੀਆਂ ਮੁੱਖ ਧੁਨੀਆਂ ਸਮਝੋ।',
      skill_letter_sounds_vowels: 'ਸੁਣਨ ਪਛਾਣ ਨਾਲ ਲਘੂ ਸਵਰ ਧੁਨੀਆਂ ਦੀ ਪਛਾਣ ਕਰੋ।',
      skill_confused_letters_bd: 'ਦਰਪਣ ਅੱਖਰਾਂ ਦੀ ਦਿਸ਼ਾ ਅਤੇ ਬਣਤਰ ਵਿੱਚ ਫਰਕ ਸਮਝੋ।',
      skill_confused_letters_pq: 'ਦਰਪਣ ਅੱਖਰਾਂ ਦੀ ਦਿਸ਼ਾ ਅਤੇ ਬਣਤਰ ਵਿੱਚ ਫਰਕ ਸਮਝੋ।',
    };
    return paDesc[skillId] || fallback;
  }
  if (isTa) {
    const taDesc: Record<string, string> = {
      skill_letter_sounds_basic: 'நெடுங்கணக்கு எழுத்துக்களை அடையாளம் கண்டு அவற்றின் அடிப்படை ஒலிகளை அறிக.',
      skill_letter_sounds_vowels: 'கேட்டல் உணர்தல் மூலம் குறில் உயிர் ஒலிகளை வேறுபடுத்தி அறிக.',
      skill_confused_letters_bd: 'கண்ணாடிப் பிம்ப எழுத்துக்களின் திசையமைப்பை வேறுபடுத்தி அறிக.',
      skill_confused_letters_pq: 'கண்ணாடிப் பிம்ப எழுத்துக்களின் திசையமைப்பை வேறுபடுத்தி அறிக.',
    };
    return taDesc[skillId] || fallback;
  }

  return fallback;
}

export class RecommendationEngine {
  private static instance: RecommendationEngine;

  private constructor() {}

  public static getInstance(): RecommendationEngine {
    if (!RecommendationEngine.instance) {
      RecommendationEngine.instance = new RecommendationEngine();
    }
    return RecommendationEngine.instance;
  }

  /**
   * Generates a ranked list of adaptive recommendations tailored to a child's skill states.
   */
  public generateRecommendations(
    child: ChildProfile,
    skillStates: Record<string, ChildSkillState>,
    lastAttemptedActivityId?: string
  ): AdaptiveRecommendation[] {
    const recommendations: AdaptiveRecommendation[] = [];
    const language = child.preferredLanguage || 'English';

    // 1. Identify Priority Remediation Skills (consecutive struggles or high mistake count)
    const struggleSkills = Object.values(skillStates)
      .filter(s => s.consecutiveStruggles >= 2 || (s.missedPatterns.length >= 2 && s.estimatedMastery < 0.65))
      .sort((a, b) => b.consecutiveStruggles - a.consecutiveStruggles);

    // Rule A: If struggling with a skill, recommend targeted remediation with supportive hints or worked example
    if (struggleSkills.length > 0) {
      const topStruggle = struggleSkills[0];
      const def = getSkillDefinition(topStruggle.skillId);
      if (def) {
        const missedDetail = topStruggle.missedPatterns.length > 0
          ? ` focusing on ${topStruggle.missedPatterns.slice(-2).join(' and ')}`
          : '';

        const altActivity = def.suggestedActivities.find(act => act !== lastAttemptedActivityId)
          || def.suggestedActivities[0];

        recommendations.push({
          id: `rec_remed_${def.id}_${Date.now()}`,
          activityId: altActivity,
          targetSkillId: def.id,
          skillName: def.name,
          category: def.category,
          title: getLocalizedSkillTitle(def.id, language, `Friendly Practice: ${def.name}`),
          description: `Gentle step-by-step guidance${missedDetail} with supportive hints.`,
          learningObjective: getLocalizedSkillObjective(def.id, language, `Reinforce ${def.name.toLowerCase()} with visual anchors and scaffolded hints.`),
          difficulty: 'beginner',
          estimatedMinutes: 4,
          prerequisites: def.prerequisites,
          recommendationType: 'remediation',
          reason: `Recommended because ${child.name} encountered challenge with ${def.name.toLowerCase()} recently. We are providing supportive visual clues and reduced difficulty.`,
          pedagogicalRationale: `Adaptive remediation: Consecutive struggle score = ${topStruggle.consecutiveStruggles}. Providing scaffolded hints and lowering cognitive load before advancing.`,
          actionIcon: '🌱',
          actionBg: '#fff2eb',
        });
      }
    }

    // 2. Identify Skills Ready to Practice (prerequisites met, not yet fully mastered)
    const candidateSkills = SKILL_REGISTRY.filter(skill => {
      // Must support child's language
      if (!skill.languages.includes(language as any) && !skill.languages.includes('English')) {
        return false;
      }

      const state = skillStates[skill.id];
      // If already fully mastered with high confidence, save for spaced review instead
      if (state && state.estimatedMastery >= 0.85 && state.confidence >= 0.7) {
        return false;
      }

      // Check prerequisites
      const prerequisitesMet = skill.prerequisites.every(preId => {
        const preState = skillStates[preId];
        return preState && preState.estimatedMastery >= 0.6; // Prerequisite baseline
      });

      return prerequisitesMet;
    });

    // Rule B: Introduce new skill or continue practicing current progression
    for (const skill of candidateSkills) {
      if (recommendations.some(r => r.targetSkillId === skill.id)) continue;
      const state = skillStates[skill.id];

      const difficulty: ActivityDifficulty = !state || state.currentLevel <= 1 || skill.level === 1
        ? 'beginner'
        : state.currentLevel === 2 || skill.level === 2
        ? 'intermediate'
        : 'advanced';

      const isNew = !state || state.attemptsCount === 0;
      const isProvisional = !state || state.isProvisional;
      const recType: RecommendationType = isNew || isProvisional ? (isNew ? 'baseline' : 'new') : 'new';

      let reason = `Recommended as the next natural step in ${child.name}'s reading path.`;
      if (isNew) {
        reason = `Let's explore ${skill.name}! A brand new adventure designed for ${child.grade}.`;
      } else if (state && state.consecutiveSuccesses >= 2) {
        reason = `Great momentum! ${child.name} has demonstrated steady accuracy, so we are stepping up the challenge.`;
      }

      const selectedActivity = skill.suggestedActivities[0] || 'act_general_practice';

      recommendations.push({
        id: `rec_prog_${skill.id}_${recommendations.length}`,
        activityId: selectedActivity,
        targetSkillId: skill.id,
        skillName: skill.name,
        category: skill.category,
        title: getLocalizedSkillTitle(skill.id, language, skill.name),
        description: skill.description,
        learningObjective: getLocalizedSkillObjective(skill.id, language, `Develop mastery in ${skill.name.toLowerCase()} through interactive play.`),
        difficulty,
        estimatedMinutes: 5,
        prerequisites: skill.prerequisites,
        recommendationType: recType,
        reason,
        pedagogicalRationale: `Progressive mastery: Current level ${state?.currentLevel || 1}, accuracy ${Math.round((state?.recentAccuracy || 0) * 100)}%, prerequisites verified.`,
        actionIcon: skill.category === 'confused_letters' ? '🔤' : skill.category === 'sound_blending' ? '🧩' : '🎧',
        actionBg: skill.category === 'confused_letters' ? '#fff1d2' : '#e8f3ff',
      });

      if (recommendations.length >= 3) break;
    }

    // Rule C: Progressive Roadmap Filling (Ensures the gentle step-by-step 3-card journey roadmap)
    // If fewer than 3 recommendations (e.g. at the start of learning),
    // include upcoming sequential skills in SKILL_REGISTRY whose prerequisites are in the path!
    if (recommendations.length < 3) {
      for (const skill of SKILL_REGISTRY) {
        if (recommendations.some(r => r.targetSkillId === skill.id)) continue;
        const state = skillStates[skill.id];
        if (state && state.estimatedMastery >= 0.85 && state.confidence >= 0.7) continue;

        // Check if prerequisites are either met OR are part of the already scheduled steps in this roadmap
        const scheduledIds = recommendations.map(r => r.targetSkillId);
        const canAdvanceToSkill = skill.prerequisites.length === 0 || skill.prerequisites.every(preId => {
          const preState = skillStates[preId];
          const isMastered = preState && preState.estimatedMastery >= 0.6;
          return isMastered || scheduledIds.includes(preId);
        });

        if (canAdvanceToSkill) {
          const difficulty: ActivityDifficulty = skill.level === 1
            ? 'beginner'
            : skill.level === 2
            ? 'intermediate'
            : 'advanced';

          const selectedActivity = skill.suggestedActivities[0] || 'act_general_practice';

          recommendations.push({
            id: `rec_prog_${skill.id}_${recommendations.length}`,
            activityId: selectedActivity,
            targetSkillId: skill.id,
            skillName: skill.name,
            category: skill.category,
            title: getLocalizedSkillTitle(skill.id, language, skill.name),
            description: skill.description,
            learningObjective: getLocalizedSkillObjective(skill.id, language, `Develop mastery in ${skill.name.toLowerCase()} through interactive play.`),
            difficulty,
            estimatedMinutes: 5,
            prerequisites: skill.prerequisites,
            recommendationType: 'new',
            reason: `Upcoming progression milestone in ${child.name}'s visual reading journey.`,
            pedagogicalRationale: `Roadmap step progression: Prerequisite scheduled or in progress. Scaffolding next milestone.`,
            actionIcon: skill.category === 'confused_letters' ? '🔤' : skill.category === 'sound_blending' ? '🧩' : '🎧',
            actionBg: skill.category === 'confused_letters' ? '#fff1d2' : '#e8f3ff',
          });

          if (recommendations.length >= 3) break;
        }
      }
    }

    // Baseline fallback if child has zero history or all candidates exhausted
    if (recommendations.length === 0) {
      const defaultSkill = SKILL_REGISTRY[0]; // Letter-Sound Association
      recommendations.push({
        id: `rec_default_baseline_${Date.now()}`,
        activityId: defaultSkill.suggestedActivities[0],
        targetSkillId: defaultSkill.id,
        skillName: defaultSkill.name,
        category: defaultSkill.category,
        title: getLocalizedSkillTitle(defaultSkill.id, language, defaultSkill.name),
        description: 'A playful first challenge to discover your learning style.',
        learningObjective: getLocalizedSkillObjective(defaultSkill.id, language, `Develop mastery in ${defaultSkill.name.toLowerCase()} through interactive play.`),
        difficulty: 'beginner',
        estimatedMinutes: 3,
        prerequisites: [],
        recommendationType: 'baseline',
        reason: `Welcome to DyslexiMate! We start with fun sound discovery to personalize your upcoming learning journey.`,
        pedagogicalRationale: 'Provisional baseline assessment: establishing initial learner profile.',
        actionIcon: '🎧',
        actionBg: '#e8f5ef',
      });
    }

    return recommendations;
  }
}
