import React, { useCallback, useState, useRef } from 'react';
import { X, UploadCloud, FileImage, Film, CheckCircle2, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@clerk/react';
import { MediaItem } from '../types';
import {
  deleteB2File,
  deleteStoredMediaItem,
  requestB2UploadSession,
  uploadToB2,
  upsertStoredMediaItem,
} from '../utils/b2Api';
import { getMediaType, fileToDataUrl, generateVideoThumbnail, generateId, formatFileSize } from '../utils/fileHelpers';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpload: (items: MediaItem[]) => void;
}

interface PendingFile {
  id: string;
  file: File;
  preview: string;
  type: 'image' | 'video';
  status: 'pending' | 'signing' | 'uploading' | 'saving' | 'done' | 'error';
  title: string;
  progress: number;
  error?: string;
}

const MAX_UPLOAD_BYTES = 200 * 1024 * 1024;

const UploadModal: React.FC<UploadModalProps> = ({ isOpen, onClose, onUpload }) => {
  const { getToken } = useAuth();
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFiles = useCallback(async (fileList: FileList | File[]) => {
    const files = Array.from(fileList);
    const newPending: PendingFile[] = [];

    for (const file of files) {
      const mediaType = getMediaType(file);
      if (!mediaType) continue;

      const id = generateId();
      const preview = mediaType === 'image'
        ? await fileToDataUrl(file)
        : '';

      newPending.push({
        id,
        file,
        preview,
        type: mediaType,
        status: 'pending',
        title: file.name.replace(/\.[^/.]+$/, ''),
        progress: 0,
      });
    }

    setPendingFiles(prev => [...prev, ...newPending]);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
    }
  }, [processFiles]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(e.target.files);
      e.target.value = '';
    }
  }, [processFiles]);

  const removeFile = (id: string) => {
    setPendingFiles(prev => prev.filter(f => f.id !== id));
  };

  const updateTitle = (id: string, title: string) => {
    setPendingFiles(prev => prev.map(f => f.id === id ? { ...f, title } : f));
  };

  const updatePendingFile = (id: string, updater: (file: PendingFile) => PendingFile) => {
    setPendingFiles(prev => prev.map((file) => (file.id === id ? updater(file) : file)));
  };

  const handleUpload = async () => {
    if (pendingFiles.length === 0) return;
    setIsUploading(true);

    const uploadedItems: MediaItem[] = [];
    const failedIds = new Set<string>();

    const token = await getToken();
    if (!token) {
      setIsUploading(false);
      return;
    }

    for (const pf of pendingFiles) {
      if (pf.file.size > MAX_UPLOAD_BYTES) {
        failedIds.add(pf.id);
        updatePendingFile(pf.id, (file) => ({
          ...file,
          status: 'error',
          progress: 0,
          error: 'Files must be 200MB or smaller.',
        }));
        continue;
      }

      let session: Awaited<ReturnType<typeof requestB2UploadSession>> | null = null;

      try {
        updatePendingFile(pf.id, (file) => ({ ...file, status: 'signing', progress: 5, error: undefined }));
        session = await requestB2UploadSession(pf.file, pf.type, token);

        updatePendingFile(pf.id, (file) => ({ ...file, status: 'uploading', progress: 10 }));
        await uploadToB2(session.uploadUrl, pf.file, (progress) => {
          updatePendingFile(pf.id, (file) => ({
            ...file,
            status: 'uploading',
            progress,
          }));
        });

        let thumbnail: string | undefined = pf.preview || undefined;
        if (pf.type === 'video') {
          const localUrl = URL.createObjectURL(pf.file);
          thumbnail = await generateVideoThumbnail(localUrl);
          URL.revokeObjectURL(localUrl);
        }

        const item: MediaItem = {
          id: session.id,
          url: session.url,
          thumbnail,
          b2Key: session.key,
          storageProvider: 'b2',
          type: pf.type,
          title: pf.title || pf.file.name,
          date: new Date().toISOString().split('T')[0],
          location: 'Backblaze B2',
          isFavorite: false,
          isLocked: false,
          size: pf.file.size,
        };

        updatePendingFile(pf.id, (file) => ({ ...file, status: 'saving', progress: 100 }));
        await upsertStoredMediaItem(item, token);

        uploadedItems.push(item);
        updatePendingFile(pf.id, (file) => ({ ...file, status: 'done', progress: 100 }));
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Upload failed.';
        failedIds.add(pf.id);
        updatePendingFile(pf.id, (file) => ({ ...file, status: 'error', error: message }));

        if (session) {
          try {
            await deleteB2File(session.key);
          } catch (cleanupError) {
            console.error('Could not clean up failed B2 upload:', cleanupError);
          }
        }
      }
    }

    const remaining = pendingFiles.filter((file) => failedIds.has(file.id));
    if (uploadedItems.length > 0) {
      onUpload(uploadedItems);
    }

    setPendingFiles(remaining);
    setIsUploading(false);

    if (failedIds.size === 0) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4"
        onClick={(e) => { if (e.target === e.currentTarget && !isUploading) onClose(); }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 40 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 40 }}
          className="w-full sm:max-w-2xl glass-panel rounded-t-[2rem] sm:rounded-[2rem] shadow-2xl shadow-black overflow-hidden flex flex-col max-h-[90vh] sm:max-h-[85vh]"
        >
          <div className="flex items-center justify-between px-8 pt-8 pb-4">
            <div>
              <h2 className="text-2xl font-bold text-white">Upload Media</h2>
              <p className="text-zinc-500 text-sm mt-1">Direct upload to Backblaze B2</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-white/10 text-zinc-400 hover:text-white transition-colors"
            >
              <X size={24} />
            </button>
          </div>

          <div className="px-8 pb-4">
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`
                relative border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all duration-300
                ${isDragging
                  ? 'border-indigo-500 bg-indigo-500/10 scale-[1.02]'
                  : 'border-white/10 hover:border-white/20 hover:bg-white/5'}
              `}
            >
              <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 flex items-center justify-center mx-auto mb-4">
                <UploadCloud size={28} className={isDragging ? 'text-indigo-400' : 'text-zinc-500'} />
              </div>
              <p className="text-white font-semibold mb-1">
                {isDragging ? 'Drop files here!' : 'Drop files or click to browse'}
              </p>
              <p className="text-zinc-500 text-sm">
                Supports JPG, PNG, GIF, WebP, MP4, WebM, MOV up to 200MB
              </p>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*,video/*"
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>
          </div>

          {pendingFiles.length > 0 && (
            <div className="px-8 pb-4 max-h-72 overflow-y-auto">
              <p className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-3">
                {pendingFiles.length} file{pendingFiles.length > 1 ? 's' : ''} selected
              </p>
              <div className="space-y-2">
                {pendingFiles.map((pf) => (
                  <motion.div
                    key={pf.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex items-center gap-3 p-3 bg-zinc-800/50 rounded-xl border border-white/5"
                  >
                    <div className="w-12 h-12 rounded-lg overflow-hidden bg-zinc-700 flex-shrink-0 flex items-center justify-center">
                      {pf.preview ? (
                        <img src={pf.preview} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <Film size={20} className="text-zinc-500" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <input
                        type="text"
                        value={pf.title}
                        onChange={(e) => updateTitle(pf.id, e.target.value)}
                        className="bg-transparent text-white text-sm font-medium w-full focus:outline-none focus:ring-1 focus:ring-indigo-500/50 rounded px-1"
                        disabled={isUploading}
                      />
                      <div className="flex items-center gap-2 text-xs text-zinc-500 mt-0.5 px-1">
                        {pf.type === 'image' ? <FileImage size={10} /> : <Film size={10} />}
                        <span>{pf.type.toUpperCase()}</span>
                        <span>•</span>
                        <span>{formatFileSize(pf.file.size)}</span>
                        <span>•</span>
                        <span>{pf.status === 'uploading' ? `${pf.progress}%` : pf.status}</span>
                      </div>
                      <div className="mt-2 h-1.5 rounded-full bg-white/5 overflow-hidden">
                        <div
                          className={`h-full transition-all ${pf.status === 'error' ? 'bg-red-500' : 'bg-indigo-500'}`}
                          style={{ width: `${pf.progress}%` }}
                        />
                      </div>
                      {pf.error && (
                        <p className="text-xs text-red-400 mt-1 px-1">{pf.error}</p>
                      )}
                    </div>

                    <div className="flex-shrink-0">
                      {pf.status === 'done' && <CheckCircle2 size={20} className="text-emerald-500" />}
                      {pf.status === 'error' && <AlertCircle size={20} className="text-red-500" />}
                      {pf.status === 'signing' || pf.status === 'uploading' || pf.status === 'saving' ? (
                        <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <button
                          onClick={() => removeFile(pf.id)}
                          className="p-1 rounded-full hover:bg-white/10 text-zinc-500 hover:text-red-400 transition-colors"
                          disabled={isUploading}
                        >
                          <X size={16} />
                        </button>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          <div className="px-8 py-6 border-t border-white/5 flex items-center justify-between">
            <p className="text-xs text-zinc-500">
              Files are uploaded directly to Backblaze B2
            </p>
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="px-6 py-2.5 rounded-xl text-zinc-400 hover:text-white hover:bg-white/5 font-medium text-sm transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleUpload}
                disabled={pendingFiles.length === 0 || isUploading}
                className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-sm transition-all shadow-lg shadow-indigo-600/20 active:scale-[0.98] flex items-center gap-2"
              >
                {isUploading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <UploadCloud size={18} />
                    Upload {pendingFiles.length > 0 ? `(${pendingFiles.length})` : ''}
                  </>
                )}
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default UploadModal;
