/**
 * Types and interfaces for transcription services
 */

export interface TranscriptionJob {
  id: string;
  createdAt: string;
  updatedAt: string;
  userId: string;
  referenceId: string;
  title: string;
  originalFilename: string;
  filePath: string;
  fileSize: string;
  durationSeconds: number;
  language: string;
  statusId: number;
  transcriptionText: string | null;
  confidenceScore: number | null;
  wordCount: number | null;
  processingStartedAt: string | null;
  processingCompletedAt: string | null;
  errorMessage: string | null;
  metadata: Record<string, unknown> | null;
  isDeleted: boolean;
  deletedAt: string | null;
}

export interface TranscriptionStatus {
  id: number;
  name: string;
  description: string;
}

export const TRANSCRIPTION_STATUSES: TranscriptionStatus[] = [
  { id: 2, name: 'Pendiente', description: 'Transcripción pendiente' },
  { id: 3, name: 'Completado', description: 'Transcripción completada' },
  { id: 4, name: 'Error', description: 'Error en la transcripción' },
];

export interface ListParams {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: string;
}

/**
 * Response type for creating a new transcription job.
 * Contains only the fields returned immediately after job creation.
 */
export type CreateJobResponse = Pick<
  TranscriptionJob,
  | 'id'
  | 'referenceId'
  | 'title'
  | 'originalFilename'
  | 'filePath'
  | 'fileSize'
  | 'durationSeconds'
  | 'language'
  | 'statusId'
  | 'createdAt'
  | 'updatedAt'
  | 'userId'
>;

// Speechmatics transcript response interfaces
export interface TranscriptAlternative {
  confidence: number;
  content: string;
  language: string;
  speaker: string;
}

export interface TranscriptResult {
  alternatives: TranscriptAlternative[];
  end_time: number;
  start_time: number;
  type: 'word' | 'punctuation';
  attaches_to?: 'previous' | 'next';
  is_eos?: boolean;
}

export interface TranscriptResponse {
  format: string;
  job: {
    created_at: string;
    data_name: string;
    duration: number;
    id: string;
  };
  metadata: {
    created_at: string;
    language_pack_info: {
      adapted: boolean;
      itn: boolean;
      language_description: string;
      word_delimiter: string;
      writing_direction: string;
    };
    orchestrator_version: string;
    transcription_config: {
      language: string;
      operating_point: string;
    };
    type: string;
  };
  results: TranscriptResult[];
}

