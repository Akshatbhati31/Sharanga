import type { AppLanguageCode } from '../types/auth';
import { i18n } from '../i18n';

export type TtsVoiceMode = 'story' | 'instruction' | 'pronunciation' | 'question' | 'encouragement' | 'explanation';

export interface SpeechSpeakOptions {
  langCode?: AppLanguageCode;
  mode?: TtsVoiceMode;
  rate?: number;
  pitch?: number;
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (err: any) => void;
  onLoading?: (isLoading: boolean) => void;
  preferCloud?: boolean;
}

export interface SpeechSpeakResult {
  spoken: boolean;
  hasNativeVoice: boolean;
  provider?: 'google_cloud_tts' | 'gemini_tts' | 'web_speech' | 'fallback';
  message?: string;
}

/**
 * Pacing and pitch profiles for warm, calm female storytelling and teaching across activities.
 */
export const MODE_AUDIO_SETTINGS: Record<TtsVoiceMode, { rate: number; pitch: number; paragraphPauseMs: number }> = {
  story: {
    rate: 0.86,           // Slightly slower than conversation for soothing, unhurried storytelling
    pitch: 1.02,          // Gentle, warm intonation
    paragraphPauseMs: 400,
  },
  instruction: {
    rate: 0.82,           // Calm, slow and deliberate for young dyslexic readers
    pitch: 1.0,
    paragraphPauseMs: 300,
  },
  pronunciation: {
    rate: 0.74,           // Extra slow for phonetic clarity and accurate phoneme modeling
    pitch: 1.0,
    paragraphPauseMs: 200,
  },
  question: {
    rate: 0.84,           // Clear question delivery with space for comprehension
    pitch: 1.04,
    paragraphPauseMs: 350,
  },
  encouragement: {
    rate: 0.88,           // Warm, uplifting, celebratory without manic excitement
    pitch: 1.06,
    paragraphPauseMs: 250,
  },
  explanation: {
    rate: 0.84,           // Patient, friendly teacher-like delivery
    pitch: 1.02,
    paragraphPauseMs: 350,
  },
};

export class SpeechService {
  private static instance: SpeechService;
  private voices: SpeechSynthesisVoice[] = [];
  private voicesLoaded: boolean = false;
  private currentAudio: HTMLAudioElement | null = null;
  private isSpeakingActive: boolean = false;
  private activeChunkUtterance: SpeechSynthesisUtterance | null = null;
  private abortController: AbortController | null = null;

  // In-memory audio cache for synthesized audio clips to eliminate repeat network roundtrips
  private clientAudioCache = new Map<string, { audioContent: string; mimeType: string }>();

  private localeMap: Record<AppLanguageCode, string> = {
    en: 'en-IN',
    hi: 'hi-IN',
    pa: 'pa-IN',
    bn: 'bn-IN',
    ta: 'ta-IN',
    or: 'or-IN',
  };

  private constructor() {
    this.initVoices();
  }

  public static getInstance(): SpeechService {
    if (!SpeechService.instance) {
      SpeechService.instance = new SpeechService();
    }
    return SpeechService.instance;
  }

