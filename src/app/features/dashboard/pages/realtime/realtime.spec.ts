import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Realtime } from './realtime';

describe('Realtime', () => {
  let component: Realtime;
  let fixture: ComponentFixture<Realtime>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Realtime]
    }).compileComponents();

    fixture = TestBed.createComponent(Realtime);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should move to error state when simulating connection error', () => {
    component.simulateConnectionError();
    fixture.detectChanges();

    expect(component.connectionState()).toBe('error');
    expect(component.uiError()).toContain('No se pudo conectar');
  });
});
