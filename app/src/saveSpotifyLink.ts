import { spotifyLinkFromText } from '@/spotifyUrl';
import { supabase } from '@/supabase';

export async function saveSpotifyLink(input: string, captureMethod: 'paste' | 'share' = 'paste'): Promise<void> {
  const link = spotifyLinkFromText(input);
  if (!link || link.kind !== 'episode') throw new Error('Paste a Spotify episode link');

  const { error } = await supabase.from('items').insert({
    source_url: link.url,
    capture_method: captureMethod,
    platform: 'spotify',
    status: 'saving',
    title: 'Spotify episode',
  });
  if (error?.code === '23505') throw new Error('Already saved');
  if (error) throw new Error(error.message);
}
