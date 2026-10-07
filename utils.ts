import { CatalogGame } from './types';

const STORY_EXTENSION = /\.(z3|z4|z5|z8|zblorb|zlb|gblorb|glb|ulx|blorb)$/i;

export function formatDate(value?: string): string {
  if (!value) return 'Not played yet';
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(value));
}

export function storyFileName(game: CatalogGame): string {
  if (game.fileName && STORY_EXTENSION.test(game.fileName)) return game.fileName;

  try {
    const name = decodeURIComponent(new URL(game.fileUrl).pathname.split('/').pop() ?? '');
    if (STORY_EXTENSION.test(name)) return name;
  } catch {
    // Older local-library records did not retain their original filename.
  }

  return 'story.z5';
}
