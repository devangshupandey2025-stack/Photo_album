interface UploadedB2File {
  id: string;
  key: string;
  url: string;
  filename: string;
  contentType: string;
  size: number;
}

export async function uploadFilesToB2(files: File[]): Promise<UploadedB2File[]> {
  const formData = new FormData();
  files.forEach((file) => formData.append('files', file));

  const response = await fetch('/api/upload', {
    method: 'POST',
    body: formData,
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error || 'Upload failed.');
  }

  return payload.files;
}

export async function deleteB2File(key: string): Promise<void> {
  const response = await fetch(`/api/files/${encodeURIComponent(key)}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.error || 'Delete failed.');
  }
}
