import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter, ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

import { TranscriptionDetail } from './transcription-detail';

describe('TranscriptionDetail', () => {
  let component: TranscriptionDetail;
  let fixture: ComponentFixture<TranscriptionDetail>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TranscriptionDetail],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: {
            params: of({ id: 'test-job-id' }),
            snapshot: {
              params: { id: 'test-job-id' }
            }
          }
        }
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TranscriptionDetail);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

