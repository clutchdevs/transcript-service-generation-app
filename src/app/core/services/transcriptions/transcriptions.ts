import { Injectable, inject } from '@angular/core';
import { HttpParams } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { Api, ApiResponse } from '../api/api';
import { CreateJobConfig } from '../../integrations/speechmatics/types';
import { LANGUAGES } from '../../integrations/speechmatics/constants';
import {
  TranscriptionJob,
  TranscriptionStatus,
  TRANSCRIPTION_STATUSES,
  ListParams,
  CreateJobResponse,
  DeleteJobResponse,
  TranscriptResponse,
  SaveEditedTranscriptRequest,
  SaveEditedTranscriptResponse,
} from './transcriptions.types';

// Endpoints
const TRANSCRIPTION_ENDPOINTS = {
  USER_JOBS: (userId: string) =>
    `/api/transcription/${encodeURIComponent(userId)}/jobs`,
  JOB: (jobId: string) =>
    `/api/transcription/jobs/${encodeURIComponent(jobId)}`,
  JOB_TRANSCRIPT: (jobId: string) =>
    `/api/transcription/jobs/${encodeURIComponent(jobId)}/transcript`,
  JOB_CANCEL: (jobId: string) =>
    `/api/transcription/jobs/${encodeURIComponent(jobId)}/cancel`,
  JOB_EDITED_TRANSCRIPT: (jobId: string) =>
    `/api/transcription/jobs/${encodeURIComponent(jobId)}/edited-transcript`,
} as const;

@Injectable({
  providedIn: 'root',
})
export class Transcriptions {
  private api = inject(Api);

  /**
   * List transcription jobs for a user
   */
  async listUserJobs(
    userId: string,
    params?: ListParams
  ): Promise<TranscriptionJob[]> {
    const httpParams = params
      ? new HttpParams({
          fromObject: Object.fromEntries(
            Object.entries(params)
              .filter(([, v]) => v !== undefined && v !== null)
              .map(([k, v]) => [k, String(v)])
          ),
        })
      : undefined;

    const endpoint = TRANSCRIPTION_ENDPOINTS.USER_JOBS(userId);
    const response = await firstValueFrom(
      this.api.get<TranscriptionJob[]>(endpoint, httpParams)
    );

    // Verificar si la respuesta es directamente un array
    if (Array.isArray(response)) {
      return this.normalizeJobs(response).filter((job) => !this.isDeleted(job));
    }

    // Si no es array, intentar acceder a la propiedad data
    const data = (response as ApiResponse<TranscriptionJob[]>).data;

    if (Array.isArray(data)) {
      // Filtrar transcripciones no eliminadas
      return this.normalizeJobs(data).filter((job) => !this.isDeleted(job));
    }

    return [];
  }

  async getJobById(jobId: string): Promise<TranscriptionJob> {
    const endpoint = TRANSCRIPTION_ENDPOINTS.JOB(jobId);
    const response = await firstValueFrom(
      this.api.get<TranscriptionJob>(endpoint)
    );

    return this.unwrapJobResponse(response);
  }

  /**
   * Create a new transcription job
   * Sends multipart/form-data: { file, config(JSON) }
   * Do NOT set Content-Type manually; the browser will set the proper boundary.
   * @returns The created transcription job data
   */
  async createJob(config: CreateJobConfig, file: File): Promise<CreateJobResponse> {
    const formData = new FormData();
    formData.append('config', JSON.stringify(config));
    formData.append('audioFile', file, file.name);

    const endpoint = '/api/transcription/create-job';
    const response = await firstValueFrom(
      this.api.post<CreateJobResponse>(endpoint, formData)
    );

    // Support both wrapped and raw responses
    const data = (response as ApiResponse<CreateJobResponse>).data;
    if (data !== undefined) {
      return this.normalizeJob(data) as CreateJobResponse;
    }
    // If response is not wrapped, assume it's the job data directly
    return this.normalizeJob(response as unknown as CreateJobResponse) as CreateJobResponse;
  }

  async deleteJob(jobId: string): Promise<DeleteJobResponse> {
    const endpoint = TRANSCRIPTION_ENDPOINTS.JOB(jobId);
    const response = await firstValueFrom(
      this.api.delete<DeleteJobResponse>(endpoint)
    );

    const data = (response as ApiResponse<DeleteJobResponse>).data;
    return data ?? (response as unknown as DeleteJobResponse);
  }

