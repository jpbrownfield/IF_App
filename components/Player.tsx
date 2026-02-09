import React, { useState } from 'react';
import { Game, SaveFile } from '../types';
import { ArrowLeft, ExternalLink, RefreshCw } from 'lucide-react';

interface PlayerProps {
  game: Game;
  initialSave?: SaveFile;
  onExit: () => void;
}

const Player: React.FC<PlayerProps> = ({ game, onExit }) => {
  const [isLoading, setIsLoading] = useState(true);

  // We use iplayif.com (Parchment) which is the standard web-based Z-Machine/Glulx interpreter.
  // It accepts a 'story' parameter with the URL of the game file.
  // This runs the ACTUAL game code in a safe sandbox.
  const interpreterUrl = `https://iplayif.com/?story=${encodeURIComponent(game.fileUrl)}&do_vm_autosave=1`;

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col h-screen">
      {/* Header */}
      <div className="flex items-center justify-between p-2 bg-zinc-900 border-b border-zinc-800 h-14 shrink-0">
        <button 
          onClick={onExit} 
          className="text-zinc-400 hover:text-white transition-colors p-2 flex items-center"
        >
          <ArrowLeft size={20} className="mr-1" />
          <span className="text-sm font-medium">Library</span>
        </button>
        
        <div className="flex-1 text-center px-2">
            <h1 className="text-zinc-200 font-bold truncate text-sm">{game.title}</h1>
        </div>

        <a 
            href={game.fileUrl}
            target="_blank" 
            rel="noopener noreferrer"
            title="Download Source File"
            className="text-zinc-500 hover:text-indigo-400 p-2"
        >
          <ExternalLink size={18} />
        </a>
      </div>

      {/* Real Interpreter Iframe */}
      <div className="flex-1 relative bg-zinc-950 w-full">
        {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center text-zinc-500">
                <RefreshCw className="animate-spin mr-2" />
                Loading Interpreter...
            </div>
        )}
        <iframe
            title="Interactive Fiction Interpreter"
            src={interpreterUrl}
            className="absolute inset-0 w-full h-full border-0"
            onLoad={() => setIsLoading(false)}
            allow="clipboard-read; clipboard-write"
            sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
        />
      </div>
      
      {/* Footer hint */}
      <div className="bg-zinc-900 text-zinc-600 text-[10px] p-1 text-center shrink-0">
        Powered by Parchment • Saves are stored in browser storage by the interpreter
      </div>
    </div>
  );
};

export default Player;
