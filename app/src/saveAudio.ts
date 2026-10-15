import { decode } from 'base64-arraybuffer';
import * as Crypto from 'expo-crypto';
import { supabase } from '@/supabase';

const AUDIO_BYTE_LIMIT = 15 * 1024 * 1024;

const audioExtensionByMime: Record<string, string> = {
  'audio/mp4': 'm4a',
  'audio/x-m4a': 'm4a',
  'audio/mpeg': 'mp3',
  'audio/mp3': 'mp3',
  'audio/aac': 'aac',
  'audio/wav': 'wav',
  'audio/x-wav': 'wav',
  'audio/wave': 'wav',
  'audio/3gpp': '3gp',
  'audio/ogg': 'ogg',
  'audio/webm': 'webm',
};

export async function saveAudio(uri: string, mimeType?: string | null, size?: number): Promise<void> {
  if (size !== undefined && size > AUDIO_BYTE_LIMIT) throw new Error('Voice note is larger than 15 MB');

  const extension = audioExtension(uri, mimeType);
  if (!extension) throw new Error('Choose a voice note audio file');

  const contentType = mimeType?.trim().toLowerCase() || mimeFromExtension(extension);
  if (!contentType || !contentType.startsWith('audio/')) throw new Error('Choose a voice note audio file');

  const { EncodingType, readAsStringAsync } = await import('expo-file-system/legacy');
  const base64 = await readAsStringAsync(uri, { encoding: EncodingType.Base64 });
  if (!base64) throw new Error('Voice note file is empty');

  const { data, error: userError } = await supabase.auth.getUser();
  if (userError || !data.user) throw new Error('Sign in again');

  const path = `${data.user.id}/${Crypto.randomUUID()}.${extension}`;
  const { error: uploadError } = await supabase.storage.from('uploads').upload(path, decode(base64), {
    contentType,
  });
  if (uploadError) throw new Error(uploadError.message);

  const { error } = await supabase.from('items').insert({
    image_path: path,
    capture_method: 'audio',
    platform: 'other',
  });
  if (error) throw new Error(error.message);
}

function audioExtension(uri: string, mimeType?: string | null): string | null {
  const fromMime = mimeType ? audioExtensionByMime[mimeType.trim().toLowerCase()] : undefined;
  if (fromMime) return fromMime;

  const clean = uri.split('?')[0]?.toLowerCase() ?? '';
  const match = clean.match(/\.([a-z0-9]+)$/);
  if (!match) return null;
  const ext = match[1];
  if (ext === 'm4a' || ext === 'mp4' || ext === 'mp3' || ext === 'aac' || ext === 'wav' || ext === '3gp' || ext === '3gpp' || ext === 'ogg' || ext === 'webm') {
    return ext === '3gpp' ? '3gp' : ext === 'mp4' ? 'm4a' : ext;
  }
  return null;
}

function mimeFromExtension(extension: string): string | null {
  if (extension === 'm4a' || extension === 'mp4') return 'audio/mp4';
  if (extension === 'mp3') return 'audio/mpeg';
  if (extension === 'aac') return 'audio/aac';
  if (extension === 'wav') return 'audio/wav';
  if (extension === '3gp') return 'audio/3gpp';
  if (extension === 'ogg') return 'audio/ogg';
  if (extension === 'webm') return 'audio/webm';
  return null;
}
