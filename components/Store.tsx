import React, { useState } from 'react';
import { Game } from '../types';
import { Search, Download, Plus, Globe, Link as LinkIcon, AlertCircle, ExternalLink } from 'lucide-react';
import { STORE_GAMES } from '../constants';

interface StoreProps {
  onInstall: (game: Game) => void;
  installedGameIds: string[];
}

const Store: React.FC<StoreProps> = ({ onInstall, installedGameIds }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [customUrl, setCustomUrl] = useState('');
  const [showUrlInput, setShowUrlInput] = useState(false);

  const filteredGames = STORE_GAMES.filter(game => 
    game.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    game.author.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCustomInstall = () => {
    if (!customUrl) return;
    
    // Basic validation
    let title = "Imported Game";
    try {
        const urlParts = customUrl.split('/');
        const filename = urlParts[urlParts.length - 1];
        title = filename.replace(/\.(z5|z8|zblorb|ulx)$/, '');
    } catch (e) {}

    const newGame: Game = {
        id: `custom-${Date.now()}`,
        title: title,
        author: 'Unknown Author',
        description: 'Manually imported from URL.',
        coverUrl: 'https://picsum.photos/400/600?grayscale',
        fileUrl: customUrl,
        dateInstalled: '',
        lastPlayed: '',
        playtime: '0m',
        genre: 'Imported'
    };
    
    onInstall(newGame);
    setCustomUrl('');
    setShowUrlInput(false);
  };

  return (
    <div className="pb-24 p-4">
      {/* Header */}
      <div className="sticky top-0 bg-[#18181b]/95 backdrop-blur-sm z-10 pb-4 border-b border-zinc-800 mb-6 -mx-4 px-4 pt-2">
         <div className="flex justify-between items-center mb-4">
             <h2 className="text-2xl font-bold text-zinc-100">IF Archive</h2>
             <button 
                onClick={() => setShowUrlInput(!showUrlInput)}
                className="text-indigo-400 hover:text-indigo-300 flex items-center text-sm font-medium"
             >
                 <Plus size={16} className="mr-1" />
                 Import URL
             </button>
         </div>

         {showUrlInput && (
             <div className="bg-zinc-800 p-4 rounded-xl mb-4 animate-in fade-in slide-in-from-top-2">
                 <label className="block text-xs text-zinc-400 mb-2 uppercase font-bold">Direct File Import (.z5, .z8, .gblorb)</label>
                 <div className="flex space-x-2">
                     <div className="relative flex-1">
                        <LinkIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-zinc-500" size={16} />
                        <input 
                            type="url" 
                            placeholder="https://ifarchive.org/.../game.z5" 
                            value={customUrl}
                            onChange={(e) => setCustomUrl(e.target.value)}
                            className="w-full bg-zinc-900 border border-zinc-700 text-zinc-200 pl-9 pr-4 py-2 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                        />
                     </div>
                     <button 
                        onClick={handleCustomInstall}
                        disabled={!customUrl}
                        className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-500 disabled:opacity-50"
                     >
                         Install
                     </button>
                 </div>
                 <p className="text-[10px] text-zinc-500 mt-2 flex items-center">
                    <AlertCircle size={10} className="mr-1" />
                    Ensure the URL allows CORS (Cross-Origin) requests.
                 </p>
             </div>
         )}

         <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-zinc-500" size={18} />
            <input
              type="text"
              placeholder="Filter repository..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-700 text-zinc-200 pl-10 pr-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent placeholder-zinc-600 transition-all"
            />
         </div>
      </div>

      {/* External Link Hint */}
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-4 mb-6 flex items-start">
        <Globe className="text-zinc-500 mt-1 shrink-0" size={16} />
        <div className="ml-3">
            <h4 className="text-sm font-bold text-zinc-300">Browse the Database</h4>
            <p className="text-xs text-zinc-500 mt-1 mb-2">
                Use the Interactive Fiction Database (IFDB) to find games. 
                Copy the "Download" link of any Z-Machine game and paste it in the Import tool above.
            </p>
            <a 
                href="https://ifdb.org/search?sortby=rat&newSortBy.x=0&newSortBy.y=0&searchfor=format%3Az-machine" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-xs text-indigo-400 hover:text-indigo-300 font-medium inline-flex items-center"
            >
                Open IFDB Top Rated <ExternalLink size={10} className="ml-1" />
            </a>
        </div>
      </div>

      {/* Curated List */}
      <div className="space-y-4">
        {filteredGames.map((game) => {
          const isInstalled = installedGameIds.includes(game.id);
          return (
            <div key={game.id} className="flex bg-zinc-900 p-4 rounded-xl border border-zinc-800 shadow-sm hover:border-zinc-600 transition-colors">
              <img 
                src={game.coverUrl} 
                alt={game.title} 
                className="w-20 h-28 object-cover rounded-lg shadow-md flex-shrink-0 bg-zinc-800"
              />
              <div className="ml-4 flex-1 flex flex-col justify-between">
                <div>
                   <h3 className="font-bold text-zinc-100">{game.title}</h3>
                   <p className="text-xs text-zinc-400 mt-1">{game.author}</p>
                   <p className="text-sm text-zinc-500 mt-2 line-clamp-2">{game.description}</p>
                </div>
                <div className="flex justify-end mt-3">
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
                            Install
                        </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Store;