import { Component, ElementRef, ViewChild, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Button } from '../../../../shared/components/ui/button/button';
import { Modal } from '../../../../shared/components/ui/modal/modal';
import { LANGUAGES, OPERATING_POINTS } from '../../../../core/integrations/speechmatics/constants';
import { NavigationService } from '../../../../core/services/navigation/navigation';
import { OperatingPoint, CreateJobConfig } from '../../../../core/integrations/speechmatics/types';
import { Transcriptions } from '../../../../core/services/transcriptions/transcriptions';

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

  private navigation = new NavigationService();
  private transcriptions = inject(Transcriptions);

  selectedLanguage: string = 'es';
  selectedOperatingPoint: OperatingPoint = 'standard';
  selectedFile: File | null = null;
  private readonly MAX_FILE_SIZE_BYTES = 100 * 1024 * 1024; // 100 MB

  readonly isLoading = signal(false);
  readonly error = signal<string | null>(null);

  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

  readonly confirmOpen = signal(false);

  private isDirty(): boolean {
    return !!this.selectedFile || this.selectedLanguage !== 'es' || this.selectedOperatingPoint !== 'standard';
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
  }

  onOperatingPointChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value as OperatingPoint;
    this.selectedOperatingPoint = value;
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
      await this.transcriptions.createJob(this.selectedFile, config);
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
