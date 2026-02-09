import { Game, SaveFile } from './types';

export const INITIAL_GAMES: Game[] = [
  {
    id: '1',
    title: 'Zork I: The Great Underground Empire',
    author: 'Infocom',
    description: 'The legendary interactive fantasy that started it all. Explore the underground empire, collect treasures, and beware the grue.',
    coverUrl: 'https://picsum.photos/id/1018/400/600',
    dateInstalled: '2023-01-15T10:00:00Z',
    lastPlayed: '2023-10-25T14:30:00Z',
    playtime: '12h 30m',
    genre: 'Fantasy'
  },
  {
    id: '2',
    title: 'The Hitchhiker\'s Guide to the Galaxy',
    author: 'Douglas Adams & Steve Meretzky',
    description: 'Don\'t panic! A text adventure game based on the book of the same name.',
    coverUrl: 'https://picsum.photos/id/1050/400/600',
    dateInstalled: '2023-05-20T09:00:00Z',
    lastPlayed: '2023-09-12T18:45:00Z',
    playtime: '5h 15m',
    genre: 'Sci-Fi'
  },
  {
    id: '3',
    title: 'Anchorhead',
    author: 'Michael Gentry',
    description: 'A tale of Lovecraftian horror. You have inherited an old mansion in a dreary New England town.',
    coverUrl: 'https://picsum.photos/id/1033/400/600',
    dateInstalled: '2023-08-10T11:20:00Z',
    lastPlayed: '2023-10-27T20:00:00Z',
    playtime: '8h 45m',
    genre: 'Horror'
  },
  {
    id: 'ai-1',
    title: 'Echoes of the Void (AI)',
    author: 'Gemini AI',
    description: 'An infinite, procedurally generated sci-fi mystery powered by Gemini. Every playthrough is unique.',
    coverUrl: 'https://picsum.photos/id/1002/400/600',
    dateInstalled: '2023-10-28T12:00:00Z',
    lastPlayed: '2023-10-28T12:05:00Z',
    playtime: '10m',
    genre: 'Sci-Fi (AI)',
    isAiStory: true
  }
];

export const STORE_GAMES: Game[] = [
  {
    id: '4',
    title: 'Spider and Web',
    author: 'Andrew Plotkin',
    description: 'A game about spies, deception, and the nature of reality.',
    coverUrl: 'https://picsum.photos/id/1040/400/600',
    dateInstalled: '',
    lastPlayed: '',
    playtime: '0m',
    genre: 'Espionage'
  },
  {
    id: '5',
    title: 'Galatea',
    author: 'Emily Short',
    description: 'An interaction with a living statue. A masterpiece of conversational IF.',
    coverUrl: 'https://picsum.photos/id/106/400/600',
    dateInstalled: '',
    lastPlayed: '',
    playtime: '0m',
    genre: 'Drama'
  },
  {
    id: '6',
    title: 'Photopia',
    author: 'Adam Cadre',
    description: 'A puzzle-light, story-heavy game that explores the impact of a single life.',
    coverUrl: 'https://picsum.photos/id/200/400/600',
    dateInstalled: '',
    lastPlayed: '',
    playtime: '0m',
    genre: 'Fiction'
  },
    {
    id: 'ai-2',
    title: 'The Haunted Manor (AI)',
    author: 'Gemini AI',
    description: 'Step into a classic gothic horror story generated in real-time.',
    coverUrl: 'https://picsum.photos/id/237/400/600',
    dateInstalled: '',
    lastPlayed: '',
    playtime: '0m',
    genre: 'Horror (AI)',
    isAiStory: true
  }
];

export const MOCK_SAVES: SaveFile[] = [
  { id: 's1', gameId: '1', timestamp: '2023-10-25T14:30:00Z', locationName: 'West of House', screenshotUrl: 'https://picsum.photos/id/10/100/100' },
  { id: 's2', gameId: '1', timestamp: '2023-10-20T09:15:00Z', locationName: 'Living Room' },
  { id: 's3', gameId: '3', timestamp: '2023-10-27T20:00:00Z', locationName: 'The Wharfs' },
];
