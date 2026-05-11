import { TestBed } from '@angular/core/testing';

import { TranscriptionPollingFallbackService } from './transcription-polling-fallback';
import { Transcriptions } from '../transcriptions/transcriptions';

const pendingJob = {
  id: 'job-1',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  userId: 'user-1',
  referenceId: 'ref-1',
  title: 'Audio pendiente',
  originalFilename: 'audio.mp3',
  filePath: 'uploads/audio.mp3',
  fileSize: '1024',
  durationSeconds: 10,
  language: 'es',
  statusId: 2,
  transcriptionText: null,
  confidenceScore: null,
  wordCount: null,
  processingStartedAt: null,
  processingCompletedAt: null,
  errorMessage: null,
  metadata: null,
  isDeleted: false,
  deletedAt: null,
};

describe('TranscriptionPollingFallbackService', () => {
  let service: TranscriptionPollingFallbackService;
  let transcriptionsMock: {
    listUserJobs: jest.Mock;
  };

  beforeEach(() => {
    transcriptionsMock = {
      listUserJobs: jest.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        {
          provide: Transcriptions,
          useValue: transcriptionsMock,
        },
      ],
    });

    service = TestBed.inject(TranscriptionPollingFallbackService);
  });

  afterEach(() => {
    service.stop();
  });

  it('should emit completed when a pending job becomes done', async () => {
    const received: unknown[] = [];
    service.events$.subscribe((event) => received.push(event));
    transcriptionsMock.listUserJobs
      .mockResolvedValueOnce([pendingJob])
      .mockResolvedValueOnce([{ ...pendingJob, statusId: 3 }]);

    service.start('user-1');
    await Promise.resolve();
    await service.pollOnce();

    expect(received).toEqual([
      {
        type: 'completed',
        jobId: 'job-1',
        transcriptionId: 'ref-1',
        title: 'Audio pendiente',
      },
    ]);
  });

  it('should emit failed when a pending job becomes failed', async () => {
    const received: unknown[] = [];
    service.events$.subscribe((event) => received.push(event));
    transcriptionsMock.listUserJobs
      .mockResolvedValueOnce([pendingJob])
      .mockResolvedValueOnce([{ ...pendingJob, statusId: 4, errorMessage: 'rejected' }]);

    service.start('user-1');
    await Promise.resolve();
    await service.pollOnce();

    expect(received).toEqual([
      {
        type: 'failed',
        jobId: 'job-1',
        transcriptionId: 'ref-1',
        status: 'rejected',
        title: 'Audio pendiente',
      },
    ]);
  });

  it('should emit canceled when a pending job becomes canceled', async () => {
    const received: unknown[] = [];
    service.events$.subscribe((event) => received.push(event));
    transcriptionsMock.listUserJobs
      .mockResolvedValueOnce([pendingJob])
      .mockResolvedValueOnce([{ ...pendingJob, statusId: 5, errorMessage: 'Canceled by user' }]);

    service.start('user-1');
    await Promise.resolve();
    await service.pollOnce();

    expect(received).toEqual([
      {
        type: 'canceled',
        jobId: 'job-1',
        transcriptionId: 'ref-1',
        title: 'Audio pendiente',
      },
    ]);
  });
});