  private getSpeechSynthesis(): SpeechSynthesis | undefined {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      return window.speechSynthesis;
    }
    if (typeof globalThis !== 'undefined' && 'speechSynthesis' in globalThis) {
      return (globalThis as any).speechSynthesis;
    }
    return undefined;
  }

  private initVoices(): void {
    const synth = this.getSpeechSynthesis();
    if (!synth) return;

    const load = () => {
      try {
        const v = synth.getVoices();
        if (v && v.length > 0) {
          this.voices = v;
          this.voicesLoaded = true;
        }
      } catch (e) {
        console.warn('[SpeechService] Failed to load browser voices:', e);
      }
    };

    load();
    if (typeof synth.onvoiceschanged !== 'undefined') {
      synth.onvoiceschanged = () => {
        load();
      };
    }
  }

  public areVoicesLoaded(): boolean {
    return this.voicesLoaded;
  }

  public getActiveUtterance(): SpeechSynthesisUtterance | null {
    return this.activeChunkUtterance;
  }

  public getLocaleForLanguage(langCode: AppLanguageCode): string {
    return this.localeMap[langCode] || 'en-IN';
  }

  /**
   * Immediately stops any active audio playback, whether from backend Cloud TTS or browser SpeechSynthesis.
   * Completely clears utterance queues and prevents overlapping voices.
   */
  public stop(): void {
    // Abort pending backend synthesis request
    if (this.abortController) {
      try {
        this.abortController.abort();
      } catch {
        // Ignore abort errors
      }
      this.abortController = null;
    }

    // Stop HTML5 audio element
    if (this.currentAudio) {
      try {
        this.currentAudio.pause();
        this.currentAudio.currentTime = 0;
        this.currentAudio.src = '';
      } catch {
        // Ignore audio cleanup errors
      }
      this.currentAudio = null;
    }

    // Stop Web Speech Synthesis
    const synth = this.getSpeechSynthesis();
    if (synth) {
      try {
        synth.cancel();
      } catch (e) {
        console.warn('[SpeechService] Speech cancellation error:', e);
      }
    }

    this.activeChunkUtterance = null;
    this.isSpeakingActive = false;
  }

  public cancel(): void {
    this.stop();
  }

  public isSpeaking(): boolean {
    const synth = this.getSpeechSynthesis();
    const isSynthSpeaking = Boolean(synth && (synth.speaking || synth.pending));
    const isAudioPlaying = Boolean(this.currentAudio && !this.currentAudio.paused && !this.currentAudio.ended);
    return this.isSpeakingActive || isSynthSpeaking || isAudioPlaying;
  }

  public isPlaying(): boolean {
    return this.isSpeaking();
  }

  /**
   * Intelligently selects the highest quality, calm female voice for the target locale.
   * Gives strong priority to natural, neural, and female-tagged voices across all 6 Indian languages.
   */
  public findBestVoiceForLocale(locale: string): SpeechSynthesisVoice | null {
    if (!this.voices || this.voices.length === 0) {
      const synth = this.getSpeechSynthesis();
      if (synth) {
        this.voices = synth.getVoices();
        if (this.voices && this.voices.length > 0) {
          this.voicesLoaded = true;
        }
      }
    }

    if (!this.voices || this.voices.length === 0) return null;

    const lowerTarget = locale.toLowerCase();
    const primaryLang = lowerTarget.split('-')[0];

    // Language keywords for name and ISO code matching
    const langKeywords: Record<string, string[]> = {
      hi: ['hi', 'hin', 'hindi', 'हिन्दी'],
      pa: ['pa', 'pan', 'punjabi', 'gurmukhi', 'ਪੰਜਾਬੀ'],
      bn: ['bn', 'ben', 'bengali', 'bangla', 'বাংলা'],
      ta: ['ta', 'tam', 'tamil', 'தமிழ்'],
      or: ['or', 'ori', 'ory', 'odia', 'oriya', 'ଓଡ଼ିଆ'],
      en: ['en', 'eng', 'english'],
    };

    const femaleKeywords = [
      'female', 'woman', 'girl', 'zira', 'kalpana', 'geeta', 'shruti', 'swara',
      'veena', 'priya', 'natural', 'neural', 'heera', 'kavya', 'sunita', 'ananya',
      'madhur', 'vani', 'aditi', 'lekha', 'neerja', 'sangeeta', 'deepa', 'aoede',
    ];

    const maleKeywords = [
      'male', 'man', 'boy', 'david', 'mark', 'george', 'ravi', 'hemant',
      'madhav', 'pradeep', 'karan', 'valluvar', 'kumar',
    ];

    const targetKeywords = langKeywords[primaryLang] || [primaryLang];

    // Filter candidate voices that match target language
    const candidateVoices = this.voices.filter(v => {
      const vLang = (v.lang || '').toLowerCase().replace(/_/g, '-');
      const vName = (v.name || '').toLowerCase();

      // Guard: Never match English voices when target is Indic
      if (primaryLang !== 'en' && (vLang.startsWith('en') || vName.includes('english'))) {
        return false;
      }

      // Check exact locale or language match
      if (vLang === lowerTarget || vLang.startsWith(primaryLang + '-') || vLang === primaryLang) {
        return true;
      }

      // Check target keywords in name or lang tag
      return targetKeywords.some(kw => vLang.includes(kw) || vName.includes(kw));
    });

    if (candidateVoices.length === 0) return null;

    // Helper to score voices for calm female preference
    const scoreVoice = (v: SpeechSynthesisVoice): number => {
      const vLang = (v.lang || '').toLowerCase().replace(/_/g, '-');
      const vName = (v.name || '').toLowerCase();
      let score = 0;

      // Locale exactness
      if (vLang === lowerTarget) score += 50;
      else if (vLang.startsWith(primaryLang)) score += 30;

      // Female preference
      const isFemale = femaleKeywords.some(kw => vName.includes(kw));
      const isMale = maleKeywords.some(kw => vName.includes(kw));

      if (isFemale) score += 60;
      if (isMale) score -= 80;

      // Quality bonuses
      if (vName.includes('neural') || vName.includes('natural') || vName.includes('online')) score += 20;
      if (v.localService) score += 5; // Low latency

      return score;
    };

    // Sort descending by score
    const sorted = [...candidateVoices].sort((a, b) => scoreVoice(b) - scoreVoice(a));
    return sorted[0] || null;
  }

  public hasNativeVoiceForLanguage(langCode: AppLanguageCode): boolean {
    const locale = this.getLocaleForLanguage(langCode);
    return Boolean(this.findBestVoiceForLocale(locale));
  }

  /**
   * Splits a long story or text into manageable paragraph chunks for seamless continuous speech.
   * Resolves the known browser bug where SpeechSynthesis abruptly cuts off audio after ~15 seconds.
   */
  private splitTextIntoChunks(text: string): string[] {
    const clean = text.trim();
    if (!clean) return [];

    // Split on double newlines (paragraphs) first
    const paragraphs = clean.split(/\n\s*\n/).map(p => p.trim()).filter(Boolean);
    if (paragraphs.length > 1) {
      return paragraphs;
    }

    // If single paragraph is very long (> 200 chars), split on sentence boundaries
    if (clean.length > 200) {
      const sentences = clean.match(/[^.!?]+[.!?]+(\s|$)|[^.!?]+$/g);
      if (sentences && sentences.length > 1) {
        const chunks: string[] = [];
        let currentChunk = '';
        for (const s of sentences) {
          if ((currentChunk + ' ' + s).trim().length > 180) {
            if (currentChunk.trim()) chunks.push(currentChunk.trim());
            currentChunk = s;
          } else {
            currentChunk = (currentChunk + ' ' + s).trim();
          }
        }
        if (currentChunk.trim()) chunks.push(currentChunk.trim());
        return chunks.length > 0 ? chunks : [clean];
      }
    }

    return [clean];
  }

  /**
   * Internal Web Speech synthesis fallback with sequential paragraph chaining.
   */
  private speakViaWebSpeech(
    text: string,
    options?: SpeechSpeakOptions
  ): SpeechSpeakResult {
    const synth = this.getSpeechSynthesis();
    if (!synth) {
      return {
        spoken: false,
        hasNativeVoice: false,
        provider: 'fallback',
        message: i18n.t('voice.speechUnavailable'),
      };
    }

    const langCode = options?.langCode || i18n.getCurrentLanguage();
    const locale = this.getLocaleForLanguage(langCode);
    const mode = options?.mode || 'story';
    const modeSettings = MODE_AUDIO_SETTINGS[mode] || MODE_AUDIO_SETTINGS.story;

    // Guard: Never read pure English text with an Indic voice
    if (langCode !== 'en') {
      const isPureEnglish = /^[a-zA-Z0-9\s.,!?'"()\-:;]+$/.test(text.trim());
      if (isPureEnglish && text.trim().length > 0) {
        console.warn(`[SpeechService] Refusing to speak English text "${text}" with non-English locale ${locale}`);
        return {
          spoken: false,
          hasNativeVoice: false,
          provider: 'fallback',
          message: i18n.t('voice.noNativeVoice', { lang: i18n.getLanguageMeta(langCode).nativeName }),
        };
      }
    }

    const voice = this.findBestVoiceForLocale(locale);
    const hasNativeVoice = Boolean(voice);

    if (this.voicesLoaded && this.voices.length > 0 && !hasNativeVoice && langCode !== 'en') {
      return {
        spoken: false,
        hasNativeVoice: false,
        provider: 'fallback',
        message: i18n.t('voice.noNativeVoice', { lang: i18n.getLanguageMeta(langCode).nativeName }),
      };
    }

    const chunks = this.splitTextIntoChunks(text);
    if (chunks.length === 0) return { spoken: false, hasNativeVoice: false };

    this.isSpeakingActive = true;
    if (options?.onStart) options.onStart();

    let chunkIndex = 0;

    const speakNextChunk = () => {
      if (!this.isSpeakingActive) return;

      if (chunkIndex >= chunks.length) {
        this.isSpeakingActive = false;
        this.activeChunkUtterance = null;
        if (options?.onEnd) options.onEnd();
        return;
      }

      const chunkText = chunks[chunkIndex++];
      const utterance = typeof SpeechSynthesisUtterance !== 'undefined'
        ? new SpeechSynthesisUtterance(chunkText)
        : ({ text: chunkText, lang: locale } as any);

      utterance.lang = locale;
      utterance.rate = options?.rate || modeSettings.rate;
      utterance.pitch = options?.pitch || modeSettings.pitch;

      if (voice) {
        utterance.voice = voice;
      }

      utterance.onend = () => {
        // Natural pause between chunks
        if (chunkIndex < chunks.length) {
          setTimeout(speakNextChunk, modeSettings.paragraphPauseMs);
        } else {
          this.isSpeakingActive = false;
          this.activeChunkUtterance = null;
          if (options?.onEnd) options.onEnd();
        }
      };

      utterance.onerror = (e: any) => {
        console.warn('[SpeechService] Utterance error:', e);
        this.isSpeakingActive = false;
        this.activeChunkUtterance = null;
        if (options?.onError) options.onError(e);
      };

      this.activeChunkUtterance = utterance;
      try {
        synth.speak(utterance);
      } catch (err) {
        console.warn('[SpeechService] Synthesis speak error:', err);
        this.isSpeakingActive = false;
        this.activeChunkUtterance = null;
        if (options?.onError) options.onError(err);
      }
    };

    speakNextChunk();

    return {
      spoken: true,
      hasNativeVoice,
      provider: 'web_speech',
      message: hasNativeVoice
        ? undefined
        : i18n.t('voice.noNativeVoice', { lang: i18n.getLanguageMeta(langCode).nativeName }),
    };
  }

  /**
   * Dual-tier speech generation:
   * 1. Attempts backend high-definition female voice synthesis via /api/voice/synthesize (Google Cloud TTS / Gemini Aoede).
   * 2. Seamlessly falls back to client Web Speech API with calm female voice configuration.
   *
   * Returns immediately with SpeechSpeakResult for backward compatibility, while initiating playback.
   */
  public speak(
    text: string,
    options?: SpeechSpeakOptions
  ): SpeechSpeakResult {
    if (!text || text.trim() === '') {
      return { spoken: false, hasNativeVoice: false };
    }

    const synth = this.getSpeechSynthesis();
    if (!synth && typeof window === 'undefined') {
      return {
        spoken: false,
        hasNativeVoice: false,
        provider: 'fallback',
        message: i18n.t('voice.speechUnavailable'),
      };
    }

    const langCode = options?.langCode || i18n.getCurrentLanguage();
    const locale = this.getLocaleForLanguage(langCode);

    // Guard: Never read pure English text with an Indic voice
    if (langCode !== 'en') {
      const isPureEnglish = /^[a-zA-Z0-9\s.,!?'"()\-:;]+$/.test(text.trim());
      if (isPureEnglish && text.trim().length > 0) {
        console.warn(`[SpeechService] Refusing to speak English text "${text}" with non-English locale ${locale}`);
        return {
          spoken: false,
          hasNativeVoice: false,
          provider: 'fallback',
          message: i18n.t('voice.noNativeVoice', { lang: i18n.getLanguageMeta(langCode).nativeName }),
        };
      }
    }

    const voice = this.findBestVoiceForLocale(locale);
    const hasNativeVoice = Boolean(voice);

    if (this.voicesLoaded && this.voices.length > 0 && !hasNativeVoice && langCode !== 'en') {
      return {
        spoken: false,
        hasNativeVoice: false,
        provider: 'fallback',
        message: i18n.t('voice.noNativeVoice', { lang: i18n.getLanguageMeta(langCode).nativeName }),
      };
    }

    // Always stop previous speech
    this.stop();

    // In a real browser environment with HTML5 Audio element support, attempt backend Cloud TTS
    if (
      typeof window !== 'undefined' &&
      typeof Audio !== 'undefined' &&
      options?.preferCloud !== false &&
      (typeof navigator === 'undefined' || navigator.onLine)
    ) {
      const mode = options?.mode || 'story';
      const settings = MODE_AUDIO_SETTINGS[mode] || MODE_AUDIO_SETTINGS.story;
      const rate = options?.rate || settings.rate;
      const pitch = options?.pitch || settings.pitch;

      const cacheKey = `${langCode}_${mode}_${text.trim()}`;
      const cached = this.clientAudioCache.get(cacheKey);
      if (cached) {
        this.playBase64Audio(cached.audioContent, cached.mimeType, options);
        return {
          spoken: true,
          hasNativeVoice: true,
          provider: 'google_cloud_tts',
        };
      }

      this.abortController = new AbortController();
      const signal = this.abortController.signal;

      if (options?.onLoading) options.onLoading(true);

      fetch('/api/voice/synthesize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          language: langCode,
          mode,
          speakingRate: rate,
          pitch,
        }),
        signal,
      })
        .then(async res => {
          if (options?.onLoading) options.onLoading(false);
          if (!res.ok) {
            throw new Error(`TTS API returned status ${res.status}`);
          }
          return res.json();
        })
        .then(data => {
          if (signal.aborted) return;
          if (data.success && data.audioContent) {
            if (this.clientAudioCache.size >= 100) {
              const first = this.clientAudioCache.keys().next().value;
              if (first) this.clientAudioCache.delete(first);
            }
            this.clientAudioCache.set(cacheKey, {
              audioContent: data.audioContent,
              mimeType: data.mimeType || 'audio/mp3',
            });

            this.playBase64Audio(data.audioContent, data.mimeType || 'audio/mp3', options);
          } else {
            this.speakViaWebSpeech(text, options);
          }
        })
        .catch(err => {
          if (signal.aborted) return;
          if (options?.onLoading) options.onLoading(false);
          console.warn('[SpeechService] Cloud synthesis fetch failed, falling back:', err);
          this.speakViaWebSpeech(text, options);
        });

      return {
        spoken: true,
        hasNativeVoice: true,
        provider: 'google_cloud_tts',
      };
    }

    // Default / Web Speech execution (including Node test environment where SpeechSynthesis is polyfilled)
    return this.speakViaWebSpeech(text, options);
  }

  /**
   * Plays a base64 encoded audio string via HTML5 Audio element.
   */
  private playBase64Audio(
    audioContent: string,
    mimeType: string,
    options?: SpeechSpeakOptions
  ): void {
    try {
      const audioUrl = `data:${mimeType};base64,${audioContent}`;
      const audio = new Audio(audioUrl);
      this.currentAudio = audio;
      this.isSpeakingActive = true;

      audio.onplay = () => {
        if (options?.onStart) options.onStart();
      };

      audio.onended = () => {
        this.isSpeakingActive = false;
        this.currentAudio = null;
        if (options?.onEnd) options.onEnd();
      };

      audio.onerror = (e) => {
        console.warn('[SpeechService] HTML5 Audio playback error, falling back:', e);
        this.isSpeakingActive = false;
        this.currentAudio = null;
        if (options?.onError) options.onError(e);
      };

      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.catch(err => {
          console.warn('[SpeechService] Audio play() promise rejected:', err);
          this.isSpeakingActive = false;
          this.currentAudio = null;
          if (options?.onError) options.onError(err);
        });
      }
    } catch (err) {
      console.warn('[SpeechService] playBase64Audio instantiation error:', err);
      this.isSpeakingActive = false;
      this.currentAudio = null;
      if (options?.onError) options.onError(err);
    }
  }

  /**
   * Async variant of speak that allows awaiting completion if needed.
   */
  public async speakAsync(
    text: string,
    options?: SpeechSpeakOptions
  ): Promise<SpeechSpeakResult> {
    return new Promise(resolve => {
      const origOnEnd = options?.onEnd;
      const origOnError = options?.onError;

      const opts: SpeechSpeakOptions = {
        ...options,
        onEnd: () => {
          if (origOnEnd) origOnEnd();
          resolve({ spoken: true, hasNativeVoice: true });
        },
        onError: (e) => {
          if (origOnError) origOnError(e);
          resolve({ spoken: false, hasNativeVoice: false, message: String(e) });
        },
      };

      this.speak(text, opts);
    });
  }

  public startSpeechRecognition(
    langCode: AppLanguageCode,
    callbacks: {
      onResult: (transcript: string) => void;
      onError: (errorText: string) => void;
      onStart?: () => void;
    }
  ): { stop: () => void } | null {
    if (typeof window === 'undefined') return null;

    const win = window as unknown as {
      SpeechRecognition?: any;
      webkitSpeechRecognition?: any;
    };
    const SR = win.SpeechRecognition || win.webkitSpeechRecognition;

    if (!SR) {
      callbacks.onError(i18n.t('voice.notSupported'));
      return null;
    }

    try {
      const recognition = new SR();
      recognition.lang = this.getLocaleForLanguage(langCode);
      recognition.continuous = false;
      recognition.interimResults = false;

      recognition.onstart = () => {
        if (callbacks.onStart) callbacks.onStart();
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results?.[0]?.[0]?.transcript || '';
        callbacks.onResult(transcript);
      };

      recognition.onerror = () => {
        callbacks.onError(i18n.t('voice.couldNotHear'));
      };

      recognition.start();

      return {
        stop: () => {
          try {
            recognition.stop();
          } catch {
            // Ignore
          }
        },
      };
    } catch {
      callbacks.onError(i18n.t('voice.notSupported'));
      return null;
    }
  }
}

export const speechService = SpeechService.getInstance();
