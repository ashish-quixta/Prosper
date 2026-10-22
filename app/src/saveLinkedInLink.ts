import { linkedinLinkFromText } from '@/linkedinUrl';
import { supabase } from '@/supabase';

export async function saveLinkedInLink(input: string): Promise<void> {
  const link = linkedinLinkFromText(input);
  if (!link) throw new Error('Paste a LinkedIn post link');

  const { error } = await supabase.from('items').insert({
    source_url: link.url,
    capture_method: 'paste',
    platform: 'linkedin',
    status: 'saving',
    title: 'LinkedIn post',
  });
  if (error?.code === '23505') throw new Error('Already saved');
  if (error) throw new Error(error.message);
}
