
import React, { useEffect, useCallback } from 'react';
import { X, Heart, Share2, Info, ChevronLeft, ChevronRight, Maximize2, Lock, Unlock, Download, Trash2 } from 'lucide-react';
import { MediaItem } from '../types';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { downloadFile, shareFile, formatFileSize } from '../utils/fileHelpers';

interface MediaViewerProps {
  item: MediaItem | null;
  allItems: MediaItem[];
  onClose: () => void;
  onToggleFavorite: (id: string) => void;
  onToggleLock: (id: string) => void;
  onDelete: (id: string) => void;
  onNavigate: (item: MediaItem) => void;
}

const MediaViewer: React.FC<MediaViewerProps> = ({ item, allItems, onClose, onToggleFavorite, onToggleLock, onDelete, onNavigate }) => {
  const currentIndex = item ? allItems.findIndex(m => m.id === item.id) : -1;
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < allItems.length - 1;

  const goPrev = useCallback(() => {
    if (hasPrev) onNavigate(allItems[currentIndex - 1]);
  }, [hasPrev, currentIndex, allItems, onNavigate]);

  const goNext = useCallback(() => {
    if (hasNext) onNavigate(allItems[currentIndex + 1]);
  }, [hasNext, currentIndex, allItems, onNavigate]);

  const handleFullscreen = useCallback(() => {
    const elem = document.documentElement;
    if (!document.fullscreenElement) {
      elem.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
  }, []);

  const handleDownload = useCallback(async () => {
    if (!item) return;
    const ext = item.type === 'video' ? 'mp4' : 'jpg';
    const filename = `${item.title.replace(/[^a-zA-Z0-9]/g, '_')}.${ext}`;
    await downloadFile(item.url, filename);
  }, [item]);

  const handleShare = useCallback(async () => {
    if (!item) return;
    const success = await shareFile(item.title, item.url);
    if (success && !navigator.share) {
      // Show a quick feedback that URL was copied
      const el = document.getElementById('share-toast');
      if (el) {
        el.style.opacity = '1';
        el.style.transform = 'translateY(0)';
        setTimeout(() => {
          el.style.opacity = '0';
          el.style.transform = 'translateY(10px)';
        }, 2000);
      }
    }
  }, [item]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') goPrev();
      if (e.key === 'ArrowRight') goNext();
      if (e.key === 'f') handleFullscreen();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, goPrev, goNext, handleFullscreen]);

  if (!item) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] bg-black flex flex-col"
    >
      {/* Share toast */}
      <div 
        id="share-toast"
        className="fixed top-20 left-1/2 -translate-x-1/2 z-[110] bg-emerald-500/90 text-white px-6 py-2 rounded-full text-sm font-medium backdrop-blur-md transition-all duration-300 pointer-events-none"
        style={{ opacity: 0, transform: 'translateY(10px)' }}
      >
        Link copied to clipboard!
      </div>

      {/* Header */}
      <div className="absolute top-0 left-0 right-0 p-4 flex items-center justify-between z-10 bg-gradient-to-b from-black/60 to-transparent">
        <div className="flex items-center gap-4">
          <button 
            onClick={onClose}
            className="p-2 rounded-full hover:bg-white/10 text-white transition-colors"
          >
            <X size={24} />
          </button>
          <div>
            <h2 className="text-white font-medium text-lg leading-tight">{item.title}</h2>
            <p className="text-white/60 text-xs">
              {format(new Date(item.date), 'MMMM d, yyyy')} • {item.location}
              {item.size ? ` • ${formatFileSize(item.size)}` : ''}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button 
            onClick={() => onToggleFavorite(item.id)}
            className={`p-2 rounded-full hover:bg-white/10 transition-colors ${item.isFavorite ? 'text-red-500' : 'text-white'}`}
            title="Favorite"
          >
            <Heart size={20} fill={item.isFavorite ? "currentColor" : "none"} />
          </button>
          <button 
            onClick={handleDownload}
            className="p-2 rounded-full hover:bg-white/10 text-white transition-colors"
            title="Download"
          >
            <Download size={20} />
          </button>
          <button 
            onClick={handleShare}
            className="p-2 rounded-full hover:bg-white/10 text-white transition-colors"
            title="Share / Copy link"
          >
            <Share2 size={20} />
          </button>
          <button 
            onClick={() => {
              onDelete(item.id);
              onClose();
            }}
            className="p-2 rounded-full hover:bg-red-500/10 text-red-500 transition-colors"
            title="Delete"
          >
            <Trash2 size={20} />
          </button>
          <button 
            onClick={() => {
              onToggleLock(item.id);
              onClose();
            }}
            className="p-2 rounded-full hover:bg-white/10 text-white transition-colors"
            title={item.isLocked ? "Unlock" : "Move to Secure Vault"}
          >
            {item.isLocked ? <Unlock size={20} /> : <Lock size={20} />}
          </button>
          <button 
            className="p-2 rounded-full hover:bg-white/10 text-white transition-colors"
            title="Info"
          >
            <Info size={20} />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex items-center justify-center relative p-12">
        {/* Prev button */}
        <button 
          onClick={goPrev}
          disabled={!hasPrev}
          className={`absolute left-6 p-3 rounded-full bg-white/5 hover:bg-white/10 transition-all backdrop-blur-md ${
            hasPrev ? 'text-white/40 hover:text-white cursor-pointer' : 'text-white/10 cursor-not-allowed'
          }`}
        >
          <ChevronLeft size={28} />
        </button>
        
        <motion.div 
          key={item.id}
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="max-w-full max-h-full rounded-lg overflow-hidden shadow-2xl shadow-black/50"
        >
          {item.type === 'video' ? (
            <video 
              src={item.url} 
              controls 
              autoPlay 
              className="max-h-[85vh] w-auto"
            />
          ) : (
            <img 
              src={item.url} 
              alt={item.title} 
              className="max-h-[85vh] w-auto object-contain"
            />
          )}
        </motion.div>

        {/* Next button */}
        <button 
          onClick={goNext}
          disabled={!hasNext}
          className={`absolute right-6 p-3 rounded-full bg-white/5 hover:bg-white/10 transition-all backdrop-blur-md ${
            hasNext ? 'text-white/40 hover:text-white cursor-pointer' : 'text-white/10 cursor-not-allowed'
          }`}
        >
          <ChevronRight size={28} />
        </button>

        <div className="absolute bottom-8 right-8 flex items-center gap-3">
          {/* Counter */}
          <div className="px-4 py-2 rounded-xl bg-white/5 backdrop-blur-md text-white/60 text-sm font-medium border border-white/10">
            {currentIndex + 1} / {allItems.length}
          </div>
          <button 
            onClick={handleFullscreen}
            className="p-3 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-all backdrop-blur-md flex items-center gap-2 border border-white/10"
          >
            <Maximize2 size={18} />
            <span className="text-sm font-medium">Fullscreen</span>
          </button>
        </div>
      </div>
    </motion.div>
  );
};

export default MediaViewer;
