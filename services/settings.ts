import { AppSettings } from '../types';

const SETTINGS_KEY = 'fableforge.settings.v1';

export const DEFAULT_SETTINGS: AppSettings = {
  customKeyboard: false,
  keyboardShortcuts: true,
  glideTyping: false,
  keyboardColor: '#000000',
  fontSize: 17,
  backgroundColor: '#18181b',
  autosave: 'five-minutes',
};

export function readSettings(): AppSettings {
  try {
    const stored = JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}') as Partial<AppSettings>;
    const legacy = stored as Partial<AppSettings> & { swipeControls?: boolean };
    if (stored.glideTyping === undefined && typeof legacy.swipeControls === 'boolean') {
      stored.glideTyping = legacy.swipeControls;
    }
    delete legacy.swipeControls;
    if ((stored.autosave as string) === 'turn') stored.autosave = 'five-minutes';
    return { ...DEFAULT_SETTINGS, ...stored };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: AppSettings): void {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}
