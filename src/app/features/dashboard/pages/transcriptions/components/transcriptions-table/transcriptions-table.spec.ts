import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TranscriptionsTable } from './transcriptions-table';

describe('TranscriptionsTable', () => {
  let component: TranscriptionsTable;
  let fixture: ComponentFixture<TranscriptionsTable>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TranscriptionsTable]
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

