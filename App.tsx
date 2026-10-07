import { useEffect, useState } from 'react';
import Library from './components/Library';
import Navigation from './components/Navigation';
import Player from './components/Player';
import Settings from './components/Settings';
import Store from './components/Store';
import { readSettings, saveSettings } from './services/settings';
import { AppTab, InstalledGame } from './types';

const LIBRARY_KEY = 'fableforge.library.v2';

function readLibrary(): InstalledGame[] {
  try {
    const value = localStorage.getItem(LIBRARY_KEY);
    return value ? JSON.parse(value) as InstalledGame[] : [];
  } catch {
    return [];
  }
}

export default function App() {
  const [activeTab, setActiveTab] = useState(AppTab.Library);
  const [games, setGames] = useState<InstalledGame[]>(readLibrary);
  const [activeGame, setActiveGame] = useState<InstalledGame | null>(null);
  const [settings, setSettings] = useState(readSettings);

  useEffect(() => {
    localStorage.setItem(LIBRARY_KEY, JSON.stringify(games));
  }, [games]);

  useEffect(() => saveSettings(settings), [settings]);

  const installGame = (game: InstalledGame) => {
    setGames(current => [game, ...current.filter(item => item.id !== game.id)]);
    setActiveTab(AppTab.Library);
  };

  const playGame = (game: InstalledGame) => {
    const updated = { ...game, lastPlayedAt: new Date().toISOString() };
    setGames(current => current.map(item => item.id === game.id ? updated : item));
    setActiveGame(updated);
    setActiveTab(AppTab.Player);
  };

  if (activeTab === AppTab.Player && activeGame) {
    return <Player game={activeGame} settings={settings} onExit={() => {
      setActiveGame(null);
      setActiveTab(AppTab.Library);
    }} />;
  }

  return (
    <div className="app-shell">
      <main className="app-content">
        {activeTab === AppTab.Library && <Library games={games} onPlay={playGame} />}
        {activeTab === AppTab.Store && <Store installedIds={games.map(game => game.id)} onInstall={installGame} />}
        {activeTab === AppTab.Settings && <Settings settings={settings} onChange={setSettings} />}
      </main>
      <Navigation activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  );
}
