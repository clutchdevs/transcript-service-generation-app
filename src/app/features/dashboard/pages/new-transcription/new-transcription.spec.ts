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
    component.selectedFile.set(new File(['audio'], 'audio.mp3', { type: 'audio/mpeg' }));
    component.selectedLanguage.set('en');
    component.selectedOperatingPoint.set('enhanced');
    component.isSummarizationEnabled.set(true);
    component.summaryContentType.set('informative');
    component.summaryLength.set('detailed');
    component.summaryType.set('bullets');
    component.isTranslationEnabled.set(true);
    component.selectedTargetLanguages.set(['es', 'de']);

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

  it('should accept supported video files', async () => {
    const videoFile = new File(['video'], 'meeting.mp4', { type: 'video/mp4' });

    component.onFileSelected({ target: { files: [videoFile] } } as unknown as Event);
    component.selectedLanguage.set('en');
    await component.onCreate();

    expect(component.error()).toBeNull();
    expect(component.selectedFile()).toBe(videoFile);
    expect(transcriptionsMock.createJob).toHaveBeenCalledWith(expect.any(Object), videoFile);
  });

  it('should reject unsupported media files', () => {
    const textFile = new File(['text'], 'notes.txt', { type: 'text/plain' });

    component.onFileSelected({ target: { files: [textFile] } } as unknown as Event);

    expect(component.selectedFile()).toBeNull();
    expect(component.error()).toContain('audio o video compatible');
  });

  it('should reject files over 500 MB', () => {
    const oversizedFile = new File(['video'], 'large.mp4', { type: 'video/mp4' });
    Object.defineProperty(oversizedFile, 'size', { value: 501 * 1024 * 1024 });

    component.onFileSelected({ target: { files: [oversizedFile] } } as unknown as Event);

    expect(component.selectedFile()).toBeNull();
    expect(component.error()).toContain('500 MB');
  });

  it('should block submit when translation is enabled without target languages', async () => {
    component.selectedFile.set(new File(['audio'], 'audio.mp3', { type: 'audio/mpeg' }));
    component.selectedLanguage.set('en');
    component.isTranslationEnabled.set(true);
    component.selectedTargetLanguages.set([]);

    await component.onCreate();

    expect(transcriptionsMock.createJob).not.toHaveBeenCalled();
    expect(component.error()).toContain('Selecciona al menos un idioma de traducción');
  });

  it('should allow translating from english to multiple supported target languages', async () => {
    component.selectedFile.set(new File(['audio'], 'audio.mp3', { type: 'audio/mpeg' }));
    component.selectedLanguage.set('en');
    component.isTranslationEnabled.set(true);
    component.selectedTargetLanguages.set(['es', 'de']);

    await component.onCreate();

    expect(transcriptionsMock.createJob).toHaveBeenCalledWith(
      expect.objectContaining({
        translation_config: {
          target_languages: ['es', 'de'],
        },
      }),
      expect.any(File),
    );
  });

  it('should allow translating from a supported non-english language to english', async () => {
    component.selectedFile.set(new File(['audio'], 'audio.mp3', { type: 'audio/mpeg' }));
    component.selectedLanguage.set('es');
    component.isTranslationEnabled.set(true);
    component.selectedTargetLanguages.set(['en']);

    await component.onCreate();

    expect(transcriptionsMock.createJob).toHaveBeenCalledWith(
      expect.objectContaining({
        transcription_config: expect.objectContaining({ language: 'es' }),
        translation_config: {
          target_languages: ['en'],
        },
      }),
      expect.any(File),
    );
  });

  it('should remove invalid non-english to non-english translation targets', () => {
    component.selectedLanguage.set('en');
    component.isTranslationEnabled.set(true);
    component.selectedTargetLanguages.set(['es', 'de']);

    component.onLanguageChange({ target: { value: 'es' } } as unknown as Event);

    expect(component.isTranslationEnabled()).toBe(true);
    expect(component.selectedTargetLanguages()).toEqual([]);
    expect(component.translationTargetOptions()).toEqual([{ value: 'en', label: 'Inglés' }]);
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

    expect(secondComponent.selectedLanguage()).toBe('en');
    expect(secondComponent.selectedOperatingPoint()).toBe('enhanced');
    expect(secondComponent.isSummarizationEnabled()).toBe(true);
    expect(secondComponent.summaryType()).toBe('paragraphs');
  });
});
