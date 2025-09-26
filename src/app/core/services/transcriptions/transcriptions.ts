import { Injectable, inject } from '@angular/core';
import { HttpParams } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { Api, ApiResponse } from '../api/api';
import { CreateJobConfig } from '../../integrations/speechmatics/types';

export interface TranscriptionJob {
  id: string;
  status: string;
  createdAt: string;
  updatedAt?: string;
  fileName?: string;
  languageFrom?: string;
  languageTo?: string;
  [key: string]: unknown;
}

export interface ListParams {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: string;
}

// Endpoints
const TRANSCRIPTION_ENDPOINTS = {
  USER_JOBS: (userId: string) => `/api/transcription/${encodeURIComponent(userId)}/jobs`
} as const;


@Injectable({
  providedIn: 'root'
})
export class Transcriptions {
  private api = inject(Api);

  /**
   * List transcription jobs for a user
   */
  async listUserJobs(userId: string, params?: ListParams): Promise<TranscriptionJob[]> {
    const httpParams = params
      ? new HttpParams({ fromObject: Object.fromEntries(
          Object.entries(params).filter(([, v]) => v !== undefined && v !== null).map(([k, v]) => [k, String(v)])
        ) })
      : undefined;

    const endpoint = TRANSCRIPTION_ENDPOINTS.USER_JOBS(userId);
    const response = await firstValueFrom(this.api.get<TranscriptionJob[]>(endpoint, httpParams));

    const data = (response as ApiResponse<TranscriptionJob[]>).data;
    if (Array.isArray(data)) return data;

    return [];
  }

  /**
   * Create a new transcription job
   * Sends multipart/form-data: { file, config(JSON) }
   * Do NOT set Content-Type manually; the browser will set the proper boundary.
   */
  async createJob(file: File, config: CreateJobConfig): Promise<any> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('config', JSON.stringify(config));

    const endpoint = '/api/transcription/create-job';
    const response = await firstValueFrom(this.api.post<any>(endpoint, formData));

    // Support both wrapped and raw responses
    const data = (response as ApiResponse<any>).data;
    return data !== undefined ? data : response;
  }
}
