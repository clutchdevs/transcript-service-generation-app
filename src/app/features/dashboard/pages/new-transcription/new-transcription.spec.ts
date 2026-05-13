import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NewTranscription } from './new-transcription';
import { NavigationService } from '../../../../core/services/navigation/navigation';
import { Transcriptions } from '../../../../core/services/transcriptions/transcriptions';
import { AppSettingsService, DEFAULT_APP_SETTINGS } from '../../../../core/services/app-settings/app-settings';

describe('NewTranscription', () => {
  let component: NewTranscription;
  let fixture: ComponentFixture<NewTranscription>;
  let transcriptionsMock: {
    createJob: jest.Mock;
  };
  let navigationMock: {
    navigate: jest.Mock;
    goToDashboard: jest.Mock;
  };
  let appSettingsMock: {
    load: jest.Mock;
  };

  beforeEach(async () => {
    localStorage.clear();

    transcriptionsMock = {
      createJob: jest.fn().mockResolvedValue({ id: 'job-1' }),
    };

    navigationMock = {
      navigate: jest.fn(),
      goToDashboard: jest.fn(),
    };

    appSettingsMock = {
      load: jest.fn().mockReturnValue(DEFAULT_APP_SETTINGS),
    };

    await TestBed.configureTestingModule({
      imports: [NewTranscription],
      providers: [
        {
          provide: Transcriptions,
          useValue: transcriptionsMock,
        },
        {
          provide: NavigationService,
          useValue: navigationMock,
        },
        {
          provide: AppSettingsService,
          useValue: appSettingsMock,
        },
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

  it('should include summary and translation config when enabled', async () => {
    component.selectedFile = new File(['audio'], 'audio.mp3', { type: 'audio/mpeg' });
    component.selectedLanguage = 'en';
    component.selectedOperatingPoint = 'enhanced';
    component.isSummarizationEnabled = true;
    component.summaryContentType = 'informative';
    component.summaryLength = 'detailed';
    component.summaryType = 'bullets';
    component.isTranslationEnabled = true;
    component.selectedTargetLanguages = ['es', 'de'];

    await component.onCreate();

    expect(transcriptionsMock.createJob).toHaveBeenCalledWith(
      {
        type: 'transcription',
        transcription_config: {
          language: 'en',
          operating_point: 'enhanced',
        },
        summarization_config: {
          content_type: 'informative',
          summary_length: 'detailed',
          summary_type: 'bullets',
        },
        translation_config: {
          target_languages: ['es', 'de'],
        },
      },
      expect.any(File),
    );
  });

  it('should block submit when translation is enabled without target languages', async () => {
    component.selectedFile = new File(['audio'], 'audio.mp3', { type: 'audio/mpeg' });
    component.selectedLanguage = 'en';
    component.isTranslationEnabled = true;
    component.selectedTargetLanguages = [];

    await component.onCreate();

    expect(transcriptionsMock.createJob).not.toHaveBeenCalled();
    expect(component.error()).toContain('Selecciona al menos un idioma de traducción');
  });

  it('should disable translation when source language is not english', () => {
    component.selectedLanguage = 'en';
    component.isTranslationEnabled = true;
    component.selectedTargetLanguages = ['es'];

    component.onLanguageChange({ target: { value: 'es' } } as unknown as Event);

    expect(component.isTranslationEnabled).toBe(false);
    expect(component.selectedTargetLanguages).toEqual([]);
  });

  it('should initialize with defaults from settings service', () => {
    appSettingsMock.load.mockReturnValue({
      ...DEFAULT_APP_SETTINGS,
      batchDefaults: {
        ...DEFAULT_APP_SETTINGS.batchDefaults,
        language: 'en',
        operatingPoint: 'enhanced',
        summarization: {
          enabled: true,
          contentType: 'informative',
          length: 'detailed',
          type: 'paragraphs',
        },
      },
    });

    const secondFixture = TestBed.createComponent(NewTranscription);
    const secondComponent = secondFixture.componentInstance;
    secondFixture.detectChanges();

    expect(secondComponent.selectedLanguage).toBe('en');
    expect(secondComponent.selectedOperatingPoint).toBe('enhanced');
    expect(secondComponent.isSummarizationEnabled).toBe(true);
    expect(secondComponent.summaryType).toBe('paragraphs');
  });
});
