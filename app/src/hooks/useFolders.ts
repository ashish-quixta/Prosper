import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { supabase } from '@/supabase';
import { sectionFilters, type HomeSection } from '@/hooks/useItems';
import { savedItemFromRow, type SavedItem } from '@/savedItem';

const pageSize = 30;
const itemColumns =
  'id, platform, capture_method, source_url, caption, status, title, summary, key_points, tags, folder_id, youtube_kind, created_at';

export type Folder = {
  id: string;
  name: string;
  createdAt: string;
};

type FolderRow = {
  id: string;
  name: string;
  created_at: string;
};

function folderFromRow(row: FolderRow): Folder {
  return { id: row.id, name: row.name, createdAt: row.created_at };
}

export function useFolders() {
  return useQuery({
    queryKey: ['folders'],
    queryFn: async (): Promise<Folder[]> => {
      const { data, error } = await supabase.from('folders').select('id, name, created_at').order('name');
      if (error) throw new Error(error.message);
      return (data ?? []).map((row) => folderFromRow(row));
    },
  });
}

export function useFolder(id: string) {
  return useQuery({
    queryKey: ['folders', id],
    enabled: id.length > 0,
    queryFn: async (): Promise<Folder | null> => {
      const { data, error } = await supabase
        .from('folders')
        .select('id, name, created_at')
        .eq('id', id)
        .maybeSingle();
      if (error) throw new Error(error.message);
      return data ? folderFromRow(data) : null;
    },
  });
}

const folderIdPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function useItemsOutsideFolder(folderId: string, section: HomeSection | null) {
  const folderIsValid = folderIdPattern.test(folderId);
  return useInfiniteQuery({
    queryKey: ['items', 'outside-folder', folderId, section],
    enabled: section !== null && folderIsValid,
    initialPageParam: 0,
    queryFn: async ({ pageParam }): Promise<SavedItem[]> => {
      if (!section) return [];
      const from = pageParam * pageSize;
      const to = from + pageSize - 1;
      let query = supabase
        .from('items')
        .select(itemColumns)
        .or(`folder_id.is.null,folder_id.neq.${folderId}`)
        .order('created_at', { ascending: false });
      for (const filter of sectionFilters(section)) query = query.eq(filter.column, filter.value);
      const { data, error } = await query.range(from, to);
      if (error) throw new Error(error.message);
      return (data ?? []).map((row) => savedItemFromRow(row));
    },
    getNextPageParam: (lastPage, _pages, lastPageParam) =>
      lastPage.length < pageSize ? undefined : lastPageParam + 1,
  });
}

export function useFolderItems(folderId: string) {
  return useInfiniteQuery({
    queryKey: ['items', 'folder', folderId],
    enabled: folderId.length > 0,
    initialPageParam: 0,
    queryFn: async ({ pageParam }): Promise<SavedItem[]> => {
      const from = pageParam * pageSize;
      const to = from + pageSize - 1;
      const { data, error } = await supabase
        .from('items')
        .select(itemColumns)
        .eq('folder_id', folderId)
        .order('created_at', { ascending: false })
        .range(from, to);
      if (error) throw new Error(error.message);
      return (data ?? []).map((row) => savedItemFromRow(row));
    },
    getNextPageParam: (lastPage, _pages, lastPageParam) =>
      lastPage.length < pageSize ? undefined : lastPageParam + 1,
  });
}
