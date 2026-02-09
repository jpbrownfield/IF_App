export interface Game {
  id: string;
  title: string;
  author: string;
  description: string;
  coverUrl: string;
  fileUrl: string; // The actual .z5, .z8, or .gblorb file URL
  dateInstalled: string;
  lastPlayed: string;
  playtime: string;
  genre: string;
  isAiStory?: boolean;
  rating?: number;
  publishDate?: string;
}

export interface SaveFile {
  id: string;
  gameId: string;
  timestamp: string;
  locationName: string;
  screenshotUrl?: string; 
}

export enum SortOption {
  Name = 'Name',
  DateInstalled = 'Date Installed',
  LastPlayed = 'Last Played'
}

export enum AppTab {
  Library = 'library',
  Store = 'store',
  Player = 'player'
}