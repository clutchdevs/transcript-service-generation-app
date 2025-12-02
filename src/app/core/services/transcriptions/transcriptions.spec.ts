import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

import { Transcriptions } from './transcriptions';

describe('Transcriptions', () => {
  let service: Transcriptions;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    });
    service = TestBed.inject(Transcriptions);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
