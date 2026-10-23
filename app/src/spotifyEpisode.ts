export type SpotifyYouTubeChapterView = { at: string; label: string };

export type SpotifyYouTubeChannelView = {
  channelTitle: string;
  description: string;
  subscriberCount: number | null;
  url: string;
  videoTitle: string | null;
  viewCount: number | null;
  likeCount: number | null;
  commentCount: number | null;
  publishedAt: string | null;
  chapters: SpotifyYouTubeChapterView[];
};

export type SpotifyCopyrightView = { text: string; type: string };

export type SpotifyEpisodeView = {
  showName: string;
  name: string;
  description: string;
  durationMs: number;
  releaseDate: string | null;
  releaseDatePrecision: string | null;
  explicit: boolean;
  languages: string[];
  isPlayable: boolean;
  restrictionReason: string | null;
  imageUrl: string | null;
  showDescription: string;
  showExplicit: boolean;
  showLanguages: string[];
  showTotalEpisodes: number | null;
  showMediaType: string | null;
  showPublisher: string | null;
  showImageUrl: string | null;
  showCopyrights: SpotifyCopyrightView[];
  youtubeChannel: SpotifyYouTubeChannelView | null;
};

export function spotifyEpisodeFromCaption(caption: string | null): SpotifyEpisodeView | null {
  if (!caption?.trim().startsWith('{')) return null;
  try {
    const parsed = JSON.parse(caption) as Partial<SpotifyEpisodeView>;
    if (typeof parsed.name !== 'string' || typeof parsed.showName !== 'string') return null;
    return {
      showName: parsed.showName,
      name: parsed.name,
      description: typeof parsed.description === 'string' ? parsed.description : '',
      durationMs: typeof parsed.durationMs === 'number' ? parsed.durationMs : 0,
      releaseDate: typeof parsed.releaseDate === 'string' ? parsed.releaseDate : null,
      releaseDatePrecision: typeof parsed.releaseDatePrecision === 'string' ? parsed.releaseDatePrecision : null,
      explicit: parsed.explicit === true,
      languages: textList(parsed.languages),
      isPlayable: parsed.isPlayable !== false,
      restrictionReason: typeof parsed.restrictionReason === 'string' ? parsed.restrictionReason : null,
      imageUrl: typeof parsed.imageUrl === 'string' ? parsed.imageUrl : null,
      showDescription: typeof parsed.showDescription === 'string' ? parsed.showDescription : '',
      showExplicit: parsed.showExplicit === true,
      showLanguages: textList(parsed.showLanguages),
      showTotalEpisodes: typeof parsed.showTotalEpisodes === 'number' ? parsed.showTotalEpisodes : null,
      showMediaType: typeof parsed.showMediaType === 'string' ? parsed.showMediaType : null,
      showPublisher: typeof parsed.showPublisher === 'string' ? parsed.showPublisher : null,
      showImageUrl: typeof parsed.showImageUrl === 'string' ? parsed.showImageUrl : null,
      showCopyrights: Array.isArray(parsed.showCopyrights)
        ? parsed.showCopyrights.filter(
            (entry): entry is SpotifyCopyrightView =>
              typeof entry?.text === 'string' && entry.text.length > 0 && typeof entry.type === 'string',
          )
        : [],
      youtubeChannel: youtubeChannelFrom(parsed.youtubeChannel),
    };
  } catch {
    return null;
  }
}

export function formatDuration(durationMs: number): string | null {
  if (durationMs <= 0) return null;
  const minutes = Math.round(durationMs / 60000);
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest === 0 ? `${hours} hr` : `${hours} hr ${rest} min`;
}

export function restrictionLabel(reason: string): string {
  if (reason === 'market') return 'Not available in this country';
  if (reason === 'product') return 'Not available on this Spotify plan';
  if (reason === 'explicit') return 'Explicit content is blocked';
  return reason;
}

function youtubeChannelFrom(value: unknown): SpotifyYouTubeChannelView | null {
  if (!value || typeof value !== 'object') return null;
  const record = value as Record<string, unknown>;
  const channelTitle = typeof record.channelTitle === 'string' ? record.channelTitle.trim() : '';
  const url = typeof record.url === 'string' ? record.url.trim() : '';
  if (!channelTitle || !url.startsWith('https://')) return null;
  return {
    channelTitle,
    description: typeof record.description === 'string' ? record.description : '',
    subscriberCount: countOrNull(record.subscriberCount),
    url,
    videoTitle: typeof record.videoTitle === 'string' && record.videoTitle.trim() ? record.videoTitle.trim() : null,
    viewCount: countOrNull(record.viewCount),
    likeCount: countOrNull(record.likeCount),
    commentCount: countOrNull(record.commentCount),
    publishedAt: typeof record.publishedAt === 'string' ? record.publishedAt : null,
    chapters: chaptersFrom(record.chapters),
  };
}

function chaptersFrom(value: unknown): SpotifyYouTubeChapterView[] {
  if (!Array.isArray(value)) return [];
  const chapters: SpotifyYouTubeChapterView[] = [];
  for (const entry of value) {
    if (!entry || typeof entry !== 'object') continue;
    const record = entry as { at?: unknown; label?: unknown };
    const at = typeof record.at === 'string' ? record.at.trim() : '';
    const label = typeof record.label === 'string' ? record.label.trim() : '';
    if (!at || !label) continue;
    chapters.push({ at, label });
  }
  return chapters;
}

function countOrNull(value: unknown): number | null {
  if (typeof value !== 'string' && typeof value !== 'number') return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return null;
  return Math.floor(parsed);
}

function textList(values: unknown): string[] {
  if (!Array.isArray(values)) return [];
  return values.filter((value): value is string => typeof value === 'string' && value.trim().length > 0);
}
