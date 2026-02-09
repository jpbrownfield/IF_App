import React from 'react';
import { AppTab } from '../types';
import { Library, ShoppingBag } from 'lucide-react';

interface NavigationProps {
  activeTab: AppTab;
  onTabChange: (tab: AppTab) => void;
}

const Navigation: React.FC<NavigationProps> = ({ activeTab, onTabChange }) => {
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-[#18181b] border-t border-zinc-800 px-6 py-2 pb-safe z-40">
      <div className="flex justify-around items-center max-w-md mx-auto">
        <button
          onClick={() => onTabChange(AppTab.Library)}
          className={`flex flex-col items-center p-2 rounded-lg transition-colors w-20 ${
            activeTab === AppTab.Library ? 'text-indigo-500' : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          <Library size={24} />
          <span className="text-[10px] mt-1 font-medium">Library</span>
        </button>
        <button
          onClick={() => onTabChange(AppTab.Store)}
          className={`flex flex-col items-center p-2 rounded-lg transition-colors w-20 ${
            activeTab === AppTab.Store ? 'text-indigo-500' : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          <ShoppingBag size={24} />
          <span className="text-[10px] mt-1 font-medium">Store</span>
        </button>
      </div>
    </div>
  );
};

export default Navigation;
