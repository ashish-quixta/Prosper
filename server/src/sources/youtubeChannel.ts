import { env } from '../env';
import { youtubeLinkFromText, youtubeNotesFromText, type YouTubeChannelRef } from '../youtubeUrl';
import { fetchYouTubeDetails, parseDescriptionChapters, parseIsoDuration, type YouTubeChapter } from './youtube';

export type ChannelCandidate = {
  channelId: string;
  title: string;
  description: string;
};

export type VideoCandidate = {
  videoId: string;
  title: string;
  channelTitle: string;
  durationSeconds?: number;
};

export type ShowYouTubeChannel = {
  channelTitle: string;
  description: string;
  subscriberCount: number | null;
  url: string;
  videoTitle: string | null;
  viewCount: number | null;
  likeCount: number | null;
  commentCount: number | null;
  publishedAt: string | null;
  chapters: YouTubeChapter[];
};

type SearchResponse = {
  items?: Array<{
    id?: { channelId?: string };
    snippet?: { title?: string; description?: string };
  }>;
};

type ChannelResponse = {
  items?: Array<{
    snippet?: { title?: string; description?: string };
    statistics?: { subscriberCount?: string; hiddenSubscriberCount?: boolean };
  }>;
};

export function canLookUpShowChannel(showName: string, publisher: string | null): boolean {
  const creator = publisher?.trim() ?? '';
  const name = showName.trim();
  if (creator.length < 2 || name.length < 2) return false;
  return name.toLowerCase() !== 'spotify';
}

export function channelTitleMatches(channelTitle: string, showName: string, publisher: string): boolean {
  return namesAlign(channelTitle, showName) || namesAlign(channelTitle, publisher);
}

export function pickMatchingChannel(
  channels: ChannelCandidate[],
  showName: string,
  publisher: string,
): ChannelCandidate | null {
  return channels.find((channel) => channelTitleMatches(channel.title, showName, publisher)) ?? null;
}

export async function findYouTubeChannelForShow(
  showName: string,
  publisher: string | null,
): Promise<ShowYouTubeChannel | null> {
  const apiKey = env.YOUTUBE_API_KEY;
  const creator = publisher?.trim() ?? '';
  if (!apiKey || !canLookUpShowChannel(showName, creator)) return null;

  try {
    const candidates = await searchChannels(apiKey, `${showName} ${creator}`);
    const picked = pickMatchingChannel(candidates, showName, creator);
    if (!picked) return null;
    const details = await fetchChannel(apiKey, picked.channelId);
    if (details) return details;
    return channelOnly(picked.title, picked.description.slice(0, 500), null, channelUrl(picked.channelId));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('spotify youtube channel lookup failed', { message });
    return null;
  }
}

function namesAlign(channelTitle: string, candidate: string): boolean {
  const channel = normalizeName(channelTitle);
  const name = normalizeName(candidate);
  if (channel.length < 3 || name.length < 3) return false;
  if (channel === name) return true;
  if (!phraseIsSpecific(name)) return false;
  return containsPhrase(channel, name) || (phraseIsSpecific(channel) && containsPhrase(name, channel));
}

function phraseIsSpecific(value: string): boolean {
  const words = value.split(' ').filter((word) => word.length > 0);
  return words.length >= 2 || value.length >= 12;
}

function containsPhrase(haystack: string, needle: string): boolean {
  const pattern = new RegExp(`(?:^| )${escapeRegExp(needle)}(?: |$)`);
  return pattern.test(haystack);
}

