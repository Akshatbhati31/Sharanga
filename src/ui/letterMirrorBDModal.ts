import { LearningPathService } from '../services/learningPathService';
import { ProfileService } from '../services/profileService';
import type { ChildProfile, AppLanguageCode } from '../types/auth';
import { SpeechService } from '../services/speechService';
import { i18n } from '../i18n';

interface BDRound {
  id: string;
  type: 'spot_b' | 'spot_d' | 'word_completion' | 'feature_check';
  prompt: string;
  targetLetter: string;
  contextWord?: string;
  contextHint?: string;
  visualIcon: string;
  audioPrompt: string;
  options: {
    letter: string;
    display: string;
    isCorrect: boolean;
    explanation: string;
  }[];
}

export class LetterMirrorBDModal {
  private static instance: LetterMirrorBDModal;
  private learningPathService: LearningPathService;
  private profileService: ProfileService;

  private activeChild: ChildProfile | null = null;
  private currentRoundIndex: number = 0;
  private rounds: BDRound[] = [];
  private totalRounds: number = 5;
  private correctCount: number = 0;
  private incorrectCount: number = 0;
  private hintsRequested: number = 0;
  private startTime: number = 0;
  private missedPatterns: string[] = [];
  private onCompletedCallback?: () => void;

  private constructor() {
    this.learningPathService = LearningPathService.getInstance();
    this.profileService = ProfileService.getInstance();
  }

  public static getInstance(): LetterMirrorBDModal {
    if (!LetterMirrorBDModal.instance) {
      LetterMirrorBDModal.instance = new LetterMirrorBDModal();
    }
    return LetterMirrorBDModal.instance;
  }

  public start(child: ChildProfile, onCompleted?: () => void): void {
    this.activeChild = child;
    this.onCompletedCallback = onCompleted;
    this.currentRoundIndex = 0;
    this.correctCount = 0;
    this.incorrectCount = 0;
    this.hintsRequested = 0;
    this.missedPatterns = [];
    this.startTime = Date.now();

    const childLangCode = i18n.supportedLanguageToCode(child.preferredLanguage || 'English');
    this.rounds = this.generateRandomizedRounds(childLangCode);

    const modalEl = this.ensureModalElement();
    modalEl.classList.remove('hidden');
    document.body.style.overflow = 'hidden';

    this.renderCurrentRound();
  }

