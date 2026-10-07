import { BookOpen, Play } from 'lucide-react';
import { InstalledGame } from '../types';
import { formatDate } from '../utils';
import GameCover from './GameCover';

interface LibraryProps {
  games: InstalledGame[];
  onPlay: (game: InstalledGame) => void;
}

export default function Library({ games, onPlay }: LibraryProps) {
  const sortedGames = [...games].sort((left, right) =>
    (right.lastPlayedAt ?? right.installedAt).localeCompare(left.lastPlayedAt ?? left.installedAt));

  return (
    <section>
      <header className="page-header">
        <div>
          <p className="eyebrow">Your stories</p>
          <h1>Library</h1>
        </div>
        <span className="count-badge">{games.length}</span>
      </header>

      {sortedGames.length === 0 ? (
        <div className="empty-state">
          <BookOpen size={42} aria-hidden="true" />
          <h2>Your library is empty</h2>
          <p>Download a story or import a story file to start reading.</p>
        </div>
      ) : (
        <div className="game-grid">
          {sortedGames.map(game => (
            <article className="game-card" key={game.id}>
              <GameCover id={game.id} title={game.title} coverUrl={game.coverUrl} />
              <div className="game-card-body">
                <div>
                  <h2>{game.title}</h2>
                  <p className="muted">{game.author}</p>
                </div>
                <p className="last-played">{formatDate(game.lastPlayedAt)}</p>
                <button className="primary-button" onClick={() => onPlay(game)}>
                  <Play size={17} fill="currentColor" aria-hidden="true" />
                  {game.lastPlayedAt ? 'Continue' : 'Start'}
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
