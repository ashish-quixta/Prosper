export type YouTubeLink = {
  videoId: string;
  url: string;
  watchUrl: string;
  isShort: boolean;
};

const youtubeUrlPattern =
  /https?:\/\/(?:(?:www|m|music)\.)?(?:youtube\.com|youtu\.be)\/[^\s"'<>]+/i;

export function extractYouTubeUrl(text: string): string | null {
  const match = text.match(youtubeUrlPattern);
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
