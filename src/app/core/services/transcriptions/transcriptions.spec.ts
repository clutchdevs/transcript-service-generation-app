import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { Transcriptions } from './transcriptions';
import { environment } from '../../../../environments/environment';

describe('Transcriptions', () => {
  let service: Transcriptions;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    });
    service = TestBed.inject(Transcriptions);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should get a job by id and normalize backend fields', async () => {
    const promise = service.getJobById('job-1');
    const req = httpMock.expectOne(`${environment.apiUrl}/api/transcription/jobs/job-1`);

    expect(req.request.method).toBe('GET');
    req.flush({
      statusCode: 200,
      message: 'OK',
      data: {
        id: 'job-1',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
        userId: 'user-1',
        referenceId: 'ref-1',
        title: 'Audio',
        originalFilename: 'audio.mp3',
        fileSize: 1234567,
        durationSeconds: 10,
        language: 'es',
        statusId: 5,
        errorMessage: 'Canceled by user',
        metadata: null,
        deletedAt: null,
      },
    });

    await expect(promise).resolves.toMatchObject({
      id: 'job-1',
      fileSize: '1234567',
      isDeleted: false,
      statusId: 5,
    });
  });

  it('should call Epic A mutation endpoints', async () => {
    const deletePromise = service.deleteJob('job-1');
    const deleteReq = httpMock.expectOne(`${environment.apiUrl}/api/transcription/jobs/job-1`);
    expect(deleteReq.request.method).toBe('DELETE');
    deleteReq.flush({ statusCode: 200, message: 'Job deleted', data: { jobId: 'job-1' } });
    await expect(deletePromise).resolves.toEqual({ jobId: 'job-1' });

    const titlePromise = service.updateJobTitle('job-1', 'Nuevo titulo');
    const titleReq = httpMock.expectOne(`${environment.apiUrl}/api/transcription/jobs/job-1`);
    expect(titleReq.request.method).toBe('PATCH');
    expect(titleReq.request.body).toEqual({ title: 'Nuevo titulo' });
    titleReq.flush({ statusCode: 200, data: jobResponse({ title: 'Nuevo titulo' }) });
    await expect(titlePromise).resolves.toMatchObject({ title: 'Nuevo titulo' });

    const cancelPromise = service.cancelJob('job-1');
    const cancelReq = httpMock.expectOne(`${environment.apiUrl}/api/transcription/jobs/job-1/cancel`);
    expect(cancelReq.request.method).toBe('POST');
    cancelReq.flush({ statusCode: 200, data: jobResponse({ statusId: 5 }) });
    await expect(cancelPromise).resolves.toMatchObject({ statusId: 5 });
  });
});

function jobResponse(overrides: Partial<ReturnType<typeof baseJob>> = {}) {
  return {
    ...baseJob(),
    ...overrides,
  };
}

function baseJob() {
  return {
    id: 'job-1',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    userId: 'user-1',
    referenceId: 'ref-1',
    title: 'Audio',
    originalFilename: 'audio.mp3',
    fileSize: '1024',
    durationSeconds: 10,
    language: 'es',
    statusId: 3,
    errorMessage: null,
    metadata: null,
    deletedAt: null,
  };
}
