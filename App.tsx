import React, { useState, useEffect } from 'react';
import Library from './components/Library';
import Store from './components/Store';
import Player from './components/Player';
import Navigation from './components/Navigation';
import { AppTab, Game, SaveFile } from './types';
import { INITIAL_GAMES, MOCK_SAVES } from './constants';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<AppTab>(AppTab.Library);
  
  // State with LocalStorage persistence initialization
  const [libraryGames, setLibraryGames] = useState<Game[]>(() => {
    try {
      const saved = localStorage.getItem('fableforge_games');
      return saved ? JSON.parse(saved) : INITIAL_GAMES;
    } catch (e) {
      console.error("Failed to parse games from storage", e);
      return INITIAL_GAMES;
    }
  });

  const [saves, setSaves] = useState<SaveFile[]>(() => {
    try {
      const saved = localStorage.getItem('fableforge_saves');
      return saved ? JSON.parse(saved) : MOCK_SAVES;
    } catch (e) {
      console.error("Failed to parse saves from storage", e);
      return MOCK_SAVES;
    }
  });

  const [activeGame, setActiveGame] = useState<Game | null>(null);
  const [activeSave, setActiveSave] = useState<SaveFile | undefined>(undefined);
  
  // Persistence effects
  useEffect(() => {
    localStorage.setItem('fableforge_games', JSON.stringify(libraryGames));
  }, [libraryGames]);

  useEffect(() => {
    localStorage.setItem('fableforge_saves', JSON.stringify(saves));
  }, [saves]);

  const handleInstallGame = (game: Game) => {
    // Avoid duplicates
    if (libraryGames.some(g => g.id === game.id)) {
        setActiveTab(AppTab.Library);
        return;
    }

    const newGame = {
        ...game,
        dateInstalled: new Date().toISOString(),
        lastPlayed: new Date().toISOString(),
    };
    setLibraryGames(prev => [newGame, ...prev]);
    setActiveTab(AppTab.Library); 
  };

  const handlePlayGame = (game: Game, save?: SaveFile) => {
    setActiveGame(game);
    setActiveSave(save);
    setActiveTab(AppTab.Player);
  };

  const handleExitGame = () => {
    // Update last played
    if (activeGame) {
        setLibraryGames(prev => prev.map(g => 
            g.id === activeGame.id 
            ? { ...g, lastPlayed: new Date().toISOString() } 
            : g
        ));
    }
    setActiveGame(null);
    setActiveSave(undefined);
    setActiveTab(AppTab.Library);
  };

  const handleAutosave = () => {
    if (!activeGame) return;

    setSaves(prevSaves => {
        const now = new Date();
        const timestamp = now.toISOString();
        const saveId = `autosave-${activeGame.id}`;

        // Create or update a distinct "Autosave" entry for this game.
        // We use the cover URL as a placeholder screenshot since we can't capture the iframe.
        
        const existingAutosaveIndex = prevSaves.findIndex(s => s.id === saveId);
        
        const newSave: SaveFile = {
            id: saveId,
            gameId: activeGame.id,
            timestamp: timestamp,
            locationName: "Auto Save Point", 
            screenshotUrl: activeGame.coverUrl 
        };

        if (existingAutosaveIndex >= 0) {
            const updated = [...prevSaves];
            updated[existingAutosaveIndex] = newSave;
            return updated;
        }

        return [newSave, ...prevSaves];
    });
  };

  // Render content based on active tab
  const renderContent = () => {
    if (activeTab === AppTab.Player && activeGame) {
      return (
        <Player 
          game={activeGame} 
          initialSave={activeSave} 
          onExit={handleExitGame} 
          onAutosave={handleAutosave}
        />
      );
    }

    // Main layout for Library and Store
    return (
      <div className="min-h-screen bg-[#18181b] text-zinc-200">
        <main className="max-w-5xl mx-auto pt-4">
          {activeTab === AppTab.Library && (
            <Library 
              games={libraryGames} 
              saves={saves}
              onPlayGame={handlePlayGame} 
            />
          )}
          {activeTab === AppTab.Store && (
            <Store 
              onInstall={handleInstallGame} 
              installedGameIds={libraryGames.map(g => g.id)}
            />
          )}
        </main>
        <Navigation activeTab={activeTab} onTabChange={setActiveTab} />
      </div>
    );
  };

  return (
    <>
      {renderContent()}
    </>
  );
};

export default App;