import { TestBed } from '@angular/core/testing';
import { Subject } from 'rxjs';

import { TranscriptionEventsCoordinatorService } from './transcription-events-coordinator';
import { RealtimeTranscriptionsService } from './realtime-transcriptions';
import { TranscriptionPollingFallbackService } from './transcription-polling-fallback';
import { TranscriptionRealtimeEvent } from './transcription-events.types';
import { ToastService } from '../toast/toast';
import { TranscriptionJob } from '../transcriptions/transcriptions.types';

const pendingJob: TranscriptionJob = {
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

describe('TranscriptionEventsCoordinatorService', () => {
  let service: TranscriptionEventsCoordinatorService;
  let realtimeMock: {
    status: jest.Mock;
    events$: Subject<TranscriptionRealtimeEvent>;
    connect: jest.Mock;
    disconnect: jest.Mock;
  };
  let fallbackMock: {
    events$: Subject<TranscriptionRealtimeEvent>;
    start: jest.Mock;
    stop: jest.Mock;
    seedKnownJobs: jest.Mock;
  };

  beforeEach(() => {
    realtimeMock = {
      status: jest.fn().mockReturnValue('idle'),
      events$: new Subject<TranscriptionRealtimeEvent>(),
      connect: jest.fn(),
      disconnect: jest.fn(),
    };
    fallbackMock = {
      events$: new Subject<TranscriptionRealtimeEvent>(),
      start: jest.fn(),
      stop: jest.fn(),
      seedKnownJobs: jest.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        {
          provide: RealtimeTranscriptionsService,
          useValue: realtimeMock,
        },
        {
          provide: TranscriptionPollingFallbackService,
          useValue: fallbackMock,
        },
        {
          provide: ToastService,
          useValue: {
            success: jest.fn(),
            error: jest.fn(),
          },
        },
      ],
    });

    service = TestBed.inject(TranscriptionEventsCoordinatorService);
  });

  afterEach(() => {
    service.stop();
  });

  it('should enable polling fallback when realtime returns error', async () => {
    realtimeMock.connect.mockResolvedValue('error');

    await service.start('user-1');

    expect(fallbackMock.start).not.toHaveBeenCalled();
    expect(service.fallbackActive()).toBe(true);
  });

  it('should start polling fallback for pending jobs after realtime returns error', async () => {
    realtimeMock.connect.mockResolvedValue('error');

    await service.start('user-1');
    service.ensurePollingFallbackForPendingJobs();

    expect(fallbackMock.start).toHaveBeenCalledWith('user-1', []);
  });

  it('should start polling fallback for pending jobs when realtime is connected', async () => {
    realtimeMock.connect.mockResolvedValue('connected');

    await service.start('user-1');
    service.ensurePollingFallbackForPendingJobs();

    expect(fallbackMock.start).toHaveBeenCalledWith('user-1', []);
    expect(service.fallbackActive()).toBe(false);
  });

  it('should pass pending jobs as polling fallback baseline', async () => {
    realtimeMock.connect.mockResolvedValue('connected');

    await service.start('user-1');
    service.ensurePollingFallbackForPendingJobs([pendingJob]);

    expect(fallbackMock.start).toHaveBeenCalledWith('user-1', [pendingJob]);
  });

  it('should not deduplicate repeated updated events for the same job', async () => {
    realtimeMock.connect.mockResolvedValue('connected');
    await service.start('user-1');

    realtimeMock.events$.next({ type: 'updated', jobId: 'job-1', statusId: 2 });
    expect(service.lastEvent()).toEqual({ type: 'updated', jobId: 'job-1', statusId: 2 });

    realtimeMock.events$.next({ type: 'updated', jobId: 'job-1', statusId: 3 });

    expect(service.lastEvent()).toEqual({ type: 'updated', jobId: 'job-1', statusId: 3 });
  });
});
