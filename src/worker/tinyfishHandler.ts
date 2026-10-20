import type {
  EducationalResource,
  ResourceSearchParams,
  ResourceType,
  TinyFishSearchResponse,
} from '../types/tinyfish';

export const MEDICAL_ACCESSIBILITY_DISCLAIMER =
  'Educational Suggestion: Resources are retrieved from publicly accessible educational sources for learning practice. Accessibility or dyslexia adaptation has not been clinically evaluated by DyslexiMate.';

interface TinyFishSearchResultItem {
  position: number;
  site_name?: string;
  title: string;
  snippet?: string;
  url: string;
}

interface TinyFishSearchApiResponse {
  query?: string;
  total_results?: number;
  page?: number;
  results?: TinyFishSearchResultItem[];
  error?: string;
}

/**
 * Validates and sanitizes search parameters from client.
 */
export function validateSearchParams(params: unknown): {
  valid: boolean;
  error?: string;
  sanitized?: ResourceSearchParams;
} {
  if (!params || typeof params !== 'object') {
    return { valid: false, error: 'Request body must be a JSON object.' };
  }

  const p = params as Record<string, unknown>;
  const rawTopic = typeof p.topic === 'string' ? p.topic.trim() : '';

  if (!rawTopic || rawTopic.length < 2) {
    return { valid: false, error: 'Please enter a learning topic with at least 2 characters.' };
  }

  if (rawTopic.length > 100) {
    return { valid: false, error: 'Learning topic is too long (maximum 100 characters).' };
  }

  // Prevent control characters or injection
  const topic = rawTopic.replace(/[\r\n\t]/g, ' ');

  const validTypes: ResourceType[] = [
    'any',
    'reading_exercise',
    'phonics_activity',
    'educational_game',
    'worksheet',
    'unspecified',
  ];

  const resourceType =
    typeof p.resourceType === 'string' && validTypes.includes(p.resourceType as ResourceType)
      ? (p.resourceType as ResourceType)
      : 'any';

  const grade = typeof p.grade === 'string' ? p.grade.trim().slice(0, 50) : undefined;
  const language = typeof p.language === 'string' ? p.language.trim().slice(0, 30) : 'English';

  return {
    valid: true,
    sanitized: {
      topic,
      grade: grade && grade !== 'any' ? grade : undefined,
      resourceType,
      language: language || 'English',
    },
  };
}

/**
 * Builds an educational search query optimized for public educational repositories.
 */
export function buildEducationalQuery(params: ResourceSearchParams): string {
  const parts: string[] = [params.topic];

  if (params.grade) {
    parts.push(params.grade);
  }

  if (params.resourceType && params.resourceType !== 'any') {
    const typeLabelMap: Record<ResourceType, string> = {
      reading_exercise: 'reading exercises',
      phonics_activity: 'phonics practice activities',
      educational_game: 'interactive learning game',
      worksheet: 'printable practice worksheet',
      any: '',
      unspecified: '',
    };
    const label = typeLabelMap[params.resourceType];
    if (label) parts.push(label);
  }

  if (params.language && params.language !== 'English') {
    parts.push(params.language);
  }

  // Focus on free educational learning resources
  parts.push('educational resource');

  return parts.join(' ').replace(/\s+/g, ' ').trim();
}

/**
 * Determines whether a URL is a valid, secure web link.
 */
