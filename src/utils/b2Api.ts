import { MediaItem, MediaType } from '../types';

export interface B2UploadSession {
  id: string;
  key: string;
  uploadUrl: string;
  url: string;
  filename: string;
  contentType: string;
  size: number;
  mediaType: MediaType;
}

interface MediaIndexResponse {
  items?: MediaItem[];
}

function toStoredMediaItem(item: MediaItem): MediaItem {
  const { thumbnail: _thumbnail, ...storedItem } = item;
  return storedItem;
}

function parseError(payload: unknown, fallback: string): string {
  if (payload && typeof payload === 'object' && 'error' in payload && typeof (payload as { error?: unknown }).error === 'string') {
    const obj = payload as any;
    let msg = obj.error;
    if (obj.details) msg += ` (Details: ${obj.details})`;
    if (obj.code) msg += ` (Code: ${obj.code})`;
    return msg;
  }
  return fallback;
}

async function readJson(response: Response): Promise<any> {
  return response.json().catch(() => ({}));
}

export async function fetchStoredMediaItems(token: string): Promise<MediaItem[]> {
  const response = await fetch('/api/media', {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  const payload = await readJson(response) as MediaIndexResponse & { error?: string };

  if (!response.ok) {
    throw new Error(parseError(payload, 'Could not load stored media.'));
  }

  return payload.items || [];
}

export async function requestB2UploadSession(file: File, mediaType: MediaType, token: string): Promise<B2UploadSession> {
  let response: Response;
  try {
    response = await fetch('/api/uploads/sign', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        filename: file.name,
        contentType: file.type || 'application/octet-stream',
        size: file.size,
        mediaType,
      }),
    });
  } catch (networkError) {
    throw new Error('Cannot reach the upload server. Make sure the backend is running (npm run server).');
  }

  const payload = await readJson(response) as Partial<B2UploadSession> & { error?: string };
  if (!response.ok) {
    throw new Error(parseError(payload, `Upload signing failed (${response.status}).`));
  }

  return payload as B2UploadSession;
}

export function uploadToB2(uploadUrl: string, file: File, onProgress?: (progress: number) => void): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.open('PUT', uploadUrl, true);
    xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');

    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable || !onProgress) return;
      const progress = Math.round((event.loaded / event.total) * 100);
      onProgress(progress);
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress?.(100);
        resolve();
        return;
      }

      reject(new Error(`Upload failed with status ${xhr.status}.`));
    };

    xhr.onerror = () => reject(new Error('Network error while uploading.'));
    xhr.onabort = () => reject(new Error('Upload was cancelled.'));
    xhr.send(file);
  });
}

export async function upsertStoredMediaItem(item: MediaItem, token: string): Promise<void> {
  const response = await fetch(`/api/media/${encodeURIComponent(item.id)}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ item: toStoredMediaItem(item) }),
  });

  const payload = await readJson(response) as { error?: string };
  if (!response.ok) {
    throw new Error(parseError(payload, 'Could not save media metadata.'));
  }
}

export async function deleteStoredMediaItem(id: string, token: string): Promise<void> {
  const response = await fetch(`/api/media/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  const payload = await readJson(response) as { error?: string };
  if (!response.ok) {
    throw new Error(parseError(payload, 'Could not delete media metadata.'));
  }
}

export async function deleteB2File(key: string): Promise<void> {
  const response = await fetch(`/api/files/${encodeURIComponent(key)}`, {
    method: 'DELETE',
  });

  const payload = await readJson(response) as { error?: string };
  if (!response.ok) {
    throw new Error(parseError(payload, 'Delete failed.'));
  }
}
