import type { AppLanguageCode, SupportedLanguage } from '../types/auth';

export type TtsVoiceMode = 'story' | 'instruction' | 'pronunciation' | 'question' | 'encouragement' | 'explanation';

export interface SynthesizeSpeechRequest {
  text: string;
  language?: SupportedLanguage | AppLanguageCode | string;
  mode?: TtsVoiceMode;
  voiceDirection?: string;
  speakingRate?: number;
  pitch?: number;
}

export interface SynthesizeSpeechResult {
  success: boolean;
  audioContent?: string; // base64 encoded audio
  mimeType?: string;
  provider?: 'google_cloud_tts' | 'gemini_tts' | 'fallback';
  voiceName?: string;
  locale?: string;
  mode?: TtsVoiceMode;
  cached?: boolean;
  error?: string;
}

export const CALM_FEMALE_VOICE_DIRECTION =
  'Speak in a soft, warm and natural female voice. Use a gentle storytelling style, as if reading a beautiful story to a young child. Be expressive, caring and reassuring without sounding overly dramatic. Maintain a comfortable, slightly slower pace. Pronounce every word clearly and naturally. Use gentle variations in pitch and emotion to make storytelling engaging. Pause naturally at commas and full stops. Make the listener feel comfortable, encouraged and interested.';

/**
 * Standard female voice configuration for Google Cloud Text-to-Speech across the 6 supported languages.
 * Prioritizes Google Neural2 and WaveNet female voices for natural, soothing, authentic native pronunciation.
 */
export const GOOGLE_CLOUD_FEMALE_VOICES: Record<AppLanguageCode, {
  locale: string;
  primaryVoice: string;
  fallbackVoice: string;
  ssmlGender: 'FEMALE';
}> = {
  en: {
    locale: 'en-IN',
    primaryVoice: 'en-IN-Neural2-A', // Soft, natural, maternal Indian English
    fallbackVoice: 'en-IN-Wavenet-A',
    ssmlGender: 'FEMALE',
  },
  hi: {
    locale: 'hi-IN',
    primaryVoice: 'hi-IN-Neural2-A', // Warm, expressive Hindi female
    fallbackVoice: 'hi-IN-Wavenet-D',
    ssmlGender: 'FEMALE',
  },
  pa: {
    locale: 'pa-IN',
    primaryVoice: 'pa-IN-Wavenet-A', // Authentic Gurmukhi Punjabi female
    fallbackVoice: 'pa-IN-Standard-A',
    ssmlGender: 'FEMALE',
  },
  bn: {
    locale: 'bn-IN',
    primaryVoice: 'bn-IN-Wavenet-A', // Gentle, melodic Bengali female
    fallbackVoice: 'bn-IN-Standard-A',
    ssmlGender: 'FEMALE',
  },
  ta: {
    locale: 'ta-IN',
    primaryVoice: 'ta-IN-Wavenet-A', // Authentic Tamil female
    fallbackVoice: 'ta-IN-Standard-A',
    ssmlGender: 'FEMALE',
  },
  or: {
    locale: 'or-IN',
    primaryVoice: 'or-IN-Standard-A', // Native Odia female
    fallbackVoice: 'or-IN-Standard-B',
    ssmlGender: 'FEMALE',
  },
};

/**
 * Mode-specific pacing and pitch configurations for warm, gentle storytelling.
 */
export const MODE_AUDIO_SETTINGS: Record<TtsVoiceMode, {
  speakingRate: number;
  pitch: number;
  paragraphBreakMs: number;
}> = {
  story: {
    speakingRate: 0.86, // Slightly slower than conversational speech for gentle storytelling
    pitch: 0.5,         // Slightly warmer, soothing pitch
    paragraphBreakMs: 400, // Natural pause between story paragraphs
  },
  instruction: {
    speakingRate: 0.82, // Calm, slow and clear for young readers
    pitch: 0.0,
    paragraphBreakMs: 300,
  },
  pronunciation: {
    speakingRate: 0.74, // Slower, crystal-clear articulation for phonetic accuracy
    pitch: 0.0,
    paragraphBreakMs: 200,
  },
  question: {
    speakingRate: 0.84, // Clear delivery with natural post-question reflection pause
    pitch: 0.4,
    paragraphBreakMs: 350,
  },
  encouragement: {
    speakingRate: 0.88, // Warm, positive, celebratory without exaggerated excitement
    pitch: 1.0,
    paragraphBreakMs: 250,
  },
  explanation: {
    speakingRate: 0.84, // Patient, friendly teacher-like delivery
    pitch: 0.2,
    paragraphBreakMs: 350,
  },
};

