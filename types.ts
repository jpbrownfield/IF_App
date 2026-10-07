export interface CatalogGame {
  id: string;
  title: string;
  author: string;
  description: string;
  fileUrl: string;
  fileName?: string;
  coverUrl?: string;
  ifdbUrl?: string;
  rating?: number;
  published?: string;
  format?: string;
}

export interface InstalledGame extends CatalogGame {
  installedAt: string;
  lastPlayedAt?: string;
}

export enum AppTab {
  Library = 'library',
  Store = 'store',
  Player = 'player',
  Settings = 'settings',
}

export type AutosaveMode = 'turn' | 'off';

export interface AppSettings {
  customKeyboard: boolean;
  keyboardShortcuts: boolean;
  swipeControls: boolean;
  keyboardColor: string;
  fontSize: number;
  backgroundColor: string;
  autosave: AutosaveMode;
}
