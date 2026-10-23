export type YouTubeLink = {
  videoId: string;
  url: string;
  watchUrl: string;
  isShort: boolean;
};

export type YouTubeChannelRef = {
  kind: 'id' | 'handle' | 'username';
  value: string;
  clip: boolean;
};

export type YouTubeNotes = {
  videoUrls: string[];
  channels: YouTubeChannelRef[];
};

const youtubeUrlSource = 'https?:\\/\\/(?:(?:www|m|music)\\.)?(?:youtube\\.com|youtu\\.be)\\/[^\\s"\'<>]+';

const reservedChannelPaths = new Set([
  'watch',
  'playlist',
  'feed',
  'results',
  'shorts',
  'live',
  'embed',
  'gaming',
  'premium',
  'account',
  'clip',
  'hashtag',
]);

export function youtubeNotesFromText(text: string): YouTubeNotes {
  const videoUrls: string[] = [];
  const channels: YouTubeChannelRef[] = [];
  const seenVideos = new Set<string>();
  const seenChannels = new Set<string>();
  for (const raw of text.match(new RegExp(youtubeUrlSource, 'gi')) ?? []) {
    const url = cleanYouTubeUrl(raw);
    const video = youtubeLinkFromText(url);
    if (video) {
      if (seenVideos.has(video.videoId)) continue;
      seenVideos.add(video.videoId);
      videoUrls.push(video.watchUrl);
      continue;
    }
    const channel = channelRefFromUrl(url);
    if (!channel) continue;
    const key = `${channel.kind}:${channel.value.toLowerCase()}`;
    if (seenChannels.has(key)) continue;
    seenChannels.add(key);
    channels.push(channel);
  }
  return { videoUrls, channels };
}

export function extractYouTubeUrl(text: string): string | null {
  const match = text.match(new RegExp(youtubeUrlSource, 'i'));
  return match?.[0]?.replace(/[),.;!?]+$/, '') ?? null;
}

export function getVideoId(url: string): string | null {
  let parsed: URL;
  try {
    parsed = new URL(url.trim());
  } catch {
    return null;
  }

  const host = parsed.hostname.replace(/^www\./i, '').toLowerCase();
  if (host === 'youtu.be') {
    const id = parsed.pathname.split('/').filter(Boolean)[0] ?? '';
    return isVideoId(id) ? id : null;
  }

  if (host !== 'youtube.com' && host !== 'm.youtube.com' && host !== 'music.youtube.com') {
    return null;
  }

  const segments = parsed.pathname.split('/').filter(Boolean);
  if (parsed.searchParams.get('v') && isVideoId(parsed.searchParams.get('v')!)) {
    return parsed.searchParams.get('v');
  }

  if (segments[0] === 'shorts' || segments[0] === 'live' || segments[0] === 'embed') {
    const id = segments[1] ?? '';
    return isVideoId(id) ? id : null;
  }

  return null;
}

export function isShortsUrl(url: string): boolean {
  try {
    const parsed = new URL(url.trim());
    return parsed.pathname.toLowerCase().includes('/shorts/');
  } catch {
    return false;
  }
}

export function youtubeLinkFromText(input: string): YouTubeLink | null {
  const found = extractYouTubeUrl(input);
  if (!found) return null;
  const videoId = getVideoId(found);
  if (!videoId) return null;
  const isShort = isShortsUrl(found);
  return {
    videoId,
    isShort,
    url: isShort ? `https://www.youtube.com/shorts/${videoId}` : `https://www.youtube.com/watch?v=${videoId}`,
    watchUrl: `https://www.youtube.com/watch?v=${videoId}`,
  };
}

function isVideoId(value: string): boolean {
  return /^[A-Za-z0-9_-]{11}$/.test(value);
}

function cleanYouTubeUrl(value: string): string {
  return value.replace(/[),.;!?…\u2060\u200b]+$/g, '').replace(/[^\x20-\x7E]+$/g, '');
}

function channelRefFromUrl(url: string): YouTubeChannelRef | null {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  const host = parsed.hostname.replace(/^(?:www|m|music)\./i, '').toLowerCase();
  if (host !== 'youtube.com') return null;
  const segments = parsed.pathname.split('/').filter(Boolean).map((segment) => decodeURIComponent(segment));
  const first = segments[0] ?? '';
  if (first.startsWith('@') && first.length > 1) return channelRef('handle', first.slice(1));
  if (first === 'channel' && segments[1]?.startsWith('UC')) return channelRef('id', segments[1]);
  if (first === 'user' && segments[1]) return channelRef('username', segments[1]);
  if (first === 'c' && segments[1]) return channelRef('handle', segments[1]);
  if (segments.length === 1 && !reservedChannelPaths.has(first.toLowerCase()) && !isVideoId(first)) {
    return channelRef('handle', first);
  }
  return null;
}

function channelRef(kind: YouTubeChannelRef['kind'], value: string): YouTubeChannelRef {
  const normalized = value.toLowerCase().replace(/[._-]+/g, ' ');
  const clip = /(?:^| )(?:clips?|highlights|shorts|repost)(?: |$)/.test(normalized) || /(?:clips?|shorts)$/.test(value.toLowerCase());
  return { kind, value, clip };
}
