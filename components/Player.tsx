import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Game, SaveFile, StoryMessage } from '../types';
import { ArrowLeft, Send, Image as ImageIcon, Sparkles, Loader2, Save } from 'lucide-react';
import { generateStorySegment, visualizeScene } from '../services/geminiService';

interface PlayerProps {
  game: Game;
  initialSave?: SaveFile;
  onExit: () => void;
}

const Player: React.FC<PlayerProps> = ({ game, initialSave, onExit }) => {
  const [messages, setMessages] = useState<StoryMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isVisualizing, setIsVisualizing] = useState(false);
  
  // Gemini history tracking
  const [history, setHistory] = useState<{ role: 'user' | 'model'; parts: { text: string }[] }[]>([]);

  const scrollRef = useRef<HTMLDivElement>(null);

  // Initialize game
  useEffect(() => {
    const initGame = async () => {
      setIsLoading(true);
      let initialText = "";

      if (game.isAiStory) {
        // AI Game Initialization
        initialText = await generateStorySegment([], "Start a new story. Set the scene.");
      } else {
        // Classic Game Mock
        if (initialSave) {
          initialText = `Resuming ${game.title} from save: ${initialSave.locationName}.\n\nYou are standing in the ${initialSave.locationName}. It is exactly as you left it.`;
        } else {
          initialText = `Welcome to ${game.title}.\n\n(This is a simulated playthrough for demonstration. In a real app, this would run a Z-Machine interpreter.)\n\nYou are standing in an open field west of a white house, with a boarded front door. There is a small mailbox here.`;
        }
      }

      const initialMsg: StoryMessage = {
        id: 'init',
        role: 'assistant',
        text: initialText
      };
      
      setMessages([initialMsg]);
      setHistory([{ role: 'model', parts: [{ text: initialText }] }]);
      setIsLoading(false);
    };

    initGame();
  }, [game, initialSave]);

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isVisualizing]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMsg: StoryMessage = {
      id: Date.now().toString(),
      role: 'user',
      text: input
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      let responseText = "";
      
      if (game.isAiStory) {
         // Use real Gemini API for AI stories
         const newHistory = [...history, { role: 'user' as const, parts: [{ text: userMsg.text }] }];
         responseText = await generateStorySegment(newHistory, userMsg.text);
         setHistory([...newHistory, { role: 'model', parts: [{ text: responseText }] }]);
      } else {
         // Mock logic for "Classic" games
         await new Promise(r => setTimeout(r, 800)); // Simulate processing
         const cmd = userMsg.text.toLowerCase();
         if (cmd.includes('look')) responseText = "You see nothing special.";
         else if (cmd.includes('inventory') || cmd === 'i') responseText = "You are carrying nothing.";
         else if (cmd.includes('go') || cmd.includes('north') || cmd.includes('south')) responseText = "You can't go that way.";
         else responseText = "I don't understand that command.";
      }

      const aiMsg: StoryMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        text: responseText
      };
      setMessages(prev => [...prev, aiMsg]);

    } catch (err) {
      setMessages(prev => [...prev, { id: Date.now().toString(), role: 'system', text: "Error processing command." }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVisualize = async () => {
    const lastAiMessage = [...messages].reverse().find(m => m.role === 'assistant');
    if (!lastAiMessage || isVisualizing) return;

    setIsVisualizing(true);
    // Add a placeholder visualization message
    const visId = `vis-${Date.now()}`;
    
    // Find index to insert properly (after the text it visualizes)
    const msgIndex = messages.findIndex(m => m.id === lastAiMessage.id);
    
    try {
      const imageUrl = await visualizeScene(lastAiMessage.text);
      if (imageUrl) {
         setMessages(prev => prev.map(m => {
             if (m.id === lastAiMessage.id) {
                 return { ...m, imageUrl };
             }
             return m;
         }));
      }
    } catch (e) {
        console.error(e);
    } finally {
        setIsVisualizing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-[#121212] z-50 flex flex-col font-serif">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-[#18181b] border-b border-zinc-800 font-sans">
        <button onClick={onExit} className="text-zinc-400 hover:text-white transition-colors">
          <ArrowLeft size={24} />
        </button>
        <div className="text-center">
            <h1 className="text-zinc-200 font-bold truncate max-w-[200px]">{game.title}</h1>
            <span className="text-xs text-zinc-500 uppercase tracking-widest">{game.isAiStory ? 'AI Adventure' : 'Interactive Fiction'}</span>
        </div>
        <button className="text-zinc-400 hover:text-white transition-colors">
          <Save size={20} />
        </button>
      </div>

      {/* Game Output */}
      <div 
        ref={scrollRef} 
        className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6 game-scroll bg-[#121212]"
      >
        {messages.map((msg) => (
          <div key={msg.id} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
            {msg.role === 'user' ? (
               <div className="bg-zinc-800 text-zinc-300 px-4 py-2 rounded-lg rounded-tr-none max-w-[80%] font-sans text-sm">
                 <span className="text-indigo-400 font-bold mr-2">&gt;</span>
                 {msg.text}
               </div>
            ) : (
               <div className="w-full max-w-2xl">
                 <div className="text-lg md:text-xl text-zinc-300 leading-relaxed whitespace-pre-wrap">
                   {msg.text}
                 </div>
                 {msg.imageUrl && (
                     <div className="mt-4 animate-in fade-in duration-700">
                         <img src={msg.imageUrl} alt="Scene Visualization" className="rounded-lg border border-zinc-700 shadow-2xl w-full max-w-md" />
                     </div>
                 )}
               </div>
            )}
          </div>
        ))}
        {isLoading && (
            <div className="flex items-center space-x-2 text-zinc-500 text-sm font-sans animate-pulse">
                <Loader2 size={16} className="animate-spin" />
                <span>Thinking...</span>
            </div>
        )}
        {isVisualizing && (
            <div className="flex items-center space-x-2 text-indigo-400 text-sm font-sans animate-pulse ml-1">
                <Sparkles size={16} />
                <span>Generating imagination...</span>
            </div>
        )}
      </div>

      {/* Input Area */}
      <div className="p-4 bg-[#18181b] border-t border-zinc-800 font-sans">
        <div className="max-w-4xl mx-auto flex items-center space-x-2">
           <button 
             onClick={handleVisualize}
             disabled={isVisualizing || isLoading || messages.length === 0}
             className="p-3 text-zinc-400 hover:text-indigo-400 hover:bg-indigo-900/20 rounded-full transition-all disabled:opacity-30"
             title="Visualize Scene"
           >
             <ImageIcon size={20} />
           </button>
           <div className="flex-1 relative">
             <input
               type="text"
               value={input}
               onChange={(e) => setInput(e.target.value)}
               onKeyDown={(e) => e.key === 'Enter' && handleSend()}
               placeholder="What do you want to do?"
               disabled={isLoading}
               className="w-full bg-zinc-900 text-zinc-200 border border-zinc-700 rounded-full pl-5 pr-12 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-transparent transition-all"
               autoFocus
             />
             <button 
               onClick={handleSend}
               disabled={!input.trim() || isLoading}
               className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1.5 bg-indigo-600 text-white rounded-full hover:bg-indigo-500 disabled:bg-zinc-700 disabled:text-zinc-500 transition-colors"
             >
               <Send size={16} />
             </button>
           </div>
        </div>
      </div>
    </div>
  );
};

export default Player;