  private generateRandomizedRounds(langCode: AppLanguageCode): BDRound[] {
    const questionPools: Record<AppLanguageCode, BDRound[]> = {
      en: [
        {
          id: 'round_spot_b',
          type: 'spot_b',
          prompt: 'Spot the lowercase letter <b>b</b> (Bat then Ball):',
          targetLetter: 'b',
          visualIcon: '🏏',
          audioPrompt: 'Touch the lowercase letter b',
          options: [
            { letter: 'b', display: 'b', isCorrect: true, explanation: "That's it! Tall bat on the left, round belly bouncing right! 🏏" },
            { letter: 'd', display: 'd', isCorrect: false, explanation: "This is 'd'. Look at its round tummy on the left. 'b' has the tall bat first!" },
          ],
        },
        {
          id: 'round_spot_d',
          type: 'spot_d',
          prompt: 'Spot the lowercase letter <b>d</b> (Donut then Stick):',
          targetLetter: 'd',
          visualIcon: '🍩',
          audioPrompt: 'Touch the lowercase letter d',
          options: [
            { letter: 'd', display: 'd', isCorrect: true, explanation: "Great job! Round donut first on the left, tall stick on the right! 🍩" },
            { letter: 'b', display: 'b', isCorrect: false, explanation: "This is 'b'. 'b' starts with the bat on the left. 'd' has the round donut first!" },
          ],
        },
        {
          id: 'round_word_ball',
          type: 'word_completion',
          prompt: 'Which letter completes <b>_all</b> (a bouncy ball)?',
          targetLetter: 'b',
          contextWord: '_all',
          contextHint: 'ball starts with the /b/ sound',
          visualIcon: '⚽',
          audioPrompt: 'Which letter starts the word ball?',
          options: [
            { letter: 'b', display: 'b', isCorrect: true, explanation: "Yes! 'b' for ball: bat then ball creates 'ball' ⚽!" },
            { letter: 'd', display: 'd', isCorrect: false, explanation: "With 'd', that spells 'dall'. We want 'ball' with the bat on the left!" },
          ],
        },
        {
          id: 'round_word_dog',
          type: 'word_completion',
          prompt: 'Which letter completes <b>_og</b> (a wagging puppy)?',
          targetLetter: 'd',
          contextWord: '_og',
          contextHint: 'dog starts with the /d/ sound',
          visualIcon: '🐶',
          audioPrompt: 'Which letter starts the word dog?',
          options: [
            { letter: 'd', display: 'd', isCorrect: true, explanation: "Spot on! 'd' for dog: round donut first, then tall stick 🐶!" },
            { letter: 'b', display: 'b', isCorrect: false, explanation: "With 'b', that spells 'bog'. We want 'dog' with the round donut on the left!" },
          ],
        },
        {
          id: 'round_word_bed',
          type: 'word_completion',
          prompt: 'Which letter begins <b>_ed</b> (where we sleep)?',
          targetLetter: 'b',
          contextWord: '_ed',
          contextHint: 'bed begins with the left hand b',
          visualIcon: '🛏️',
          audioPrompt: 'Which letter starts the word bed?',
          options: [
            { letter: 'b', display: 'b', isCorrect: true, explanation: "Super! The word 'bed' starts with 'b' (left hand) and ends with 'd' (right hand) 🛏️!" },
            { letter: 'd', display: 'd', isCorrect: false, explanation: "Remember the bed trick: left hand is 'b', right hand is 'd'!" },
          ],
        },
        {
          id: 'round_belly_right',
          type: 'feature_check',
          prompt: 'Which letter has its round tummy facing <b>RIGHT</b>?',
          targetLetter: 'b',
          visualIcon: '👉',
          audioPrompt: 'Which letter has its belly facing right?',
          options: [
            { letter: 'b', display: 'b', isCorrect: true, explanation: "Exactly! 'b' sticks its tummy forward to the right (like a full belly) 🎈!" },
            { letter: 'd', display: 'd', isCorrect: false, explanation: "'d' has its belly facing left. 'b' has its belly bouncing right!" },
          ],
        },
      ],
      hi: [
        {
          id: 'round_hi_spot_ba',
          type: 'spot_b',
          prompt: 'अक्षर <b>ब</b> की पहचान कीजिए (बकरी 🐐):',
          targetLetter: 'ब',
          visualIcon: '🐐',
          audioPrompt: 'अक्षर ब को पहचानिए',
          options: [
            { letter: 'ब', display: 'ब', isCorrect: true, explanation: 'बहुत बढ़िया! गोल पेट में तिरछी रेखा वाला अक्षर "ब" (बकरी) है! 🐐' },
            { letter: 'भ', display: 'भ', isCorrect: false, explanation: 'यह "भ" (भालू) है। ऊपर से खुले मुख वाला भ है, तिरछी रेखा वाला ब चुनें।' },
          ],
        },
        {
          id: 'round_hi_spot_bha',
          type: 'spot_d',
          prompt: 'अक्षर <b>भ</b> की पहचान कीजिए (भालू 🐻):',
          targetLetter: 'भ',
          visualIcon: '🐻',
          audioPrompt: 'अक्षर भ को पहचानिए',
          options: [
            { letter: 'भ', display: 'भ', isCorrect: true, explanation: 'शाबाश! ऊपर से मुड़े हुए मुख वाला अक्षर "भ" (भालू) है! 🐻' },
            { letter: 'ब', display: 'ब', isCorrect: false, explanation: 'यह "ब" है। भ का मुख ऊपर से मुड़ा होता है।' },
          ],
        },
        {
          id: 'round_hi_word_bakri',
          type: 'word_completion',
          prompt: 'कौन-सा अक्षर शब्द पूरा करता है: <b>_करी</b> (घास चरने वाली)?',
          targetLetter: 'ब',
          contextWord: '_करी',
          contextHint: 'बकरी "ब" ध्वनि से शुरू होती है',
          visualIcon: '🐐',
          audioPrompt: 'बकरी शब्द किस अक्षर से शुरू होता है?',
          options: [
            { letter: 'ब', display: 'ब', isCorrect: true, explanation: 'सटीक उत्तर! ब से बकरी बनती है 🐐!' },
            { letter: 'भ', display: 'भ', isCorrect: false, explanation: 'भ से "भकरी" नहीं होता। सही अक्षर "ब" है।' },
          ],
        },
        {
          id: 'round_hi_word_bhalu',
          type: 'word_completion',
          prompt: 'कौन-सा अक्षर शब्द पूरा करता है: <b>_ालू</b> (जंगल का भालू)?',
          targetLetter: 'भ',
          contextWord: '_ालू',
          contextHint: 'भालू "भ" ध्वनि से शुरू होता है',
          visualIcon: '🐻',
          audioPrompt: 'भालू शब्द किस अक्षर से शुरू होता है?',
          options: [
            { letter: 'भ', display: 'भ', isCorrect: true, explanation: 'उत्कृष्ट! भ से भालू बनता है 🐻!' },
            { letter: 'ब', display: 'ब', isCorrect: false, explanation: 'ब से "बालू" बनता है। जंगल के भालू के लिए "भ" चुनें!' },
          ],
        },
        {
          id: 'round_hi_feature',
          type: 'feature_check',
          prompt: 'किस अक्षर के पेट में <b>तिरछी रेखा</b> कटी होती है?',
          targetLetter: 'ब',
          visualIcon: '✂️',
          audioPrompt: 'किस अक्षर के पेट में तिरछी रेखा होती है?',
          options: [
            { letter: 'ब', display: 'ब', isCorrect: true, explanation: 'बिल्कुल सही! "ब" के गोल पेट में तिरछी रेखा होती है!' },
            { letter: 'व', display: 'व', isCorrect: false, explanation: '"व" का पेट खाली होता है। रेखा वाला अक्षर "ब" है।' },
          ],
        },
      ],
      or: [
        {
          id: 'round_or_spot_ba',
          type: 'spot_b',
          prompt: 'ଅକ୍ଷର <b>ବ</b> କୁ ଚିହ୍ନଟ କରନ୍ତୁ (ବେଙ୍ଗ 🐸):',
          targetLetter: 'ବ',
          visualIcon: '🐸',
          audioPrompt: 'ଅକ୍ଷର ବ କୁ ସ୍ପର୍ଶ କରନ୍ତୁ',
          options: [
            { letter: 'ବ', display: 'ବ', isCorrect: true, explanation: 'ଚମତ୍କାର! ଏହା ଗୋଲ ଆକାରର ସରଳ ଅକ୍ଷର "ବ" (ବେଙ୍ଗ) ଅଟେ! 🐸' },
            { letter: 'ଧ', display: 'ଧ', isCorrect: false, explanation: 'ଏହା "ଧ" (ଧନୁ) ଅଟେ। "ବ" ଅକ୍ଷର ସମ୍ପୂର୍ଣ୍ଣ ସରଳ।' },
          ],
        },
        {
          id: 'round_or_spot_dha',
          type: 'spot_d',
          prompt: 'ଅକ୍ଷର <b>ଧ</b> କୁ ଚିହ୍ନଟ କରନ୍ତୁ (ଧନୁ 🏹):',
          targetLetter: 'ଧ',
          visualIcon: '🏹',
          audioPrompt: 'ଅକ୍ଷର ଧ କୁ ସ୍ପର୍ଶ କରନ୍ତୁ',
          options: [
            { letter: 'ଧ', display: 'ଧ', isCorrect: true, explanation: 'ଠିକ୍ ଉତ୍ତର! ଉପରୁ ଉଠିଥିବା ମୁଣ୍ଡ ଥିବା ଅକ୍ଷର "ଧ" (ଧନୁ) ଅଟେ! 🏹' },
            { letter: 'ବ', display: 'ବ', isCorrect: false, explanation: 'ଏହା "ବ" ଅଟେ। ଧନୁ ପରି ବଙ୍କା ଅକ୍ଷର "ଧ" ବାଛନ୍ତୁ।' },
          ],
        },
        {
          id: 'round_or_word_benga',
          type: 'word_completion',
          prompt: 'କେଉଁ ଅକ୍ଷର ଶବ୍ଦ ପୂରଣ କରେ: <b>_େଙ୍ଗ</b> (ପାଣିର ବେଙ୍ଗ 🐸)?',
          targetLetter: 'ବ',
          contextWord: '_େଙ୍ଗ',
          contextHint: 'ବେଙ୍ଗ ବ ଧ୍ୱନିରୁ ଆରମ୍ଭ ହୁଏ',
          visualIcon: '🐸',
          audioPrompt: 'ବେଙ୍ଗ ଶବ୍ଦ କେଉଁ ଅକ୍ଷରରୁ ଆରମ୍ଭ ହୁଏ?',
          options: [
            { letter: 'ବ', display: 'ବ', isCorrect: true, explanation: 'ଅତି ସୁନ୍ଦର! ବ ରୁ ବେଙ୍ଗ ହୁଏ 🐸!' },
            { letter: 'ଧ', display: 'ଧ', isCorrect: false, explanation: 'ଧ ରୁ ବେଙ୍ଗ ହୁଏ ନାହିଁ। ସଠିକ୍ ଅକ୍ଷର "ବ" ଅଟେ।' },
          ],
        },
        {
          id: 'round_or_word_dhanu',
          type: 'word_completion',
          prompt: 'କେଉଁ ଅକ୍ଷର ଶବ୍ଦ ପୂରଣ କରେ: <b>_ନୁ</b> (ତୀର ଧନୁ 🏹)?',
          targetLetter: 'ଧ',
          contextWord: '_ନୁ',
          contextHint: 'ଧନୁ ଧ ଧ୍ୱନିରୁ ଆରମ୍ଭ ହୁଏ',
          visualIcon: '🏹',
          audioPrompt: 'ଧନୁ ଶବ୍ଦ କେଉଁ ଅକ୍ଷରରୁ ଆରମ୍ଭ ହୁଏ?',
          options: [
            { letter: 'ଧ', display: 'ଧ', isCorrect: true, explanation: 'ସାବାସ୍! ଧ ରୁ ଧନୁ ହୁଏ 🏹!' },
            { letter: 'ବ', display: 'ବ', isCorrect: false, explanation: 'ବ ରୁ ଧନୁ ହୁଏ ନାହିଁ। "ଧ" ବାଛନ୍ତୁ।' },
          ],
        },
        {
          id: 'round_or_feature',
          type: 'feature_check',
          prompt: 'କେଉଁ ଅକ୍ଷରଟି ସମ୍ପୂର୍ଣ୍ଣ <b>ଗୋଲ ବୃତ୍ତ</b> ଆକାରରେ ଥାଏ?',
          targetLetter: 'ବ',
          visualIcon: '⭕',
          audioPrompt: 'ସମ୍ପୂର୍ଣ୍ଣ ଗୋଲ ଆକାରର ଅକ୍ଷର କେଉଁଟି?',
          options: [
            { letter: 'ବ', display: 'ବ', isCorrect: true, explanation: 'ସଠିକ୍! "ବ" ସରଳ ଓ ଗୋଲ ଆକାରର ଅକ୍ଷର!' },
            { letter: 'କ', display: 'କ', isCorrect: false, explanation: '"କ" ର ଉପର ପାଖେ ବୁଲାଣି ଥାଏ।' },
          ],
        },
      ],
      pa: [
        {
          id: 'round_pa_spot_ba',
          type: 'spot_b',
          prompt: 'ਅੱਖਰ <b>ਬ</b> ਦੀ ਪਛਾਣ ਕਰੋ (ਬੱਤਖ 🦆):',
          targetLetter: 'ਬ',
          visualIcon: '🦆',
          audioPrompt: 'ਅੱਖਰ ਬ ਨੂੰ ਛੂਹੋ',
          options: [
            { letter: 'ਬ', display: 'ਬ', isCorrect: true, explanation: 'ਬਹੁਤ ਵਧੀਆ! ਸਾਫ਼ ਅਤੇ ਸਿੱਧੀ ਬਣਤਰ ਵਾਲਾ ਅੱਖਰ "ਬ" (ਬੱਤਖ) ਹੈ! 🦆' },
            { letter: 'ਭ', display: 'ਭ', isCorrect: false, explanation: 'ਇਹ "ਭ" (ਭਾਲੂ) ਹੈ। ਉੱਪਰੋਂ ਮੁੜੇ ਹੋਏ ਸਿਰੇ ਵਾਲਾ ਭ ਹੈ।' },
          ],
        },
        {
          id: 'round_pa_spot_bha',
          type: 'spot_d',
          prompt: 'ਅੱਖਰ <b>ਭ</b> ਦੀ ਪਛਾਣ ਕਰੋ (ਭਾਲੂ 🐻):',
          targetLetter: 'ਭ',
          visualIcon: '🐻',
          audioPrompt: 'ਅੱਖਰ ਭ ਨੂੰ ਛੂਹੋ',
          options: [
            { letter: 'ਭ', display: 'ਭ', isCorrect: true, explanation: 'ਸ਼ਾਬਾਸ਼! ਉੱਪਰੋਂ ਮੁੜਿਆ ਹੋਇਆ ਅੱਖਰ "ਭ" (ਭਾਲੂ) ਹੈ! 🐻' },
            { letter: 'ਬ', display: 'ਬ', isCorrect: false, explanation: 'ਇਹ "ਬ" ਹੈ। ਭਾਲੂ ਲਈ "ਭ" ਚੁਣੋ।' },
          ],
        },
        {
          id: 'round_pa_word_battakh',
          type: 'word_completion',
          prompt: 'ਕਿਹੜਾ ਅੱਖਰ ਸ਼ਬਦ ਪੂਰਾ ਕਰਦਾ ਹੈ: <b>_ੱਤਖ</b> (ਪਾਣੀ ਦੀ ਬੱਤਖ 🦆)?',
          targetLetter: 'ਬ',
          contextWord: '_ੱਤਖ',
          contextHint: 'ਬੱਤਖ ਬ ਧੁਨੀ ਨਾਲ ਸ਼ੁਰੂ ਹੁੰਦੀ ਹੈ',
          visualIcon: '🦆',
          audioPrompt: 'ਬੱਤਖ ਸ਼ਬਦ ਕਿਸ ਅੱਖਰ ਨਾਲ ਸ਼ੁਰੂ ਹੁੰਦਾ ਹੈ?',
          options: [
            { letter: 'ਬ', display: 'ਬ', isCorrect: true, explanation: 'ਬਿਲਕੁਲ ਠੀਕ! ਬ ਤੋਂ ਬੱਤਖ ਬਣਦੀ ਹੈ 🦆!' },
            { letter: 'ਭ', display: 'ਭ', isCorrect: false, explanation: 'ਭ ਤੋਂ ਬੱਤਖ ਨਹੀਂ ਬਣਦੀ। ਸਹੀ ਅੱਖਰ "ਬ" ਹੈ।' },
          ],
        },
        {
          id: 'round_pa_word_bhalu',
          type: 'word_completion',
          prompt: 'ਕਿਹੜਾ ਅੱਖਰ ਸ਼ਬਦ ਪੂਰਾ ਕਰਦਾ ਹੈ: <b>_ਾਲੂ</b> (ਜੰਗਲ ਦਾ ਭਾਲੂ 🐻)?',
          targetLetter: 'ਭ',
          contextWord: '_ਾਲੂ',
          contextHint: 'ਭਾਲੂ ਭ ਧੁਨੀ ਨਾਲ ਸ਼ੁਰੂ ਹੁੰਦਾ ਹੈ',
          visualIcon: '🐻',
          audioPrompt: 'ਭਾਲੂ ਸ਼ਬਦ ਕਿਸ ਅੱਖਰ ਨਾਲ ਸ਼ੁਰੂ ਹੁੰਦਾ ਹੈ?',
          options: [
            { letter: 'ਭ', display: 'ਭ', isCorrect: true, explanation: 'ਕਮਾਲ! ਭ ਤੋਂ ਭਾਲੂ ਬਣਦਾ ਹੈ 🐻!' },
            { letter: 'ਬ', display: 'ਬ', isCorrect: false, explanation: 'ਜੰਗਲ ਦੇ ਭਾਲੂ ਲਈ "ਭ" ਚੁਣੋ!' },
          ],
        },
        {
          id: 'round_pa_feature',
          type: 'feature_check',
          prompt: 'ਕਿਹੜਾ ਅੱਖਰ ਉੱਪਰੋਂ <b>ਸਿੱਧਾ ਅਤੇ ਬੰਦ</b> ਹੁੰਦਾ ਹੈ?',
          targetLetter: 'ਬ',
          visualIcon: '🔒',
          audioPrompt: 'ਸਿੱਧਾ ਅਤੇ ਬੰਦ ਅੱਖਰ ਕਿਹੜਾ ਹੈ?',
          options: [
            { letter: 'ਬ', display: 'ਬ', isCorrect: true, explanation: 'ਬਿਲਕੁਲ ਸਹੀ! "ਬ" ਉੱਪਰੋਂ ਸਿੱਧੀ ਰੇਖਾ ਨਾਲ ਬੰਦ ਹੁੰਦਾ ਹੈ!' },
            { letter: 'ਭ', display: 'ਭ', isCorrect: false, explanation: '"ਭ" ਉੱਪਰੋਂ ਖੁੱਲ੍ਹਾ ਅਤੇ ਮੁੜਿਆ ਹੁੰਦਾ ਹੈ।' },
          ],
        },
      ],
      ta: [
        {
          id: 'round_ta_spot_ra',
          type: 'spot_b',
          prompt: 'இடையின எழுத்து <b>ர</b> ஐக் கண்டறியவும் (ரயில் 🚆):',
          targetLetter: 'ர',
          visualIcon: '🚆',
          audioPrompt: 'ர எழுத்தைத் தொடவும்',
          options: [
            { letter: 'ர', display: 'ர', isCorrect: true, explanation: 'அருமை! மென்மையான எளிய வளைவு கொண்ட இடையின "ர" (ரயில்) இதுவே! 🚆' },
            { letter: 'ற', display: 'ற', isCorrect: false, explanation: 'இது வல்லின "ற" (பறவை). எளிய "ர" ஐத் தேர்ந்தெடுக்கவும்.' },
          ],
        },
        {
          id: 'round_ta_spot_rra',
          type: 'spot_d',
          prompt: 'வல்லின எழுத்து <b>ற</b> ஐக் கண்டறியவும் (பறவை 🐦):',
          targetLetter: 'ற',
          visualIcon: '🐦',
          audioPrompt: 'ற எழுத்தைத் தொடவும்',
          options: [
            { letter: 'ற', display: 'ற', isCorrect: true, explanation: 'மிகச் சரி! மேல்நோக்கிச் சுழித்து வரும் வல்லின "ற" (பறவை) இதுவே! 🐦' },
            { letter: 'ர', display: 'ர', isCorrect: false, explanation: 'இது இடையின "ர". வல்லின "ற" ஐத் தேர்ந்தெடுக்கவும்.' },
          ],
        },
        {
          id: 'round_ta_word_rayil',
          type: 'word_completion',
          prompt: 'எந்த எழுத்து சொல்லை நிறைவு செய்கிறது: <b>_யில்</b> (நீண்ட ரயில் 🚆)?',
          targetLetter: 'ர',
          contextWord: '_யில்',
          contextHint: 'ரயில் ர ஒலியில் தொடங்குகிறது',
          visualIcon: '🚆',
          audioPrompt: 'ரயில் சொல் எந்த எழுத்தில் தொடங்குகிறது?',
          options: [
            { letter: 'ர', display: 'ர', isCorrect: true, explanation: 'அற்புதம்! ர-யில் ரயில் 🚆!' },
            { letter: 'ற', display: 'ற', isCorrect: false, explanation: 'ரயிலுக்கு இடையின "ர" பொருத்தமானது.' },
          ],
        },
        {
          id: 'round_ta_word_paravai',
          type: 'word_completion',
          prompt: 'எந்த எழுத்து சொல்லை நிறைவு செய்கிறது: <b>ப_வை</b> (வானில் பறக்கும் பறவை 🐦)?',
          targetLetter: 'ற',
          contextWord: 'ப_வை',
          contextHint: 'பறவை சொல்லில் ற வருகிறது',
          visualIcon: '🐦',
          audioPrompt: 'பறவை சொல்லில் எந்த எழுத்து வருகிறது?',
          options: [
            { letter: 'ற', display: 'ற', isCorrect: true, explanation: 'அருமை! ப-ற-வை பறவை 🐦!' },
            { letter: 'ர', display: 'ர', isCorrect: false, explanation: 'பறவைக்கு வல்லின "ற" பொருத்தமானது.' },
          ],
        },
        {
          id: 'round_ta_feature',
          type: 'feature_check',
          prompt: 'எந்த எழுத்து <b>எளிய கீழ்நோக்கிய வளைவு</b> உடையது?',
          targetLetter: 'ர',
          visualIcon: '➰',
          audioPrompt: 'எளிய கீழ்நோக்கிய வளைவு கொண்ட எழுத்து எது?',
          options: [
            { letter: 'ர', display: 'ர', isCorrect: true, explanation: 'சரியான பதில்! "ர" எளிய வளைவுடைய இடையின மெய்!' },
            { letter: 'ற', display: 'ற', isCorrect: false, explanation: '"ற" மேல்நோக்கிச் சுழித்து அமைந்திருக்கும்.' },
          ],
        },
      ],
    };

    const selectedPool = questionPools[langCode] || questionPools.en;
    const shuffled = [...selectedPool].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, this.totalRounds);
  }

  private renderCurrentRound(): void {
    const modalEl = this.ensureModalElement();
    const round = this.rounds[this.currentRoundIndex];
    if (!round) {
      this.renderSummary();
      return;
    }

    const childLangCode = i18n.supportedLanguageToCode(this.activeChild?.preferredLanguage || 'English');
    const metaCards: Record<AppLanguageCode, {
      title: string;
      desc: string;
      card1: { letter: string; icon: string; title: string; desc: string };
      card2: { letter: string; icon: string; title: string; desc: string };
      trick: string;
    }> = {
      en: {
        title: 'Letter Mirror: b and d Detective 🔍',
        desc: 'Learn to tell lowercase <strong>b</strong> and <strong>d</strong> apart with easy visual tricks.',
        card1: { letter: 'b', icon: '🏏', title: 'Bat then Ball', desc: 'Tall stick on the LEFT, belly on the RIGHT' },
        card2: { letter: 'd', icon: '🍩', title: 'Donut then Stick', desc: 'Round donut on the LEFT, tall stick on RIGHT' },
        trick: '<strong>The Bed Trick:</strong> Make two fists with thumbs up. Left hand is <b>b</b>, right hand is <b>d</b>. Together they spell <b>b - e - d</b>!',
      },
      hi: {
        title: 'अक्षर पहचान: ब और भ 🔍',
        desc: 'समान दिखने वाले अक्षरों <strong>ब</strong> और <strong>भ</strong> में अंतर पहचानना सीखें।',
        card1: { letter: 'ब', icon: '🐐', title: 'बकरी (तिरछी रेखा)', desc: 'गोल पेट के बीच में तिरछी रेखा होती है' },
        card2: { letter: 'भ', icon: '🐻', title: 'भालू (मुड़ा हुआ)', desc: 'ऊपर से खुला और मुड़ा हुआ मुख' },
        trick: '<strong>पहचान सूत्र:</strong> ब का पेट बंद होता है और बीच में रेखा कटती है, जबकि भ ऊपर से मुड़कर खुलता है!',
      },
      or: {
        title: 'ଅକ୍ଷର ଚିହ୍ନଟ: ବ ଏବଂ ଧ 🔍',
        desc: 'ଦ୍ୱନ୍ଦ୍ୱ ସୃଷ୍ଟି କରୁଥିବା ଅକ୍ଷର <strong>ବ</strong> ଏବଂ <strong>ଧ</strong> କୁ ସହଜରେ ଚିହ୍ନନ୍ତୁ।',
        card1: { letter: 'ବ', icon: '🐸', title: 'ବେଙ୍ଗ (ସିଧା ଗୋଲ)', desc: 'ସମ୍ପୂର୍ଣ୍ଣ ଗୋଲ ହୋଇ ଉପରକୁ ଉଠିଥିବା' },
        card2: { letter: 'ଧ', icon: '🏹', title: 'ଧନୁ (ବଙ୍କା ଶୀର୍ଷ)', desc: 'ଉପରୁ ଧନୁ ପରି ବଙ୍କା ହୋଇ ରହିଥିବା' },
        trick: '<strong>ଚିହ୍ନଟ ସୂତ୍ର:</strong> ବ ସମ୍ପୂର୍ଣ୍ଣ ସରଳ ଓ ଗୋଲ, ଧ ର ମୁଣ୍ଡ ଧନୁ ପରି ଉଠି ରହିଥାଏ!',
      },
      pa: {
        title: 'ਅੱਖਰ ਪਛਾਣ: ਬ ਅਤੇ ਭ 🔍',
        desc: 'ਰਲਦੇ-ਮਿਲਦੇ ਅੱਖਰਾਂ <strong>ਬ</strong> ਅਤੇ <strong>ਭ</strong> ਵਿਚਕਾਰ ਆਸਾਨੀ ਨਾਲ ਫਰਕ ਪਛਾਣੋ।',
        card1: { letter: 'ਬ', icon: '🦆', title: 'ਬੱਤਖ (ਸਿੱਧੀ ਬਣਤਰ)', desc: 'ਸਾਫ਼ ਅਤੇ ਸਿੱਧੀ ਬਣਤਰ ਵਾਲਾ ਅੱਖਰ' },
        card2: { letter: 'ਭ', icon: '🐻', title: 'ਭਾਲੂ (ਮੁੜਿਆ ਸਿਰਾ)', desc: 'ਉੱਪਰੋਂ ਮੁੜਿਆ ਹੋਇਆ ਖੁੱਲ੍ਹਾ ਸਿਰਾ' },
        trick: '<strong>ਪਛਾਣ ਸੂਤਰ:</strong> ਬ ਦਾ ਉੱਪਰਲਾ ਹਿੱਸਾ ਬੰਦ ਹੈ, ਜਦਕਿ ਭ ਉੱਪਰੋਂ ਮੁੜ ਕੇ ਖੁੱਲ੍ਹਦਾ ਹੈ!',
      },
      ta: {
        title: 'எழுத்து வேறுபாடு: ர மற்றும் ற 🔍',
        desc: 'ஒத்த வடிவ எழுத்துகளான <strong>ர</strong> மற்றும் <strong>ற</strong> வை எளிதாக வேறுபடுத்திக் காணுங்கள்.',
        card1: { letter: 'ர', icon: '🚆', title: 'இடையின ரகரம் (ரயில்)', desc: 'மேலிருந்து கீழ் வளைந்து வரும் எளிய வடிவம்' },
        card2: { letter: 'ற', icon: '🐦', title: 'வல்லின றகரம் (பறவை)', desc: 'மேல்நோக்கி சுழித்து மேலேறும் வடிவம்' },
        trick: '<strong>வேறுபாட்டுக் குறிப்பு:</strong> ர மென்மையான எளிய வளைவு, ற வன்மையுடன் மேல்நோக்கிச் சுழிக்கும்!',
      },
    };

    const currentMeta = metaCards[childLangCode] || metaCards.en;

    // Randomize option order for this round
    const randomizedOptions = [...round.options].sort(() => Math.random() - 0.5);

    modalEl.innerHTML = `
      <div class="modal activity-runner-modal" style="max-width: 620px;" role="dialog" aria-modal="true" aria-labelledby="bdModalTitle">
        <!-- Head -->
        <div class="modal-head" style="align-items: center; border-bottom: 1.5px solid var(--line); padding-bottom: 14px;">
          <div style="display: flex; align-items: center; gap: 10px;">
            <div style="width: 42px; height: 42px; border-radius: 12px; background: #fff1d2; font-size: 22px; display: grid; place-items: center;">
              🔤
            </div>
            <div>
              <div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
                <h2 id="bdModalTitle" style="font: 900 18px Nunito; margin: 0; color: var(--ink);">
                  ${currentMeta.title}
                </h2>
                <span class="tag" style="background:#eef8f4; color:var(--teal); font-size:11px;">
                  ${this.currentRoundIndex + 1} / ${this.totalRounds}
                </span>
              </div>
              <p style="font-size: 12px; color: var(--muted); margin: 2px 0 0;">
                ${currentMeta.desc}
              </p>
            </div>
          </div>
          <button type="button" class="modal-close" id="btnCloseBDModal" aria-label="Close activity">×</button>
        </div>

        <!-- Body -->
        <div class="modal-body" style="padding-top: 14px;">
          <!-- Visual Helper Mnemonic Cards -->
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 18px;">
            <div style="background: #eef6fc; border: 2px solid #bce0fd; border-radius: 16px; padding: 12px; text-align: center;">
              <div style="display: flex; align-items: center; justify-content: center; gap: 6px;">
                <span style="font: 900 36px 'Comic Sans MS', Nunito, sans-serif; color: #1971c2; line-height: 1;">${currentMeta.card1.letter}</span>
                <span style="font-size: 24px;">${currentMeta.card1.icon}</span>
              </div>
              <strong style="font: 800 13px Nunito; color: #1971c2; display: block; margin-top: 4px;">${currentMeta.card1.title}</strong>
              <small style="font-size: 11px; color: #495057;">${currentMeta.card1.desc}</small>
            </div>

            <div style="background: #fbf2ea; border: 2px solid #ffd8a8; border-radius: 16px; padding: 12px; text-align: center;">
              <div style="display: flex; align-items: center; justify-content: center; gap: 6px;">
                <span style="font: 900 36px 'Comic Sans MS', Nunito, sans-serif; color: #d9480f; line-height: 1;">${currentMeta.card2.letter}</span>
                <span style="font-size: 24px;">${currentMeta.card2.icon}</span>
              </div>
              <strong style="font: 800 13px Nunito; color: #d9480f; display: block; margin-top: 4px;">${currentMeta.card2.title}</strong>
              <small style="font-size: 11px; color: #495057;">${currentMeta.card2.desc}</small>
            </div>
          </div>

          <!-- Prompt Box -->
          <div style="background: #fff; border: 2px dashed #b7ebc9; border-radius: 18px; padding: 18px; text-align: center; margin-bottom: 18px;">
            <div style="font-size: 32px; margin-bottom: 6px;">${round.visualIcon}</div>
            <h3 style="font: 900 20px Nunito; margin: 0 0 6px; color: var(--ink);">
              ${round.prompt}
            </h3>
            ${
              round.contextHint
                ? `<p style="font-size: 13px; color: #5c7078; margin: 0;">💡 ${round.contextHint}</p>`
                : ''
            }
            <button type="button" id="btnHearBDLetter" class="btn-action-pill" style="margin-top: 10px; font-size: 12px; padding: 6px 14px; background: #f3f6f8;">
              🔊 ${i18n.t('activity.listenQuestionBtn')}
            </button>
          </div>

          <!-- Choice Options -->
          <div class="bd-choice-grid" style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px;">
            ${randomizedOptions
              .map(
                opt => `
              <button
                type="button"
                class="bd-option-btn"
                data-letter="${opt.letter}"
                data-is-correct="${opt.isCorrect}"
                data-explanation="${opt.explanation.replace(/"/g, '&quot;')}"
                style="
                  min-height: 90px;
                  border-radius: 20px;
                  border: 2.5px solid var(--line);
                  background: #fff;
                  display: flex;
                  flex-direction: column;
                  align-items: center;
                  justify-content: center;
                  cursor: pointer;
                  transition: all 0.16s ease;
                  font: 900 48px 'Comic Sans MS', Nunito, sans-serif;
                  color: var(--ink);
                  box-shadow: var(--shadow);
                "
              >
                <span>${opt.display}</span>
              </button>
            `
              )
              .join('')}
          </div>

          <!-- Feedback Box -->
          <div id="bdFeedbackBox" class="hidden" style="margin-bottom: 16px; border-radius: 14px; padding: 12px 16px;"></div>

          <!-- The Mnemonic Reminder -->
          <div style="background: #fbfcfb; border: 1px solid #e1e9e4; border-radius: 12px; padding: 8px 14px; font-size: 11px; color: #5a6e65; display: flex; align-items: center; gap: 8px;">
            <span>✨</span>
            <span>${currentMeta.trick}</span>
          </div>

          <!-- Controls -->
          <div class="modal-controls" style="margin-top: 18px; display: flex; justify-content: flex-end; gap: 10px;">
            <button type="button" id="btnNextBDRound" class="primary hidden" style="min-height: 44px; padding: 10px 24px; font-size: 14px;">
              ${this.currentRoundIndex < this.totalRounds - 1 ? `${i18n.t('activity.nextAdventureBtn')}` : `${i18n.t('activity.finishBtn')}`}
            </button>
          </div>
        </div>
      </div>
    `;

    this.bindRoundEvents(round);
  }

  private bindRoundEvents(round: BDRound): void {
    const modalEl = this.ensureModalElement();
    const childLangCode = i18n.supportedLanguageToCode(this.activeChild?.preferredLanguage || 'English');

    modalEl.querySelector('#btnCloseBDModal')?.addEventListener('click', () => {
      this.close();
    });

    // Audio text to speech
    modalEl.querySelector('#btnHearBDLetter')?.addEventListener('click', () => {
      this.speakText(round.audioPrompt);
    });

    const optButtons = modalEl.querySelectorAll('.bd-option-btn');
    const fbBox = modalEl.querySelector('#bdFeedbackBox') as HTMLElement;
    const nextBtn = modalEl.querySelector('#btnNextBDRound') as HTMLElement;

    optButtons.forEach(btn => {
      btn.addEventListener('keydown', (e: Event) => {
        const keyEvent = e as KeyboardEvent;
        if (keyEvent.key === 'Enter' || keyEvent.key === ' ') {
          keyEvent.preventDefault();
          (btn as HTMLElement).click();
        }
      });

      btn.addEventListener('click', () => {
        const isCorrect = (btn as HTMLElement).dataset.isCorrect === 'true';
        const explanation = (btn as HTMLElement).dataset.explanation || '';

        optButtons.forEach(b => {
          (b as HTMLElement).style.pointerEvents = 'none';
        });

        if (isCorrect) {
          (btn as HTMLElement).style.borderColor = '#3b9b75';
          (btn as HTMLElement).style.background = '#eefbf4';
          (btn as HTMLElement).style.color = '#18794e';
          this.correctCount += 1;

          const winTitle = i18n.tForLang(childLangCode, 'activity.winTitle') || 'Spot on!';
          const fullSpokenFeedback = `${winTitle}. ${explanation}`;

          if (fbBox) {
            fbBox.className = '';
            fbBox.style.background = '#e6f8ee';
            fbBox.style.border = '1.5px solid #b7ebc9';
            fbBox.style.color = '#18794e';
            fbBox.innerHTML = `
              <div style="display: flex; align-items: center; gap: 10px;">
                <span style="font-size: 24px;">🎉</span>
                <div>
                  <strong>${winTitle}</strong>
                  <p style="margin: 2px 0 0; font-size: 13px;">${explanation}</p>
                </div>
              </div>
            `;
            fbBox.classList.remove('hidden');
          }

          this.speakText(fullSpokenFeedback);
        } else {
          (btn as HTMLElement).style.borderColor = '#e03131';
          (btn as HTMLElement).style.background = '#fff5f5';
          (btn as HTMLElement).style.color = '#c92a2a';
          this.incorrectCount += 1;
          this.missedPatterns.push('letter_distinction');

          const tryAgainTitle = i18n.tForLang(childLangCode, 'activity.tryAgainTitle') || "Let's check again:";
          const fullSpokenFeedback = `${tryAgainTitle}. ${explanation}`;

          // Highlight the correct one
          optButtons.forEach(b => {
            if ((b as HTMLElement).dataset.isCorrect === 'true') {
              (b as HTMLElement).style.borderColor = '#3b9b75';
              (b as HTMLElement).style.background = '#eefbf4';
            }
          });

          if (fbBox) {
            fbBox.className = '';
            fbBox.style.background = '#fff9db';
            fbBox.style.border = '1.5px solid #ffe066';
            fbBox.style.color = '#7d6200';
            fbBox.innerHTML = `
              <div style="display: flex; align-items: center; gap: 10px;">
                <span style="font-size: 24px;">🌱</span>
                <div>
                  <strong>${tryAgainTitle}</strong>
                  <p style="margin: 2px 0 0; font-size: 13px;">${explanation}</p>
                </div>
              </div>
            `;
            fbBox.classList.remove('hidden');
          }

          this.speakText(fullSpokenFeedback);
        }

        if (nextBtn) {
          nextBtn.classList.remove('hidden');
          nextBtn.focus();
        }
      });
    });

    nextBtn?.addEventListener('click', () => {
      this.currentRoundIndex += 1;
      this.renderCurrentRound();
    });
  }

  private async renderSummary(): Promise<void> {
    if (!this.activeChild) return;

    const modalEl = this.ensureModalElement();
    const durationSeconds = Math.max(20, Math.round((Date.now() - this.startTime) / 1000));
    const accuracy = this.correctCount / this.totalRounds;
    const score = Math.round(accuracy * 100);

    // Record the learning attempt to persist and update adaptive path
    await this.learningPathService.recordAttempt({
      id: `att_bd_${Date.now()}`,
      childId: this.activeChild.id,
      activityId: 'act_mirror_bd',
      skillId: 'skill_confused_letters_bd',
      activityType: 'letter_distinction',
      score,
      accuracy,
      totalQuestions: this.totalRounds,
      correctAnswers: this.correctCount,
      incorrectAnswers: this.incorrectCount,
      attemptsRequired: this.totalRounds + this.incorrectCount,
      hintsRequested: this.hintsRequested,
      correctedAfterHint: 0,
      durationSeconds,
      missedItems: this.missedPatterns,
      completedAt: new Date().toISOString(),
    });

    // Award happy points
    const pointsAwarded = Math.round(this.correctCount * 5) + 10;
    const currentProgress = this.profileService.getChildProgress(this.activeChild.id);
    this.profileService.updateChildProgress(this.activeChild.id, {
      happyPoints: currentProgress.happyPoints + pointsAwarded,
      practiceMinutes: currentProgress.practiceMinutes + Math.round(durationSeconds / 60),
      practiceWins: currentProgress.practiceWins + 1,
    });

    const childLangCode = i18n.supportedLanguageToCode(this.activeChild.preferredLanguage || 'English');
    const winTitle = i18n.tForLang(childLangCode, 'activity.completedTitle') || 'Activity Complete! 🎉';
    const winDesc = i18n.tForLang(childLangCode, 'activity.completedDesc', { title: 'Letter Detective' }) || 'Great effort! You practiced letter recognition.';
    const correctLabel = i18n.tForLang(childLangCode, 'progress.statAccuracy') || 'Accuracy';
    const pointsLabel = i18n.tForLang(childLangCode, 'profileSelect.pointsUnit') || 'Points';
    const returnBtn = `${i18n.t('activity.returnPracticeBtn')} →`;

    modalEl.innerHTML = `
      <div class="modal activity-runner-modal" style="max-width: 520px; text-align: center; padding: 36px 24px;" role="dialog" aria-modal="true">
        <div style="font-size: 56px; margin-bottom: 10px;">🌟</div>
        <h2 style="font: 900 24px Nunito; margin: 0 0 8px; color: var(--ink);">
          ${winTitle}
        </h2>
        <p style="font-size: 14px; color: #516269; margin: 0 0 20px;">
          ${winDesc}
        </p>

        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 24px;">
          <div style="background: #f4fbf8; border: 1.5px solid #c8ecd9; border-radius: 14px; padding: 12px 6px;">
            <strong style="font: 900 22px Nunito; color: var(--teal); display: block;">${this.correctCount}/${this.totalRounds}</strong>
            <small style="font-size: 11px; color: var(--muted);">${i18n.t('progress.statAccuracy')}</small>
          </div>
          <div style="background: #fff8e8; border: 1.5px solid #f6e69d; border-radius: 14px; padding: 12px 6px;">
            <strong style="font: 900 22px Nunito; color: #9c6c06; display: block;">${score}%</strong>
            <small style="font-size: 11px; color: var(--muted);">${correctLabel}</small>
          </div>
          <div style="background: #f3edff; border: 1.5px solid #ded5fa; border-radius: 14px; padding: 12px 6px;">
            <strong style="font: 900 22px Nunito; color: #6c5ce7; display: block;">+${pointsAwarded} ⭐</strong>
            <small style="font-size: 11px; color: var(--muted);">${pointsLabel}</small>
          </div>
        </div>

        <button type="button" id="btnFinishBDModal" class="primary hero-cta" style="font-size: 14px; padding: 12px 30px; width: 100%;">
          ${returnBtn}
        </button>
      </div>
    `;

    modalEl.querySelector('#btnFinishBDModal')?.addEventListener('click', () => {
      this.close();
      if (this.onCompletedCallback) {
        this.onCompletedCallback();
      }
    });
  }

  public close(): void {
    SpeechService.getInstance().stop();
    const modalEl = document.getElementById('bdRunnerModalContainer');
    if (modalEl) {
      modalEl.classList.add('hidden');
    }
    document.body.style.overflow = '';
  }

  private speakText(text: string): void {
    const childLangCode = i18n.supportedLanguageToCode(this.activeChild?.preferredLanguage || 'English');
    const res = SpeechService.getInstance().speak(text, { langCode: childLangCode });
    if (!res.spoken && res.message) {
      const fbBox = document.getElementById('bdFeedbackBox');
      if (fbBox) {
        fbBox.className = '';
        fbBox.style.background = '#fff9db';
        fbBox.style.border = '1.5px solid #ffe066';
        fbBox.style.color = '#7d6200';
        fbBox.textContent = res.message;
        fbBox.classList.remove('hidden');
      }
    }
  }

  private ensureModalElement(): HTMLElement {
    let el = document.getElementById('bdRunnerModalContainer');
    if (!el) {
      el = document.createElement('div');
      el.id = 'bdRunnerModalContainer';
      el.className = 'modal-backdrop hidden';
      document.body.appendChild(el);
    }
    return el;
  }
}
