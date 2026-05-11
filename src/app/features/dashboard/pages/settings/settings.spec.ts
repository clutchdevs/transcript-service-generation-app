import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Settings } from './settings';
import { AppSettingsService, DEFAULT_APP_SETTINGS } from '../../../../core/services/app-settings/app-settings';
import { ToastService } from '../../../../core/services/toast/toast';

describe('Settings', () => {
  let component: Settings;
  let fixture: ComponentFixture<Settings>;
  let appSettingsMock: {
    load: jest.Mock;
    save: jest.Mock;
    reset: jest.Mock;
  };
  let toastMock: {
    success: jest.Mock;
    info: jest.Mock;
  };

  beforeEach(async () => {
    appSettingsMock = {
      load: jest.fn().mockReturnValue(DEFAULT_APP_SETTINGS),
      save: jest.fn().mockImplementation((value) => value),
      reset: jest.fn().mockReturnValue(DEFAULT_APP_SETTINGS),
    };

    toastMock = {
      success: jest.fn(),
      info: jest.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [Settings],
      providers: [
        {
          provide: AppSettingsService,
          useValue: appSettingsMock,
        },
        {
          provide: ToastService,
          useValue: toastMock,
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Settings);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should save settings', () => {
    component.onSave();

    expect(appSettingsMock.save).toHaveBeenCalled();
    expect(toastMock.success).toHaveBeenCalled();
  });

  it('should reset settings', () => {
    component.onReset();

    expect(appSettingsMock.reset).toHaveBeenCalled();
    expect(toastMock.info).toHaveBeenCalled();
  });
});
