import type { InteractiveActivityContent, ActivityDifficulty } from '../types/adaptive';

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
   * If offline or API fails, returns an instant rich fallback activity safely.
   */
  public async generateActivity(params: {
    skillId: string;
    difficulty: ActivityDifficulty;
    language: string;
    childName?: string;
    interest?: string;
    targetPattern?: string;
  }): Promise<InteractiveActivityContent> {
    try {
      const res = await fetch('/api/ai/generate-activity', {
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
    } catch (err) {
      console.warn('Network error fetching AI activity, using local fallback:', err);
    }

    // Client-side fallback if network or endpoint fails completely
    return {
      id: `act_client_fallback_${Date.now()}`,
      skillId: params.skillId,
      title: 'Sound Discovery Practice 🌟',
      instruction: 'Find the picture that matches the sound:',
      difficulty: params.difficulty,
      language: params.language,
      type: 'word_match',
      prompt: 'Which word matches the sound?',
      items: [
        { id: 'opt_1', text: 'Star', visual: '⭐', isCorrect: true, feedbackHint: 'Great job! 🌟' },
        { id: 'opt_2', text: 'Sun', visual: '☀️', isCorrect: false, feedbackHint: 'Nice try! Look closely.' },
      ],
      stepByStepHint: 'Take your time and listen closely to the word sound.',
    };
  }
}
