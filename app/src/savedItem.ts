export type Platform = 'instagram' | 'reddit' | 'x' | 'linkedin' | 'youtube' | 'spotify' | 'other';
export type ItemStatus = 'saving' | 'summarising' | 'ready' | 'limited' | 'failed';

export type CaptureMethod = 'share' | 'paste' | 'screenshot' | 'bot' | 'pdf' | 'audio' | 'doc' | 'slides';
export type YouTubeKind = 'short' | 'video' | 'podcast';

export type SavedItem = {
  id: string;
  platform: Platform;
  captureMethod: CaptureMethod;
  sourceUrl: string | null;
  caption: string | null;
  status: ItemStatus;
  title: string | null;
  summary: string | null;
  keyPoints: string[];
  tags: string[];
  folderId: string | null;
  youtubeKind: YouTubeKind | null;
  createdAt: string;
};

const captureMethods = new Set<CaptureMethod>(['share', 'paste', 'screenshot', 'bot', 'pdf', 'audio', 'doc', 'slides']);

type ItemRow = {
  id: string;
  platform: Platform;
  capture_method: string;
  source_url: string | null;
  caption: string | null;
  status: ItemStatus;
  title: string | null;
  summary: string | null;
  key_points: unknown;
  tags: string[] | null;
  folder_id: string | null;
  youtube_kind: string | null;
  created_at: string;
};

const platforms = new Set<Platform>(['instagram', 'reddit', 'x', 'linkedin', 'youtube', 'spotify', 'other']);
const youtubeKinds = new Set<YouTubeKind>(['short', 'video', 'podcast']);
const statuses = new Set<ItemStatus>(['saving', 'summarising', 'ready', 'limited', 'failed']);

export function savedItemFromRow(row: ItemRow): SavedItem {
  return {
    id: row.id,
    platform: platforms.has(row.platform) ? row.platform : 'other',
    captureMethod: captureMethods.has(row.capture_method as CaptureMethod)
      ? (row.capture_method as CaptureMethod)
      : 'share',
    sourceUrl: row.source_url,
    caption: row.caption,
    status: statuses.has(row.status) ? row.status : 'saving',
    title: row.title,
    summary: row.summary,
    keyPoints: stringList(row.key_points),
    tags: stringList(row.tags),
    folderId: row.folder_id,
    youtubeKind: youtubeKinds.has(row.youtube_kind as YouTubeKind) ? (row.youtube_kind as YouTubeKind) : null,
    createdAt: row.created_at,
  };
}

export function itemHeading(item: SavedItem): string {
  if (item.title && item.title.trim().length > 0) return item.title;
  if (item.sourceUrl && item.sourceUrl.trim().length > 0) return item.sourceUrl;
  if (item.caption && item.caption.trim().length > 0) return item.caption;
  if (item.captureMethod === 'screenshot') return 'Screenshot';
  if (item.captureMethod === 'pdf') return 'PDF';
  if (item.captureMethod === 'audio') return 'Voice note';
  if (item.captureMethod === 'doc') return 'Google Doc';
  if (item.captureMethod === 'slides') return 'Google Slides';
  return 'Saved post';
}

export function platformLabel(platform: Platform): string {
  if (platform === 'instagram') return 'Instagram';
  if (platform === 'reddit') return 'Reddit';
  if (platform === 'x') return 'X';
  if (platform === 'linkedin') return 'LinkedIn';
  if (platform === 'youtube') return 'YouTube';
  if (platform === 'spotify') return 'Spotify';
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
