import React, { useState, useMemo } from 'react';
import { Game, SortOption, SaveFile } from '../types';
import { Clock, Play, FileText, Bookmark } from 'lucide-react';
import { PLACEHOLDER_COVER } from '../constants';
import { getProxiedImageUrl } from '../utils';

interface LibraryProps {
  games: Game[];
  saves: SaveFile[];
  onPlayGame: (game: Game, save?: SaveFile) => void;
}

const Library: React.FC<LibraryProps> = ({ games, saves, onPlayGame }) => {
  const [sortBy, setSortBy] = useState<SortOption>(SortOption.LastPlayed);
  const [selectedGameId, setSelectedGameId] = useState<string | null>(null);

  const sortedGames = useMemo(() => {
    return [...games].sort((a, b) => {
      switch (sortBy) {
        case SortOption.Name:
          return a.title.localeCompare(b.title);
        case SortOption.DateInstalled:
          return new Date(b.dateInstalled).getTime() - new Date(a.dateInstalled).getTime();
        case SortOption.LastPlayed:
          return new Date(b.lastPlayed).getTime() - new Date(a.lastPlayed).getTime();
        default:
          return 0;
      }
    });
  }, [games, sortBy]);

  const handleGameClick = (id: string) => {
    setSelectedGameId(selectedGameId === id ? null : id);
  };

  const getSavesForGame = (gameId: string) => saves.filter(s => s.gameId === gameId);

  return (
    <div className="pb-24 p-4">
      {/* Header & Sort */}
      <div className="sticky top-0 bg-[#18181b]/95 backdrop-blur-sm z-10 pb-2 border-b border-zinc-800 mb-6 -mx-4 px-4 pt-4 shadow-lg">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-zinc-100">Library</h2>
          <span className="text-xs text-zinc-500 font-medium px-2 py-1 bg-zinc-900 rounded-md border border-zinc-800">
            {games.length} {games.length === 1 ? 'Game' : 'Games'}
          </span>
        </div>
        
        <div className="flex space-x-2 pb-2 overflow-x-auto no-scrollbar">
            {Object.values(SortOption).map((option) => (
              <button
                key={option}
                onClick={() => setSortBy(option)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors border whitespace-nowrap ${
                    sortBy === option 
                    ? 'bg-zinc-100 text-zinc-900 border-zinc-100' 
                    : 'bg-transparent text-zinc-400 border-zinc-700 hover:border-zinc-500 hover:text-zinc-200'
                }`}
              >
                {option}
              </button>
            ))}
        </div>
      </div>

      {/* Compact Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {sortedGames.map((game) => {
          const gameSaves = getSavesForGame(game.id);
          const hasSaves = gameSaves.length > 0;

          return (
            <div 
              key={game.id} 
              className={`bg-zinc-900 rounded-xl overflow-hidden border transition-all duration-300 shadow-sm flex flex-col ${
                selectedGameId === game.id 
                  ? 'ring-2 ring-indigo-500 border-indigo-500' 
                  : 'border-zinc-800 hover:border-zinc-600'
              }`}
            >
              {/* Horizontal Card Layout */}
              <div 
                className="flex flex-row h-32 cursor-pointer relative" 
                onClick={() => handleGameClick(game.id)}
              >
                {/* Cover Image */}
                <div className="w-24 shrink-0 bg-zinc-950 relative overflow-hidden">
                  <img 
                    src={getProxiedImageUrl(game.coverUrl)} 
                    alt={game.title} 
                    className="w-full h-full object-cover opacity-90 transition-opacity hover:opacity-100"
                    loading="lazy"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = PLACEHOLDER_COVER;
                      (e.target as HTMLImageElement).onerror = null; 
                    }}
                  />
                  {game.isAiStory && (
                    <div className="absolute top-1 left-1 bg-indigo-600/90 backdrop-blur text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow-sm">
                      AI
                    </div>
                  )}
                  {hasSaves && (
                    <div className="absolute bottom-1 right-1 bg-emerald-600 text-white p-1 rounded shadow-sm">
                      <Bookmark size={10} className="fill-current" />
                    </div>
                  )}
                </div>

                {/* Main Info */}
                <div className="flex-1 p-3 flex flex-col justify-between overflow-hidden">
                  <div>
                    <h3 className="font-bold text-zinc-100 text-sm leading-tight truncate pr-2">{game.title}</h3>
                    <p className="text-zinc-400 text-xs truncate mt-0.5">{game.author}</p>
                  </div>
                  
                  <p className="text-xs text-zinc-500 line-clamp-2 mt-1 mb-1 leading-relaxed">
                    {game.description}
                  </p>

                  <div className="flex items-center space-x-3 text-[10px] text-zinc-500 font-medium">
                    <div className="flex items-center">
                        <Clock size={10} className="mr-1" />
                        <span>{new Date(game.lastPlayed).toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center">
                        <Play size={10} className="mr-1" />
                        <span>{game.playtime}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Expanded Actions */}
              {selectedGameId === game.id && (
                <div className="px-3 pb-3 pt-0 animate-in fade-in slide-in-from-top-1 duration-200 bg-zinc-900 border-t border-zinc-800/50">
                  <div className="mt-3 flex flex-col space-y-2">
                      {hasSaves && (
                        <div className="bg-zinc-800/30 rounded-lg p-2 border border-zinc-800">
                          <p className="text-[10px] text-zinc-500 mb-1.5 uppercase tracking-wider font-black flex items-center">
                            <Bookmark size={10} className="mr-1" />
                            Resume Latest Progress
                          </p>
                          <div className="space-y-1.5 max-h-32 overflow-y-auto game-scroll">
                            {gameSaves.map(save => (
                              <button
                                key={save.id}
                                onClick={() => onPlayGame(game, save)}
                                className="w-full text-left bg-emerald-950/20 hover:bg-emerald-950/40 p-2.5 rounded border border-emerald-900/30 hover:border-emerald-500/50 flex items-center justify-between group transition-all"
                              >
                                <div className="min-w-0">
                                  <div className="text-xs text-emerald-100 font-bold truncate">{save.locationName}</div>
                                  <div className="text-[9px] text-zinc-500">{new Date(save.timestamp).toLocaleString()}</div>
                                </div>
                                <Play size={14} className="text-emerald-500 group-hover:scale-110 transition-transform shrink-0 ml-2" />
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      <button 
                        onClick={() => onPlayGame(game)}
                        className={`w-full py-2 rounded-lg font-bold text-xs transition-all flex items-center justify-center space-x-1.5 shadow-lg ${
                          hasSaves 
                            ? 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700 hover:text-white border border-zinc-700' 
                            : 'bg-indigo-600 text-white hover:bg-indigo-500 shadow-indigo-900/20'
                        }`}
                      >
                        <Play size={14} />
                        <span>{hasSaves ? 'Start New Game' : 'Play Now'}</span>
                      </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {sortedGames.length === 0 && (
          <div className="text-center py-20 text-zinc-500">
              <FileText size={48} className="mx-auto mb-4 opacity-20" />
              <p>Your library is empty.</p>
              <p className="text-sm mt-1">Visit the Store to find games.</p>
          </div>
      )}
    </div>
  );
};

export default Library;