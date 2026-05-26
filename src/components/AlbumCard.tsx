
import React from 'react';
import { Album } from '../types';
import { motion } from 'framer-motion';
import { MapPin, Clock, Folder } from 'lucide-react';

interface AlbumCardProps {
  album: Album;
  onClick: (album: Album) => void;
}

const AlbumCard: React.FC<AlbumCardProps> = ({ album, onClick }) => {
  const Icon = album.type === 'place' ? MapPin : album.type === 'time' ? Clock : Folder;

  return (
    <motion.div
      whileHover={{ y: -4 }}
      className="group cursor-pointer"
      onClick={() => onClick(album)}
    >
      <div className="relative aspect-square rounded-[2rem] overflow-hidden mb-3 bg-zinc-900 shadow-xl ring-1 ring-white/10">
        <img 
          src={album.coverUrl} 
          alt={album.title}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
        />
        <div className="absolute inset-0 bg-black/20 group-hover:bg-black/0 transition-colors duration-300" />
        <div className="absolute top-4 right-4 w-10 h-10 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-white">
          <Icon size={18} />
        </div>
      </div>
      <div className="px-2">
        <h3 className="text-white font-semibold text-base mb-0.5">{album.title}</h3>
        <p className="text-zinc-500 text-xs font-medium uppercase tracking-wider">
          {album.mediaIds.length} Items
        </p>
      </div>
    </motion.div>
  );
};

export default AlbumCard;
