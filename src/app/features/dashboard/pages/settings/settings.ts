import { Component, inject } from '@angular/core';

import { FormsModule } from '@angular/forms';
import { Button } from '../../../../shared/components/ui/button/button';
import { LANGUAGES, OPERATING_POINTS, TRANSLATION_TARGET_OPTIONS, SelectOption } from '../../../../core/integrations/speechmatics/constants';
import { AppSettingsData, AppSettingsService } from '../../../../core/services/app-settings/app-settings';
import { ToastService } from '../../../../core/services/toast/toast';

// TODO(FE-UI-001): Use a single SelectOption type shared by Speechmatics constants and app-select.

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [FormsModule, Button],
  templateUrl: './settings.html',
  styleUrl: './settings.scss'
})
export class Settings {
  private appSettings = inject(AppSettingsService);
  private toast = inject(ToastService);

  readonly languages = LANGUAGES;
  readonly operatingPoints = OPERATING_POINTS;
  readonly englishTranslationTargetOption: SelectOption = { value: 'en', label: 'Inglés' };
  // TODO(FE-UI-002): Migrate native Settings selects to app-select after option types are unified.
  readonly autosaveDebounceOptions: SelectOption[] = [
    { value: '1000', label: '1 segundo' },
    { value: '1500', label: '1.5 segundos' },
    { value: '3000', label: '3 segundos' },
  ];

  settings: AppSettingsData;

  constructor() {
    this.settings = this.appSettings.load();
    this.normalizeTranslationDefaults();
  }

  get translationTargetOptions(): SelectOption[] {
    return this.getTranslationTargetOptions(this.settings.batchDefaults.language);
  }

  get translationHelpText(): string {
    if (this.settings.batchDefaults.language === 'en') {
      return 'Origen inglés: puedes definir hasta 5 idiomas destino compatibles.';
    }

    if (this.translationTargetOptions.length > 0) {
      return 'Origen no inglés: Speechmatics solo permite traducir este idioma hacia inglés.';
    }

    return 'Traducción disponible solo entre inglés y los idiomas compatibles.';
  }

  onSave(): void {
    this.normalizeTranslationDefaults();
    this.settings = this.appSettings.save(this.settings);
    this.toast.success('Preferencias guardadas.');
  }

  onReset(): void {
    this.settings = this.appSettings.reset();
    this.normalizeTranslationDefaults();
    this.toast.info('Preferencias restablecidas al valor por defecto.');
  }

  onBatchLanguageChange(language: string): void {
    this.settings = {
      ...this.settings,
      batchDefaults: {
        ...this.settings.batchDefaults,
        language,
      },
    };
    this.normalizeTranslationDefaults();
  }

  onTranslationTargetToggle(event: Event): void {
    const checkbox = event.target as HTMLInputElement;
    const code = checkbox.value;
    const targetLanguages = this.settings.batchDefaults.translation.targetLanguages;

    if (checkbox.checked) {
      if (!this.translationTargetOptions.some((option) => option.value === code)) {
        checkbox.checked = false;
        return;
      }
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
    if (!this.translationTargetOptions.some((option) => option.value === code)) {
      return true;
    }
    if (selected.includes(code)) {
      return false;
    }
    return selected.length >= 5;
  }

  private normalizeTranslationDefaults(): void {
    const language = this.settings.batchDefaults.language;
    const validTargets = new Set(this.getTranslationTargetOptions(language).map((option) => option.value));
    const targetLanguages = this.settings.batchDefaults.translation.targetLanguages
      .filter((code) => code !== language && validTargets.has(code))
      .slice(0, 5);

    this.settings = {
      ...this.settings,
      batchDefaults: {
        ...this.settings.batchDefaults,
        translation: {
          ...this.settings.batchDefaults.translation,
          enabled: this.settings.batchDefaults.translation.enabled && validTargets.size > 0,
          targetLanguages,
        },
      },
    };
  }

  private getTranslationTargetOptions(sourceLanguage: string): SelectOption[] {
    if (sourceLanguage === 'en') {
      return TRANSLATION_TARGET_OPTIONS;
    }

    const canTranslateToEnglish = TRANSLATION_TARGET_OPTIONS.some((option) => option.value === sourceLanguage);
    return canTranslateToEnglish ? [this.englishTranslationTargetOption] : [];
  }
}
