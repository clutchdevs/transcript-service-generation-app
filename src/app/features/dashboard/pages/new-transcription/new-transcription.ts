import { Component, ElementRef, ViewChild, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Button } from '../../../../shared/components/ui/button/button';
import { Modal } from '../../../../shared/components/ui/modal/modal';
import { LANGUAGES, OPERATING_POINTS } from '../../../../core/integrations/speechmatics/constants';
import { NavigationService } from '../../../../core/services/navigation/navigation';
import { OperatingPoint, CreateJobConfig, SummaryContentType, SummaryLength, SummaryType } from '../../../../core/integrations/speechmatics/types';
import { Transcriptions } from '../../../../core/services/transcriptions/transcriptions';
import { Auth } from '../../../../core/services/auth/auth';

interface SelectOption {
  value: string;
  label: string;
}

@Component({
  selector: 'app-new-transcription',
  imports: [CommonModule, Button, Modal],
  templateUrl: './new-transcription.html',
  styleUrl: './new-transcription.scss'
})
export class NewTranscription {
  readonly languages = LANGUAGES;
  readonly operatingPoints = OPERATING_POINTS;
  readonly labelStandard = this.operatingPoints.find(op => op.value === 'standard')?.label ?? 'Estándar';
  readonly labelEnhanced = this.operatingPoints.find(op => op.value === 'enhanced')?.label ?? 'Mejorada';

  private navigation = inject(NavigationService);
  private transcriptions = inject(Transcriptions);
  private auth = inject(Auth);

  selectedLanguage: string = 'es';
  selectedOperatingPoint: OperatingPoint = 'standard';
  selectedFile: File | null = null;
  private readonly MAX_FILE_SIZE_BYTES = 100 * 1024 * 1024; // 100 MB
  private readonly MAX_TRANSLATION_TARGETS = 5;

  isSummarizationEnabled = false;
  summaryContentType: SummaryContentType = 'auto';
  summaryLength: SummaryLength = 'brief';
  summaryType: SummaryType = 'bullets';

  isTranslationEnabled = false;
  selectedTargetLanguages: string[] = [];

  readonly summaryContentTypeOptions: SelectOption[] = [
    { value: 'auto', label: 'Automático' },
    { value: 'conversational', label: 'Conversacional' },
    { value: 'informative', label: 'Informativo' },
  ];
  readonly summaryLengthOptions: SelectOption[] = [
    { value: 'brief', label: 'Breve' },
    { value: 'detailed', label: 'Detallado' },
  ];
  readonly summaryTypeOptions: SelectOption[] = [
    { value: 'bullets', label: 'Viñetas' },
    { value: 'paragraphs', label: 'Párrafos' },
  ];
  readonly translationTargetOptions: SelectOption[] = [
    { value: 'bg', label: 'Búlgaro' },
    { value: 'ca', label: 'Catalán' },
    { value: 'cmn', label: 'Mandarín' },
    { value: 'cs', label: 'Checo' },
    { value: 'da', label: 'Danés' },
    { value: 'de', label: 'Alemán' },
    { value: 'el', label: 'Griego' },
    { value: 'es', label: 'Español' },
    { value: 'et', label: 'Estonio' },
    { value: 'fi', label: 'Finlandés' },
    { value: 'fr', label: 'Francés' },
    { value: 'gl', label: 'Gallego' },
    { value: 'hi', label: 'Hindi' },
    { value: 'hr', label: 'Croata' },
    { value: 'hu', label: 'Húngaro' },
    { value: 'id', label: 'Indonesio' },
    { value: 'it', label: 'Italiano' },
    { value: 'ja', label: 'Japonés' },
    { value: 'ko', label: 'Coreano' },
    { value: 'lt', label: 'Lituano' },
    { value: 'lv', label: 'Letón' },
    { value: 'ms', label: 'Malayo' },
    { value: 'nl', label: 'Neerlandés' },
    { value: 'no', label: 'Noruego' },
    { value: 'pl', label: 'Polaco' },
    { value: 'pt', label: 'Portugués' },
    { value: 'ro', label: 'Rumano' },
    { value: 'ru', label: 'Ruso' },
    { value: 'sk', label: 'Eslovaco' },
    { value: 'sl', label: 'Esloveno' },
    { value: 'sv', label: 'Sueco' },
    { value: 'tr', label: 'Turco' },
    { value: 'uk', label: 'Ucraniano' },
    { value: 'vi', label: 'Vietnamita' },
  ];

  readonly isLoading = signal(false);
  readonly error = signal<string | null>(null);

  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

  readonly confirmOpen = signal(false);

  private isDirty(): boolean {
    return !!this.selectedFile
      || this.selectedLanguage !== 'es'
      || this.selectedOperatingPoint !== 'standard'
      || this.isSummarizationEnabled
      || this.isTranslationEnabled
      || this.selectedTargetLanguages.length > 0;
  }

  get isTranslationAvailable(): boolean {
    return this.selectedLanguage === 'en';
  }

  get canSubmit(): boolean {
    if (!this.selectedFile || this.isLoading()) {
      return false;
    }
    if (this.isTranslationEnabled && this.selectedTargetLanguages.length === 0) {
      return false;
    }
    return true;
  }

  onCancel(): void {
    if (this.isLoading()) return;
    if (this.isDirty()) {
      this.confirmOpen.set(true);
    } else {
      this.navigation.goToDashboard();
    }
  }

