import React, { useState, useEffect } from 'react';
import Library from './components/Library';
import Store from './components/Store';
import Player from './components/Player';
import Navigation from './components/Navigation';
import { AppTab, Game, SaveFile } from './types';
import { INITIAL_GAMES, MOCK_SAVES } from './constants';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<AppTab>(AppTab.Library);
  const [libraryGames, setLibraryGames] = useState<Game[]>(INITIAL_GAMES);
  const [activeGame, setActiveGame] = useState<Game | null>(null);
  const [activeSave, setActiveSave] = useState<SaveFile | undefined>(undefined);
  
  // Load initial state (simulated)
  useEffect(() => {
     // In a real app, we'd load from localStorage or IndexedDB here
  }, []);

  const handleInstallGame = (game: Game) => {
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

  // Render content based on active tab
  const renderContent = () => {
    if (activeTab === AppTab.Player && activeGame) {
      return (
        <Player 
          game={activeGame} 
          initialSave={activeSave} 
          onExit={handleExitGame} 
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
              saves={MOCK_SAVES}
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
