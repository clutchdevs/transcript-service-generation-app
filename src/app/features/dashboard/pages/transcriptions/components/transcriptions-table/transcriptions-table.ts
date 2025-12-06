import { Component, Input, Output, EventEmitter, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Button } from '../../../../../../shared/components/ui/button/button';
import { TranscriptionJob } from '../../../../../../core/services/transcriptions/transcriptions.types';
import { Transcriptions as TranscriptionsService } from '../../../../../../core/services/transcriptions/transcriptions';

@Component({
  selector: 'app-transcriptions-table',
  standalone: true,
  imports: [CommonModule, Button],
  templateUrl: './transcriptions-table.html',
  styleUrl: './transcriptions-table.scss'
})
export class TranscriptionsTable {
  @Input() jobs: TranscriptionJob[] = [];

  private transcriptionsService = inject(TranscriptionsService);

  @Output() viewJob = new EventEmitter<TranscriptionJob>();
  @Output() deleteJob = new EventEmitter<TranscriptionJob>();

  formatFileSize(bytes: string): string {
    return this.transcriptionsService.formatFileSize(bytes);
  }

  formatDuration(seconds: number): string {
    return this.transcriptionsService.formatDuration(seconds);
  }

  getStatusName(statusId: number): string {
    return this.transcriptionsService.getStatusName(statusId);
  }

  getLanguageName(languageCode: string): string {
    return this.transcriptionsService.getLanguageName(languageCode);
  }

  onViewJob(job: TranscriptionJob): void {
    this.viewJob.emit(job);
  }

  onDeleteJob(job: TranscriptionJob): void {
    this.deleteJob.emit(job);
  }
}

