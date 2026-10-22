import type { AppLanguageCode, SupportedLanguage } from '../types/auth';
import type { LanguageMeta, TranslationSchema } from './types';
import { en } from './locales/en';
import { hi } from './locales/hi';
import { or } from './locales/or';
import { pa } from './locales/pa';
import { ta } from './locales/ta';

export const SUPPORTED_LANGUAGES: LanguageMeta[] = [
  {
    code: 'en',
    prefix: 'EG',
    nativeName: 'English',
    englishName: 'English',
    supportedLanguageName: 'English',
    speechLocale: 'en-IN',
    flag: '🇬🇧',
  },
  {
    code: 'hi',
    prefix: 'HN',
    nativeName: 'हिन्दी',
    englishName: 'Hindi',
    supportedLanguageName: 'Hindi',
    speechLocale: 'hi-IN',
    flag: '🇮🇳',
  },
  {
    code: 'or',
    prefix: 'OD',
    nativeName: 'ଓଡ଼ିଆ',
    englishName: 'Odia',
    supportedLanguageName: 'Odia',
    speechLocale: 'or-IN',
    flag: '🇮🇳',
  },
  {
    code: 'pa',
    prefix: 'PB',
    nativeName: 'ਪੰਜਾਬੀ',
    englishName: 'Punjabi',
    supportedLanguageName: 'Punjabi',
    speechLocale: 'pa-IN',
    flag: '🇮🇳',
  },
  {
    code: 'ta',
    prefix: 'TM',
    nativeName: 'தமிழ்',
    englishName: 'Tamil',
    supportedLanguageName: 'Tamil',
    speechLocale: 'ta-IN',
    flag: '🇮🇳',
  },
];

const TRANSLATIONS: Record<AppLanguageCode, TranslationSchema> = {
  en,
  hi,
  or,
  pa,
  ta,
};

const STORAGE_KEY = 'dysleximate_interface_lang_v1';

export class I18nService {
  private static instance: I18nService;
  private currentLanguage: AppLanguageCode = 'en';
  private listeners: Array<(lang: AppLanguageCode) => void> = [];

  private constructor() {
    this.currentLanguage = this.loadSavedGuestLanguage() || 'en';
    this.applyDocumentAttributes();
  }

  public static getInstance(): I18nService {
    if (!I18nService.instance) {
      I18nService.instance = new I18nService();
    }
    return I18nService.instance;
  }

  public getSupportedLanguages(): LanguageMeta[] {
    return [...SUPPORTED_LANGUAGES];
  }

  public getCurrentLanguage(): AppLanguageCode {
    return this.currentLanguage;
  }

  public getCurrentMeta(): LanguageMeta {
    return this.getLanguageMeta(this.currentLanguage);
  }

  public getLanguageMeta(code: AppLanguageCode = this.currentLanguage): LanguageMeta {
    return (
      SUPPORTED_LANGUAGES.find(l => l.code === code) || SUPPORTED_LANGUAGES[0]
    );
  }

  public codeToSupportedLanguage(codeOrLang: string): SupportedLanguage {
    const code = this.supportedLanguageToCode(codeOrLang);
    const meta = SUPPORTED_LANGUAGES.find(l => l.code === code);
    return meta ? meta.supportedLanguageName : 'English';
  }

  public codeToSpeechLocale(codeOrLang: string): string {
    const code = this.supportedLanguageToCode(codeOrLang);
    const meta = SUPPORTED_LANGUAGES.find(l => l.code === code);
    return meta ? meta.speechLocale : 'en-IN';
  }

  public supportedLanguageToCode(lang: SupportedLanguage | string): AppLanguageCode {
    const normalized = (lang || '').trim().toLowerCase();
    if (normalized.startsWith('hi') || normalized.includes('hindi')) return 'hi';
    if (normalized.startsWith('or') || normalized.includes('odia') || normalized.includes('oriya')) return 'or';
    if (normalized.startsWith('pa') || normalized.includes('punjabi') || normalized.includes('gurmukhi')) return 'pa';
    if (normalized.startsWith('ta') || normalized.includes('tamil')) return 'ta';
    return 'en';
  }

  /**
   * Resolves the initial interface language following the requirement order:
   * 1. Authenticated user's saved preference
   * 2. Guest's saved preference (local storage)
   * 3. Child's preferred language when appropriate
   * 4. English ('en')
   */
  public resolveInitialLanguage(params?: {
    authenticatedUserLang?: string;
    childPreferredLang?: string;
    guestSavedLang?: string;
  }): AppLanguageCode {
    // 1. Authenticated user's saved preference
    if (params?.authenticatedUserLang) {
      const code = this.supportedLanguageToCode(params.authenticatedUserLang);
      this.currentLanguage = code;
      this.applyDocumentAttributes();
      return code;
    }

    // 2. Guest's saved preference in localStorage or params
    const guestParam = params?.guestSavedLang ? this.supportedLanguageToCode(params.guestSavedLang) : null;
    const saved = guestParam || this.loadSavedGuestLanguage();
    if (saved) {
      this.currentLanguage = saved;
      this.applyDocumentAttributes();
      return saved;
    }

    // 3. Child's preferred language when appropriate
    if (params?.childPreferredLang) {
      const code = this.supportedLanguageToCode(params.childPreferredLang);
      this.currentLanguage = code;
      this.applyDocumentAttributes();
      return code;
    }

    // 4. Default: English
    this.currentLanguage = 'en';
    this.applyDocumentAttributes();
    return 'en';
  }

