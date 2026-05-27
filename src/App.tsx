
import React, { useState, useMemo, useCallback, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import MediaCard from './components/MediaCard';
import MediaViewer from './components/MediaViewer';
import SecureVault from './components/SecureVault';
import AlbumCard from './components/AlbumCard';
import UploadModal from './components/UploadModal';
import CreateAlbumModal from './components/CreateAlbumModal';
import { useLocalStorage } from './hooks/useLocalStorage';

import { MediaItem, Album, SortOption, GridSize } from './types';
import {
  Show,
  SignInButton,
  SignUpButton,
  UserButton,
  useAuth,
} from '@clerk/react';
import { formatFileSize } from './utils/fileHelpers';
import {
  deleteB2File,
  deleteStoredMediaItem,
  fetchStoredMediaItems,
  upsertStoredMediaItem,
} from './utils/b2Api';
import { Search, Grid3X3, Grid2X2, SortDesc, Filter, ArrowLeft, X, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'date-desc', label: 'Newest First' },
  { value: 'date-asc', label: 'Oldest First' },
  { value: 'name-asc', label: 'Name A→Z' },
  { value: 'name-desc', label: 'Name Z→A' },
  { value: 'size-desc', label: 'Largest First' },
  { value: 'size-asc', label: 'Smallest First' },
];

const FILTER_OPTIONS = [
  { value: 'all', label: 'All Types' },
  { value: 'image', label: 'Images Only' },
  { value: 'video', label: 'Videos Only' },
];