function normalizeName(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\b(the|official|podcast|show|channel)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function searchChannels(apiKey: string, query: string): Promise<ChannelCandidate[]> {
  const endpoint = new URL('https://www.googleapis.com/youtube/v3/search');
  endpoint.searchParams.set('part', 'snippet');
  endpoint.searchParams.set('type', 'channel');
  endpoint.searchParams.set('maxResults', '5');
  endpoint.searchParams.set('q', query);
  endpoint.searchParams.set('key', apiKey);
  const response = await fetch(endpoint, { signal: AbortSignal.timeout(15000) });
  if (!response.ok) throw new Error(`YouTube channel search failed (${response.status})`);
  const body = (await response.json()) as SearchResponse;
  const channels: ChannelCandidate[] = [];
  for (const item of body.items ?? []) {
    const channelId = item.id?.channelId?.trim() ?? '';
    const title = item.snippet?.title?.trim() ?? '';
    if (!channelId || !title) continue;
    channels.push({
      channelId,
      title,
      description: item.snippet?.description?.trim() ?? '',
    });
  }
  return channels;
}

async function fetchChannel(apiKey: string, channelId: string): Promise<ShowYouTubeChannel | null> {
  const endpoint = new URL('https://www.googleapis.com/youtube/v3/channels');
  endpoint.searchParams.set('part', 'snippet,statistics');
  endpoint.searchParams.set('id', channelId);
  endpoint.searchParams.set('key', apiKey);
  const response = await fetch(endpoint, { signal: AbortSignal.timeout(15000) });
  if (!response.ok) return null;
  const body = (await response.json()) as ChannelResponse;
  const item = body.items?.[0];
  const title = item?.snippet?.title?.trim();
  if (!item || !title) return null;
  const stats = item.statistics;
  return channelOnly(
    title,
    (item.snippet?.description?.trim() ?? '').slice(0, 500),
    stats?.hiddenSubscriberCount ? null : countOrNull(stats?.subscriberCount),
    channelUrl(channelId),
  );
}

export function canLookUpShowVideo(episodeName: string, showName: string, publisher: string | null): boolean {
  if (episodeName.trim().length < 8) return false;
  const name = showName.trim();
  if (name.length < 2 || name.toLowerCase() === 'spotify') return false;
  if ((publisher?.trim().length ?? 0) >= 2) return true;
  return normalizeName(name).split(' ').filter((word) => word.length >= 3).length >= 2;
}

export function pickMatchingVideo(
  videos: VideoCandidate[],
  episodeName: string,
  showName: string,
  publisher: string | null,
): VideoCandidate | null {
  const ranked = videos
    .map((video) => ({
      video,
      score: scoreEpisodeVideo(video, episodeName, showName, publisher),
      overlap: titleOverlap(video.title, episodeName, showName),
    }))
    .filter(
      (entry) =>
        entry.overlap >= 2 &&
        entry.score >= 6 &&
        channelIdentityScore(entry.video, episodeName, showName, publisher) > 0,
    )
    .sort((a, b) => compareCandidates(a, b));
  return ranked[0]?.video ?? null;
}

export function channelSearchQuery(episodeName: string): string {
  const cleaned = episodeName
    .replace(/[“”„«»"']/g, ' ')
    .replace(/#\w+\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return cleaned.length >= 8 ? cleaned.slice(0, 140) : episodeName.trim().slice(0, 140);
}

export function pickVideoOnChannel(videos: VideoCandidate[], episodeName: string, showName: string): VideoCandidate | null {
  const ranked = videos
    .map((video) => ({ video, overlap: titleOverlap(video.title, episodeName, showName) }))
    .filter((entry) => entry.overlap >= 2)
    .sort((a, b) => compareCandidates({ score: a.overlap, video: a.video }, { score: b.overlap, video: b.video }));
  return ranked[0]?.video ?? null;
}

export async function findYouTubeForEpisode(
  episodeName: string,
  showName: string,
  publisher: string | null,
  notes = '',
): Promise<ShowYouTubeChannel | null> {
  const apiKey = env.YOUTUBE_API_KEY;
  if (!apiKey) return null;

  try {
    const fromNotes = await findFromShowNotes(apiKey, episodeName, showName, notes);
    if (fromNotes) return fromNotes;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('spotify youtube notes lookup failed', { message });
  }

  if (!canLookUpShowVideo(episodeName, showName, publisher)) {
    return findYouTubeChannelForShow(showName, publisher);
  }

  try {
    const query = [episodeName, showName, publisher?.trim() ?? ''].filter((part) => part.length > 0).join(' ');
    const found = await searchVideos(apiKey, query);
    const preliminary = found
      .map((video) => ({
        video,
        score: scoreEpisodeVideo(video, episodeName, showName, publisher),
        overlap: titleOverlap(video.title, episodeName, showName),
      }))
      .filter(
        (entry) =>
          entry.overlap >= 2 &&
          entry.score >= 6 &&
          channelIdentityScore(entry.video, episodeName, showName, publisher) > 0,
      )
      .sort((a, b) => compareCandidates(a, b))
      .slice(0, 5)
      .map((entry) => entry.video);
    const candidates = await attachDurations(apiKey, preliminary);
    const picked = pickMatchingVideo(candidates, episodeName, showName, publisher);
    if (!picked) return findYouTubeChannelForShow(showName, publisher);
    const details = await fetchYouTubeDetails(`https://www.youtube.com/watch?v=${picked.videoId}`);
    const confirmed = pickMatchingVideo(
      [
        {
          videoId: picked.videoId,
          title: details.title,
          channelTitle: details.channelTitle,
          durationSeconds: details.durationSeconds,
        },
      ],
      episodeName,
      showName,
      publisher,
    );
    if (!confirmed) return findYouTubeChannelForShow(showName, publisher);
    return {
      channelTitle: details.channelTitle,
      description: '',
      subscriberCount: details.subscriberCount,
      url: details.watchUrl,
      videoTitle: details.title,
      viewCount: details.viewCount,
      likeCount: details.likeCount,
      commentCount: details.commentCount,
      publishedAt: details.publishedAt,
      chapters: parseDescriptionChapters(details.description).slice(0, 40),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('spotify youtube video lookup failed', { message });
    return findYouTubeChannelForShow(showName, publisher);
  }
}

const TITLE_STOP_WORDS = new Set(['with', 'from', 'that', 'this', 'your', 'about', 'episode', 'how']);

async function findFromShowNotes(
  apiKey: string,
  episodeName: string,
  showName: string,
  notes: string,
): Promise<ShowYouTubeChannel | null> {
  const parsed = youtubeNotesFromText(notes);
  const links = parsed.videoUrls
    .map((url) => youtubeLinkFromText(url))
    .filter((link): link is NonNullable<ReturnType<typeof youtubeLinkFromText>> => link != null);
  for (const link of links.filter((link) => !link.isShort)) {
    const match = await videoMatch(link.watchUrl);
    if (match) return match;
  }

  for (const channel of parsed.channels.filter((channel) => !channel.clip).slice(0, 2)) {
    const channelId = await resolveChannelId(apiKey, channel);
    if (!channelId) continue;
    const found = await searchVideos(apiKey, channelSearchQuery(episodeName), channelId);
    const picked = pickVideoOnChannel(await attachDurations(apiKey, found), episodeName, showName);
    if (!picked) continue;
    const match = await videoMatch(`https://www.youtube.com/watch?v=${picked.videoId}`);
    if (match) return match;
  }

  const short = links.find((link) => link.isShort);
  return short ? videoMatch(short.watchUrl) : null;
}

async function videoMatch(watchUrl: string): Promise<ShowYouTubeChannel | null> {
  try {
    const details = await fetchYouTubeDetails(watchUrl);
    return {
      channelTitle: details.channelTitle,
      description: '',
      subscriberCount: details.subscriberCount,
      url: details.watchUrl,
      videoTitle: details.title,
      viewCount: details.viewCount,
      likeCount: details.likeCount,
      commentCount: details.commentCount,
      publishedAt: details.publishedAt,
      chapters: parseDescriptionChapters(details.description).slice(0, 40),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('spotify youtube video read failed', { message });
    return null;
  }
}

async function resolveChannelId(apiKey: string, channel: YouTubeChannelRef): Promise<string | null> {
  const direct = await lookupChannel(apiKey, channel);
  if (direct) return direct;
  if (channel.kind === 'id') return null;
  return channelIdFromSearch(apiKey, channel.value);
}

async function lookupChannel(apiKey: string, channel: YouTubeChannelRef): Promise<string | null> {
  const endpoint = new URL('https://www.googleapis.com/youtube/v3/channels');
  endpoint.searchParams.set('part', 'id');
  if (channel.kind === 'id') endpoint.searchParams.set('id', channel.value);
  else if (channel.kind === 'username') endpoint.searchParams.set('forUsername', channel.value);
  else endpoint.searchParams.set('forHandle', channel.value);
  endpoint.searchParams.set('key', apiKey);
  const response = await fetch(endpoint, { signal: AbortSignal.timeout(15000) });
  if (!response.ok) return null;
  const body = (await response.json()) as { items?: Array<{ id?: string }> };
  return body.items?.[0]?.id?.trim() || null;
}

async function channelIdFromSearch(apiKey: string, value: string): Promise<string | null> {
  const search = new URL('https://www.googleapis.com/youtube/v3/search');
  search.searchParams.set('part', 'snippet');
  search.searchParams.set('type', 'channel');
  search.searchParams.set('maxResults', '5');
  search.searchParams.set('q', value);
  search.searchParams.set('key', apiKey);
  const found = await fetch(search, { signal: AbortSignal.timeout(15000) });
  if (!found.ok) return null;
  const foundBody = (await found.json()) as { items?: Array<{ id?: { channelId?: string } }> };
  const ids = (foundBody.items ?? []).map((item) => item.id?.channelId?.trim() ?? '').filter((id) => id.length > 0);
  if (ids.length === 0) return null;

  const details = new URL('https://www.googleapis.com/youtube/v3/channels');
  details.searchParams.set('part', 'snippet');
  details.searchParams.set('id', ids.join(','));
  details.searchParams.set('key', apiKey);
  const response = await fetch(details, { signal: AbortSignal.timeout(15000) });
  if (!response.ok) return null;
  const body = (await response.json()) as {
    items?: Array<{ id?: string; snippet?: { title?: string; customUrl?: string } }>;
  };
  const byId = new Map((body.items ?? []).map((item) => [item.id ?? '', item]));
  const wanted = value.toLowerCase().replace(/^@/, '');
  const ordered = ids
    .map((id) => byId.get(id))
    .filter((item): item is NonNullable<typeof item> => item != null);
  const exact = ordered.find((item) => {
    const customUrl = item.snippet?.customUrl?.toLowerCase().replace(/^@/, '') ?? '';
    return customUrl === wanted && !isClipChannel(item.snippet?.title ?? '');
  });
  if (exact?.id) return exact.id;
  const first = ordered.find((item) => !isClipChannel(item.snippet?.title ?? '') && !isClipChannel(item.snippet?.customUrl ?? ''));
  return first?.id?.trim() || null;
}

function scoreEpisodeVideo(video: VideoCandidate, episodeName: string, showName: string, publisher: string | null): number {
  const overlap = titleOverlap(video.title, episodeName, showName);
  const identity = channelIdentityScore(video, episodeName, showName, publisher);
  const clipPenalty = isClipChannel(video.channelTitle) ? 5 : 0;
  return overlap + identity - clipPenalty;
}

function channelIdentityScore(
  video: VideoCandidate,
  episodeName: string,
  showName: string,
  publisher: string | null,
): number {
  const creator = publisher?.trim() ?? '';
  if (channelTitleMatches(video.channelTitle, showName, creator)) return 8;
  const channelWords = significantTokens(video.channelTitle);
  const haystack = new Set([
    ...significantTokens(showName),
    ...significantTokens(creator),
    ...significantTokens(episodeName),
  ]);
  const shared = channelWords.filter((word) => haystack.has(word));
  if (shared.some((word) => word.length >= 8)) return 6;
  if (shared.length >= 2) return 5;
  return 0;
}

function isClipChannel(channelTitle: string): boolean {
  return /\b(clips?|highlights|shorts|repost|fan)\b/.test(normalizeName(channelTitle));
}

function compareCandidates(
  a: { score: number; video: VideoCandidate },
  b: { score: number; video: VideoCandidate },
): number {
  const scoreGap = b.score - a.score;
  const aDuration = a.video.durationSeconds;
  const bDuration = b.video.durationSeconds;
  if (Math.abs(scoreGap) <= 3 && aDuration != null && bDuration != null && aDuration !== bDuration) {
    return bDuration - aDuration;
  }
  return scoreGap;
}

async function attachDurations(apiKey: string, videos: VideoCandidate[]): Promise<VideoCandidate[]> {
  if (videos.length < 2) return videos;
  const endpoint = new URL('https://www.googleapis.com/youtube/v3/videos');
  endpoint.searchParams.set('part', 'contentDetails');
  endpoint.searchParams.set('id', videos.map((video) => video.videoId).join(','));
  endpoint.searchParams.set('key', apiKey);
  const response = await fetch(endpoint, { signal: AbortSignal.timeout(15000) });
  if (!response.ok) return videos;
  const body = (await response.json()) as {
    items?: Array<{ id?: string; contentDetails?: { duration?: string } }>;
  };
  const durations = new Map<string, number>();
  for (const item of body.items ?? []) {
    const id = item.id?.trim() ?? '';
    if (!id) continue;
    durations.set(id, parseIsoDuration(item.contentDetails?.duration ?? 'PT0S'));
  }
  return videos.map((video) => ({ ...video, durationSeconds: durations.get(video.videoId) ?? video.durationSeconds }));
}

function titleOverlap(videoTitle: string, episodeName: string, showName: string): number {
  const showWords = new Set(significantTokens(showName));
  const episodeWords = significantTokens(episodeName).filter((word) => !showWords.has(word));
  const videoWords = new Set(significantTokens(videoTitle));
  return episodeWords.filter((word) => videoWords.has(word)).length;
}

function significantTokens(value: string): string[] {
  return normalizeName(decodeHtml(value))
    .split(' ')
    .filter((word) => word.length >= 5 && !TITLE_STOP_WORDS.has(word));
}

function decodeHtml(value: string): string {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

function channelOnly(
  channelTitle: string,
  description: string,
  subscriberCount: number | null,
  url: string,
): ShowYouTubeChannel {
  return {
    channelTitle,
    description,
    subscriberCount,
    url,
    videoTitle: null,
    viewCount: null,
    likeCount: null,
    commentCount: null,
    publishedAt: null,
    chapters: [],
  };
}

async function searchVideos(apiKey: string, query: string, channelId?: string): Promise<VideoCandidate[]> {
  const endpoint = new URL('https://www.googleapis.com/youtube/v3/search');
  endpoint.searchParams.set('part', 'snippet');
  endpoint.searchParams.set('type', 'video');
  endpoint.searchParams.set('maxResults', channelId ? '5' : '10');
  endpoint.searchParams.set('q', query);
  if (channelId) endpoint.searchParams.set('channelId', channelId);
  endpoint.searchParams.set('key', apiKey);
  const response = await fetch(endpoint, { signal: AbortSignal.timeout(15000) });
  if (!response.ok) throw new Error(`YouTube video search failed (${response.status})`);
  const body = (await response.json()) as {
    items?: Array<{ id?: { videoId?: string }; snippet?: { title?: string; channelTitle?: string } }>;
  };
  const videos: VideoCandidate[] = [];
  for (const item of body.items ?? []) {
    const videoId = item.id?.videoId?.trim() ?? '';
    const title = decodeHtml(item.snippet?.title?.trim() ?? '');
    const channelTitle = decodeHtml(item.snippet?.channelTitle?.trim() ?? '');
    if (!videoId || !title || !channelTitle) continue;
    videos.push({ videoId, title, channelTitle });
  }
  return videos;
}

function channelUrl(channelId: string): string {
  return `https://www.youtube.com/channel/${channelId}`;
}

function countOrNull(value: unknown): number | null {
  if (typeof value !== 'string' && typeof value !== 'number') return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return null;
  return Math.floor(parsed);
}
