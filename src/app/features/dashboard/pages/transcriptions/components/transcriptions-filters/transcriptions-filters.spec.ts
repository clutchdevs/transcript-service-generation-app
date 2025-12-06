import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TranscriptionsFilters } from './transcriptions-filters';

describe('TranscriptionsFilters', () => {
  let component: TranscriptionsFilters;
  let fixture: ComponentFixture<TranscriptionsFilters>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TranscriptionsFilters]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TranscriptionsFilters);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