export function isValidWebUrl(urlStr: string): boolean {
  try {
    const parsed = new URL(urlStr);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Infers a resource type classification from snippet / title text if not explicitly designated.
 */
function inferResourceType(title: string, snippet: string, requestedType?: ResourceType): ResourceType {
  if (requestedType && requestedType !== 'any') {
    return requestedType;
  }
  const combined = (title + ' ' + snippet).toLowerCase();
  if (combined.includes('game') || combined.includes('play') || combined.includes('interactive')) {
    return 'educational_game';
  }
  if (combined.includes('worksheet') || combined.includes('printable') || combined.includes('pdf')) {
    return 'worksheet';
  }
  if (combined.includes('phonic') || combined.includes('sound') || combined.includes('letter')) {
    return 'phonics_activity';
  }
  if (combined.includes('read') || combined.includes('story') || combined.includes('passage') || combined.includes('comprehension')) {
    return 'reading_exercise';
  }
  return 'unspecified';
}

/**
 * Core handler that executes the TinyFish search request and formats the response.
 */
export async function handleTinyFishSearch(
  params: ResourceSearchParams,
  apiKey?: string,
  fetchFn: typeof fetch = fetch
): Promise<TinyFishSearchResponse> {
  const query = buildEducationalQuery(params);

  // If TinyFish API key is missing on the server, report honest unconfigured state
  if (!apiKey || apiKey.trim() === '' || apiKey.includes('placeholder') || apiKey === 'your-tinyfish-api-key') {
    return {
      success: false,
      configured: false,
      query,
      totalResults: 0,
      resources: [],
      error:
        'TinyFish API key is not configured on the server. Please set TINYFISH_API_KEY in your Cloudflare Worker environment or server configuration.',
      disclaimer: MEDICAL_ACCESSIBILITY_DISCLAIMER,
    };
  }

  const endpoint = `https://api.search.tinyfish.ai?query=${encodeURIComponent(query)}&location=US`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000); // 15-second timeout

  try {
    const res = await fetchFn(endpoint, {
      method: 'GET',
      headers: {
        'X-API-Key': apiKey.trim(),
        'Accept': 'application/json',
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (res.status === 401 || res.status === 403) {
      return {
        success: false,
        configured: true,
        query,
        totalResults: 0,
        resources: [],
        error: 'TinyFish authentication failed. Please verify that TINYFISH_API_KEY is valid.',
        disclaimer: MEDICAL_ACCESSIBILITY_DISCLAIMER,
      };
    }

    if (res.status === 429) {
      return {
        success: false,
        configured: true,
        query,
        totalResults: 0,
        resources: [],
        error: 'TinyFish rate limit exceeded. Please wait a moment before trying again.',
        disclaimer: MEDICAL_ACCESSIBILITY_DISCLAIMER,
      };
    }

    if (!res.ok) {
      return {
        success: false,
        configured: true,
        query,
        totalResults: 0,
        resources: [],
        error: `TinyFish service returned error status ${res.status} (${res.statusText || 'Unknown'}).`,
        disclaimer: MEDICAL_ACCESSIBILITY_DISCLAIMER,
      };
    }

    const data = (await res.json()) as TinyFishSearchApiResponse;
    const rawResults = Array.isArray(data.results) ? data.results : [];

    const resources: EducationalResource[] = rawResults
      .filter(item => item && typeof item.url === 'string' && isValidWebUrl(item.url))
      .map((item, index) => {
        let siteName = item.site_name;
        if (!siteName) {
          try {
            siteName = new URL(item.url).hostname.replace(/^www\./, '');
          } catch {
            siteName = 'Educational Source';
          }
        }

        return {
          id: `tf-${index + 1}-${Date.now().toString(36)}`,
          title: item.title?.trim() || 'Untitled Educational Resource',
          url: item.url,
          siteName,
          summary: item.snippet?.trim() || 'Factual summary unavailable from source.',
          resourceType: inferResourceType(item.title || '', item.snippet || '', params.resourceType),
          gradeLevel: params.grade || null,
          language: params.language || 'English',
          verified: true,
          accessibilityNotes: 'Accessibility or dyslexia adaptation has not been clinically evaluated by DyslexiMate.',
        };
      });

    return {
      success: true,
      configured: true,
      query,
      totalResults: resources.length,
      resources,
      disclaimer: MEDICAL_ACCESSIBILITY_DISCLAIMER,
    };
  } catch (err: unknown) {
    clearTimeout(timeoutId);
    const isAbort = (err as Error)?.name === 'AbortError';
    const message = isAbort
      ? 'The TinyFish search request timed out after 15 seconds. Please try again with a more specific topic.'
      : (err as Error)?.message || 'Failed to connect to TinyFish service.';

    return {
      success: false,
      configured: true,
      query,
      totalResults: 0,
      resources: [],
      error: message,
      disclaimer: MEDICAL_ACCESSIBILITY_DISCLAIMER,
    };
  }
}
