export type Platform = 'instagram' | 'reddit' | 'x' | 'linkedin' | 'other';
export type ItemStatus = 'saving' | 'summarising' | 'ready' | 'limited' | 'failed';

export type SavedItem = {
  id: string;
  platform: Platform;
  sourceUrl: string | null;
  caption: string | null;
  status: ItemStatus;
  title: string | null;
  summary: string | null;
  keyPoints: string[];
  tags: string[];
  createdAt: string;
};

type ItemRow = {
  id: string;
  platform: Platform;
  source_url: string | null;
  caption: string | null;
  status: ItemStatus;
  title: string | null;
  summary: string | null;
  key_points: unknown;
  tags: string[] | null;
  created_at: string;
};

const platforms = new Set<Platform>(['instagram', 'reddit', 'x', 'linkedin', 'other']);
const statuses = new Set<ItemStatus>(['saving', 'summarising', 'ready', 'limited', 'failed']);

export function savedItemFromRow(row: ItemRow): SavedItem {
  return {
    id: row.id,
    platform: platforms.has(row.platform) ? row.platform : 'other',
    sourceUrl: row.source_url,
    caption: row.caption,
    status: statuses.has(row.status) ? row.status : 'saving',
    title: row.title,
    summary: row.summary,
    keyPoints: stringList(row.key_points),
    tags: stringList(row.tags),
    createdAt: row.created_at,
  };
}

export function itemHeading(item: SavedItem): string {
  if (item.title && item.title.trim().length > 0) return item.title;
  if (item.sourceUrl && item.sourceUrl.trim().length > 0) return item.sourceUrl;
  if (item.caption && item.caption.trim().length > 0) return item.caption;
  return 'Saved post';
}

export function platformLabel(platform: Platform): string {
  if (platform === 'instagram') return 'Instagram';
  if (platform === 'reddit') return 'Reddit';
  if (platform === 'x') return 'X';
  if (platform === 'linkedin') return 'LinkedIn';
  return 'Other';
}

export function statusLabel(status: ItemStatus): string {
  if (status === 'saving') return 'Saving';
  if (status === 'summarising') return 'Summarising';
  if (status === 'ready') return 'Ready';
  if (status === 'limited') return 'Limited';
  return 'Failed';
}

function stringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((entry): entry is string => typeof entry === 'string' && entry.trim().length > 0);
}
