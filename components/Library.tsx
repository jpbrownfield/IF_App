import React, { useState, useMemo } from 'react';
import { Game, SortOption, SaveFile } from '../types';
import { Clock, Calendar, Play, FileText, ChevronDown, MoreVertical } from 'lucide-react';

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
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-zinc-100">Library</h2>
        <div className="relative group">
          <button className="flex items-center space-x-2 text-zinc-400 hover:text-zinc-200 transition-colors">
            <span className="text-sm font-medium">{sortBy}</span>
            <ChevronDown size={16} />
          </button>
          <div className="absolute right-0 mt-2 w-48 bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl overflow-hidden z-20 hidden group-hover:block">
            {Object.values(SortOption).map((option) => (
              <button
                key={option}
                onClick={() => setSortBy(option)}
                className={`w-full text-left px-4 py-2 text-sm ${sortBy === option ? 'bg-indigo-600 text-white' : 'text-zinc-300 hover:bg-zinc-700'}`}
              >
                {option}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {sortedGames.map((game) => (
          <div 
            key={game.id} 
            className={`bg-zinc-900 rounded-xl overflow-hidden border border-zinc-800 hover:border-zinc-600 transition-all duration-300 ${selectedGameId === game.id ? 'ring-2 ring-indigo-500' : ''}`}
          >
            <div className="relative h-48 cursor-pointer" onClick={() => handleGameClick(game.id)}>
              <img src={game.coverUrl} alt={game.title} className="w-full h-full object-cover opacity-80 hover:opacity-100 transition-opacity" />
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-4">
                <h3 className="font-bold text-lg text-white leading-tight truncate">{game.title}</h3>
                <p className="text-zinc-400 text-xs mt-1">{game.author}</p>
              </div>
              {game.isAiStory && (
                <div className="absolute top-2 right-2 bg-indigo-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-lg">
                  AI STORY
                </div>
              )}
            </div>

            <div className="p-4">
              <div className="flex justify-between items-center text-xs text-zinc-500 mb-3">
                <div className="flex items-center space-x-1">
                  <Clock size={12} />
                  <span>{new Date(game.lastPlayed).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Play size={12} />
                  <span>{game.playtime}</span>
                </div>
              </div>
              
              <p className="text-sm text-zinc-400 line-clamp-2 mb-4 h-10">
                {game.description}
              </p>

              {selectedGameId === game.id && (
                <div className="mt-4 space-y-2 animate-in fade-in slide-in-from-top-2 duration-200">
                  <button 
                    onClick={() => onPlayGame(game)}
                    className="w-full bg-indigo-600 hover:bg-indigo-500 text-white py-2 rounded-lg font-medium text-sm transition-colors flex items-center justify-center space-x-2"
                  >
                    <Play size={16} />
                    <span>Start New Game</span>
                  </button>
                  
                  {getSavesForGame(game.id).length > 0 && (
                     <div className="pt-2 border-t border-zinc-800">
                       <p className="text-xs text-zinc-500 mb-2 uppercase tracking-wider font-semibold">Load Save</p>
                       <div className="space-y-2 max-h-32 overflow-y-auto game-scroll pr-1">
                         {getSavesForGame(game.id).map(save => (
                           <button
                             key={save.id}
                             onClick={() => onPlayGame(game, save)}
                             className="w-full text-left bg-zinc-800 hover:bg-zinc-700 p-2 rounded flex items-center justify-between group"
                           >
                             <div>
                               <div className="text-xs text-zinc-200 font-medium">{save.locationName}</div>
                               <div className="text-[10px] text-zinc-500">{new Date(save.timestamp).toLocaleString()}</div>
                             </div>
                             <Play size={12} className="text-zinc-500 group-hover:text-indigo-400" />
                           </button>
                         ))}
                       </div>
                     </div>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
      {sortedGames.length === 0 && (
          <div className="text-center py-20 text-zinc-500">
              <FileText size={48} className="mx-auto mb-4 opacity-20" />
              <p>Your library is empty.</p>
              <p className="text-sm">Visit the Store to find games.</p>
          </div>
      )}
    </div>
  );
};

export default Library;
