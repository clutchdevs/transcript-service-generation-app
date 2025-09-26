import { TestBed } from '@angular/core/testing';

import { Transcriptions } from './transcriptions';

describe('Transcriptions', () => {
  let service: Transcriptions;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Transcriptions);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
