import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NewTranscription } from './new-transcription';

describe('NewTranscription', () => {
  let component: NewTranscription;
  let fixture: ComponentFixture<NewTranscription>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NewTranscription]
    })
    .compileComponents();

    fixture = TestBed.createComponent(NewTranscription);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
