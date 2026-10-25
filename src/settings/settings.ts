const STORAGE_KEY = "user-settings";

export const DEFAULT_MAXIMUM_TRIGGER_WORD_FREQUENCY = 7.396e-7;

export interface UserSettings {
  maximumTriggerWordFrequency(): number;
  setMaximumTriggerWordFrequency(value: number): void;
}

function toFrequency(value: number): number | null {
  if (!Number.isFinite(value)) return null;
  return Math.min(1, Math.max(0, value));
}

function load(storage: Storage): number {
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_MAXIMUM_TRIGGER_WORD_FREQUENCY;
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return DEFAULT_MAXIMUM_TRIGGER_WORD_FREQUENCY;
    const stored = (parsed as { maximumTriggerWordFrequency?: unknown }).maximumTriggerWordFrequency;
    if (typeof stored !== "number") return DEFAULT_MAXIMUM_TRIGGER_WORD_FREQUENCY;
    return toFrequency(stored) ?? DEFAULT_MAXIMUM_TRIGGER_WORD_FREQUENCY;
  } catch {
    return DEFAULT_MAXIMUM_TRIGGER_WORD_FREQUENCY;
  }
}

class Settings implements UserSettings {
  private mtwf: number;

  constructor(private readonly storage: Storage) {
    this.mtwf = load(storage);
  }

  maximumTriggerWordFrequency(): number {
    return this.mtwf;
  }

  setMaximumTriggerWordFrequency(value: number): void {
    const frequency = toFrequency(value);
    if (frequency === null) return;
    this.mtwf = frequency;
    try {
      this.storage.setItem(
        STORAGE_KEY,
        JSON.stringify({ maximumTriggerWordFrequency: frequency }),
      );
    } catch {
      // Ignore storage failures (e.g. quota exceeded or disabled storage).
    }
  }
}

export function createUserSettings(storage: Storage = sessionStorage): UserSettings {
  return new Settings(storage);
}
