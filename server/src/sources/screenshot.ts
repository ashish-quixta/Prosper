import { PermanentError } from '../worker/errors';
import { supabase } from '../supabase';

const SCREENSHOT_BYTE_LIMIT = 8 * 1024 * 1024;

export async function downloadScreenshot(path: string): Promise<Buffer> {
  const { data, error } = await supabase.storage.from('uploads').download(path);
  if (error || !data) throw new PermanentError('Screenshot file is no longer available');

  const bytes = Buffer.from(await data.arrayBuffer());
  if (bytes.length === 0) throw new PermanentError('Screenshot file is empty');
  if (bytes.length > SCREENSHOT_BYTE_LIMIT) throw new PermanentError('Screenshot is larger than 8 MB');
  return bytes;
}

const PDF_BYTE_LIMIT = 10 * 1024 * 1024;
const AUDIO_BYTE_LIMIT = 15 * 1024 * 1024;

const audioMimeByExtension: Record<string, string> = {
  '.m4a': 'audio/mp4',
  '.mp4': 'audio/mp4',
  '.mp3': 'audio/mpeg',
  '.mpeg': 'audio/mpeg',
  '.mpga': 'audio/mpeg',
  '.aac': 'audio/aac',
  '.wav': 'audio/wav',
  '.3gp': 'audio/3gpp',
  '.3gpp': 'audio/3gpp',
  '.ogg': 'audio/ogg',
  '.oga': 'audio/ogg',
  '.webm': 'audio/webm',
};

export type StoredAudio = {
  bytes: Buffer;
  mimeType: string;
};

export async function downloadPdf(path: string): Promise<Buffer> {
  const { data, error } = await supabase.storage.from('uploads').download(path);
  if (error || !data) throw new PermanentError('PDF file is no longer available');

  const bytes = Buffer.from(await data.arrayBuffer());
  if (bytes.length === 0) throw new PermanentError('PDF file is empty');
  if (bytes.length > PDF_BYTE_LIMIT) throw new PermanentError('PDF is larger than 10 MB');
  if (!bytes.subarray(0, 5).toString('utf8').startsWith('%PDF')) {
    throw new PermanentError('This file is not a readable PDF');
  }
  return bytes;
}

export async function downloadAudio(path: string): Promise<StoredAudio> {
  const mimeType = audioMimeFromPath(path);
  if (!mimeType) throw new PermanentError('This file is not a readable voice note');

  const { data, error } = await supabase.storage.from('uploads').download(path);
  if (error || !data) throw new PermanentError('Voice note file is no longer available');

  const bytes = Buffer.from(await data.arrayBuffer());
  if (bytes.length === 0) throw new PermanentError('Voice note file is empty');
  if (bytes.length > AUDIO_BYTE_LIMIT) throw new PermanentError('Voice note is larger than 15 MB');
  return { bytes, mimeType };
}

function audioMimeFromPath(path: string): string | null {
  const lower = path.toLowerCase();
  const dot = lower.lastIndexOf('.');
  if (dot < 0) return null;
  return audioMimeByExtension[lower.slice(dot)] ?? null;
}

export async function deleteScreenshot(path: string): Promise<void> {
  const { error } = await supabase.storage.from('uploads').remove([path]);
  if (error) throw new Error(error.message);
}
