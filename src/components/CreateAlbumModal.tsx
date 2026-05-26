
import React, { useState } from 'react';
import { X, Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Album, MediaItem } from '../types';

interface CreateAlbumModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (album: Album) => void;
  allMedia: MediaItem[];
}

const CreateAlbumModal: React.FC<CreateAlbumModalProps> = ({ isOpen, onClose, onCreate, allMedia }) => {
  const [title, setTitle] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [albumType, setAlbumType] = useState<'custom' | 'place' | 'time'>('custom');

  const toggleMedia = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleCreate = () => {
    if (!title.trim() || selectedIds.length === 0) return;

    const coverMedia = allMedia.find(m => m.id === selectedIds[0]);
    const album: Album = {
      id: `album-${Date.now()}`,
      title: title.trim(),
      coverUrl: coverMedia?.thumbnail || coverMedia?.url || '',
      mediaIds: selectedIds,
      type: albumType,
    };

    onCreate(album);
    setTitle('');
    setSelectedIds([]);
    onClose();
  };

  if (!isOpen) return null;

  const availableMedia = allMedia.filter(m => !m.isLocked);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[200] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
        onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="w-full max-w-2xl bg-zinc-900 border border-white/10 rounded-[2rem] shadow-2xl overflow-hidden max-h-[85vh] flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-8 pt-8 pb-4 flex-shrink-0">
            <div>
              <h2 className="text-2xl font-bold text-white">Create Album</h2>
              <p className="text-zinc-500 text-sm mt-1">Organize your media into collections</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-white/10 text-zinc-400 hover:text-white transition-colors"
            >
              <X size={24} />
            </button>
          </div>

          {/* Album Details */}
          <div className="px-8 pb-4 flex-shrink-0">
            <input
              type="text"
              placeholder="Album name..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-zinc-800/50 border border-white/5 rounded-xl py-3 px-4 text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/50 transition-all text-sm font-medium"
              autoFocus
            />
            <div className="flex gap-2 mt-3">
              {(['custom', 'place', 'time'] as const).map((type) => (
                <button
                  key={type}
                  onClick={() => setAlbumType(type)}
                  className={`px-4 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider transition-all ${
                    albumType === type
                      ? 'bg-indigo-500/20 text-indigo-400 ring-1 ring-indigo-500/50'
                      : 'bg-zinc-800 text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          {/* Media Selection */}
          <div className="px-8 pb-4 overflow-y-auto flex-1">
            <p className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-3">
              Select media ({selectedIds.length} selected)
            </p>
            <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-2">
              {availableMedia.map((item) => (
                <div
                  key={item.id}
                  onClick={() => toggleMedia(item.id)}
                  className={`relative aspect-square rounded-xl overflow-hidden cursor-pointer transition-all duration-200 ${
                    selectedIds.includes(item.id)
                      ? 'ring-2 ring-indigo-500 scale-95'
                      : 'hover:ring-1 hover:ring-white/20'
                  }`}
                >
                  <img
                    src={item.thumbnail || item.url}
                    alt={item.title}
                    className="w-full h-full object-cover"
                  />
                  {selectedIds.includes(item.id) && (
                    <div className="absolute inset-0 bg-indigo-500/30 flex items-center justify-center">
                      <div className="w-6 h-6 rounded-full bg-indigo-500 flex items-center justify-center">
                        <Plus size={14} className="text-white rotate-45" />
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
            {availableMedia.length === 0 && (
              <p className="text-zinc-500 text-center py-8 text-sm">No media available. Upload some files first!</p>
            )}
          </div>

          {/* Footer */}
          <div className="px-8 py-6 border-t border-white/5 flex items-center justify-end gap-3 flex-shrink-0">
            <button
              onClick={onClose}
              className="px-6 py-2.5 rounded-xl text-zinc-400 hover:text-white hover:bg-white/5 font-medium text-sm transition-all"
            >
              Cancel
            </button>
            <button
              onClick={handleCreate}
              disabled={!title.trim() || selectedIds.length === 0}
              className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-sm transition-all shadow-lg shadow-indigo-600/20 active:scale-[0.98]"
            >
              Create Album ({selectedIds.length})
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default CreateAlbumModal;
