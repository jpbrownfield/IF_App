export interface Game {
  id: string;
  title: string;
  author: string;
  description: string;
  coverUrl: string;
  dateInstalled: string;
  lastPlayed: string;
  playtime: string;
  genre: string;
  isAiStory?: boolean; // If true, uses Gemini to generate the story
}

export interface SaveFile {
  id: string;
  gameId: string;
  timestamp: string;
  locationName: string;
  screenshotUrl?: string; // Placeholder for save state visual
}

export interface StoryMessage {
  id: string;
  role: 'system' | 'user' | 'assistant';
  text: string;
  imageUrl?: string; // If the user requested a visualization
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
