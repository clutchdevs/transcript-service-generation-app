import { Injectable } from '@angular/core';
import { STORAGE_KEYS } from '../../constants/storage';
import { OperatingPoint, SummaryContentType, SummaryLength, SummaryType } from '../../integrations/speechmatics/types';

export interface BatchDefaults {
  language: string;
  operatingPoint: OperatingPoint;
  summarization: {
    enabled: boolean;
    contentType: SummaryContentType;
    length: SummaryLength;
    type: SummaryType;
  };
  translation: {
    enabled: boolean;
    targetLanguages: string[];
  };
}

export interface EditorDefaults {
  autosaveEnabled: boolean;
  autosaveDebounceMs: number;
  startInEditableMode: boolean;
}

export interface RealtimeDefaults {
  region: 'eu' | 'us';
  maxDelay: number;
  enablePartials: boolean;
  diarization: 'none' | 'speaker' | 'channel';
}

export interface AppSettingsData {
  batchDefaults: BatchDefaults;
  editorDefaults: EditorDefaults;
  realtimeDefaults: RealtimeDefaults;
}

export const DEFAULT_APP_SETTINGS: AppSettingsData = {
  batchDefaults: {
    language: 'es',
    operatingPoint: 'standard',
    summarization: {
      enabled: false,
      contentType: 'auto',
      length: 'brief',
      type: 'bullets',
    },
    translation: {
      enabled: false,
      targetLanguages: [],
    },
  },
  editorDefaults: {
    autosaveEnabled: true,
    autosaveDebounceMs: 1500,
    startInEditableMode: false,
  },
  realtimeDefaults: {
    region: 'eu',
    maxDelay: 1,
    enablePartials: true,
    diarization: 'none',
  },
};

@Injectable({ providedIn: 'root' })
export class AppSettingsService {
  load(): AppSettingsData {
    try {
      const rawValue = localStorage.getItem(STORAGE_KEYS.APP_SETTINGS);
      if (!rawValue) {
        return this.cloneDefaults();
      }

      const parsed = JSON.parse(rawValue) as Partial<AppSettingsData>;
      return this.sanitize(parsed);
    } catch {
      return this.cloneDefaults();
    }
  }

  save(next: AppSettingsData): AppSettingsData {
    const sanitized = this.sanitize(next);
    localStorage.setItem(STORAGE_KEYS.APP_SETTINGS, JSON.stringify(sanitized));
    return sanitized;
  }

  reset(): AppSettingsData {
    const defaults = this.cloneDefaults();
    localStorage.setItem(STORAGE_KEYS.APP_SETTINGS, JSON.stringify(defaults));
    return defaults;
  }

  private sanitize(input: Partial<AppSettingsData>): AppSettingsData {
    const defaults = this.cloneDefaults();

    const autosaveDebounceRaw = input.editorDefaults?.autosaveDebounceMs;
    const autosaveDebounceMs = typeof autosaveDebounceRaw === 'number'
      ? autosaveDebounceRaw
      : Number(autosaveDebounceRaw);

    const maxDelayRaw = input.realtimeDefaults?.maxDelay;
    const maxDelay = typeof maxDelayRaw === 'number' ? maxDelayRaw : Number(maxDelayRaw);

    const rawTargets = input.batchDefaults?.translation?.targetLanguages;
    const targetLanguages = Array.isArray(rawTargets)
      ? rawTargets.filter((value): value is string => typeof value === 'string').slice(0, 5)
      : defaults.batchDefaults.translation.targetLanguages;

    return {
      batchDefaults: {
        language: input.batchDefaults?.language ?? defaults.batchDefaults.language,
        operatingPoint: input.batchDefaults?.operatingPoint ?? defaults.batchDefaults.operatingPoint,
        summarization: {
          enabled: input.batchDefaults?.summarization?.enabled ?? defaults.batchDefaults.summarization.enabled,
          contentType: input.batchDefaults?.summarization?.contentType ?? defaults.batchDefaults.summarization.contentType,
          length: input.batchDefaults?.summarization?.length ?? defaults.batchDefaults.summarization.length,
          type: input.batchDefaults?.summarization?.type ?? defaults.batchDefaults.summarization.type,
        },
        translation: {
          enabled: input.batchDefaults?.translation?.enabled ?? defaults.batchDefaults.translation.enabled,
          targetLanguages,
        },
      },
      editorDefaults: {
        autosaveEnabled: input.editorDefaults?.autosaveEnabled ?? defaults.editorDefaults.autosaveEnabled,
        autosaveDebounceMs: Number.isFinite(autosaveDebounceMs) ? autosaveDebounceMs : defaults.editorDefaults.autosaveDebounceMs,
        startInEditableMode: input.editorDefaults?.startInEditableMode ?? defaults.editorDefaults.startInEditableMode,
      },
      realtimeDefaults: {
        region: input.realtimeDefaults?.region ?? defaults.realtimeDefaults.region,
        maxDelay: Number.isFinite(maxDelay) ? maxDelay : defaults.realtimeDefaults.maxDelay,
        enablePartials: input.realtimeDefaults?.enablePartials ?? defaults.realtimeDefaults.enablePartials,
        diarization: input.realtimeDefaults?.diarization ?? defaults.realtimeDefaults.diarization,
      },
    };
  }

  private cloneDefaults(): AppSettingsData {
    return JSON.parse(JSON.stringify(DEFAULT_APP_SETTINGS)) as AppSettingsData;
  }
}
