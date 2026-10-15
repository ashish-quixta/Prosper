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

export async function deleteScreenshot(path: string): Promise<void> {
  const { error } = await supabase.storage.from('uploads').remove([path]);
  if (error) throw new Error(error.message);
}
