import { BookOpen, Download, Settings } from 'lucide-react';
import { AppTab } from '../types';

interface NavigationProps {
  activeTab: AppTab;
  onTabChange: (tab: AppTab) => void;
}

export default function Navigation({ activeTab, onTabChange }: NavigationProps) {
  return (
    <nav className="bottom-nav" aria-label="Main navigation">
      <button className={activeTab === AppTab.Library ? 'active' : ''} onClick={() => onTabChange(AppTab.Library)}>
        <BookOpen aria-hidden="true" /><span>Library</span>
      </button>
      <button className={activeTab === AppTab.Store ? 'active' : ''} onClick={() => onTabChange(AppTab.Store)}>
        <Download aria-hidden="true" /><span>Browse Library</span>
      </button>
      <button className={activeTab === AppTab.Settings ? 'active' : ''} onClick={() => onTabChange(AppTab.Settings)}>
        <Settings aria-hidden="true" /><span>Settings</span>
      </button>
    </nav>
  );
}
