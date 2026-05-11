import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Transcriptions as TranscriptionsService } from '../../../../../../core/services/transcriptions/transcriptions';
import { TranscriptionsTable } from './transcriptions-table';

describe('TranscriptionsTable', () => {
  let component: TranscriptionsTable;
  let fixture: ComponentFixture<TranscriptionsTable>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TranscriptionsTable],
      providers: [
        {
          provide: TranscriptionsService,
          useValue: {
            formatFileSize: jest.fn((bytes: string) => bytes),
            formatDuration: jest.fn((seconds: number) => `${seconds}`),
            getStatusName: jest.fn((statusId: number) => `${statusId}`),
            getLanguageName: jest.fn((languageCode: string) => languageCode)
          }
        }
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TranscriptionsTable);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

