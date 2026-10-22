import type { InteractiveActivityContent, ActivityDifficulty } from '../types/adaptive';
import { getDeterministicActivity } from '../worker/aiHandler.ts';

export class AiActivityService {
  private static instance: AiActivityService;

  private constructor() {}

  public static getInstance(): AiActivityService {
    if (!AiActivityService.instance) {
      AiActivityService.instance = new AiActivityService();
    }
    return AiActivityService.instance;
  }

  /**
   * Fetches an adaptive interactive activity tailored to skill, level, and preferences.
   * If offline or API fails, returns an instant rich fallback activity safely in the requested learning language.
   */
  public async generateActivity(params: {
    skillId: string;
    difficulty: ActivityDifficulty;
    language: string;
    childName?: string;
    interest?: string;
    targetPattern?: string;
    variant?: number;
  }): Promise<InteractiveActivityContent> {
    try {
      const endpoint =
        typeof window !== 'undefined'
          ? '/api/ai/generate-activity'
          : 'http://localhost:5173/api/ai/generate-activity';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(params),
      });

      if (res.ok) {
        const data = (await res.json()) as { success: boolean; activity: InteractiveActivityContent };
        if (data.success && data.activity) {
          return data.activity;
        }
      }
    } catch {
      // Graceful local deterministic fallback if network or endpoint is offline
    }

    // Client-side fallback if network or endpoint fails completely
    return getDeterministicActivity(params);
  }
}
