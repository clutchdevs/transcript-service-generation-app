import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

import { TranscriptionDetail } from './transcription-detail';
import { Transcriptions } from '../../../../core/services/transcriptions/transcriptions';
import { Auth } from '../../../../core/services/auth/auth';
import { NavigationService } from '../../../../core/services/navigation/navigation';
import { TranscriptionDraftService } from '../../../../core/services/transcription-draft/transcription-draft';

const mockJob = {
  id: 'test-job-id',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  userId: 'user-1',
  referenceId: 'ref-1',
  title: 'Audio de prueba',
  originalFilename: 'audio.mp3',
  filePath: 'uploads/audio.mp3',
  fileSize: '1024',
  durationSeconds: 10,
  language: 'es',
  statusId: 3,
  transcriptionText: 'Texto de transcripción inicial',
  confidenceScore: null,
  wordCount: null,
  processingStartedAt: null,
  processingCompletedAt: null,
  errorMessage: null,
  metadata: null,
  isDeleted: false,
  deletedAt: null,
};

describe('TranscriptionDetail', () => {
  let component: TranscriptionDetail;
  let fixture: ComponentFixture<TranscriptionDetail>;
  let draftServiceMock: {
    load: jest.Mock;
    save: jest.Mock;
    clear: jest.Mock;
  };

  beforeEach(async () => {
    history.replaceState({ job: mockJob }, '', '/dashboard/transcriptions/test-job-id');

    draftServiceMock = {
      load: jest.fn().mockReturnValue(null),
      save: jest.fn().mockImplementation((jobId: string, originalText: string, editedText: string) => ({
        jobId,
        originalText,
        editedText,
        updatedAt: Date.now(),
      })),
      clear: jest.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [TranscriptionDetail],
      providers: [
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: {
            params: of({ id: 'test-job-id' }),
            snapshot: {
              params: { id: 'test-job-id' }
            }
          }
        },
        {
          provide: Transcriptions,
          useValue: {
            listUserJobs: jest.fn().mockResolvedValue([]),
            getJobTranscript: jest.fn().mockResolvedValue(''),
            formatFileSize: jest.fn().mockReturnValue('1 KB'),
            formatDuration: jest.fn().mockReturnValue('0:10'),
            getStatusName: jest.fn().mockReturnValue('Completado'),
            getLanguageName: jest.fn().mockReturnValue('Español'),
          }
        },
        {
          provide: Auth,
          useValue: {
            user: jest.fn().mockReturnValue({ id: 'user-1', email: 'test@example.com', name: 'User' })
          }
        },
        {
          provide: NavigationService,
          useValue: {
            navigate: jest.fn(),
            goToDashboard: jest.fn(),
          }
        },
        {
          provide: TranscriptionDraftService,
          useValue: draftServiceMock,
        }
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TranscriptionDetail);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should open edit title modal and update title locally', () => {
    const editButton = Array.from(fixture.nativeElement.querySelectorAll('button'))
      .find((btn: HTMLButtonElement) => btn.textContent?.includes('Editar título')) as HTMLButtonElement;

    expect(editButton).toBeTruthy();
    editButton.click();
    fixture.detectChanges();

    const titleInput = fixture.nativeElement.querySelector('#edit-title') as HTMLInputElement;
    expect(titleInput).toBeTruthy();

    titleInput.value = 'Título actualizado';
    titleInput.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    const saveButton = Array.from(fixture.nativeElement.querySelectorAll('button'))
      .find((btn: HTMLButtonElement) => btn.textContent?.trim() === 'Guardar') as HTMLButtonElement;
    saveButton.click();
    fixture.detectChanges();

    const pageTitle = fixture.nativeElement.querySelector('h2');
    expect(pageTitle.textContent).toContain('Título actualizado');
  });

  it('should switch to editable mode and save edited transcript', () => {
    const editableButton = Array.from(fixture.nativeElement.querySelectorAll('button'))
      .find((btn: HTMLButtonElement) => btn.textContent?.trim() === 'Editable') as HTMLButtonElement;

    editableButton.click();
    fixture.detectChanges();

    const textarea = fixture.nativeElement.querySelector('textarea') as HTMLTextAreaElement;
    expect(textarea).toBeTruthy();

    textarea.value = 'Texto editado por el usuario';
    textarea.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    const saveButton = Array.from(fixture.nativeElement.querySelectorAll('button'))
      .find((btn: HTMLButtonElement) => btn.textContent?.trim() === 'Guardar cambios') as HTMLButtonElement;

    saveButton.click();
    fixture.detectChanges();

    expect(draftServiceMock.save).toHaveBeenCalled();
    expect(component.editedTranscript()).toBe('Texto editado por el usuario');
    expect(component.saveStatus()).toBe('saved');
  });
});


