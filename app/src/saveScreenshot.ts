import { decode } from 'base64-arraybuffer';
import * as Crypto from 'expo-crypto';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { supabase } from '@/supabase';

export async function saveScreenshot(uri: string): Promise<void> {
  const { data, error: userError } = await supabase.auth.getUser();
  if (userError || !data.user) throw new Error('Sign in again');

  const compressed = await manipulateAsync(uri, [{ resize: { width: 1080 } }], {
    compress: 0.7,
    format: SaveFormat.JPEG,
    base64: true,
  });
  if (!compressed.base64) throw new Error('The photo could not be prepared');

  const path = `${data.user.id}/${Crypto.randomUUID()}.jpg`;
  const { error: uploadError } = await supabase.storage.from('uploads').upload(path, decode(compressed.base64), {
    contentType: 'image/jpeg',
  });
  if (uploadError) throw new Error(uploadError.message);

  const { error } = await supabase.from('items').insert({
    image_path: path,
    capture_method: 'screenshot',
    platform: 'other',
  });
  if (error) throw new Error(error.message);
}
