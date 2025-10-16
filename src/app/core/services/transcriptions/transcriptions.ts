import { Injectable, inject } from '@angular/core';
import { HttpParams } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { Api, ApiResponse } from '../api/api';
import { CreateJobConfig } from '../../integrations/speechmatics/types';
import { LANGUAGES } from '../../integrations/speechmatics/constants';

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
  metadata: any | null;
  isDeleted: boolean;
  deletedAt: string | null;
}

export interface TranscriptionStatus {
  id: number;
  name: string;
  description: string;
}

export const TRANSCRIPTION_STATUSES: TranscriptionStatus[] = [
  { id: 2, name: 'Completado', description: 'Transcripción finalizada' },
  // Agregar más estados cuando los conozcamos
];

export interface ListParams {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: string;
}

// Endpoints
const TRANSCRIPTION_ENDPOINTS = {
  USER_JOBS: (userId: string) =>
    `/api/transcription/${encodeURIComponent(userId)}/jobs`,
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
      return response.filter((job) => !job.isDeleted);
    }

    // Si no es array, intentar acceder a la propiedad data
    const data = (response as ApiResponse<TranscriptionJob[]>).data;

    if (Array.isArray(data)) {
      // Filtrar transcripciones no eliminadas
      return data.filter((job) => !job.isDeleted);
    }

    return [];
  }

  /**
   * Create a new transcription job
   * Sends multipart/form-data: { file, config(JSON) }
   * Do NOT set Content-Type manually; the browser will set the proper boundary.
   */
  async createJob(
    userId: string,
    config: CreateJobConfig,
    file: File
  ): Promise<any> {
    const formData = new FormData();
    formData.append('userId', userId);
    formData.append('config', JSON.stringify(config));
    formData.append('audioFile', file, file.name);

    const endpoint = '/api/transcription/create-job';
    const response = await firstValueFrom(
      this.api.post<any>(endpoint, formData)
    );

    // Support both wrapped and raw responses
    const data = (response as ApiResponse<any>).data;
    return data !== undefined ? data : response;
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
  formatFileSize(bytes: string): string {
    const size = parseInt(bytes);
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
}
