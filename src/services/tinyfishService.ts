import type {
  ResourceSearchParams,
  TinyFishSearchResponse,
} from '../types/tinyfish';

export class TinyFishService {
  private static instance: TinyFishService;

  private constructor() {}

  public static getInstance(): TinyFishService {
    if (!TinyFishService.instance) {
      TinyFishService.instance = new TinyFishService();
    }
    return TinyFishService.instance;
  }

  /**
   * Check whether the TinyFish API is configured on the backend server / Vercel.
   */
  public async checkStatus(): Promise<{ configured: boolean; status: string }> {
    try {
      const res = await fetch('/api/tinyfish/status', {
        headers: { Accept: 'application/json' },
      });
      if (!res.ok) {
        return { configured: false, status: `HTTP ${res.status}` };
      }
      const data = (await res.json()) as { configured?: boolean; status?: string };
      return {
        configured: Boolean(data.configured),
        status: data.status || 'ok',
      };
    } catch {
      return { configured: false, status: 'offline' };
    }
  }

  /**
   * Search for educational resources via the backend TinyFish endpoint.
   */
  public async searchResources(params: ResourceSearchParams): Promise<TinyFishSearchResponse> {
    try {
      const res = await fetch('/api/tinyfish/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(params),
      });

      const data = (await res.json()) as TinyFishSearchResponse;
      return data;
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Network error communicating with resource finder service.';
      return {
        success: false,
        configured: false,
        query: params.topic || '',
        totalResults: 0,
        resources: [],
        error: message,
        disclaimer:
          'Educational Suggestion: Resources are retrieved from publicly accessible educational sources for learning practice. Accessibility or dyslexia adaptation has not been clinically evaluated by DyslexiMate.',
      };
    }
  }
}