  async updateJobTitle(jobId: string, title: string): Promise<TranscriptionJob> {
    const endpoint = TRANSCRIPTION_ENDPOINTS.JOB(jobId);
    const response = await firstValueFrom(
      this.api.patch<TranscriptionJob>(endpoint, { title })
    );

    return this.unwrapJobResponse(response);
  }

  async cancelJob(jobId: string): Promise<TranscriptionJob> {
    const endpoint = TRANSCRIPTION_ENDPOINTS.JOB_CANCEL(jobId);
    const response = await firstValueFrom(
      this.api.post<TranscriptionJob>(endpoint, {})
    );

    return this.unwrapJobResponse(response);
  }

  async saveEditedTranscript(
    jobId: string,
    payload: SaveEditedTranscriptRequest,
  ): Promise<SaveEditedTranscriptResponse> {
    const endpoint = TRANSCRIPTION_ENDPOINTS.JOB_EDITED_TRANSCRIPT(jobId);
    const response = await firstValueFrom(
      this.api.put<SaveEditedTranscriptResponse>(endpoint, payload)
    );

    return (response as ApiResponse<SaveEditedTranscriptResponse>).data
      ?? (response as unknown as SaveEditedTranscriptResponse);
  }

  /**
   * Get transcript for a specific job
   * @param jobId - The referenceId of the job
   * @returns The transcript text extracted from Speechmatics format
   */
  async getJobTranscript(jobId: string): Promise<string> {
    const data = await this.getJobTranscriptData(jobId);

    // Extract text from results array
    if (!data?.results || !Array.isArray(data.results)) {
      return '';
    }

    // Build transcript text from results
    let transcript = '';
    for (const result of data.results) {
      if (result.alternatives && result.alternatives.length > 0) {
        const content = result.alternatives[0].content;

        // Handle punctuation that attaches to previous word (no space before)
        if (result.type === 'punctuation' && result.attaches_to === 'previous') {
          transcript += content;
        } else {
          // Add space before word/punctuation if transcript is not empty
          if (transcript.length > 0 && !transcript.endsWith(' ')) {
            transcript += ' ';
          }
          transcript += content;
        }
      }
    }

    return transcript.trim();
  }

  async getJobTranscriptData(jobId: string): Promise<TranscriptResponse> {
    const endpoint = TRANSCRIPTION_ENDPOINTS.JOB_TRANSCRIPT(jobId);
    const response = await firstValueFrom(
      this.api.get<TranscriptResponse>(endpoint)
    );

    // Check if response is wrapped in ApiResponse
    let data: TranscriptResponse;
    if ('data' in response && response.data) {
      data = response.data as TranscriptResponse;
    } else {
      data = response as unknown as TranscriptResponse;
    }

    return data;
  }

  /**
   * Get status name by status ID
   */
  getStatusName(statusId: number): string {
    const status = TRANSCRIPTION_STATUSES.find((s) => s.id === statusId);
    return status?.name || `Estado ${statusId}`;
  }

  /**
   * Format file size from bytes to human readable
   */
  formatFileSize(bytes: string | number): string {
    const size = typeof bytes === 'number' ? bytes : parseInt(bytes, 10);
    if (!Number.isFinite(size)) return '0 B';
    if (size === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(size) / Math.log(k));
    return parseFloat((size / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  /**
   * Format duration from seconds to human readable
   */
  formatDuration(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs
        .toString()
        .padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  }

  /**
   * Get language name by language code
   */
  getLanguageName(languageCode: string): string {
    // Buscar en la lista de idiomas de Speechmatics
    const language = LANGUAGES.find(lang => lang.value === languageCode);
    return language?.label || languageCode.toUpperCase();
  }

  private unwrapJobResponse(response: ApiResponse<TranscriptionJob> | TranscriptionJob): TranscriptionJob {
    const data = (response as ApiResponse<TranscriptionJob>).data;
    return this.normalizeJob(data ?? (response as TranscriptionJob));
  }

  private normalizeJobs(jobs: TranscriptionJob[]): TranscriptionJob[] {
    return jobs.map((job) => this.normalizeJob(job));
  }

  private normalizeJob<T extends { fileSize: string | number; isDeleted?: boolean; deletedAt?: string | null }>(job: T): T {
    return {
      ...job,
      isDeleted: job.isDeleted ?? Boolean(job.deletedAt),
      fileSize: typeof job.fileSize === 'number' ? String(job.fileSize) : job.fileSize,
    };
  }

  private isDeleted(job: TranscriptionJob): boolean {
    return Boolean(job.isDeleted || job.deletedAt);
  }
}
