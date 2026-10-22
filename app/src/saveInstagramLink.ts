import { instagramLinkFromText } from '@/instagramUrl';
import { supabase } from '@/supabase';

const limitedSummary = 'This link does not include the reel. Add a screenshot for a briefing.';

export async function saveInstagramLink(input: string): Promise<void> {
  const link = instagramLinkFromText(input);
  if (!link) throw new Error('Paste an Instagram post or reel link');

  const { error } = await supabase.from('items').insert({
    source_url: link.url,
    capture_method: 'paste',
    platform: 'instagram',
    status: 'limited',
    title: 'Instagram link',
    summary: limitedSummary,
    error: 'Add a screenshot for a briefing',
  });
  if (error?.code === '23505') throw new Error('Already saved');
  if (error) throw new Error(error.message);
}
