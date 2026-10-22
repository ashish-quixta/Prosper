import type { Folder } from '@/hooks/useFolders';
import type { SavedItem } from '@/savedItem';

export type LibrarySnapshot = {
  items: SavedItem[];
  folders: Folder[];
};

const emptyLibrary: LibrarySnapshot = { items: [], folders: [] };
const userIdPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function readLibrary(userId: string): Promise<LibrarySnapshot> {
  const path = await libraryPath(userId);
  if (!path) return emptyLibrary;
  const { getInfoAsync, readAsStringAsync } = await import('expo-file-system/legacy');
  const info = await getInfoAsync(path);
  if (!info.exists) return emptyLibrary;
  const raw = await readAsStringAsync(path);
  return parseLibrary(raw);
}

export async function writeLibrary(userId: string, snapshot: LibrarySnapshot): Promise<void> {
  const path = await libraryPath(userId);
  if (!path) return;
  const { documentDirectory, makeDirectoryAsync, writeAsStringAsync } = await import('expo-file-system/legacy');
  if (!documentDirectory) return;
  await makeDirectoryAsync(`${documentDirectory}libraries`, { intermediates: true });
  await writeAsStringAsync(path, JSON.stringify(snapshot));
}

export async function deleteLibrary(userId: string): Promise<void> {
  const path = await libraryPath(userId);
  if (!path) return;
  const { deleteAsync, getInfoAsync } = await import('expo-file-system/legacy');
  const info = await getInfoAsync(path);
  if (!info.exists) return;
  await deleteAsync(path);
}

async function libraryPath(userId: string): Promise<string | null> {
  if (!userIdPattern.test(userId)) return null;
  const { documentDirectory } = await import('expo-file-system/legacy');
  if (!documentDirectory) return null;
  return `${documentDirectory}libraries/${userId}.json`;
}

function parseLibrary(raw: string): LibrarySnapshot {
  try {
    const parsed = JSON.parse(raw) as Partial<LibrarySnapshot>;
    return {
      items: Array.isArray(parsed.items) ? parsed.items.filter(isSavedItem) : [],
      folders: Array.isArray(parsed.folders) ? parsed.folders.filter(isFolder) : [],
    };
  } catch {
    return emptyLibrary;
  }
}

function isSavedItem(value: unknown): value is SavedItem {
  if (!value || typeof value !== 'object') return false;
  const item = value as SavedItem;
  return typeof item.id === 'string' && typeof item.createdAt === 'string' && typeof item.platform === 'string';
}

function isFolder(value: unknown): value is Folder {
  if (!value || typeof value !== 'object') return false;
  const folder = value as Folder;
  return typeof folder.id === 'string' && typeof folder.name === 'string';
}
