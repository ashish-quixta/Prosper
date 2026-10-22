import { type YouTubeKind } from '@/savedItem';
import { supabase } from '@/supabase';
import { youtubeLinkFromText } from '@/youtubeUrl';

const titles: Record<YouTubeKind, string> = {
  short: 'YouTube Short',
  video: 'YouTube video',
  podcast: 'YouTube podcast',
};

export async function saveYoutubeLink(input: string, kind: YouTubeKind): Promise<void> {
  const link = youtubeLinkFromText(input);
  if (!link) throw new Error('Paste a YouTube link');

  const { error } = await supabase.from('items').insert({
    source_url: link.watchUrl,
    capture_method: 'paste',
    platform: 'youtube',
    youtube_kind: kind,
    status: 'saving',
    title: titles[kind],
  });
  if (error?.code === '23505') throw new Error('Already saved');
  if (error) throw new Error(error.message);
}
