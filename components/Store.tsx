import { BookOpen, Download, FileUp, Link, LoaderCircle, Search, Trophy } from 'lucide-react';
import { ChangeEvent, useEffect, useMemo, useRef, useState } from 'react';
import awardWinners from '../data/award-winners.json';
import { loadCatalog } from '../services/catalog';
import { saveGameFile } from '../services/db';
import { CatalogGame, InstalledGame } from '../types';
import GameCover from './GameCover';

interface StoreProps {
  installedIds: string[];
  onInstall: (game: InstalledGame) => void;
  onOpenLibrary: () => void;
}

// Keep this list aligned with the formats bundled in our Parchment build.
const STORY_EXTENSIONS = /\.(z3|z4|z5|z8|zblorb|zlb|gblorb|glb|ulx|blorb)$/i;
const AWARDS_BY_IFDB_ID = new Map(awardWinners.map(award => [award.ifdbId, award]));

function awardForGame(game: CatalogGame) {
  return AWARDS_BY_IFDB_ID.get(game.ifdbId || game.id);
}

function titleFromFilename(filename: string): string {
  return filename.replace(STORY_EXTENSIONS, '').replace(/[-_]+/g, ' ').trim() || 'Imported story';
}

export default function Store({ installedIds, onInstall, onOpenLibrary }: StoreProps) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [section, setSection] = useState<'browse' | 'import'>('browse');
  const [collection, setCollection] = useState<'all' | 'awards'>('all');
  const [sortBy, setSortBy] = useState<'popular' | 'recent'>('popular');
  const [query, setQuery] = useState('');
  const [url, setUrl] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [addedTitle, setAddedTitle] = useState<string | null>(null);
  const [catalog, setCatalog] = useState<CatalogGame[]>([]);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [catalogLoading, setCatalogLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    loadCatalog(controller.signal)
      .then(setCatalog)
      .catch(reason => {
        if (reason instanceof DOMException && reason.name === 'AbortError') return;
        setCatalogError('The story catalog could not be loaded. You can still import a file or direct URL.');
      })
      .finally(() => setCatalogLoading(false));
    return () => controller.abort();
  }, []);

  const games = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    const matching = catalog.filter(game =>
      (collection === 'all' || awardForGame(game))
      && (!normalized || `${game.title} ${game.author}`.toLowerCase().includes(normalized)));
    return [...matching].sort((left, right) => {
      const primary = sortBy === 'popular'
        ? (right.ratingCount ?? -1) - (left.ratingCount ?? -1)
        : (right.published ?? '').localeCompare(left.published ?? '');
      return primary || left.title.localeCompare(right.title);
    });
  }, [catalog, collection, query, sortBy]);

  const awardCount = catalog.filter(game => awardForGame(game)).length;

  const installBlob = async (game: CatalogGame, blob: Blob) => {
    await saveGameFile(game.id, blob);
    onInstall({ ...game, installedAt: new Date().toISOString() });
    setAddedTitle(game.title);
  };

  const download = async (game: CatalogGame) => {
    setBusyId(game.id);
    setError(null);
    setAddedTitle(null);
    try {
      const response = await fetch(game.fileUrl);
      if (!response.ok) throw new Error(`The server returned ${response.status}.`);
      await installBlob(game, await response.blob());
    } catch (reason) {
      const detail = reason instanceof Error ? reason.message : 'Unknown error';
      setError(`Could not download "${game.title}". ${detail}`);
    } finally {
      setBusyId(null);
    }
  };

  const importUrl = async () => {
    const trimmedUrl = url.trim();
    if (!trimmedUrl) return;
    let parsed: URL;
    try {
      parsed = new URL(trimmedUrl);
      if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error();
    } catch {
      setError('Enter a valid http or https URL.');
      return;
    }
    const filename = decodeURIComponent(parsed.pathname.split('/').pop() || 'Imported story');
    if (!STORY_EXTENSIONS.test(filename)) {
      setError('The URL must end with a supported story-file extension.');
      return;
    }
    const game: CatalogGame = {
      id: `url-${crypto.randomUUID()}`,
      title: titleFromFilename(filename),
      author: 'Imported from URL',
      description: '',
      fileUrl: trimmedUrl,
      fileName: filename,
    };
    await download(game);
  };

  const importFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!STORY_EXTENSIONS.test(file.name)) {
      setError('Choose a Z-machine or Glulx story file.');
      return;
    }
    const game: CatalogGame = {
      id: `file-${crypto.randomUUID()}`,
      title: titleFromFilename(file.name),
      author: 'Local file',
      description: '',
      fileUrl: '',
      fileName: file.name,
    };
    setBusyId(game.id);
    setError(null);
    setAddedTitle(null);
    try {
      await installBlob(game, file);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not import that file.');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <section>
      <header className="page-header">
        <div>
          <p className="eyebrow">Find your next story</p>
          <h1>Browse Stories</h1>
        </div>
      </header>

      <div className="browse-mode-tabs" aria-label="Story source">
        <button type="button" aria-controls="browse-online-panel" aria-pressed={section === 'browse'}
          onClick={() => setSection('browse')}>
          <Search size={18} aria-hidden="true" /> Browse online
        </button>
        <button type="button" aria-controls="import-local-panel" aria-pressed={section === 'import'}
          onClick={() => setSection('import')}>
          <FileUp size={18} aria-hidden="true" /> Import local
        </button>
      </div>
      {addedTitle && <div className="install-success" role="status">
        <span>{addedTitle} was added to your library.</span>
        <button type="button" onClick={onOpenLibrary}><BookOpen size={16} aria-hidden="true" /> Open Library</button>
      </div>}
      {error && <p className="error-message catalog-error" role="alert">{error}</p>}

      {section === 'browse' && <div id="browse-online-panel">
        <div className="source-heading">
          <h2>Browse online stories</h2>
          <p>Discover playable stories from our IFDB and IF Archive catalog.</p>
        </div>
        <div className="collection-filter" role="group" aria-label="Story collection">
          <button type="button" aria-pressed={collection === 'all'} onClick={() => setCollection('all')}>All stories</button>
          <button type="button" aria-pressed={collection === 'awards'} onClick={() => setCollection('awards')}>
            <Trophy size={16} aria-hidden="true" /> Award Winners <span>{awardCount}</span>
          </button>
        </div>
        <label className="search-box">
          <Search size={18} aria-hidden="true" />
          <input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search online stories" />
        </label>

        <div className="section-heading browse-results-heading">
          <div>
            <h3>{collection === 'awards' ? 'Award Winners' : 'Stories'} <span className="result-count">{games.length}</span></h3>
            <p>{collection === 'awards'
              ? 'Verified winners with playable IF Archive files.'
              : 'Popular uses IFDB rating counts; Recent uses publication date.'}</p>
          </div>
          <label className="sort-control">Sort by
            <select value={sortBy} onChange={event => setSortBy(event.target.value as 'popular' | 'recent')}>
              <option value="popular">Popular</option>
              <option value="recent">Recent</option>
            </select>
          </label>
        </div>

        <div className="download-list">
          {games.map(game => {
            const installed = installedIds.includes(game.id);
            const busy = busyId === game.id;
            const award = awardForGame(game);
            return (
              <article className="download-card" key={game.id}>
                <GameCover id={game.id} title={game.title} coverUrl={game.coverUrl} compact />
                <div>
                  <h2>{game.title}</h2>
                  <p className="muted">{game.author}</p>
                  {(game.published || game.ratingCount !== undefined) && <p className="catalog-meta">
                    {[game.published, game.ratingCount !== undefined ? `${game.ratingCount} IFDB ratings` : ''].filter(Boolean).join(' | ')}
                  </p>}
                  {award && <p className="award-highlight">
                    <Trophy size={14} aria-hidden="true" />
                    {award.event} {award.year}: {award.honor}
                    <a href={award.sourceUrl} target="_blank" rel="noopener noreferrer"
                      aria-label={`Award source for ${game.title}`}>Source</a>
                  </p>}
                  <p>{game.description}</p>
                </div>
                <button className="download-button" aria-label={installed ? `${game.title} added` : `Download ${game.title}`}
                  disabled={installed || busyId !== null} onClick={() => download(game)}>
                  {busy ? <LoaderCircle className="spin" /> : installed ? 'Added' : <><Download size={17} /> Add</>}
                </button>
              </article>
            );
          })}
        </div>
        {catalogLoading && <p className="no-results">Loading story catalog...</p>}
        {catalogError && <p className="error-message catalog-error" role="alert">{catalogError}</p>}
        {!catalogLoading && !catalogError && games.length === 0 && (
          <p className="no-results">{collection === 'awards' && awardCount === 0
            ? 'No verified award winners are available in this catalog yet.'
            : 'No stories match that search.'}</p>
        )}
      </div>}
      {section === 'import' && <div id="import-local-panel">
        <div className="source-heading">
          <h2>Import your own story</h2>
          <p>Add a supported Z-machine or Glulx story file to your library.</p>
        </div>
        <div className="import-panel">
          <div className="import-method-heading">
            <FileUp size={20} aria-hidden="true" />
            <div><h3>From your device</h3><p>Choose a story file already saved on this phone or computer.</p></div>
          </div>
          <button type="button" className="secondary-button" disabled={busyId !== null}
            onClick={() => fileInput.current?.click()}>Choose story file</button>
          <input ref={fileInput} className="visually-hidden" type="file"
            accept=".z3,.z4,.z5,.z8,.zblorb,.zlb,.gblorb,.glb,.ulx,.blorb"
            onChange={importFile} />
          <div className="import-divider">or</div>
          <div className="import-method-heading">
            <Link size={20} aria-hidden="true" />
            <div><h3>From a direct URL</h3><p>Paste a link to a supported story file.</p></div>
          </div>
          <div className="url-row">
            <input aria-label="Story file URL" type="url" value={url}
              placeholder="https://example.com/story.z8" onChange={event => setUrl(event.target.value)} />
            <button type="button" onClick={importUrl} disabled={!url.trim() || busyId !== null}>Add</button>
          </div>
        </div>
      </div>}
    </section>
  );
}
