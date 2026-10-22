export type YouTubeChapter = {
  at: string;
  label: string;
};

export type YouTubeFacts = {
  channelTitle: string;
  subscriberCount: number | null;
  likeCount: number | null;
  viewCount: number | null;
  commentCount: number | null;
  publishedAt: string | null;
  chapters: YouTubeChapter[];
};

export function youtubeFactsFromCaption(caption: string | null): YouTubeFacts | null {
  if (!caption || !caption.trim().startsWith('{')) return null;
  let value: unknown;
  try {
    value = JSON.parse(caption);
  } catch {
    return null;
  }
  if (!value || typeof value !== 'object') return null;
  const record = value as Record<string, unknown>;
  if (typeof record.channelTitle !== 'string' || record.channelTitle.trim().length === 0) return null;
  return {
    channelTitle: record.channelTitle.trim(),
    subscriberCount: countOrNull(record.subscriberCount),
    likeCount: countOrNull(record.likeCount),
    viewCount: countOrNull(record.viewCount),
    commentCount: countOrNull(record.commentCount),
    publishedAt: typeof record.publishedAt === 'string' ? record.publishedAt : null,
    chapters: chaptersFrom(record.chapters),
  };
}

export function formatCount(value: number): string {
  if (value >= 1_000_000) return trimCount(value / 1_000_000, 'M');
  if (value >= 1_000) return trimCount(value / 1_000, 'K');
  return String(value);
}

export function formatPublished(value: string): string | null {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function trimCount(value: number, suffix: string): string {
  const rounded = value >= 10 ? value.toFixed(0) : value.toFixed(1);
  return `${rounded.replace(/\.0$/, '')}${suffix}`;
}

function countOrNull(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) return null;
  return Math.floor(value);
}

function chaptersFrom(value: unknown): YouTubeChapter[] {
  if (!Array.isArray(value)) return [];
  const chapters: YouTubeChapter[] = [];
  for (const entry of value) {
    if (!entry || typeof entry !== 'object') continue;
    const record = entry as { at?: unknown; label?: unknown };
    if (typeof record.at !== 'string' || typeof record.label !== 'string') continue;
    const at = record.at.trim();
    const label = record.label.trim();
    if (!at || !label) continue;
    chapters.push({ at, label });
  }
  return chapters;
}
