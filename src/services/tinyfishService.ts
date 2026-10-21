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

      const rawData = (await res.json()) as any;

      let errorMessage: string | undefined;
      if (typeof rawData?.error === 'string') {
        errorMessage = rawData.error;
      } else if (typeof rawData?.error === 'object' && rawData.error !== null) {
        errorMessage = rawData.error.message || rawData.error.code || JSON.stringify(rawData.error);
      } else if (!res.ok) {
        errorMessage = `TinyFish service returned error status ${res.status} (${res.statusText || 'Unknown'}).`;
      }

      return {
        success: Boolean(rawData?.success),
        configured: rawData?.configured !== undefined ? Boolean(rawData.configured) : (res.ok && !errorMessage),
        query: typeof rawData?.query === 'string' ? rawData.query : (params.topic || ''),
        totalResults: typeof rawData?.totalResults === 'number' ? rawData.totalResults : (Array.isArray(rawData?.resources) ? rawData.resources.length : 0),
        resources: Array.isArray(rawData?.resources) ? rawData.resources : [],
        error: errorMessage,
        disclaimer:
          typeof rawData?.disclaimer === 'string'
            ? rawData.disclaimer
            : 'Educational Suggestion: Resources are retrieved from publicly accessible educational sources for learning practice. Accessibility or dyslexia adaptation has not been clinically evaluated by DyslexiMate.',
      };
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
