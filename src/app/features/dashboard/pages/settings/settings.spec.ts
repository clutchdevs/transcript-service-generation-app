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

  it('should show english as the only translation target for supported non-english default language', () => {
    component.onBatchLanguageChange('es');

    expect(component.translationTargetOptions).toEqual([{ value: 'en', label: 'Inglés' }]);
  });

  it('should remove invalid translation targets when default language changes', () => {
    component.settings = {
      ...DEFAULT_APP_SETTINGS,
      batchDefaults: {
        ...DEFAULT_APP_SETTINGS.batchDefaults,
        language: 'en',
        translation: {
          enabled: true,
          targetLanguages: ['es', 'de'],
        },
      },
    };

    component.onBatchLanguageChange('es');

    expect(component.settings.batchDefaults.translation.enabled).toBe(true);
    expect(component.settings.batchDefaults.translation.targetLanguages).toEqual([]);
    expect(component.isTargetLanguageDisabled('de')).toBe(true);
    expect(component.isTargetLanguageDisabled('en')).toBe(false);
  });

  it('should disable translation defaults for unsupported source language', () => {
    component.settings = {
      ...DEFAULT_APP_SETTINGS,
      batchDefaults: {
        ...DEFAULT_APP_SETTINGS.batchDefaults,
        language: 'auto',
        translation: {
          enabled: true,
          targetLanguages: ['en'],
        },
      },
    };

    component.onSave();

    expect(appSettingsMock.save).toHaveBeenCalledWith(expect.objectContaining({
      batchDefaults: expect.objectContaining({
        translation: {
          enabled: false,
          targetLanguages: [],
        },
      }),
    }));
  });
});
