import { Download, FileUp, Link, LoaderCircle, Search } from 'lucide-react';
import { ChangeEvent, useEffect, useMemo, useRef, useState } from 'react';
import { loadCatalog } from '../services/catalog';
import { saveGameFile } from '../services/db';
import { CatalogGame, InstalledGame } from '../types';
import GameCover from './GameCover';

interface StoreProps {
  installedIds: string[];
  onInstall: (game: InstalledGame) => void;
}

// Keep this list aligned with the formats bundled in our Parchment build.
const STORY_EXTENSIONS = /\.(z3|z4|z5|z8|zblorb|zlb|gblorb|glb|ulx|blorb)$/i;

function titleFromFilename(filename: string): string {
  return filename.replace(STORY_EXTENSIONS, '').replace(/[-_]+/g, ' ').trim() || 'Imported story';
}

export default function Store({ installedIds, onInstall }: StoreProps) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  const [url, setUrl] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
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
    return normalized
      ? catalog.filter(game => `${game.title} ${game.author}`.toLowerCase().includes(normalized))
      : catalog;
  }, [catalog, query]);

  const installBlob = async (game: CatalogGame, blob: Blob) => {
    await saveGameFile(game.id, blob);
    onInstall({ ...game, installedAt: new Date().toISOString() });
  };

  const download = async (game: CatalogGame) => {
    setBusyId(game.id);
    setError(null);
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
          <h1>Browse Library</h1>
        </div>
      </header>

      <div className="import-panel">
        <button className="secondary-button" onClick={() => fileInput.current?.click()}>
          <FileUp size={18} aria-hidden="true" /> Import from device
        </button>
        <input ref={fileInput} className="visually-hidden" type="file"
          accept=".z3,.z4,.z5,.z8,.zblorb,.zlb,.gblorb,.glb,.ulx,.blorb"
          onChange={importFile} />
        <div className="url-row">
          <Link size={18} aria-hidden="true" />
          <input aria-label="Story file URL" type="url" value={url}
            placeholder="https://example.com/story.z8" onChange={event => setUrl(event.target.value)} />
          <button onClick={importUrl} disabled={!url.trim() || busyId !== null}>Add</button>
        </div>
        {error && <p className="error-message" role="alert">{error}</p>}
      </div>

      <label className="search-box">
        <Search size={18} aria-hidden="true" />
        <input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search online stories" />
      </label>

      <div className="section-heading">
        <div>
          <h2>Online stories</h2>
          <p>IFDB discovery - playable files from the IF Archive</p>
        </div>
        <span>{games.length}</span>
      </div>

      <div className="download-list">
        {games.map(game => {
          const installed = installedIds.includes(game.id);
          const busy = busyId === game.id;
          return (
            <article className="download-card" key={game.id}>
              <GameCover id={game.id} title={game.title} coverUrl={game.coverUrl} compact />
              <div>
                <h2>{game.title}</h2>
                <p className="muted">{game.author}</p>
                <p>{game.description}</p>
              </div>
              <button className="download-button" aria-label={`Download ${game.title}`}
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
        <p className="no-results">No stories match that search.</p>
      )}
    </section>
  );
}