  onConfirmLeave(): void {
    this.confirmOpen.set(false);
    this.navigation.goToDashboard();
  }

  onCloseConfirm(): void {
    this.confirmOpen.set(false);
  }

  onBrowseFiles(): void {
    this.fileInput?.nativeElement.click();
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files && input.files[0];
    if (!file) {
      this.selectedFile = null;
      return;
    }
    // Validate type and size
    const isAudio = file.type.startsWith('audio/');
    const isSizeOk = file.size <= this.MAX_FILE_SIZE_BYTES;
    if (!isAudio) {
      this.error.set('El archivo debe ser de audio.');
      this.clearSelectedFileOnly();
      return;
    }
    if (!isSizeOk) {
      this.error.set('El archivo excede el tamaño máximo de 100 MB.');
      this.clearSelectedFileOnly();
      return;
    }
    this.error.set(null);
    this.selectedFile = file;
  }

  onLanguageChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.selectedLanguage = value;

    if (!this.isTranslationAvailable) {
      this.isTranslationEnabled = false;
      this.selectedTargetLanguages = [];
    }

    this.selectedTargetLanguages = this.selectedTargetLanguages.filter((code) => code !== value);
  }

  onOperatingPointChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value as OperatingPoint;
    this.selectedOperatingPoint = value;
  }

  onSummarizationToggle(event: Event): void {
    this.isSummarizationEnabled = (event.target as HTMLInputElement).checked;
  }

  onTranslationToggle(event: Event): void {
    const enabled = (event.target as HTMLInputElement).checked;
    if (enabled && !this.isTranslationAvailable) {
      this.isTranslationEnabled = false;
      return;
    }

    this.isTranslationEnabled = enabled;
    if (!enabled) {
      this.selectedTargetLanguages = [];
    }
  }

  onSummaryContentTypeChange(event: Event): void {
    this.summaryContentType = (event.target as HTMLSelectElement).value as SummaryContentType;
  }

  onSummaryLengthChange(event: Event): void {
    this.summaryLength = (event.target as HTMLSelectElement).value as SummaryLength;
  }

  onSummaryTypeChange(event: Event): void {
    this.summaryType = (event.target as HTMLSelectElement).value as SummaryType;
  }

  onTargetLanguageToggle(event: Event): void {
    const checkbox = event.target as HTMLInputElement;
    const code = checkbox.value;

    if (checkbox.checked) {
      if (this.selectedTargetLanguages.length >= this.MAX_TRANSLATION_TARGETS) {
        checkbox.checked = false;
        return;
      }
      if (!this.selectedTargetLanguages.includes(code)) {
        this.selectedTargetLanguages = [...this.selectedTargetLanguages, code];
      }
      return;
    }

    this.selectedTargetLanguages = this.selectedTargetLanguages.filter((lang) => lang !== code);
  }

  isTargetLanguageSelected(code: string): boolean {
    return this.selectedTargetLanguages.includes(code);
  }

  isTargetLanguageDisabled(code: string): boolean {
    if (code === this.selectedLanguage) {
      return true;
    }
    if (this.isTargetLanguageSelected(code)) {
      return false;
    }
    return this.selectedTargetLanguages.length >= this.MAX_TRANSLATION_TARGETS;
  }

  async onCreate(): Promise<void> {
    if (!this.selectedFile) {
      this.error.set('Selecciona un archivo de audio.');
      return;
    }
    if (!this.selectedLanguage) {
      this.error.set('Selecciona un idioma.');
      return;
    }

    this.isLoading.set(true);
    this.error.set(null);
    try {
      const config: CreateJobConfig = {
        type: 'transcription',
        transcription_config: {
          language: this.selectedLanguage,
          operating_point: this.selectedOperatingPoint,
        },
      };

      if (this.isSummarizationEnabled) {
        config.summarization_config = {
          content_type: this.summaryContentType,
          summary_length: this.summaryLength,
          summary_type: this.summaryType,
        };
      }

      if (this.isTranslationEnabled) {
        if (this.selectedTargetLanguages.length === 0) {
          this.error.set('Selecciona al menos un idioma de traducción.');
          return;
        }
        config.translation_config = {
          target_languages: this.selectedTargetLanguages,
        };
      }

      const userId = this.auth.user()?.id || '';
      await this.transcriptions.createJob(userId, config, this.selectedFile);
      this.navigation.navigate('/dashboard/transcriptions');
    } catch (e: unknown) {
      const msg = (e as { message?: string })?.message || 'No se pudo crear el job.';
      this.error.set(msg);
    } finally {
      this.isLoading.set(false);
    }
  }

  clearSelectedFile(): void {
    this.clearSelectedFileOnly();
    this.error.set(null);
  }

  private clearSelectedFileOnly(): void {
    this.selectedFile = null;
    if (this.fileInput?.nativeElement) {
      this.fileInput.nativeElement.value = '';
    }
  }

  onClearAll(): void {
    this.clearSelectedFileOnly();
    this.selectedLanguage = 'es';
    this.selectedOperatingPoint = 'standard';
    this.isSummarizationEnabled = false;
    this.summaryContentType = 'auto';
    this.summaryLength = 'brief';
    this.summaryType = 'bullets';
    this.isTranslationEnabled = false;
    this.selectedTargetLanguages = [];
    this.error.set(null);
  }

  formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    const value = parseFloat((bytes / Math.pow(k, i)).toFixed(1));
    return `${value} ${sizes[i]}`;
  }
}
