import { useInfiniteQuery } from '@tanstack/react-query';
import { supabase } from '@/supabase';
import { savedItemFromRow, type SavedItem } from '@/savedItem';

const pageSize = 30;
const columns = 'id, platform, source_url, caption, status, title, summary, key_points, tags, created_at';

export function useItems() {
  return useInfiniteQuery({
    queryKey: ['items'],
    initialPageParam: 0,
    queryFn: async ({ pageParam }): Promise<SavedItem[]> => {
      const from = pageParam * pageSize;
      const to = from + pageSize - 1;
      const { data, error } = await supabase
        .from('items')
        .select(columns)
        .order('created_at', { ascending: false })
        .range(from, to);
      if (error) throw new Error(error.message);
      return (data ?? []).map((row) => savedItemFromRow(row));
    },
    getNextPageParam: (lastPage, _pages, lastPageParam) =>
      lastPage.length < pageSize ? undefined : lastPageParam + 1,
  });
}
