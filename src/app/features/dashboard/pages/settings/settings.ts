import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Button } from '../../../../shared/components/ui/button/button';
import { LANGUAGES, OPERATING_POINTS, TRANSLATION_TARGET_OPTIONS, SelectOption } from '../../../../core/integrations/speechmatics/constants';
import { AppSettingsData, AppSettingsService } from '../../../../core/services/app-settings/app-settings';
import { ToastService } from '../../../../core/services/toast/toast';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, FormsModule, Button],
  templateUrl: './settings.html',
  styleUrl: './settings.scss'
})
export class Settings {
  private appSettings = inject(AppSettingsService);
  private toast = inject(ToastService);

  readonly languages = LANGUAGES;
  readonly operatingPoints = OPERATING_POINTS;
  readonly translationTargetOptions = TRANSLATION_TARGET_OPTIONS;
  readonly autosaveDebounceOptions: SelectOption[] = [
    { value: '1000', label: '1 segundo' },
    { value: '1500', label: '1.5 segundos' },
    { value: '3000', label: '3 segundos' },
  ];

  settings: AppSettingsData;

  constructor() {
    this.settings = this.appSettings.load();
  }

  onSave(): void {
    this.settings = this.appSettings.save(this.settings);
    this.toast.success('Preferencias guardadas.');
  }

  onReset(): void {
    this.settings = this.appSettings.reset();
    this.toast.info('Preferencias restablecidas al valor por defecto.');
  }

  onTranslationTargetToggle(event: Event): void {
    const checkbox = event.target as HTMLInputElement;
    const code = checkbox.value;
    const targetLanguages = this.settings.batchDefaults.translation.targetLanguages;

    if (checkbox.checked) {
      if (targetLanguages.includes(code)) {
        return;
      }
      if (targetLanguages.length >= 5) {
        checkbox.checked = false;
        return;
      }
      this.settings = {
        ...this.settings,
        batchDefaults: {
          ...this.settings.batchDefaults,
          translation: {
            ...this.settings.batchDefaults.translation,
            targetLanguages: [...targetLanguages, code],
          },
        },
      };
      return;
    }

    this.settings = {
      ...this.settings,
      batchDefaults: {
        ...this.settings.batchDefaults,
        translation: {
          ...this.settings.batchDefaults.translation,
          targetLanguages: targetLanguages.filter((lang) => lang !== code),
        },
      },
    };
  }

  isTargetLanguageSelected(code: string): boolean {
    return this.settings.batchDefaults.translation.targetLanguages.includes(code);
  }

  isTargetLanguageDisabled(code: string): boolean {
    const selected = this.settings.batchDefaults.translation.targetLanguages;
    if (selected.includes(code)) {
      return false;
    }
    return selected.length >= 5;
  }
}
