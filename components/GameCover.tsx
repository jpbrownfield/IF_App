import { CSSProperties, useState } from 'react';

interface GameCoverProps {
  id: string;
  title: string;
  compact?: boolean;
  coverUrl?: string;
}

const PALETTES = [
  ['#4338ca', '#111827'],
  ['#be123c', '#292524'],
  ['#0f766e', '#172554'],
  ['#a16207', '#3f1d2e'],
  ['#7e22ce', '#1e293b'],
  ['#0369a1', '#312e81'],
];

function hash(value: string): number {
  return [...value].reduce((total, character) => total + character.charCodeAt(0), 0);
}

function initials(title: string): string {
  const words = title.replace(/[^a-z0-9 ]/gi, '').split(/\s+/).filter(Boolean);
  return words.slice(0, 2).map(word => word[0]).join('').toUpperCase() || 'IF';
}

export default function GameCover({ id, title, compact = false, coverUrl }: GameCoverProps) {
  const [imageFailed, setImageFailed] = useState(false);
  const [from, to] = PALETTES[hash(id) % PALETTES.length];
  const style = { '--cover-from': from, '--cover-to': to } as CSSProperties;

  if (coverUrl && !imageFailed) {
    return (
      <img
        className={`story-cover-image${compact ? ' compact' : ''}`}
        src={coverUrl}
        alt=""
        loading="lazy"
        onError={() => setImageFailed(true)}
      />
    );
  }

  return (
    <div className={`story-cover${compact ? ' compact' : ''}`} style={style} aria-hidden="true">
      <span className="story-cover-mark">{initials(title)}</span>
      <span className="story-cover-title">{title}</span>
    </div>
  );
}
