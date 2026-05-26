
import React from 'react';
import { 
  Image, 
  Film, 
  Heart, 
  Lock, 
  Folder, 
  LayoutGrid, 
  Clock,
  MapPin,
  Settings,
  PlusCircle,
  FolderPlus,
  Trash2
} from 'lucide-react';
import { cn } from '../utils/cn';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onUpload: () => void;
  onCreateAlbum: () => void;
  onClearData: () => void;
  mediaCount: number;
  storageUsed: string;
}

const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab, onUpload, onCreateAlbum, onClearData, mediaCount, storageUsed }) => {
  const menuItems = [
    { id: 'photos', label: 'Photos', icon: Image },
    { id: 'videos', label: 'Videos', icon: Film },
    { id: 'favorites', label: 'Favorites', icon: Heart },
    { id: 'albums', label: 'Albums', icon: Folder },
    { id: 'locked', label: 'Secure Vault', icon: Lock },
  ];

  const categories = [
    { id: 'places', label: 'Places', icon: MapPin },
    { id: 'recent', label: 'Recent', icon: Clock },
  ];

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-zinc-950/50 backdrop-blur-xl border-r border-white/5 flex flex-col z-50 overflow-hidden">
      {/* Logo - fixed height */}
      <div className="flex items-center gap-3 px-6 pt-5 pb-4">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
          <LayoutGrid size={18} className="text-white" />
        </div>
        <h1 className="text-xl font-bold bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent tracking-tight">
          Lumina
        </h1>
      </div>

      {/* Scrollable nav area */}
      <nav className="flex-1 overflow-y-auto px-4 space-y-6 min-h-0">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-3 px-2">Library</p>
          <div className="space-y-0.5">
            {menuItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2 rounded-xl transition-all duration-200 group",
                  activeTab === item.id 
                    ? "bg-indigo-500/10 text-indigo-400 shadow-sm" 
                    : "text-zinc-400 hover:text-white hover:bg-white/5"
                )}
              >
                <item.icon size={18} className={cn(
                  "transition-transform duration-200 group-hover:scale-110",
                  activeTab === item.id ? "text-indigo-400" : "text-zinc-500 group-hover:text-zinc-300"
                )} />
                <span className="font-medium text-sm">{item.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-3 px-2">Organize</p>
          <div className="space-y-0.5">
            {categories.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2 rounded-xl transition-all duration-200 group",
                  activeTab === item.id 
                    ? "bg-indigo-500/10 text-indigo-400" 
                    : "text-zinc-400 hover:text-white hover:bg-white/5"
                )}
              >
                <item.icon size={18} className={cn(
                  "transition-transform duration-200 group-hover:scale-110",
                  activeTab === item.id ? "text-indigo-400" : "text-zinc-500 group-hover:text-zinc-300"
                )} />
                <span className="font-medium text-sm">{item.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Storage info */}
        <div className="px-2 py-2.5 bg-zinc-900/50 rounded-xl border border-white/5">
          <div className="flex justify-between items-center mb-1.5">
            <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Storage</p>
            <p className="text-[10px] text-zinc-500">{mediaCount} files</p>
          </div>
          <p className="text-sm font-semibold text-white">{storageUsed}</p>
          <div className="mt-1.5 h-1 bg-zinc-800 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-500" style={{ width: `${Math.min((mediaCount / 100) * 100, 100)}%` }} />
          </div>
        </div>
      </nav>

      {/* Bottom section - always visible */}
      <div className="px-4 pb-4 pt-2 space-y-2 border-t border-white/5 flex-shrink-0">
        <div className="flex gap-2">
          <button 
            onClick={onClearData}
            className="flex-1 flex items-center justify-center gap-2 px-2 py-2 rounded-xl text-zinc-500 hover:text-red-400 hover:bg-red-500/5 transition-all duration-200 text-xs"
            title="Clear All Data"
          >
            <Trash2 size={14} />
            <span className="font-medium">Clear</span>
          </button>
          <button 
            onClick={onCreateAlbum}
            className="flex-1 flex items-center justify-center gap-2 px-2 py-2 rounded-xl text-zinc-500 hover:text-white hover:bg-white/5 transition-all duration-200 text-xs"
            title="Create Album"
          >
            <FolderPlus size={14} />
            <span className="font-medium">Album</span>
          </button>
          <button 
            className="flex-1 flex items-center justify-center gap-2 px-2 py-2 rounded-xl text-zinc-500 hover:text-white hover:bg-white/5 transition-all duration-200 text-xs"
            title="Settings"
          >
            <Settings size={14} />
            <span className="font-medium">Settings</span>
          </button>
        </div>
        <button 
          onClick={onUpload}
          className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white transition-all duration-200 shadow-lg shadow-indigo-600/20 active:scale-[0.98]"
        >
          <PlusCircle size={18} />
          <span className="font-semibold text-sm">Upload New</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
