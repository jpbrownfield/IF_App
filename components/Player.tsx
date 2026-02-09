
import React, { useState, useEffect, useRef } from 'react';
import { Game, SaveFile } from '../types';
import { ArrowLeft, RefreshCw, Save, CheckCircle, WifiOff, ZoomIn, ZoomOut, Info, X } from 'lucide-react';
import { getGameFile } from '../services/db';

interface PlayerProps {
  game: Game;
  initialSave?: SaveFile;
  onExit: () => void;
  onAutosave: () => void;
}

const Player: React.FC<PlayerProps> = ({ game, onExit, onAutosave }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [localUrl, setLocalUrl] = useState<string | null>(null);
  const [isOfflineMode, setIsOfflineMode] = useState(false);
  const [showSaveHelp, setShowSaveHelp] = useState(false);
  
  // Zoom state: Initialize from localStorage or default to 1.0
  const [zoom, setZoom] = useState(() => {
    const saved = localStorage.getItem('fableforge_zoom');
    return saved ? parseFloat(saved) : 1.0;
  });

  // Persist zoom setting whenever it changes
  useEffect(() => {
    localStorage.setItem('fableforge_zoom', zoom.toString());
  }, [zoom]);

  useEffect(() => {
    const prepareGame = async () => {
        try {
            const blob = await getGameFile(game.id);
            if (blob) {
                const url = URL.createObjectURL(blob);
                setLocalUrl(url);
                setIsOfflineMode(true);
            }
        } catch (e) {
            console.error("Could not load local file", e);
        }
    };
    prepareGame();
    return () => { if (localUrl) URL.revokeObjectURL(localUrl); };
  }, [game.id]);

  const onAutosaveRef = useRef(onAutosave);
  useEffect(() => { onAutosaveRef.current = onAutosave; }, [onAutosave]);

  const triggerSave = () => {
    setSaveStatus('saving');
    onAutosaveRef.current();
    
    // Simulate save delay for feedback
    setTimeout(() => {
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 3000);
    }, 800);
  };

  useEffect(() => {
    const intervalId = setInterval(() => triggerSave(), 120000);
    return () => clearInterval(intervalId);
  }, []);

  const handleExit = () => {
    onAutosaveRef.current();
    onExit();
  };

  // Zoom Increments: 0.07 is roughly 1pt in a standard 16px baseline
  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.07, 2.5));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.07, 0.6));

  const gameFileUrl = localUrl || game.fileUrl;
  
  // do_vm_autosave=1 ensures Parchment uses its internal browser storage
  const interpreterUrl = `https://iplayif.com/?story=${encodeURIComponent(gameFileUrl)}&do_vm_autosave=1`;

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col h-screen overflow-hidden">
      {/* Save Help Overlay */}
      {showSaveHelp && (
        <div className="absolute inset-0 z-[70] bg-black/80 backdrop-blur-sm flex items-center justify-center p-6 animate-in fade-in">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 max-w-xs w-full shadow-2xl">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-zinc-100 font-bold flex items-center">
                <Info size={18} className="mr-2 text-indigo-400" />
                How to Save Progress
              </h3>
              <button onClick={() => setShowSaveHelp(false)} className="text-zinc-500 hover:text-white">
                <X size={20} />
              </button>
            </div>
            <div className="space-y-4 text-sm text-zinc-400 leading-relaxed">
              <p>
                1. <span className="text-zinc-100 font-medium italic">Auto-Save:</span> FableForge syncs your session metadata every 2 minutes.
              </p>
              <p>
                2. <span className="text-zinc-100 font-medium italic">Manual Save:</span> To save your exact game state, type <span className="text-emerald-400 font-mono font-bold">SAVE</span> in the game input and press enter.
              </p>
              <p>
                3. <span className="text-zinc-100 font-medium italic">Restore:</span> Type <span className="text-amber-400 font-mono font-bold">RESTORE</span> to load your previous state.
              </p>
            </div>
            <button 
              onClick={() => setShowSaveHelp(false)}
              className="w-full mt-6 bg-indigo-600 text-white py-2 rounded-lg font-bold hover:bg-indigo-500 transition-colors"
            >
              Got it
            </button>
          </div>
        </div>
      )}

      {/* Status Toast */}
      <div className={`fixed top-16 left-1/2 -translate-x-1/2 z-[60] transition-all duration-500 transform ${
        saveStatus !== 'idle' ? 'translate-y-0 opacity-100' : '-translate-y-8 opacity-0'
      }`}>
        <div className="bg-emerald-600 text-white px-4 py-2 rounded-full shadow-2xl flex items-center space-x-2 text-sm font-bold border border-emerald-400/30">
          {saveStatus === 'saving' ? (
            <RefreshCw size={16} className="animate-spin" />
          ) : (
            <CheckCircle size={16} />
          )}
          <span>{saveStatus === 'saving' ? 'Syncing metadata...' : 'Progress Bookmarked'}</span>
        </div>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between px-2 bg-zinc-950 border-b border-zinc-800 h-14 shrink-0 relative shadow-md">
        <button 
          onClick={handleExit} 
          className="text-zinc-400 hover:text-white transition-colors p-2 flex items-center group shrink-0"
        >
          <ArrowLeft size={20} />
          <span className="text-xs font-bold ml-1 hidden sm:inline">Library</span>
        </button>
        
        <div className="flex-1 text-center px-1 flex flex-col justify-center items-center min-w-0">
            <h1 className="text-zinc-200 font-bold truncate text-[13px] w-full">{game.title}</h1>
            <div className="flex items-center space-x-1">
                {isOfflineMode && <WifiOff size={10} className="text-emerald-500" />}
                <span className="text-[9px] text-zinc-500 truncate uppercase tracking-tighter font-black">
                  {isOfflineMode ? 'Storage Play' : 'Remote Stream'}
                </span>
            </div>
        </div>

        <div className="flex items-center space-x-0.5 shrink-0">
            <button 
                onClick={() => setShowSaveHelp(true)}
                className="p-2 text-zinc-500 hover:text-indigo-400 transition-colors"
                title="Save Instructions"
            >
                <Info size={18} />
            </button>
            <button 
                onClick={triggerSave}
                disabled={saveStatus !== 'idle'}
                className={`p-2 transition-colors ${saveStatus !== 'idle' ? 'text-emerald-500' : 'text-zinc-400 hover:text-emerald-400'}`}
                title="Bookmark Session"
            >
                <Save size={20} />
            </button>
            <div className="h-4 w-[1px] bg-zinc-800 mx-1" />
            <button 
                onClick={handleZoomOut}
                className="text-zinc-400 hover:text-white p-2"
                title="Decrease Font Size (-1pt)"
            >
                <ZoomOut size={18} />
            </button>
            <button 
                onClick={handleZoomIn}
                className="text-zinc-400 hover:text-white p-2"
                title="Increase Font Size (+1pt)"
            >
                <ZoomIn size={18} />
            </button>
        </div>
      </div>

      {/* Interpreter Iframe */}
      <div className="flex-1 relative bg-zinc-950 w-full overflow-hidden">
        {isLoading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-zinc-500 z-10 bg-zinc-950">
                <RefreshCw className="animate-spin mb-4 text-indigo-500" size={32} />
                <p className="text-xs font-black uppercase tracking-widest">Waking Z-Machine...</p>
            </div>
        )}
        
        <div 
            className="absolute inset-0 origin-top-left transition-transform duration-300 ease-out"
            style={{ 
                transform: `scale(${zoom})`,
                width: `${100 / zoom}%`,
                height: `${100 / zoom}%`
            }}
        >
            <iframe
                key={gameFileUrl} 
                title="Interpreter"
                src={interpreterUrl}
                className="w-full h-full border-0"
                onLoad={() => setIsLoading(false)}
                allow="clipboard-read; clipboard-write"
                sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
            />
        </div>
      </div>
      
      <div className="bg-zinc-950 text-zinc-600 text-[9px] px-3 h-8 flex items-center justify-between shrink-0 border-t border-zinc-900 font-bold uppercase tracking-wider">
        <span>Zoom: {Math.round(zoom * 100)}%</span>
        <span>Type <span className="text-zinc-400">SAVE</span> to preserve state</span>
      </div>
    </div>
  );
};

export default Player;
