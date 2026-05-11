import { TestBed } from '@angular/core/testing';
import { throwError } from 'rxjs';

import { RealtimeTranscriptionsService } from './realtime-transcriptions';
import { Api } from '../api/api';

describe('RealtimeTranscriptionsService', () => {
  let service: RealtimeTranscriptionsService;
  let apiMock: {
    post: jest.Mock;
  };

  beforeEach(() => {
    apiMock = {
      post: jest.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        {
          provide: Api,
          useValue: apiMock,
        },
      ],
    });

    service = TestBed.inject(RealtimeTranscriptionsService);
  });

  afterEach(() => {
    service.disconnect();
  });

  it('should mark realtime unavailable when token endpoint returns 503', async () => {
    apiMock.post.mockReturnValue(throwError(() => ({ status: 503 })));

    const result = await service.connect('user-1');

    expect(result).toBe('unavailable');
    expect(service.status()).toBe('unavailable');
  });

  it('should normalize Epic A job events without transcriptionId', () => {
    const normalizePayload = (service as unknown as {
      normalizePayload: (payload: unknown) => unknown;
    }).normalizePayload.bind(service);

    expect(normalizePayload({ type: 'job.updated', data: { jobId: 'job-1', statusId: 5 } })).toEqual({
      type: 'updated',
      jobId: 'job-1',
      statusId: 5,
      title: undefined,
    });
    expect(normalizePayload({ type: 'job.deleted', data: { jobId: 'job-1' } })).toEqual({
      type: 'deleted',
      jobId: 'job-1',
    });
    expect(normalizePayload({ type: 'job.canceled', data: { jobId: 'job-1', title: 'Audio' } })).toEqual({
      type: 'canceled',
      jobId: 'job-1',
      title: 'Audio',
    });
  });
});
