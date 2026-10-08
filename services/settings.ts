import { AppSettings } from '../types';

const SETTINGS_KEY = 'fableforge.settings.v1';

export const DEFAULT_SETTINGS: AppSettings = {
  customKeyboard: false,
  keyboardShortcuts: true,
  swipeControls: false,
  keyboardColor: '#000000',
  fontSize: 17,
  backgroundColor: '#18181b',
  autosave: 'five-minutes',
};

export function readSettings(): AppSettings {
  try {
    const stored = JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}') as Partial<AppSettings>;
    if ((stored.autosave as string) === 'turn') stored.autosave = 'five-minutes';
    return { ...DEFAULT_SETTINGS, ...stored };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: AppSettings): void {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}
