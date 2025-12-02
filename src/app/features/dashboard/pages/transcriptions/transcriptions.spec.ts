import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

import { Transcriptions } from './transcriptions';

describe('Transcriptions', () => {
  let component: Transcriptions;
  let fixture: ComponentFixture<Transcriptions>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Transcriptions],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Transcriptions);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
