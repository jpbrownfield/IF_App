import { Game, SaveFile } from './types';

// A generic dark placeholder image for when IFDB hotlinking fails
export const PLACEHOLDER_COVER = "https://placehold.co/400x600/18181b/52525b?text=IF";

// Real games hosted on the IF Archive or compatible mirrors
export const INITIAL_GAMES: Game[] = [
  {
    id: '1',
    title: '9:05',
    author: 'Adam Cadre',
    description: 'A short and snappy introduction to interactive fiction. You wake up and the phone is ringing.',
    coverUrl: 'https://ifdb.org/IMG/a1/3k/a13ky63j96q7566n.jpg',
    fileUrl: 'https://ifarchive.org/if-archive/games/zcode/905.z5',
    dateInstalled: '2023-01-15T10:00:00Z',
    lastPlayed: '2023-10-25T14:30:00Z',
    playtime: '15m',
    genre: 'Slice of Life',
    rating: 4.2,
    publishDate: '2000-01-01'
  },
  {
    id: '2',
    title: 'Lost Pig',
    author: 'Admiral Jota',
    description: 'A hilarious game about an orc trying to catch a pig. Winner of multiple XYZZY awards.',
    coverUrl: 'https://ifdb.org/IMG/63/h8/63h89mclj109a96o.jpg',
    fileUrl: 'https://ifarchive.org/if-archive/games/zcode/LostPig.z8',
    dateInstalled: '2023-05-20T09:00:00Z',
    lastPlayed: '2023-09-12T18:45:00Z',
    playtime: '2h',
    genre: 'Comedy',
    rating: 4.8,
    publishDate: '2007-09-01'
  }
];

export const STORE_GAMES: Game[] = [
  {
    id: '3',
    title: 'Spider and Web',
    author: 'Andrew Plotkin',
    description: 'A game about spies, deception, and the nature of reality. High difficulty.',
    coverUrl: 'https://ifdb.org/IMG/20/0x/200x53gb5k48p7.jpg',
    fileUrl: 'https://ifarchive.org/if-archive/games/zcode/Tangle.z5',
    dateInstalled: '',
    lastPlayed: '',
    playtime: '0m',
    genre: 'Espionage',
    rating: 4.9,
    publishDate: '1998-02-01'
  },
  {
    id: '4',
    title: 'Galatea',
    author: 'Emily Short',
    description: 'An interaction with a living statue. A masterpiece of conversational IF.',
    coverUrl: 'https://ifdb.org/IMG/pj/81/pj81n980p50n110.jpg',
    fileUrl: 'https://ifarchive.org/if-archive/games/zcode/Galatea.zblorb',
    dateInstalled: '',
    lastPlayed: '',
    playtime: '0m',
    genre: 'Drama',
    rating: 4.6,
    publishDate: '2000-02-01'
  },
  {
    id: '5',
    title: 'Dreamhold',
    author: 'Andrew Plotkin',
    description: 'Designed as a tutorial for new players, but rich with secrets for veterans.',
    coverUrl: 'https://ifdb.org/IMG/47/w2/47w207o87d3us13.jpg',
    fileUrl: 'https://ifarchive.org/if-archive/games/zcode/Dreamhold.z8',
    dateInstalled: '',
    lastPlayed: '',
    playtime: '0m',
    genre: 'Fantasy',
    rating: 4.5,
    publishDate: '2004-11-01'
  },
  {
    id: '6',
    title: 'Bronze',
    author: 'Emily Short',
    description: 'A retelling of Beauty and the Beast. Friendly to beginners.',
    coverUrl: 'https://ifdb.org/IMG/9b/a2/9ba2665m454x97a.jpg',
    fileUrl: 'https://ifarchive.org/if-archive/games/zcode/Bronze.z8',
    dateInstalled: '',
    lastPlayed: '',
    playtime: '0m',
    genre: 'Fairytale',
    rating: 4.3,
    publishDate: '2006-03-01'
  }
];

export const MOCK_SAVES: SaveFile[] = [];