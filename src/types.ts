
export type MediaType = 'image' | 'video';

export interface MediaItem {
  id: string;
  url: string;
  thumbnail?: string;
  type: MediaType;
  title: string;
  date: string;
  location: string;
  isFavorite: boolean;
  isLocked: boolean;
  size?: number; // bytes
}

export interface Album {
  id: string;
  title: string;
  coverUrl: string;
  mediaIds: string[];
  type: 'place' | 'time' | 'custom';
}

export type SortOption = 'date-desc' | 'date-asc' | 'name-asc' | 'name-desc' | 'size-desc' | 'size-asc';

export type GridSize = 'small' | 'large';
