
import React, { useState, useMemo } from 'react';
import { Game } from '../types';
import { Search, Download, Plus, Link as LinkIcon, AlertCircle, ExternalLink, Star, Loader2, Cloud, Check } from 'lucide-react';
import { STORE_GAMES, PLACEHOLDER_COVER } from '../constants';
import { searchGamesOnWeb } from '../services/ifdbService';
import { getProxiedImageUrl } from '../utils';
import { saveGameFile } from '../services/db';

interface StoreProps {
  onInstall: (game: Game) => void;
  installedGameIds: string[];
}

type StoreSortOption = 'Popular' | 'Recent' | 'Name';

const Store: React.FC<StoreProps> = ({ onInstall, installedGameIds }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [customUrl, setCustomUrl] = useState('');
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [sortBy, setSortBy] = useState<StoreSortOption>('Popular');
  
  // Search State
  const [isSearching, setIsSearching] = useState(false);
  const [isDownloadingId, setIsDownloadingId] = useState<string | null>(null);
  const [webResults, setWebResults] = useState<Game[]>([]);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = async () => {
    if (!searchTerm.trim()) return;
    setIsSearching(true);
    setHasSearched(true);
    setWebResults([]);
    try {
        const results = await searchGamesOnWeb(searchTerm);
        setWebResults(results);
    } catch (e) {
        console.error("Search failed", e);
    } finally {
        setIsSearching(false);
    }
  };

  const handleInstallWithDownload = async (game: Game) => {
    setIsDownloadingId(game.id);
    let blob: Blob | null = null;
    
    // Download Helper with Fallbacks
    const downloadStrategies = [
        // Strategy 1: CorsProxy.io (Usually fastest for binary)
        async () => {
             const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(game.fileUrl)}`;
             const res = await fetch(proxyUrl);
             if (!res.ok) throw new Error("CorsProxy failed");
             return await res.blob();
        },
        // Strategy 2: AllOrigins Raw (Reliable backup)
        async () => {
             const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(game.fileUrl)}`;
             const res = await fetch(proxyUrl);
             if (!res.ok) throw new Error("AllOrigins failed");
             return await res.blob();
        }
    ];

    try {
        // Try strategies in sequence
        for (const strategy of downloadStrategies) {
            try {
                blob = await strategy();
                if (blob && blob.size > 0) break;
            } catch (e) {
                console.warn("Download strategy failed, trying next...", e);
            }
        }

        if (!blob) throw new Error("All download strategies failed.");

        await saveGameFile(game.id, blob);
        
        // After successful download, add to library
        onInstall(game);
    } catch (error) {
        console.error("Download failed:", error);
        alert("Failed to download game. The source server might be blocking requests or down.");
    } finally {
        setIsDownloadingId(null);
    }
  };

  const displayGames = useMemo(() => {
    if (hasSearched) return webResults;
    let games = STORE_GAMES.filter(game => 
      game.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      game.author.toLowerCase().includes(searchTerm.toLowerCase())
    );
    return games.sort((a, b) => {
      switch (sortBy) {
        case 'Popular': return (b.rating || 0) - (a.rating || 0);
        case 'Recent': return new Date(b.publishDate || 0).getTime() - new Date(a.publishDate || 0).getTime();
        case 'Name': return a.title.localeCompare(b.title);
        default: return 0;
      }
    });
  }, [searchTerm, sortBy, webResults, hasSearched]);

  return (
    <div className="pb-24 p-4">
      {/* Header */}
      <div className="sticky top-0 bg-[#18181b]/95 backdrop-blur-sm z-10 pb-2 border-b border-zinc-800 mb-6 -mx-4 px-4 pt-2 shadow-lg">
         <div className="flex justify-between items-center mb-4">
             <h2 className="text-2xl font-bold text-zinc-100 flex items-center">
                {hasSearched ? <Cloud className="mr-2 text-indigo-400" size={24}/> : null}
                {hasSearched ? 'Web Search' : 'IF Archive'}
             </h2>
             <button onClick={() => setShowUrlInput(!showUrlInput)} className="text-indigo-400 hover:text-indigo-300 flex items-center text-sm font-medium">
                 <Plus size={16} className="mr-1" /> Import URL
             </button>
         </div>

         {showUrlInput && (
             <div className="bg-zinc-800 p-4 rounded-xl mb-4 animate-in fade-in slide-in-from-top-2">
                 <label className="block text-xs text-zinc-400 mb-2 uppercase font-bold">Direct File Import (.z5, .z8, .gblorb)</label>
                 <div className="flex space-x-2">
                     <div className="relative flex-1">
                        <LinkIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-zinc-500" size={16} />
                        <input type="url" placeholder="https://..." value={customUrl} onChange={(e) => setCustomUrl(e.target.value)} className="w-full bg-zinc-900 border border-zinc-700 text-zinc-200 pl-9 pr-4 py-2 rounded-lg text-sm outline-none" />
                     </div>
                     <button onClick={() => handleInstallWithDownload({ ...STORE_GAMES[0], id: `custom-${Date.now()}`, title: 'Custom Game', fileUrl: customUrl })} disabled={!customUrl} className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium">Install</button>
                 </div>
             </div>
         )}

         <div className="relative mb-3 flex space-x-2">
            <input type="text" placeholder="Search web..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSearch()} className="flex-1 bg-zinc-900 border border-zinc-700 text-zinc-200 pl-4 pr-4 py-3 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500" />
            <button onClick={handleSearch} disabled={isSearching || !searchTerm.trim()} className="bg-zinc-800 hover:bg-zinc-700 text-zinc-200 px-4 rounded-xl border border-zinc-700">
                {isSearching ? <Loader2 className="animate-spin" size={20}/> : 'Search'}
            </button>
         </div>
      </div>

      <div className="space-y-4">
        {displayGames.map((game) => {
          const isInstalled = installedGameIds.includes(game.id);
          const isDownloading = isDownloadingId === game.id;

          return (
            <div key={game.id} className="flex bg-zinc-900 p-4 rounded-xl border border-zinc-800 shadow-sm hover:border-zinc-600 transition-colors">
              <img src={getProxiedImageUrl(game.coverUrl)} alt={game.title} className="w-20 h-28 object-cover rounded-lg bg-zinc-800" />
              <div className="ml-4 flex-1 flex flex-col justify-between">
                <div>
                   <h3 className="font-bold text-zinc-100">{game.title}</h3>
                   <p className="text-xs text-zinc-400 mt-1">{game.author}</p>
                   <p className="text-sm text-zinc-500 mt-2 line-clamp-2">{game.description}</p>
                </div>
                <div className="flex justify-between items-center mt-3">
                    <span className="text-[10px] text-zinc-600"> {game.publishDate ? new Date(game.publishDate).getFullYear() : 'Unknown'} </span>
                    <button
                        onClick={() => !isInstalled && !isDownloading && handleInstallWithDownload(game)}
                        disabled={isInstalled || isDownloading}
                        className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center transition-all ${
                            isInstalled ? 'bg-zinc-800 text-emerald-500' : 'bg-zinc-100 text-zinc-900 hover:bg-indigo-500 hover:text-white'
                        }`}
                    >
                        {isDownloading ? <Loader2 className="animate-spin mr-1.5" size={14} /> : isInstalled ? <Check size={14} className="mr-1.5" /> : <Download size={14} className="mr-1.5" />}
                        {isDownloading ? 'Downloading...' : isInstalled ? 'Installed' : 'Install'}
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
