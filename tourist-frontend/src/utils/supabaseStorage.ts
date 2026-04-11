import { postForm } from './api';

const defaultBucket = (import.meta.env.VITE_SUPABASE_BUCKET as string | undefined) || 'mizTour';

const sanitizeFileName = (name: string) => name.replace(/[^a-zA-Z0-9._-]/g, '_');

const fileToBase64 = async (file: File): Promise<string> => {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Failed to read selected file'));
    reader.readAsDataURL(file);
  });

  const base64 = dataUrl.split(',')[1] || '';

  if (!base64) {
    throw new Error('Failed to encode selected file');
  }

  return base64;
};

export interface UploadedDocumentMeta {
  bucket: string;
  storagePath: string;
  publicUrl: string | null;
  fileName: string;
  fileType: string;
  fileSize: number;
}

export const uploadDocumentToMizTour = async (
  file: File,
  folder: string,
  bucket = defaultBucket
): Promise<UploadedDocumentMeta> => {
  if (!file) {
    throw new Error('No file selected for upload');
  }

  const safeName = sanitizeFileName(file.name);
  const encodedFile = await fileToBase64(file);

  return postForm<UploadedDocumentMeta>('/api/storage/upload', {
    fileName: safeName,
    fileType: file.type || 'application/octet-stream',
    fileDataBase64: encodedFile,
    folder,
    bucket
  });
};