  public async setLanguage(
    newLang: AppLanguageCode,
    options?: { persistUserCallback?: (langCode: AppLanguageCode) => Promise<void> }
  ): Promise<void> {
    if (!SUPPORTED_LANGUAGES.some(l => l.code === newLang)) {
      console.warn(`Unsupported language code: ${newLang}. Falling back to 'en'.`);
      newLang = 'en';
    }

    // Stop any ongoing speech synthesis immediately when changing language
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch (err) {
        console.warn('Failed to cancel speech synthesis on language change:', err);
      }
    }

    this.currentLanguage = newLang;
    this.saveGuestLanguage(newLang);
    this.applyDocumentAttributes();

    if (options?.persistUserCallback) {
      try {
        await options.persistUserCallback(newLang);
      } catch (e) {
        console.warn('Failed to persist language preference for authenticated user:', e);
      }
    }

    this.notifyListeners();
  }

  public onLanguageChanged(listener: (lang: AppLanguageCode) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notifyListeners(): void {
    for (const listener of this.listeners) {
      try {
        listener(this.currentLanguage);
      } catch (err) {
        console.error('Error in language change listener:', err);
      }
    }
  }

  private applyDocumentAttributes(): void {
    if (typeof document !== 'undefined' && document.documentElement) {
      document.documentElement.lang = this.currentLanguage;
      document.documentElement.dir = 'ltr';
    }
  }

  private loadSavedGuestLanguage(): AppLanguageCode | null {
    if (typeof localStorage === 'undefined') return null;
    try {
      const code = localStorage.getItem(STORAGE_KEY) || localStorage.getItem('dysleximate_lang');
      if (code && SUPPORTED_LANGUAGES.some(l => l.code === code)) {
        return code as AppLanguageCode;
      }
    } catch {
      // LocalStorage unavailable
    }
    return null;
  }

  private saveGuestLanguage(code: AppLanguageCode): void {
    if (typeof localStorage === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_KEY, code);
      localStorage.setItem('dysleximate_lang', code);
    } catch {
      // Ignore storage write failure
    }
  }

  /**
   * Retrieves translation string by dotted path (e.g. 'auth.login.title' or 'nav.myHome').
   * Supports interpolation like '{name}' or '{count}'.
   * Detects missing keys and provides informative fallback without silent English UI in non-English.
   */
  public t(path: string, params?: Record<string, string | number>): string {
    const keys = path.split('.');
    const activeDict = TRANSLATIONS[this.currentLanguage];
    let val: any = activeDict;

    for (const k of keys) {
      if (val && typeof val === 'object' && k in val) {
        val = val[k];
      } else {
        val = undefined;
        break;
      }
    }

    if (typeof val !== 'string') {
      // Missing translation detection - do not silently produce English UI
      console.warn(`[i18n] Missing translation key for '${this.currentLanguage}': ${path}`);
      return `[MISSING: ${path}]`;
    }

    if (params) {
      let str = val as string;
      for (const [pKey, pVal] of Object.entries(params)) {
        str = str.replace(new RegExp(`\\{${pKey}\\}`, 'g'), String(pVal));
      }
      return str;
    }

    return val as string;
  }

  /**
   * Retrieves translation string by dotted path for an explicit language code,
   * keeping the parent interface language independent of the child's learning language.
   */
  public tForLang(langCode: AppLanguageCode, path: string, params?: Record<string, string | number>): string {
    const keys = path.split('.');
    const activeDict = TRANSLATIONS[langCode] || TRANSLATIONS.en;
    let val: any = activeDict;

    for (const k of keys) {
      if (val && typeof val === 'object' && k in val) {
        val = val[k];
      } else {
        val = undefined;
        break;
      }
    }

    if (typeof val !== 'string') {
      return `[MISSING: ${path}]`;
    }

    if (params) {
      let str = val as string;
      for (const [pKey, pVal] of Object.entries(params)) {
        str = str.replace(new RegExp(`\\{${pKey}\\}`, 'g'), String(pVal));
      }
      return str;
    }

    return val as string;
  }

  /**
   * Generates accessible HTML for language dropdown with native script names:
   * English, हिन्दी, ଓଡ଼ିଆ, ਪੰਜਾਬੀ, தமிழ்.
   */
  public renderLanguageSelect(options: {
    id: string;
    label?: string;
    className?: string;
    showLabel?: boolean;
    current?: AppLanguageCode;
  }): string {
    const currentCode = options.current || this.currentLanguage;
    const selectHtml = `
      <select id="${options.id}" class="${options.className || 'lang-selector-dropdown'}" aria-label="${options.label || 'Select Interface Language'}">
        ${SUPPORTED_LANGUAGES.map(
          l => `<option value="${l.code}" ${l.code === currentCode ? 'selected' : ''}>${l.prefix} ${l.nativeName}</option>`
        ).join('')}
      </select>
    `;

    if (options.showLabel) {
      return `
        <div class="lang-select-wrapper">
          <label for="${options.id}">${options.label || 'Language / भाषा'}</label>
          ${selectHtml}
        </div>
      `;
    }

    return selectHtml;
  }
}

export const i18n = I18nService.getInstance();
export const t = (path: string, params?: Record<string, string | number>) => i18n.t(path, params);
export const tForLang = (langCode: AppLanguageCode, path: string, params?: Record<string, string | number>) =>
  i18n.tForLang(langCode, path, params);
