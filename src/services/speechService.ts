import type { AppLanguageCode } from '../types/auth';
import { i18n } from '../i18n';

export interface SpeechSpeakOptions {
  langCode?: AppLanguageCode;
  rate?: number;
  pitch?: number;
  onEnd?: () => void;
  onError?: (err: any) => void;
}

export class SpeechService {
  private static instance: SpeechService;
  private voices: SpeechSynthesisVoice[] = [];
  private voicesLoaded: boolean = false;

  private localeMap: Record<AppLanguageCode, string> = {
    en: 'en-IN',
    hi: 'hi-IN',
    or: 'or-IN',
    pa: 'pa-IN',
    ta: 'ta-IN',
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
        console.warn('Failed to load voices:', e);
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

  public getLocaleForLanguage(langCode: AppLanguageCode): string {
    return this.localeMap[langCode] || 'en-IN';
  }

  public stop(): void {
    const synth = this.getSpeechSynthesis();
    if (synth) {
      try {
        synth.cancel();
      } catch (e) {
        console.warn('Speech cancellation error:', e);
      }
    }
  }

  public cancel(): void {
    this.stop();
  }

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
      or: ['or', 'ori', 'ory', 'odia', 'oriya', 'ଓଡ଼ିଆ'],
      pa: ['pa', 'pan', 'punjabi', 'gurmukhi', 'ਪੰਜਾਬੀ'],
      ta: ['ta', 'tam', 'tamil', 'தமிழ்'],
      en: ['en', 'eng', 'english'],
    };

    const targetKeywords = langKeywords[primaryLang] || [primaryLang];

    // 1. Exact match on BCP-47 locale (e.g. 'hi-IN', 'ta-IN')
    const exact = this.voices.find(v => {
      const vLang = (v.lang || '').toLowerCase().replace('_', '-');
      return vLang === lowerTarget;
    });
    if (exact) return exact;

    // 2. Primary language tag match (e.g. 'hi', 'ta', 'pa', 'or') on v.lang
    const langMatch = this.voices.find(v => {
      const vLang = (v.lang || '').toLowerCase().replace('_', '-');
      return vLang.startsWith(primaryLang + '-') || vLang === primaryLang;
    });
    if (langMatch) return langMatch;

    // 3. Match against language aliases / keywords in v.lang or v.name
    const keywordMatch = this.voices.find(v => {
      const vLang = (v.lang || '').toLowerCase();
      const vName = (v.name || '').toLowerCase();
      // Ensure we don't accidentally match English voices when looking for Indic languages
      if (primaryLang !== 'en' && (vLang.startsWith('en') || vName.includes('english'))) {
        return false;
      }
      return targetKeywords.some(kw => vLang.includes(kw) || vName.includes(kw));
    });
    if (keywordMatch) return keywordMatch;

    return null;
  }

  public hasNativeVoiceForLanguage(langCode: AppLanguageCode): boolean {
    const locale = this.getLocaleForLanguage(langCode);
    return Boolean(this.findBestVoiceForLocale(locale));
  }

  public speak(
    text: string,
    options?: SpeechSpeakOptions
  ): { spoken: boolean; hasNativeVoice: boolean; message?: string } {
    const synth = this.getSpeechSynthesis();
    if (!synth) {
      return {
        spoken: false,
        hasNativeVoice: false,
        message: i18n.t('voice.speechUnavailable'),
      };
    }

    if (!text || text.trim() === '') {
      return { spoken: false, hasNativeVoice: false };
    }

    this.stop();

    const langCode = options?.langCode || i18n.getCurrentLanguage();
    const locale = this.getLocaleForLanguage(langCode);

    // Guard: Never read pure English words with a Hindi/Odia/Punjabi/Tamil locale
    if (langCode !== 'en') {
      const isPureEnglish = /^[a-zA-Z0-9\s.,!?'"()\-:;]+$/.test(text.trim());
      if (isPureEnglish && text.trim().length > 0) {
        console.warn(`[SpeechService] Refusing to speak English text "${text}" with non-English locale ${locale}`);
        return {
          spoken: false,
          hasNativeVoice: false,
          message: i18n.t('voice.noNativeVoice', { lang: i18n.getLanguageMeta(langCode).nativeName }),
        };
      }
    }

    const voice = this.findBestVoiceForLocale(locale);
    const hasNativeVoice = Boolean(voice);

    // If voices are loaded in the browser and no native voice exists for a non-English language,
    // do not use an unrelated English voice as a silent fallback.
    if (this.voicesLoaded && this.voices.length > 0 && !voice && langCode !== 'en') {
      return {
        spoken: false,
        hasNativeVoice: false,
        message: i18n.t('voice.noNativeVoice', { lang: i18n.getLanguageMeta(langCode).nativeName }),
      };
    }

    const utterance = typeof SpeechSynthesisUtterance !== 'undefined'
      ? new SpeechSynthesisUtterance(text)
      : ({ text, lang: locale } as any);

    utterance.lang = locale;
    utterance.rate = options?.rate || 0.82;
    utterance.pitch = options?.pitch || 1.0;

    if (voice) {
      utterance.voice = voice;
    }

    if (options?.onEnd) {
      utterance.onend = () => options.onEnd!();
    }
    if (options?.onError) {
      utterance.onerror = (e: any) => options.onError!(e);
    }

    try {
      synth.speak(utterance);
      return {
        spoken: true,
        hasNativeVoice,
        message: hasNativeVoice
          ? undefined
          : i18n.t('voice.noNativeVoice', { lang: i18n.getLanguageMeta(langCode).nativeName }),
      };
    } catch (err) {
      console.warn('Speech synthesis speak error:', err);
      return {
        spoken: false,
        hasNativeVoice,
        message: i18n.t('voice.speechUnavailable'),
      };
    }
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
