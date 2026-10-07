import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/supabase';
import { savedItemFromRow } from '@/savedItem';

const columns = 'id, platform, source_url, caption, status, title, summary, key_points, tags, created_at';

export function useItem(id: string) {
  return useQuery({
    queryKey: ['items', id],
    enabled: id.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase.from('items').select(columns).eq('id', id).maybeSingle();
      if (error) throw new Error(error.message);
      return data ? savedItemFromRow(data) : null;
    },
  });
}
