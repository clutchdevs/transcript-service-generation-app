import { TestBed } from '@angular/core/testing';
import { Subject } from 'rxjs';

import { TranscriptionEventsCoordinatorService } from './transcription-events-coordinator';
import { RealtimeTranscriptionsService } from './realtime-transcriptions';
import { TranscriptionPollingFallbackService } from './transcription-polling-fallback';
import { ToastService } from '../toast/toast';

describe('TranscriptionEventsCoordinatorService', () => {
  let service: TranscriptionEventsCoordinatorService;
  let realtimeMock: {
    status: jest.Mock;
    events$: Subject<never>;
    connect: jest.Mock;
    disconnect: jest.Mock;
  };
  let fallbackMock: {
    events$: Subject<never>;
    start: jest.Mock;
    stop: jest.Mock;
    seedKnownJobs: jest.Mock;
  };

  beforeEach(() => {
    realtimeMock = {
      status: jest.fn().mockReturnValue('idle'),
      events$: new Subject<never>(),
      connect: jest.fn(),
      disconnect: jest.fn(),
    };
    fallbackMock = {
      events$: new Subject<never>(),
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

    expect(fallbackMock.start).toHaveBeenCalledWith('user-1');
  });
});
