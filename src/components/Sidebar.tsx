
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
    <>
      {/* --- DESKTOP SIDEBAR --- */}
      <aside className="hidden md:flex fixed left-0 top-0 h-screen w-64 bg-zinc-950/40 glass-panel border-r border-white/5 flex-col z-50 overflow-hidden">
        {/* Logo - fixed height */}
        <div className="flex items-center gap-3 px-6 pt-6 pb-5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center shadow-lg shadow-indigo-500/30">
            <LayoutGrid size={18} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-white to-white/70 bg-clip-text text-transparent tracking-tight">
            Lumina
          </h1>
        </div>

        {/* Scrollable nav area */}
        <nav className="flex-1 overflow-y-auto px-4 space-y-8 min-h-0 no-scrollbar">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-3 px-2">Library</p>
            <div className="space-y-1">
              {menuItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-300 group",
                    activeTab === item.id 
                      ? "bg-indigo-500/15 text-indigo-400 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.1)]" 
                      : "text-zinc-400 hover:text-white hover:bg-white/5"
                  )}
                >
                  <item.icon size={18} className={cn(
                    "transition-transform duration-300 group-hover:scale-110",
                    activeTab === item.id ? "text-indigo-400" : "text-zinc-500 group-hover:text-zinc-300"
                  )} />
                  <span className="font-medium text-sm tracking-wide">{item.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-3 px-2">Organize</p>
            <div className="space-y-1">
              {categories.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-300 group",
                    activeTab === item.id 
                      ? "bg-indigo-500/15 text-indigo-400 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.1)]" 
                      : "text-zinc-400 hover:text-white hover:bg-white/5"
                  )}
                >
                  <item.icon size={18} className={cn(
                    "transition-transform duration-300 group-hover:scale-110",
                    activeTab === item.id ? "text-indigo-400" : "text-zinc-500 group-hover:text-zinc-300"
                  )} />
                  <span className="font-medium text-sm tracking-wide">{item.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Storage info */}
          <div className="px-3 py-3 bg-zinc-900/40 rounded-2xl border border-white/5 shadow-inner">
            <div className="flex justify-between items-center mb-2">
              <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Storage</p>
              <p className="text-[10px] text-zinc-400 font-medium">{mediaCount} files</p>
            </div>
            <p className="text-sm font-semibold text-white tracking-wide">{storageUsed}</p>
            <div className="mt-2 h-1.5 bg-zinc-950/50 rounded-full overflow-hidden shadow-inner">
              <div className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-700 ease-out" style={{ width: `${Math.min((mediaCount / 100) * 100, 100)}%` }} />
            </div>
          </div>
        </nav>

        {/* Bottom section - always visible */}
        <div className="px-4 pb-6 pt-4 space-y-3 border-t border-white/5 flex-shrink-0 bg-zinc-950/20">
          <div className="flex gap-2">
            <button 
              onClick={onClearData}
              className="flex-1 flex items-center justify-center gap-2 px-2 py-2.5 rounded-xl text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-all duration-300 text-xs group"
              title="Clear All Data"
            >
              <Trash2 size={14} className="group-hover:scale-110 transition-transform duration-300" />
              <span className="font-semibold">Clear</span>
            </button>
            <button 
              onClick={onCreateAlbum}
              className="flex-1 flex items-center justify-center gap-2 px-2 py-2.5 rounded-xl text-zinc-500 hover:text-white hover:bg-white/10 transition-all duration-300 text-xs group"
              title="Create Album"
            >
              <FolderPlus size={14} className="group-hover:scale-110 transition-transform duration-300" />
              <span className="font-semibold">Album</span>
            </button>
            <button 
              className="flex-1 flex items-center justify-center gap-2 px-2 py-2.5 rounded-xl text-zinc-500 hover:text-white hover:bg-white/10 transition-all duration-300 text-xs group"
              title="Settings"
            >
              <Settings size={14} className="group-hover:scale-110 transition-transform duration-300" />
              <span className="font-semibold">Settings</span>
            </button>
          </div>
          <button 
            onClick={onUpload}
            className="w-full flex items-center justify-center gap-2 px-3 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white transition-all duration-300 shadow-[0_0_20px_rgba(79,70,229,0.3)] hover:shadow-[0_0_25px_rgba(79,70,229,0.5)] active:scale-[0.98]"
          >
            <PlusCircle size={18} />
            <span className="font-semibold text-sm tracking-wide">Upload New</span>
          </button>
        </div>
      </aside>

      {/* --- MOBILE BOTTOM NAVIGATION --- */}
      <nav className="md:hidden fixed bottom-4 left-4 right-4 z-50 glass-panel rounded-2xl flex items-center justify-around px-2 py-3 shadow-2xl shadow-black/50">
        {[menuItems[0], menuItems[1], menuItems[3], menuItems[4]].map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={cn(
              "flex flex-col items-center justify-center gap-1 p-2 rounded-xl transition-all duration-300 w-16",
              activeTab === item.id 
                ? "text-indigo-400" 
                : "text-zinc-500 hover:text-zinc-300"
            )}
          >
            <item.icon size={20} className={cn(
              "transition-all duration-300",
              activeTab === item.id ? "scale-110 drop-shadow-[0_0_8px_rgba(99,102,241,0.5)]" : ""
            )} />
            <span className="text-[9px] font-semibold tracking-wide">{item.label}</span>
          </button>
        ))}
      </nav>

      {/* --- MOBILE FLOATING ACTION BUTTON (UPLOAD) --- */}
      <button
        onClick={onUpload}
        className="md:hidden fixed bottom-24 right-4 z-50 w-14 h-14 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white flex items-center justify-center shadow-[0_8px_25px_rgba(79,70,229,0.5)] transition-all duration-300 active:scale-95 border border-indigo-400/30"
      >
        <PlusCircle size={24} />
      </button>
    </>
  );
};

export default Sidebar;
