// Speechmatics domain types

export type OperatingPoint = 'standard' | 'enhanced';

// Keep language code flexible; Speechmatics uses ISO639-1/3 and some bilingual codes
export type LanguageCode = string;

export type SummaryContentType = 'auto' | 'informative' | 'conversational';
export type SummaryLength = 'brief' | 'detailed';
export type SummaryType = 'paragraphs' | 'bullets';

export interface SummarizationConfig {
  content_type?: SummaryContentType;
  summary_length?: SummaryLength;
  summary_type?: SummaryType;
}

export interface TranslationConfig {
  target_languages: LanguageCode[];
}

export interface CreateJobConfig {
  type: 'transcription';
  transcription_config: {
    language: LanguageCode;
    operating_point?: OperatingPoint;
    // Additional vendor options supported by backend
    [key: string]: unknown;
  } & Record<string, unknown>;
  summarization_config?: SummarizationConfig;
  translation_config?: TranslationConfig;
  [key: string]: unknown;
}