/**
 * In-memory LRU audio cache to avoid redundant API calls and latency.
 */
const audioCache = new Map<string, { audioContent: string; mimeType: string; voiceName: string; locale: string }>();
const MAX_CACHE_SIZE = 120;

function computeCacheKey(text: string, locale: string, mode: string): string {
  return `${locale}_${mode}_${text.trim()}`;
}

export function normalizeLanguageToCode(input?: string): AppLanguageCode {
  if (!input) return 'en';
  const clean = input.trim().toLowerCase();
  if (clean === 'hi' || clean.startsWith('hi-') || clean === 'hindi' || clean === 'हिन्दी') return 'hi';
  if (clean === 'pa' || clean.startsWith('pa-') || clean === 'punjabi' || clean === 'gurmukhi' || clean === 'ਪੰਜਾਬੀ') return 'pa';
  if (clean === 'bn' || clean.startsWith('bn-') || clean === 'bengali' || clean === 'bangla' || clean === 'বাংলা') return 'bn';
  if (clean === 'ta' || clean.startsWith('ta-') || clean === 'tamil' || clean === 'தமிழ்') return 'ta';
  if (clean === 'or' || clean.startsWith('or-') || clean === 'odia' || clean === 'oriya' || clean === 'ଓଡ଼ିଆ') return 'or';
  return 'en';
}

/**
 * Builds clean SSML markup with natural paragraph pauses and intonation.
 */
export function buildSsml(text: string, mode: TtsVoiceMode): string {
  const settings = MODE_AUDIO_SETTINGS[mode] || MODE_AUDIO_SETTINGS.story;
  // Clean special characters for valid SSML
  const safeText = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // Split into paragraphs to inject natural pauses
  const paragraphs = safeText
    .split(/\n\s*\n/)
    .map(p => p.trim())
    .filter(Boolean);

  if (paragraphs.length <= 1) {
    if (mode === 'question') {
      return `<speak><p>${safeText}</p><break time="${settings.paragraphBreakMs}ms"/></speak>`;
    }
    return `<speak><p>${safeText}</p></speak>`;
  }

  const ssmlBody = paragraphs
    .map(p => `<p>${p}</p>`)
    .join(`<break time="${settings.paragraphBreakMs}ms"/>`);

  return `<speak>${ssmlBody}</speak>`;
}

/**
 * Handles speech synthesis using Google Cloud Text-to-Speech API or Gemini Audio API,
 * providing a soft, warm female voice in all 6 Indian languages.
 */
