// Speechmatics domain types

export type OperatingPoint = 'standard' | 'enhanced';

// Keep language code flexible; Speechmatics uses ISO639-1/3 and some bilingual codes
export type LanguageCode = string;

export interface CreateJobConfig {
  type: 'transcription';
  transcription_config: {
    language: LanguageCode;
    operating_point?: OperatingPoint;
    // Additional vendor options supported by backend
    [key: string]: unknown;
  } & Record<string, unknown>;
  [key: string]: unknown;
}


