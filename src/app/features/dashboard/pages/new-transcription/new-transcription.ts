import { Component, ElementRef, ViewChild, computed, inject, signal } from '@angular/core';

import { Button } from '../../../../shared/components/ui/button/button';
import { Modal } from '../../../../shared/components/ui/modal/modal';
import { LANGUAGES, OPERATING_POINTS, TRANSLATION_TARGET_OPTIONS, SelectOption } from '../../../../core/integrations/speechmatics/constants';
import { NavigationService } from '../../../../core/services/navigation/navigation';
import { OperatingPoint, CreateJobConfig, SummaryContentType, SummaryLength, SummaryType } from '../../../../core/integrations/speechmatics/types';
import { Transcriptions } from '../../../../core/services/transcriptions/transcriptions';
import { AppSettingsService, BatchDefaults } from '../../../../core/services/app-settings/app-settings';

@Component({
  selector: 'app-new-transcription',
  imports: [Button, Modal],
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
  private appSettings = inject(AppSettingsService);

  readonly selectedLanguage = signal('es');
  readonly selectedOperatingPoint = signal<OperatingPoint>('standard');
  readonly selectedFile = signal<File | null>(null);
  private readonly MAX_FILE_SIZE_BYTES = 500 * 1024 * 1024; // 500 MB
  private readonly MAX_TRANSLATION_TARGETS = 5;
  private readonly SUPPORTED_MEDIA_EXTENSIONS = new Set(['wav', 'mp3', 'aac', 'ogg', 'mpeg', 'amr', 'm4a', 'mp4', 'flac']);

  readonly isSummarizationEnabled = signal(false);
  readonly summaryContentType = signal<SummaryContentType>('auto');
  readonly summaryLength = signal<SummaryLength>('brief');
  readonly summaryType = signal<SummaryType>('bullets');

  readonly isTranslationEnabled = signal(false);
  readonly selectedTargetLanguages = signal<string[]>([]);

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
  readonly translationTargetOptions = computed(() => this.getTranslationTargetOptions(this.selectedLanguage()));
  readonly translationHelpText = computed(() => {
    if (this.selectedLanguage() === 'en') {
      return 'Origen inglés: puedes traducir hasta 5 idiomas destino compatibles.';
    }

    if (this.isTranslationAvailable()) {
      return 'Origen no inglés: Speechmatics solo permite traducir este idioma hacia inglés.';
    }

    return 'Traducción disponible solo entre inglés y los idiomas compatibles.';
  });

  readonly isLoading = signal(false);
  readonly error = signal<string | null>(null);
  readonly isTranslationAvailable = computed(() => this.translationTargetOptions().length > 0);
  readonly canSubmit = computed(() => {
    if (!this.selectedFile() || this.isLoading()) {
      return false;
    }
    if (this.isTranslationEnabled() && this.selectedTargetLanguages().length === 0) {
      return false;
    }
    return true;
  });

  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

  readonly confirmOpen = signal(false);

  constructor() {
    const settings = this.appSettings.load();
    this.applyBatchDefaults(settings.batchDefaults);
  }

  private isDirty(): boolean {
    return !!this.selectedFile()
      || this.selectedLanguage() !== 'es'
      || this.selectedOperatingPoint() !== 'standard'
      || this.isSummarizationEnabled()
      || this.isTranslationEnabled()
      || this.selectedTargetLanguages().length > 0;
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
      this.selectedFile.set(null);
      return;
    }
    // Validate type and size. Backend keeps the multipart field as audioFile but accepts audio/video media.
    const isSupportedMedia = this.isSupportedMediaFile(file);
    const isSizeOk = file.size <= this.MAX_FILE_SIZE_BYTES;
    if (!isSupportedMedia) {
      this.error.set('El archivo debe ser de audio o video compatible.');
      this.clearSelectedFileOnly();
      return;
    }
    if (!isSizeOk) {
      this.error.set('El archivo excede el tamaño máximo de 500 MB.');
      this.clearSelectedFileOnly();
      return;
    }
    this.error.set(null);
    this.selectedFile.set(file);
  }

  onLanguageChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.selectedLanguage.set(value);

    if (!this.isTranslationAvailable()) {
      this.isTranslationEnabled.set(false);
      this.selectedTargetLanguages.set([]);
    }

    this.selectedTargetLanguages.update((languages) => this.filterValidTranslationTargets(value, languages));
  }

  onOperatingPointChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value as OperatingPoint;
    this.selectedOperatingPoint.set(value);
  }

  onSummarizationToggle(event: Event): void {
    this.isSummarizationEnabled.set((event.target as HTMLInputElement).checked);
  }

  onTranslationToggle(event: Event): void {
    const enabled = (event.target as HTMLInputElement).checked;
    if (enabled && !this.isTranslationAvailable()) {
      this.isTranslationEnabled.set(false);
      return;
    }

    this.isTranslationEnabled.set(enabled);
    if (!enabled) {
      this.selectedTargetLanguages.set([]);
      return;
    }

    this.selectedTargetLanguages.update((languages) => this.filterValidTranslationTargets(this.selectedLanguage(), languages));
  }

  onSummaryContentTypeChange(event: Event): void {
    this.summaryContentType.set((event.target as HTMLSelectElement).value as SummaryContentType);
  }

  onSummaryLengthChange(event: Event): void {
    this.summaryLength.set((event.target as HTMLSelectElement).value as SummaryLength);
  }

  onSummaryTypeChange(event: Event): void {
    this.summaryType.set((event.target as HTMLSelectElement).value as SummaryType);
  }

  onTargetLanguageToggle(event: Event): void {
    const checkbox = event.target as HTMLInputElement;
    const code = checkbox.value;

    if (checkbox.checked) {
      if (this.selectedTargetLanguages().length >= this.MAX_TRANSLATION_TARGETS) {
        checkbox.checked = false;
        return;
      }
      this.selectedTargetLanguages.update((languages) => languages.includes(code) ? languages : [...languages, code]);
      return;
    }

    this.selectedTargetLanguages.update((languages) => languages.filter((lang) => lang !== code));
  }

  isTargetLanguageSelected(code: string): boolean {
    return this.selectedTargetLanguages().includes(code);
  }

  isTargetLanguageDisabled(code: string): boolean {
    if (code === this.selectedLanguage()) {
      return true;
    }
    if (!this.translationTargetOptions().some((option) => option.value === code)) {
      return true;
    }
    if (this.isTargetLanguageSelected(code)) {
      return false;
    }
    return this.selectedTargetLanguages().length >= this.MAX_TRANSLATION_TARGETS;
  }

  async onCreate(): Promise<void> {
    const selectedFile = this.selectedFile();
    const selectedLanguage = this.selectedLanguage();
    if (!selectedFile) {
      this.error.set('Selecciona un archivo de audio o video.');
      return;
    }
    if (!selectedLanguage) {
      this.error.set('Selecciona un idioma.');
      return;
    }

    this.isLoading.set(true);
    this.error.set(null);
    try {
      const config: CreateJobConfig = {
        type: 'transcription',
        transcription_config: {
          language: selectedLanguage,
          operating_point: this.selectedOperatingPoint(),
        },
      };

      if (this.isSummarizationEnabled()) {
        config.summarization_config = {
          content_type: this.summaryContentType(),
          summary_length: this.summaryLength(),
          summary_type: this.summaryType(),
        };
      }

      if (this.isTranslationEnabled()) {
        const selectedTargetLanguages = this.selectedTargetLanguages();
        if (selectedTargetLanguages.length === 0) {
          this.error.set('Selecciona al menos un idioma de traducción.');
          return;
        }
        config.translation_config = {
          target_languages: selectedTargetLanguages,
        };
      }

      await this.transcriptions.createJob(config, selectedFile);
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
    this.selectedFile.set(null);
    if (this.fileInput?.nativeElement) {
      this.fileInput.nativeElement.value = '';
    }
  }

  onClearAll(): void {
    this.clearSelectedFileOnly();
    const settings = this.appSettings.load();
    this.applyBatchDefaults(settings.batchDefaults);
    this.error.set(null);
  }

  private applyBatchDefaults(batchDefaults: BatchDefaults): void {
    this.selectedLanguage.set(batchDefaults.language);
    this.selectedOperatingPoint.set(batchDefaults.operatingPoint);

    this.isSummarizationEnabled.set(batchDefaults.summarization.enabled);
    this.summaryContentType.set(batchDefaults.summarization.contentType);
    this.summaryLength.set(batchDefaults.summarization.length);
    this.summaryType.set(batchDefaults.summarization.type);

    this.isTranslationEnabled.set(batchDefaults.translation.enabled);
    this.selectedTargetLanguages.set(this.filterValidTranslationTargets(this.selectedLanguage(), batchDefaults.translation.targetLanguages));

    if (!this.isTranslationAvailable()) {
      this.isTranslationEnabled.set(false);
      this.selectedTargetLanguages.set([]);
    }
  }

  formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    const value = parseFloat((bytes / Math.pow(k, i)).toFixed(1));
    return `${value} ${sizes[i]}`;
  }

  private isSupportedMediaFile(file: File): boolean {
    const extension = file.name.split('.').pop()?.toLowerCase() ?? '';
    const hasSupportedExtension = this.SUPPORTED_MEDIA_EXTENSIONS.has(extension);
    const hasSupportedMime = file.type.startsWith('audio/') || file.type.startsWith('video/');

    return hasSupportedExtension && (hasSupportedMime || file.type === '');
  }

  private getTranslationTargetOptions(sourceLanguage: string): SelectOption[] {
    if (sourceLanguage === 'en') {
      return TRANSLATION_TARGET_OPTIONS;
    }

    const canTranslateToEnglish = TRANSLATION_TARGET_OPTIONS.some((option) => option.value === sourceLanguage);
    return canTranslateToEnglish ? [{ value: 'en', label: 'Inglés' }] : [];
  }

  private filterValidTranslationTargets(sourceLanguage: string, targetLanguages: string[]): string[] {
    const validTargets = new Set(this.getTranslationTargetOptions(sourceLanguage).map((option) => option.value));
    return targetLanguages
      .filter((code) => code !== sourceLanguage && validTargets.has(code))
      .slice(0, this.MAX_TRANSLATION_TARGETS);
  }
}