export async function handleSynthesizeSpeech(
  req: SynthesizeSpeechRequest,
  apiKey?: string,
  fetchFn: typeof fetch = fetch
): Promise<SynthesizeSpeechResult> {
  const text = (req.text || '').trim();
  if (!text) {
    return { success: false, error: 'Text parameter is required for speech synthesis.' };
  }

  const langCode = normalizeLanguageToCode(req.language);
  const voiceConfig = GOOGLE_CLOUD_FEMALE_VOICES[langCode] || GOOGLE_CLOUD_FEMALE_VOICES.en;
  const mode = req.mode || 'story';
  const settings = MODE_AUDIO_SETTINGS[mode] || MODE_AUDIO_SETTINGS.story;
  const rate = req.speakingRate || settings.speakingRate;
  const pitch = req.pitch !== undefined ? req.pitch : settings.pitch;

  // Check cache first
  const cacheKey = computeCacheKey(text, voiceConfig.locale, mode);
  const cachedItem = audioCache.get(cacheKey);
  if (cachedItem) {
    return {
      success: true,
      audioContent: cachedItem.audioContent,
      mimeType: cachedItem.mimeType,
      provider: 'google_cloud_tts',
      voiceName: cachedItem.voiceName,
      locale: cachedItem.locale,
      mode,
      cached: true,
    };
  }

  const resolvedKey =
    (apiKey && apiKey.trim() !== '' && !apiKey.includes('placeholder'))
      ? apiKey.trim()
      : (typeof process !== 'undefined' && process.env?.GOOGLE_TTS_API_KEY && !process.env.GOOGLE_TTS_API_KEY.includes('placeholder'))
        ? process.env.GOOGLE_TTS_API_KEY.trim()
        : (typeof process !== 'undefined' && process.env?.GEMINI_API_KEY && !process.env.GEMINI_API_KEY.includes('placeholder'))
          ? process.env.GEMINI_API_KEY.trim()
          : (typeof process !== 'undefined' && process.env?.GOOGLE_API_KEY && !process.env.GOOGLE_API_KEY.includes('placeholder'))
            ? process.env.GOOGLE_API_KEY.trim()
            : undefined;

  // If no external key is configured, return fallback signal for client Web Speech API
  if (!resolvedKey) {
    return {
      success: false,
      provider: 'fallback',
      locale: voiceConfig.locale,
      voiceName: voiceConfig.primaryVoice,
      mode,
      error: 'Google Cloud TTS API key not configured on backend. Client female voice engine active.',
    };
  }

  // Attempt 1: Google Cloud Text-to-Speech API
  try {
    const ssml = buildSsml(text, mode);
    const googleTtsEndpoint = `https://texttospeech.googleapis.com/v1/text:synthesize?key=${encodeURIComponent(resolvedKey)}`;

    const ttsPayload = {
      input: { ssml },
      voice: {
        languageCode: voiceConfig.locale,
        name: voiceConfig.primaryVoice,
        ssmlGender: voiceConfig.ssmlGender,
      },
      audioConfig: {
        audioEncoding: 'MP3',
        speakingRate: rate,
        pitch,
        effectsProfileId: ['small-bluetooth-speaker-class-device'], // Optimized for clear voice playback
      },
    };

    const res = await fetchFn(googleTtsEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(ttsPayload),
    });

    if (res.ok) {
      const data = (await res.json()) as { audioContent?: string };
      if (data.audioContent && typeof data.audioContent === 'string' && data.audioContent.length > 50) {
        if (audioCache.size >= MAX_CACHE_SIZE) {
          const firstKey = audioCache.keys().next().value;
          if (firstKey) audioCache.delete(firstKey);
        }
        audioCache.set(cacheKey, {
          audioContent: data.audioContent,
          mimeType: 'audio/mp3',
          voiceName: voiceConfig.primaryVoice,
          locale: voiceConfig.locale,
        });

        return {
          success: true,
          audioContent: data.audioContent,
          mimeType: 'audio/mp3',
          provider: 'google_cloud_tts',
          voiceName: voiceConfig.primaryVoice,
          locale: voiceConfig.locale,
          mode,
          cached: false,
        };
      }
    } else {
      console.warn(`[Google TTS] Response failed (${res.status}):`, await res.text().catch(() => ''));
    }
  } catch (err) {
    console.warn('[Google TTS] Network/API error, attempting Gemini audio fallback:', err);
  }

  // Attempt 2: Gemini Audio generation with calm storytelling prompt
  try {
    const geminiEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${encodeURIComponent(resolvedKey)}`;
    const prompt = `${req.voiceDirection || CALM_FEMALE_VOICE_DIRECTION}\n\nRead the following text in ${voiceConfig.locale}:\n"${text}"`;

    const geminiPayload = {
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: {
              voiceName: 'Aoede', // Gentle, calm female voice
            },
          },
        },
      },
    };

    const geminiRes = await fetchFn(geminiEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(geminiPayload),
    });

    if (geminiRes.ok) {
      const gData = (await geminiRes.json()) as any;
      const part = gData?.candidates?.[0]?.content?.parts?.[0];
      const audioData = part?.inlineData?.data;
      const mime = part?.inlineData?.mimeType || 'audio/wav';

      if (audioData && typeof audioData === 'string' && audioData.length > 50) {
        audioCache.set(cacheKey, {
          audioContent: audioData,
          mimeType: mime,
          voiceName: 'Aoede (Gemini Female)',
          locale: voiceConfig.locale,
        });

        return {
          success: true,
          audioContent: audioData,
          mimeType: mime,
          provider: 'gemini_tts',
          voiceName: 'Aoede (Gemini Female)',
          locale: voiceConfig.locale,
          mode,
          cached: false,
        };
      }
    }
  } catch (geminiErr) {
    console.warn('[Gemini TTS] Fallback error:', geminiErr);
  }

  // Graceful fallback to client Web Speech engine
  return {
    success: false,
    provider: 'fallback',
    locale: voiceConfig.locale,
    voiceName: voiceConfig.primaryVoice,
    mode,
    error: 'Backend audio synthesis unavailable. Seamlessly using calm female Web Speech synthesis.',
  };
}
