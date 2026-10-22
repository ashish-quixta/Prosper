import { useInfiniteQuery } from '@tanstack/react-query';
import { supabase } from '@/supabase';
import { savedItemFromRow, type SavedItem, type YouTubeKind } from '@/savedItem';

const pageSize = 30;
const columns =
  'id, platform, capture_method, source_url, caption, status, title, summary, key_points, tags, folder_id, youtube_kind, created_at';

export type HomeSection =
  | 'screenshot'
  | 'pdf'
  | 'audio'
  | 'instagram'
  | 'youtube-short'
  | 'youtube-video'
  | 'youtube-podcast'
  | 'linkedin'
  | 'x'
  | 'doc'
  | 'slides';

export function youtubeKindFromSection(section: HomeSection): YouTubeKind | null {
  if (section === 'youtube-short') return 'short';
  if (section === 'youtube-video') return 'video';
  if (section === 'youtube-podcast') return 'podcast';
  return null;
}

export function sectionFilters(section: HomeSection): { column: string; value: string }[] {
  const kind = youtubeKindFromSection(section);
  if (kind) {
    return [
      { column: 'platform', value: 'youtube' },
      { column: 'youtube_kind', value: kind },
    ];
  }
  if (section === 'instagram' || section === 'linkedin' || section === 'x') {
    return [{ column: 'platform', value: section }];
  }
  return [{ column: 'capture_method', value: section }];
}

export function itemMatchesSection(item: SavedItem, section: HomeSection): boolean {
  return sectionFilters(section).every((filter) => {
    if (filter.column === 'platform') return item.platform === filter.value;
    if (filter.column === 'youtube_kind') return item.youtubeKind === filter.value;
    return item.captureMethod === filter.value;
  });
}

export function useItems(section: HomeSection) {
  return useInfiniteQuery({
    queryKey: ['items', section],
    initialPageParam: 0,
    queryFn: async ({ pageParam }): Promise<SavedItem[]> => {
      const from = pageParam * pageSize;
      const to = from + pageSize - 1;
      let query = supabase.from('items').select(columns).order('created_at', { ascending: false });
      for (const filter of sectionFilters(section)) query = query.eq(filter.column, filter.value);
      const { data, error } = await query.range(from, to);
      if (error) throw new Error(error.message);
      return (data ?? []).map((row) => savedItemFromRow(row));
    },
    getNextPageParam: (lastPage, _pages, lastPageParam) =>
      lastPage.length < pageSize ? undefined : lastPageParam + 1,
  });
}
