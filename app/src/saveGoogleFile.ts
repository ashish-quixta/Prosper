import { googleFileFromText, type GoogleFileKind } from '@/googleDoc';
import { supabase } from '@/supabase';

const titles: Record<GoogleFileKind, string> = {
  doc: 'Google Doc',
  slides: 'Google Slides',
};

export async function saveGoogleFile(input: string, kind: GoogleFileKind): Promise<void> {
  const file = googleFileFromText(input);
  if (!file || file.kind !== kind) {
    throw new Error(kind === 'doc' ? 'Paste a Google Docs link' : 'Paste a Google Slides link');
  }

  const { error } = await supabase.from('items').insert({
    source_url: file.url,
    capture_method: kind,
    platform: 'other',
    status: 'saving',
    title: titles[kind],
  });
  if (error?.code === '23505') throw new Error('Already saved');
  if (error) throw new Error(error.message);
}
