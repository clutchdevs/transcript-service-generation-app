export type TranscriptionRealtimeEvent =
  | {
      type: 'completed';
      jobId: string;
      transcriptionId: string;
      title?: string;
    }
  | {
      type: 'failed';
      jobId: string;
      transcriptionId: string;
      status?: string;
      title?: string;
    }
  | {
      type: 'updated';
      jobId: string;
      transcriptionId?: string;
      statusId?: number;
      title?: string;
    }
  | {
      type: 'deleted';
      jobId: string;
      transcriptionId?: string;
    }
  | {
      type: 'canceled';
      jobId: string;
      transcriptionId?: string;
      title?: string;
    };

export type TranscriptionRealtimeStatus =
  | 'idle'
  | 'connecting'
  | 'connected'
  | 'unavailable'
  | 'disconnected'
  | 'error';

export interface RealtimeTokenResponse {
  token: string;
  expiresAt: number;
}
