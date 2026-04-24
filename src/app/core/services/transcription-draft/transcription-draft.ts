import { Injectable } from '@angular/core';

export interface TranscriptionDraftData {
  jobId: string;
  originalText: string;
  editedText: string;
  updatedAt: number;
}

@Injectable({ providedIn: 'root' })
export class TranscriptionDraftService {
  private readonly keyPrefix = 'transcription.draft.';

  load(jobId: string): TranscriptionDraftData | null {
    try {
      const rawValue = localStorage.getItem(this.storageKey(jobId));
      if (!rawValue) {
        return null;
      }

      const parsed = JSON.parse(rawValue) as Partial<TranscriptionDraftData>;
      if (
        typeof parsed?.jobId !== 'string' ||
        typeof parsed?.originalText !== 'string' ||
        typeof parsed?.editedText !== 'string' ||
        typeof parsed?.updatedAt !== 'number'
      ) {
        return null;
      }

      return parsed as TranscriptionDraftData;
    } catch {
      return null;
    }
  }

  save(jobId: string, originalText: string, editedText: string): TranscriptionDraftData {
    const draft: TranscriptionDraftData = {
      jobId,
      originalText,
      editedText,
      updatedAt: Date.now(),
    };

    localStorage.setItem(this.storageKey(jobId), JSON.stringify(draft));
    return draft;
  }

  clear(jobId: string): void {
    localStorage.removeItem(this.storageKey(jobId));
  }

  private storageKey(jobId: string): string {
    return `${this.keyPrefix}${jobId}`;
  }
}
