/**
 * uploadFile — uploads a single file to our backend local disk storage.
 *
 * Usage:
 *   import { uploadFile } from '@/lib/uploadFile';
 *   const url = await uploadFile(file);  // returns e.g. "http://localhost:3001/uploads/abc123.jpg"
 */
import client from '@/api/client';

/**
 * @param {File} file - Browser File object
 * @returns {Promise<string>} Public URL of the uploaded file
 */
export async function uploadFile(file) {
  const formData = new FormData();
  formData.append('file', file);
  // Let the browser provide the multipart boundary required by multer.
  const res = await client.post('/api/upload', formData);
  return res.data.url;
}

/**
 * @param {File[]} files - Array of File objects (max 10)
 * @returns {Promise<string[]>} Array of public URLs
 */
export async function uploadFiles(files) {
  const formData = new FormData();
  files.forEach(f => formData.append('files', f));
  const res = await client.post('/api/upload/multiple', formData);
  return res.data.files.map(f => f.url);
}

