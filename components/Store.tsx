import React, { useState } from 'react';
import { Game } from '../types';
import { Search, Download, Star, TrendingUp } from 'lucide-react';
import { STORE_GAMES } from '../constants';

interface StoreProps {
  onInstall: (game: Game) => void;
  installedGameIds: string[];
}

const Store: React.FC<StoreProps> = ({ onInstall, installedGameIds }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<'popular' | 'new' | 'rating'>('popular');

  const filteredGames = STORE_GAMES.filter(game => 
    game.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    game.author.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="pb-24 p-4">
      <div className="sticky top-0 bg-[#18181b]/95 backdrop-blur-sm z-10 pb-4 border-b border-zinc-800 mb-6 -mx-4 px-4 pt-2">
         <h2 className="text-2xl font-bold text-zinc-100 mb-4">IFDB Store</h2>
         <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-zinc-500" size={18} />
            <input
              type="text"
              placeholder="Search by title or author..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-700 text-zinc-200 pl-10 pr-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent placeholder-zinc-600 transition-all"
            />
         </div>
         <div className="flex space-x-2 mt-4 overflow-x-auto pb-1 no-scrollbar">
            {['popular', 'new', 'rating'].map((f) => (
                <button
                    key={f}
                    onClick={() => setFilter(f as any)}
                    className={`px-4 py-1.5 rounded-full text-xs font-medium capitalize whitespace-nowrap border transition-colors ${
                        filter === f 
                        ? 'bg-zinc-100 text-zinc-900 border-zinc-100' 
                        : 'bg-transparent text-zinc-400 border-zinc-700 hover:border-zinc-500'
                    }`}
                >
                    {f}
                </button>
            ))}
         </div>
      </div>

      <div className="space-y-4">
        {filteredGames.map((game) => {
          const isInstalled = installedGameIds.includes(game.id);
          return (
            <div key={game.id} className="flex bg-zinc-900 p-4 rounded-xl border border-zinc-800 shadow-sm hover:border-zinc-600 transition-colors">
              <img 
                src={game.coverUrl} 
                alt={game.title} 
                className="w-20 h-28 object-cover rounded-lg shadow-md flex-shrink-0"
              />
              <div className="ml-4 flex-1 flex flex-col justify-between">
                <div>
                   <div className="flex justify-between items-start">
                     <h3 className="font-bold text-zinc-100">{game.title}</h3>
                     {game.isAiStory && <span className="text-[10px] bg-indigo-900/50 text-indigo-300 px-2 py-0.5 rounded border border-indigo-800">AI</span>}
                   </div>
                   <p className="text-xs text-zinc-400 mt-1">{game.author}</p>
                   <p className="text-sm text-zinc-500 mt-2 line-clamp-2">{game.description}</p>
                </div>
                <div className="flex justify-between items-center mt-3">
                  <div className="flex items-center space-x-3 text-xs text-zinc-600">
                     <div className="flex items-center"><Star size={10} className="mr-1 text-yellow-500" /> 4.8</div>
                     <div className="flex items-center"><TrendingUp size={10} className="mr-1" /> 98%</div>
                  </div>
                  <button
                    onClick={() => !isInstalled && onInstall(game)}
                    disabled={isInstalled}
                    className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center transition-all ${
                      isInstalled 
                        ? 'bg-zinc-800 text-zinc-500 cursor-default' 
                        : 'bg-zinc-100 text-zinc-900 hover:bg-indigo-500 hover:text-white'
                    }`}
                  >
                    {isInstalled ? 'Installed' : (
                        <>
                            <Download size={14} className="mr-1.5" />
                            Get
                        </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
        {filteredGames.length === 0 && (
            <div className="text-center py-12 text-zinc-500">
                <p>No games found matching "{searchTerm}"</p>
            </div>
        )}
      </div>
    </div>
  );
};

export default Store;
