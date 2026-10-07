import { CatalogGame } from '../types';

function isCatalogGame(value: unknown): value is CatalogGame {
  if (!value || typeof value !== 'object') return false;
  const game = value as Partial<CatalogGame>;
  return typeof game.id === 'string'
    && typeof game.title === 'string'
    && typeof game.author === 'string'
    && typeof game.description === 'string'
    && typeof game.fileUrl === 'string';
}

export async function loadCatalog(signal?: AbortSignal): Promise<CatalogGame[]> {
  const catalogUrl = new URL('catalog.json', document.baseURI);
  const response = await fetch(catalogUrl, { signal });
  if (!response.ok) throw new Error(`Catalog request returned ${response.status}.`);

  const value: unknown = await response.json();
  if (!Array.isArray(value)) throw new Error('Catalog data is not a list.');

  const games = value.filter(isCatalogGame);
  if (games.length === 0) throw new Error('Catalog contains no playable stories.');
  return games;
}
