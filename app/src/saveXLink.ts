import { supabase } from '@/supabase';
import { xLinkFromText } from '@/xUrl';

export async function saveXLink(input: string, captureMethod: 'paste' | 'share' = 'paste'): Promise<void> {
  const link = xLinkFromText(input);
  if (!link) throw new Error('Paste an X post link');

  const { error } = await supabase.from('items').insert({
    source_url: link.url,
    capture_method: captureMethod,
    platform: 'x',
    status: 'saving',
    title: 'X post',
  });
  if (error?.code === '23505') throw new Error('Already saved');
  if (error) throw new Error(error.message);
}
