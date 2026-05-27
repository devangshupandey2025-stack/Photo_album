
import React from 'react';
import { Play, Heart, Lock, MapPin } from 'lucide-react';
import { MediaItem } from '../types';
import { cn } from '../utils/cn';
import { motion } from 'framer-motion';

interface MediaCardProps {
  item: MediaItem;
  onClick: (item: MediaItem) => void;
  onToggleFavorite: (id: string) => void;
}

const MediaCard: React.FC<MediaCardProps> = ({ item, onClick, onToggleFavorite }) => {
  return (
    <motion.div 
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ y: -6 }}
      className="group relative aspect-square rounded-2xl overflow-hidden cursor-pointer bg-zinc-900 shadow-xl ring-1 ring-white/10 hover:shadow-[0_10px_40px_rgba(99,102,241,0.2)] hover:ring-indigo-500/30 transition-all duration-500 ease-out"
      onClick={() => !item.isLocked && onClick(item)}
    >
      <img 
        src={item.thumbnail || item.url} 
        alt={item.title}
        className={cn(
          "w-full h-full object-cover transition-transform duration-500 group-hover:scale-110",
          item.isLocked && "blur-2xl opacity-50 scale-125"
        )}
      />
      
      {/* Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
        <div className="absolute bottom-0 left-0 right-0 p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-white font-medium text-sm truncate">{item.title}</h3>
              <div className="flex items-center gap-1 text-white/60 text-[10px]">
                <MapPin size={10} />
                <span>{item.location}</span>
              </div>
            </div>
            <button 
              onClick={(e) => {
                e.stopPropagation();
                onToggleFavorite(item.id);
              }}
              className={cn(
                "p-2 rounded-full backdrop-blur-md transition-colors",
                item.isFavorite ? "bg-red-500/20 text-red-500" : "bg-white/10 text-white hover:bg-white/20"
              )}
            >
              <Heart size={14} fill={item.isFavorite ? "currentColor" : "none"} />
            </button>
          </div>
        </div>
      </div>

      {/* Badges */}
      <div className="absolute top-3 right-3 flex gap-2">
        {item.type === 'video' && (
          <div className="w-8 h-8 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center text-white ring-1 ring-white/20">
            <Play size={14} fill="white" />
          </div>
        )}
        {item.isLocked && (
          <div className="w-8 h-8 rounded-full bg-indigo-500/80 backdrop-blur-md flex items-center justify-center text-white ring-1 ring-white/20 shadow-lg">
            <Lock size={14} />
          </div>
        )}
      </div>

      {item.isLocked && (
        <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center">
          <div className="w-12 h-12 rounded-2xl bg-white/5 backdrop-blur-md border border-white/10 flex items-center justify-center mb-3">
            <Lock size={20} className="text-white/60" />
          </div>
          <p className="text-xs font-medium text-white/40">Secure content</p>
        </div>
      )}
    </motion.div>
  );
};

export default MediaCard;
