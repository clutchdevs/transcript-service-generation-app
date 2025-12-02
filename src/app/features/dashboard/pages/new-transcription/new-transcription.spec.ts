import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

import { NewTranscription } from './new-transcription';

describe('NewTranscription', () => {
  let component: NewTranscription;
  let fixture: ComponentFixture<NewTranscription>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NewTranscription],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting()
      ]
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
