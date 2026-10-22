import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { AppState } from 'react-native';
import type { Folder } from '@/hooks/useFolders';
import { deleteLibrary, readLibrary, writeLibrary, type LibrarySnapshot } from '@/localLibrary';
import { savedItemFromRow, type SavedItem } from '@/savedItem';
import { supabase } from '@/supabase';

type LibraryContextValue = {
  ready: boolean;
  refreshing: boolean;
  error: string | null;
  items: SavedItem[];
  folders: Folder[];
  refresh: () => Promise<void>;
};

const LibraryContext = createContext<LibraryContextValue | null>(null);

const pageSize = 200;
const itemColumns =
  'id, platform, capture_method, source_url, caption, status, title, summary, key_points, tags, folder_id, youtube_kind, created_at';

let refreshLibraryImpl: (() => Promise<void>) | null = null;

export function refreshLibrary(): Promise<void> {
  return refreshLibraryImpl?.() ?? Promise.resolve();
}

export function useLibrary(): LibraryContextValue {
  const library = useContext(LibraryContext);
  if (!library) throw new Error('Library is unavailable');
  return library;
}

export function LibraryProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<SavedItem[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const userIdRef = useRef<string | null>(null);

  useEffect(() => {
    async function refreshFor(userId: string): Promise<void> {
      setRefreshing(true);
      try {
        const snapshot = await fetchLibrary();
        if (userIdRef.current !== userId) return;
        setItems(snapshot.items);
        setFolders(snapshot.folders);
        setError(null);
        await writeLibrary(userId, snapshot);
      } catch (err) {
        if (userIdRef.current !== userId) return;
        setError(err instanceof Error ? err.message : 'Could not refresh your library');
      } finally {
        if (userIdRef.current === userId) setRefreshing(false);
      }
    }

    async function load(userId: string): Promise<void> {
      setReady(false);
      setError(null);
      const stored = await readLibrary(userId);
      if (userIdRef.current !== userId) return;
      if (stored.items.length > 0 || stored.folders.length > 0) {
        setItems(stored.items);
        setFolders(stored.folders);
        setReady(true);
        void refreshFor(userId);
        return;
      }
      setItems([]);
      setFolders([]);
      await refreshFor(userId);
      if (userIdRef.current === userId) setReady(true);
    }

    refreshLibraryImpl = async () => {
      const userId = userIdRef.current;
      if (!userId) return;
      await refreshFor(userId);
    };

    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      const nextId = session?.user.id ?? null;
      if (!nextId) {
        const previous = userIdRef.current;
        userIdRef.current = null;
        setItems([]);
        setFolders([]);
        setError(null);
        setRefreshing(false);
        setReady(true);
        if (previous && event === 'SIGNED_OUT') setTimeout(() => void deleteLibrary(previous), 0);
        return;
      }
      if (nextId === userIdRef.current) return;
      userIdRef.current = nextId;
      setTimeout(() => void load(nextId), 0);
    });

    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') void refreshLibraryImpl?.();
    });

    return () => {
      data.subscription.unsubscribe();
      subscription.remove();
      refreshLibraryImpl = null;
    };
  }, []);

  const value = {
    ready,
    refreshing,
    error,
    items,
    folders,
    refresh: () => refreshLibrary(),
  };

  return <LibraryContext.Provider value={value}>{children}</LibraryContext.Provider>;
}

async function fetchLibrary(): Promise<LibrarySnapshot> {
  const [items, folders] = await Promise.all([fetchItems(), fetchFolders()]);
  return { items, folders };
}

async function fetchItems(): Promise<SavedItem[]> {
  const items: SavedItem[] = [];
  for (let page = 0; page < 100; page += 1) {
    const from = page * pageSize;
    const to = from + pageSize - 1;
    const { data, error } = await supabase
      .from('items')
      .select(itemColumns)
      .order('created_at', { ascending: false })
      .range(from, to);
    if (error) throw new Error(error.message);
    const rows = data ?? [];
    items.push(...rows.map((row) => savedItemFromRow(row)));
    if (rows.length < pageSize) break;
  }
  return items;
}

async function fetchFolders(): Promise<Folder[]> {
  const { data, error } = await supabase.from('folders').select('id, name, created_at').order('name');
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => ({ id: row.id, name: row.name, createdAt: row.created_at }));
}
