import { useInfiniteQuery } from '@tanstack/react-query';
import { supabase } from '@/supabase';
import { savedItemFromRow, type SavedItem } from '@/savedItem';

const pageSize = 30;
const columns =
  'id, platform, capture_method, source_url, caption, status, title, summary, key_points, tags, created_at';

export type HomeSection = 'screenshot' | 'pdf' | 'instagram';

export function useItems(section: HomeSection) {
  return useInfiniteQuery({
    queryKey: ['items', section],
    initialPageParam: 0,
    queryFn: async ({ pageParam }): Promise<SavedItem[]> => {
      const from = pageParam * pageSize;
      const to = from + pageSize - 1;
      let query = supabase.from('items').select(columns).order('created_at', { ascending: false });
      if (section === 'instagram') query = query.eq('platform', 'instagram');
      else query = query.eq('capture_method', section);
      const { data, error } = await query.range(from, to);
      if (error) throw new Error(error.message);
      return (data ?? []).map((row) => savedItemFromRow(row));
    },
    getNextPageParam: (lastPage, _pages, lastPageParam) =>
      lastPage.length < pageSize ? undefined : lastPageParam + 1,
  });
}
