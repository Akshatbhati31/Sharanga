export type ResourceType =
  | 'any'
  | 'reading_exercise'
  | 'phonics_activity'
  | 'educational_game'
  | 'worksheet'
  | 'unspecified';

export interface EducationalResource {
  id: string;
  title: string;
  url: string;
  siteName: string;
  summary: string;
  resourceType: ResourceType;
  gradeLevel: string | null;
  language: string;
  verified: boolean;
  accessibilityNotes: string | null;
}

export interface ResourceSearchParams {
  topic: string;
  grade?: string;
  resourceType?: ResourceType;
  language?: string;
}

export interface TinyFishSearchResponse {
  success: boolean;
  configured: boolean;
  query: string;
  totalResults: number;
  resources: EducationalResource[];
  error?: string;
  disclaimer: string;
}