const mergeMediaItems = (localItems: MediaItem[], remoteItems: MediaItem[]) => {
  const merged = new Map<string, MediaItem>();

  localItems.forEach((item) => {
    merged.set(item.id, item);
  });

  remoteItems.forEach((item) => {
    merged.set(item.id, { ...merged.get(item.id), ...item });
  });

  return Array.from(merged.values());
};

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState('photos');
  const [activeAlbumId, setActiveAlbumId] = useState<string | null>(null);

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    setActiveAlbumId(null);
    if (tab !== 'locked') setIsVaultUnlocked(false);
  };

  const { getToken, userId } = useAuth();

  const [media, setMedia] = useLocalStorage<MediaItem[]>(`lumina-media-${userId || 'guest'}`, []);
  const [albums, setAlbums] = useLocalStorage<Album[]>(`lumina-albums-${userId || 'guest'}`, []);
  const [selectedMedia, setSelectedMedia] = useState<MediaItem | null>(null);
  const [isVaultUnlocked, setIsVaultUnlocked] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOption, setSortOption] = useState<SortOption>('date-desc');
  const [filterType, setFilterType] = useState<string>('all');
  const [gridSize, setGridSize] = useState<GridSize>('small');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showCreateAlbumModal, setShowCreateAlbumModal] = useState(false);
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [showFilterMenu, setShowFilterMenu] = useState(false);

  useEffect(() => {
    let cancelled = false;

    if (!userId) {
      setMedia([]);
      setAlbums([]);
      return;
    }

    getToken().then((token) => {
      if (!token || cancelled) return;
      fetchStoredMediaItems(token)
        .then((remoteItems) => {
          if (cancelled || remoteItems.length === 0) return;
          setMedia((current) => mergeMediaItems(current, remoteItems));
        })
        .catch((error) => {
          console.error('Could not load stored media metadata:', error);
        });
    });

    return () => {
      cancelled = true;
    };
  }, [userId, getToken, setMedia, setAlbums]);

  const filteredMedia = useMemo(() => {
    if (activeTab === 'albums' && activeAlbumId) {
      const album = albums.find(a => a.id === activeAlbumId);
      return media.filter(m => album?.mediaIds.includes(m.id));
    }

    let items = media;

    if (activeTab === 'photos') items = items.filter(m => m.type === 'image' && !m.isLocked);
    else if (activeTab === 'videos') items = items.filter(m => m.type === 'video' && !m.isLocked);
    else if (activeTab === 'favorites') items = items.filter(m => m.isFavorite && !m.isLocked);
    else if (activeTab === 'locked') items = items.filter(m => m.isLocked);
    else if (activeTab === 'places') items = items.filter(m => m.location && !m.isLocked);
    else if (activeTab === 'recent') items = items.filter(m => !m.isLocked);

    // Apply type filter
    if (filterType !== 'all') {
      items = items.filter(m => m.type === filterType);
    }

    // Apply search
    if (searchQuery) {
      items = items.filter(m => 
        m.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.location.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Apply sort
    items = [...items].sort((a, b) => {
      switch (sortOption) {
        case 'date-desc': return new Date(b.date).getTime() - new Date(a.date).getTime();
        case 'date-asc': return new Date(a.date).getTime() - new Date(b.date).getTime();
        case 'name-asc': return a.title.localeCompare(b.title);
        case 'name-desc': return b.title.localeCompare(a.title);
        case 'size-desc': return (b.size || 0) - (a.size || 0);
        case 'size-asc': return (a.size || 0) - (b.size || 0);
        default: return 0;
      }
    });

    return items;
  }, [media, albums, activeTab, activeAlbumId, searchQuery, sortOption, filterType]);

  const toggleFavorite = useCallback(async (id: string) => {
    const item = media.find((entry) => entry.id === id);
    if (!item) return;

    const nextItem = { ...item, isFavorite: !item.isFavorite };
    setMedia(media.map((m) => (m.id === id ? nextItem : m)));

    getToken().then((token) => {
      if (!token) return;
      upsertStoredMediaItem(nextItem, token).catch((error) => {
        console.error('Could not sync favorite state:', error);
      });
    });
  }, [media, setMedia, getToken]);

  const toggleLock = useCallback(async (id: string) => {
    const item = media.find((entry) => entry.id === id);
    if (!item) return;

    const nextItem = { ...item, isLocked: !item.isLocked };
    setMedia(media.map((m) => (m.id === id ? nextItem : m)));

    getToken().then((token) => {
      if (!token) return;
      upsertStoredMediaItem(nextItem, token).catch((error) => {
        console.error('Could not sync locked state:', error);
      });
    });
  }, [media, setMedia, getToken]);

  const deleteMedia = useCallback(async (id: string) => {
    const item = media.find((entry) => entry.id === id);
    if (!item) return;

    if (item.storageProvider === 'b2' && item.b2Key) {
      try {
        const token = await getToken();
        if (token) {
          await Promise.all([
            deleteB2File(item.b2Key || ''),
            deleteStoredMediaItem(item.id, token),
          ]);
        }
      } catch (error) {
        console.error('Could not delete file from Backblaze B2:', error);
        return;
      }
    }

    setMedia((prev) => prev.filter((entry) => entry.id !== id));
    setAlbums((prev) => prev.map((album) => ({
      ...album,
      mediaIds: album.mediaIds.filter((mediaId) => mediaId !== id),
    })));
  }, [media, setMedia, setAlbums]);

  const handleUpload = useCallback((items: MediaItem[]) => {
    setMedia(prev => [...items, ...prev]);
    setActiveTab('photos');
  }, [setMedia]);

  const handleCreateAlbum = useCallback((album: Album) => {
    setAlbums(prev => [...prev, album]);
  }, [setAlbums]);

  const handleDeleteAlbum = useCallback((albumId: string) => {
    setAlbums(prev => prev.filter(a => a.id !== albumId));
  }, [setAlbums]);

  const handleClearData = useCallback(async () => {
    if (!window.confirm('This will delete ALL your media and albums. This cannot be undone. Are you sure?')) {
      return;
    }

    const uploadedItems = media.filter((item) => item.storageProvider === 'b2' && item.b2Key);
    setMedia([]);
    setAlbums([]);
    localStorage.removeItem('lumina-media');
    localStorage.removeItem('lumina-albums');

    await Promise.all(uploadedItems.map(async (item) => {
      try {
        await Promise.all([
          deleteB2File(item.b2Key!),
          deleteStoredMediaItem(item.id),
        ]);
      } catch (error) {
        console.error('Could not fully clear Backblaze B2 data:', error);
      }
    }));
  }, [media, setMedia, setAlbums]);

  const totalStorage = useMemo(() => {
    const bytes = media.reduce((acc, m) => acc + (m.size || 0), 0);
    return formatFileSize(bytes);
  }, [media]);

  const getPageTitle = () => {
    if (activeAlbumId && activeTab === 'albums') {
      const album = albums.find(a => a.id === activeAlbumId);
      return album?.title || 'Album';
    }
    switch (activeTab) {
      case 'photos': return 'Your Photography';
      case 'videos': return 'Cinematic Clips';
      case 'favorites': return 'Favorite Moments';
      case 'albums': return 'Collections';
      case 'locked': return 'Secure Vault';
      case 'places': return 'Explorations';
      case 'recent': return 'Recent Activity';
      default: return 'Gallery';
    }
  };

  const gridColsClass = gridSize === 'large'
    ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6'
    : 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4';

  return (
    <div className="min-h-screen bg-[#050505] text-white flex">
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={handleTabChange} 
        onUpload={() => setShowUploadModal(true)}
        onCreateAlbum={() => setShowCreateAlbumModal(true)}
        onClearData={() => { void handleClearData(); }}
        mediaCount={media.length}
        storageUsed={totalStorage}
      />
      
      <main className="flex-1 md:ml-64 px-4 sm:px-8 pt-8 pb-32 md:pb-8 min-h-screen relative">
        <Show when="signed-out">
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 backdrop-blur-md z-30">
            <h2 className="text-3xl font-bold mb-4 text-white">Welcome to Lumina</h2>
            <p className="text-zinc-400 mb-8 max-w-md text-center">Sign in to view and manage your personal photo and video collection securely.</p>
            <SignInButton mode="modal">
              <button className="px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold transition-all shadow-lg shadow-indigo-600/20">
                Get Started
              </button>
            </SignInButton>
          </div>
        </Show>

        {/* Header */}
        <header className="sticky top-0 z-40 -mx-4 sm:-mx-8 px-4 sm:px-8 py-4 mb-8 glass-panel border-b border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            {activeAlbumId && (
              <button 
                onClick={() => setActiveAlbumId(null)}
                className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-all border border-white/5 shadow-sm"
              >
                <ArrowLeft size={20} />
              </button>
            )}
            <div>
              <h2 className="text-4xl font-bold tracking-tight mb-2">{getPageTitle()}</h2>
              <p className="text-zinc-500 text-sm font-medium">
                {activeTab === 'albums' && !activeAlbumId ? `${albums.length} albums available` : `${filteredMedia.length} items found`}
                {filterType !== 'all' && <span className="text-indigo-400"> • {filterType}s only</span>}
                {searchQuery && <span className="text-indigo-400"> • searching "{searchQuery}"</span>}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="relative group flex-1 sm:flex-none">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-indigo-400 transition-colors" size={18} />
              <input 
                type="text" 
                placeholder="Search library..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-black/20 border border-white/10 rounded-xl py-2.5 pl-10 pr-10 w-full sm:w-64 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500/50 transition-all text-sm backdrop-blur-sm shadow-inner"
              />
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white transition-colors"
                >
                  <X size={16} />
                </button>
              )}
            </div>
            
            {/* Grid size toggle - hide on very small screens */}
            <div className="hidden sm:flex bg-black/20 rounded-xl p-1 border border-white/10 backdrop-blur-sm shadow-inner">
              <button 
                onClick={() => setGridSize('small')}
                className={`p-1.5 rounded-lg transition-all ${gridSize === 'small' ? 'bg-white/10 text-white shadow-sm' : 'text-zinc-500 hover:text-white'}`}
                title="Small Grid"
              >
                <Grid3X3 size={18} />
              </button>
              <button 
                onClick={() => setGridSize('large')}
                className={`p-1.5 rounded-lg transition-all ${gridSize === 'large' ? 'bg-white/10 text-white shadow-sm' : 'text-zinc-500 hover:text-white'}`}
              >
                <Grid2X2 size={18} />
              </button>
            </div>

            {/* Sort dropdown */}
            <div className="relative">
              <button 
                onClick={() => { setShowSortMenu(!showSortMenu); setShowFilterMenu(false); }}
                className={`p-2.5 rounded-xl bg-black/20 border border-white/10 backdrop-blur-sm shadow-inner transition-all ${
                  showSortMenu ? 'text-indigo-400 border-indigo-500/50 shadow-[0_0_15px_rgba(79,70,229,0.2)]' : 'text-zinc-400 hover:text-white hover:bg-white/5'
                }`}
                title="Sort"
              >
                <SortDesc size={20} />
              </button>
              <AnimatePresence>
                {showSortMenu && (
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.95 }}
                    className="absolute right-0 top-12 w-48 glass-panel rounded-2xl shadow-2xl shadow-black overflow-hidden z-50"
                  >
                    {SORT_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => { setSortOption(opt.value); setShowSortMenu(false); }}
                        className={`w-full text-left px-4 py-2.5 text-sm font-medium transition-colors ${
                          sortOption === opt.value 
                            ? 'bg-indigo-500/10 text-indigo-400' 
                            : 'text-zinc-400 hover:bg-white/5 hover:text-white'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            
            {/* Filter dropdown */}
            <div className="relative">
              <button 
                onClick={() => { setShowFilterMenu(!showFilterMenu); setShowSortMenu(false); }}
                className={`p-2.5 rounded-xl bg-black/20 border border-white/10 backdrop-blur-sm shadow-inner transition-all ${
                  showFilterMenu || filterType !== 'all' ? 'text-indigo-400 border-indigo-500/50 shadow-[0_0_15px_rgba(79,70,229,0.2)]' : 'text-zinc-400 hover:text-white hover:bg-white/5'
                }`}
                title="Filter"
              >
                <Filter size={20} />
              </button>
              <AnimatePresence>
                {showFilterMenu && (
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.95 }}
                    className="absolute right-0 top-12 w-48 glass-panel rounded-2xl shadow-2xl shadow-black overflow-hidden z-50"
                  >
                    {FILTER_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => { setFilterType(opt.value); setShowFilterMenu(false); }}
                        className={`w-full text-left px-4 py-2.5 text-sm font-medium transition-colors ${
                          filterType === opt.value 
                            ? 'bg-indigo-500/10 text-indigo-400' 
                            : 'text-zinc-400 hover:bg-white/5 hover:text-white'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Auth Controls */}
            <div className="flex items-center gap-2 ml-2 pl-4 border-l border-white/10">
              <Show when="signed-out">
                <SignInButton mode="modal">
                  <button className="text-sm font-medium text-zinc-300 hover:text-white transition-colors">Sign in</button>
                </SignInButton>
                <SignUpButton mode="modal">
                  <button className="text-sm font-medium px-3 py-1.5 rounded-lg bg-indigo-500 hover:bg-indigo-400 text-white transition-colors shadow-lg shadow-indigo-500/20">Sign up</button>
                </SignUpButton>
              </Show>
              <Show when="signed-in">
                <UserButton appearance={{ elements: { userButtonAvatarBox: "w-8 h-8" } }} />
              </Show>
            </div>

          </div>
        </header>

        {/* Content */}
        <div className="relative" onClick={() => { setShowSortMenu(false); setShowFilterMenu(false); }}>
          {activeTab === 'locked' && !isVaultUnlocked ? (
            <SecureVault onUnlock={() => setIsVaultUnlocked(true)} isUnlocked={isVaultUnlocked} />
          ) : activeTab === 'albums' && !activeAlbumId ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-8">
              {albums.map((album) => (
                <div key={album.id} className="relative group">
                  <AlbumCard album={album} onClick={(a) => setActiveAlbumId(a.id)} />
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (window.confirm(`Delete album "${album.title}"? (Media won't be deleted)`)) {
                        handleDeleteAlbum(album.id);
                      }
                    }}
                    className="absolute top-3 left-3 p-2 rounded-xl bg-black/60 backdrop-blur-md text-red-400 opacity-0 group-hover:opacity-100 transition-all hover:bg-red-500/20 border border-white/10 z-10"
                    title="Delete Album"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
              {albums.length === 0 && (
                <div className="col-span-full flex flex-col items-center justify-center py-32 text-center">
                  <div className="w-20 h-20 rounded-[2.5rem] bg-zinc-900 flex items-center justify-center mb-6 text-zinc-700">
                    <Search size={32} />
                  </div>
                  <h3 className="text-xl font-semibold text-zinc-300">No albums yet</h3>
                  <p className="text-zinc-500 max-w-xs mt-2">Create your first album to organize your media.</p>
                  <button 
                    onClick={() => setShowCreateAlbumModal(true)}
                    className="mt-6 px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm transition-all"
                  >
                    Create Album
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className={`grid ${gridColsClass}`}>
              <AnimatePresence mode="popLayout">
                {filteredMedia.map((item) => (
                  <motion.div
                    key={item.id}
                    layout
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ duration: 0.2 }}
                  >
                    <MediaCard 
                      item={item} 
                      onClick={setSelectedMedia}
                      onToggleFavorite={toggleFavorite}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}

          {filteredMedia.length === 0 && activeTab !== 'albums' && (activeTab !== 'locked' || isVaultUnlocked) && (
            <div className="flex flex-col items-center justify-center py-32 text-center">
              <div className="w-20 h-20 rounded-[2.5rem] bg-zinc-900 flex items-center justify-center mb-6 text-zinc-700">
                <Search size={32} />
              </div>
              <h3 className="text-xl font-semibold text-zinc-300">No media found</h3>
              <p className="text-zinc-500 max-w-xs mt-2">
                {media.length === 0 
                  ? 'Upload some photos or videos to get started!'
                  : 'Try adjusting your filters or search terms to find what you\'re looking for.'}
              </p>
              {media.length === 0 && (
                <button 
                  onClick={() => setShowUploadModal(true)}
                  className="mt-6 px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm transition-all"
                >
                  Upload Media
                </button>
              )}
            </div>
          )}
        </div>
      </main>

      {/* Media Viewer */}
      <AnimatePresence>
        {selectedMedia && (
          <MediaViewer 
            item={selectedMedia} 
            allItems={filteredMedia}
            onClose={() => setSelectedMedia(null)} 
            onToggleFavorite={toggleFavorite}
            onToggleLock={toggleLock}
            onDelete={deleteMedia}
            onNavigate={setSelectedMedia}
          />
        )}
      </AnimatePresence>

      {/* Upload Modal */}
      <UploadModal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        onUpload={handleUpload}
      />

      {/* Create Album Modal */}
      <CreateAlbumModal
        isOpen={showCreateAlbumModal}
        onClose={() => setShowCreateAlbumModal(false)}
        onCreate={handleCreateAlbum}
        allMedia={media}
      />
    </div>
  );
};

export default App;
