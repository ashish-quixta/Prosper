import { decode } from 'base64-arraybuffer';
import * as Crypto from 'expo-crypto';
import { supabase } from '@/supabase';

const PDF_BYTE_LIMIT = 10 * 1024 * 1024;

export async function savePdf(uri: string, size?: number): Promise<void> {
  if (size !== undefined && size > PDF_BYTE_LIMIT) throw new Error('PDF is larger than 10 MB');

  const { EncodingType, readAsStringAsync } = await import('expo-file-system/legacy');
  const base64 = await readAsStringAsync(uri, { encoding: EncodingType.Base64 });
  if (!base64.startsWith('JVBERi')) throw new Error('This file is not a readable PDF');

  const { data, error: userError } = await supabase.auth.getUser();
  if (userError || !data.user) throw new Error('Sign in again');

  const path = `${data.user.id}/${Crypto.randomUUID()}.pdf`;
  const { error: uploadError } = await supabase.storage.from('uploads').upload(path, decode(base64), {
    contentType: 'application/pdf',
  });
  if (uploadError) throw new Error(uploadError.message);

  const { error } = await supabase.from('items').insert({
    image_path: path,
    capture_method: 'pdf',
    platform: 'other',
  });
  if (error) throw new Error(error.message);
}
