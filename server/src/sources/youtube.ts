import { env } from '../env';
import { PermanentError } from '../worker/errors';
import { youtubeLinkFromText } from '../youtubeUrl';

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
  description: string;
};

export type YouTubeDetails = {
  videoId: string;
  watchUrl: string;
  title: string;
  description: string;
  channelTitle: string;
  channelId: string | null;
  durationSeconds: number;
  isShort: boolean;
  embeddable: boolean;
  privacyStatus: string;
  liveBroadcastContent: string;
  subscriberCount: number | null;
  likeCount: number | null;
  viewCount: number | null;
  commentCount: number | null;
  publishedAt: string | null;
};

type VideosListResponse = {
  items?: Array<{
    id: string;
    snippet?: {
      title?: string;
      description?: string;
      channelTitle?: string;
      channelId?: string;
      publishedAt?: string;
      liveBroadcastContent?: string;
    };
    contentDetails?: { duration?: string };
    statistics?: {
      viewCount?: string;
      likeCount?: string;
      commentCount?: string;
    };
    status?: {
      privacyStatus?: string;
      embeddable?: boolean;
    };
  }>;
};

export async function fetchYouTubeDetails(sourceUrl: string): Promise<YouTubeDetails> {
  if (!env.YOUTUBE_API_KEY) throw new Error('missing YOUTUBE_API_KEY');

  const link = youtubeLinkFromText(sourceUrl);
  if (!link) throw new PermanentError('Paste a YouTube video or Short link');

  const endpoint = new URL('https://www.googleapis.com/youtube/v3/videos');
  endpoint.searchParams.set('part', 'snippet,contentDetails,statistics,status');
  endpoint.searchParams.set('id', link.videoId);
  endpoint.searchParams.set('key', env.YOUTUBE_API_KEY);

  const response = await fetch(endpoint);
  if (!response.ok) {
    if (response.status === 403 || response.status === 429) {
      throw new Error(`YouTube API unavailable (${response.status})`);
    }
    throw new Error(`YouTube API failed (${response.status})`);
  }

  const body = (await response.json()) as VideosListResponse;
  const item = body.items?.[0];
  if (!item) throw new PermanentError('This YouTube video was not found');

  const privacyStatus = item.status?.privacyStatus ?? 'unknown';
  if (privacyStatus === 'private') throw new PermanentError('This YouTube video is private');

  const live = item.snippet?.liveBroadcastContent ?? 'none';
  if (live === 'live' || live === 'upcoming') {
    throw new PermanentError('Live YouTube streams are not supported yet');
  }

  const durationSeconds = parseIsoDuration(item.contentDetails?.duration ?? 'PT0S');
  const isShort = link.isShort || durationSeconds <= 180;
  const channelId = item.snippet?.channelId?.trim() || null;
  const subscriberCount = channelId ? await fetchSubscriberCount(channelId, env.YOUTUBE_API_KEY) : null;

  return {
    videoId: link.videoId,
    watchUrl: link.watchUrl,
    title: item.snippet?.title?.trim() || 'YouTube video',
    description: item.snippet?.description?.trim() || '',
    channelTitle: item.snippet?.channelTitle?.trim() || 'YouTube',
    channelId,
    durationSeconds,
    isShort,
    embeddable: item.status?.embeddable !== false,
    privacyStatus,
    liveBroadcastContent: live,
    subscriberCount,
    likeCount: countOrNull(item.statistics?.likeCount),
    viewCount: countOrNull(item.statistics?.viewCount),
    commentCount: countOrNull(item.statistics?.commentCount),
    publishedAt: item.snippet?.publishedAt ?? null,
  };
}

export function wantsYouTubeChapters(kind: string | null, isShort: boolean): boolean {
  if (kind === 'short') return false;
  if (kind === 'video' || kind === 'podcast') return true;
  return !isShort;
}

export function parseDescriptionChapters(description: string): YouTubeChapter[] {
  const chapters: YouTubeChapter[] = [];
  for (const line of description.split('\n')) {
    const match = line.match(/^\s*((?:\d{1,2}:)?\d{1,2}:\d{2})\s*[-–—:]?\s+(.+?)\s*$/);
    if (!match) continue;
    const at = normalizeTimestamp(match[1] ?? '');
    const label = match[2]?.trim().slice(0, 120) ?? '';
    if (!at || label.length === 0) continue;
    chapters.push({ at, label });
  }
  if (chapters.length < 2 || chapters[0]?.at !== '0:00') return [];
  return chapters.slice(0, 40);
}

export function youtubeFactsCaption(facts: YouTubeFacts): string {
  return JSON.stringify({
    channelTitle: facts.channelTitle,
    subscriberCount: facts.subscriberCount,
    likeCount: facts.likeCount,
    viewCount: facts.viewCount,
    commentCount: facts.commentCount,
    publishedAt: facts.publishedAt,
    chapters: facts.chapters,
    description: facts.description.slice(0, 2000),
  });
}

async function fetchSubscriberCount(channelId: string, apiKey: string): Promise<number | null> {
  try {
    const endpoint = new URL('https://www.googleapis.com/youtube/v3/channels');
    endpoint.searchParams.set('part', 'statistics');
    endpoint.searchParams.set('id', channelId);
    endpoint.searchParams.set('key', apiKey);
    const response = await fetch(endpoint);
    if (!response.ok) return null;
    const body = (await response.json()) as {
      items?: Array<{ statistics?: { subscriberCount?: string; hiddenSubscriberCount?: boolean } }>;
    };
    const stats = body.items?.[0]?.statistics;
    if (!stats || stats.hiddenSubscriberCount) return null;
    return countOrNull(stats.subscriberCount);
  } catch {
    return null;
  }
}

function countOrNull(value: unknown): number | null {
  if (typeof value !== 'string' && typeof value !== 'number') return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return null;
  return Math.floor(parsed);
}

export function chaptersFromModel(input: string): YouTubeChapter[] {
  let value: unknown;
  try {
    value = JSON.parse(
      input
        .trim()
        .replace(/^```json\s*/i, '')
        .replace(/```$/, '')
        .trim(),
    );
  } catch {
    return [];
  }
  if (!value || typeof value !== 'object') return [];
  const chapters = (value as { chapters?: unknown }).chapters;
  if (!Array.isArray(chapters)) return [];
  const parsed: YouTubeChapter[] = [];
  for (const entry of chapters) {
    if (!entry || typeof entry !== 'object') continue;
    const record = entry as { at?: unknown; label?: unknown };
    const at = typeof record.at === 'string' ? normalizeTimestamp(record.at) : null;
    const label = typeof record.label === 'string' ? record.label.trim().slice(0, 120) : '';
    if (!at || label.length === 0) continue;
    parsed.push({ at, label });
    if (parsed.length === 12) break;
  }
  return parsed;
}

export function normalizeTimestamp(value: string): string | null {
  const match = value.trim().match(/^(?:(\d{1,2}):)?(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  const hours = match[1] == null ? null : Number(match[1]);
  const minutes = Number(match[2]);
  const seconds = Number(match[3]);
  if (seconds > 59 || minutes > 59) return null;
  const clock = `${minutes}:${String(seconds).padStart(2, '0')}`;
  if (hours == null || hours === 0) return clock;
  return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export function parseIsoDuration(value: string): number {
  const match = value.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/i);
  if (!match) return 0;
  const hours = Number(match[1] ?? 0);
  const minutes = Number(match[2] ?? 0);
  const seconds = Number(match[3] ?? 0);
  return hours * 3600 + minutes * 60 + seconds;
}
