import { env } from '../env';
import { PermanentError } from '../worker/errors';
import { spotifyLinkFromText } from '../spotifyUrl';
import type { ShowYouTubeChannel } from './youtubeChannel';

export type SpotifyCopyright = { text: string; type: string };

export type SpotifyEpisode = {
  id: string;
  url: string;
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
  showName: string;
  showDescription: string;
  showExplicit: boolean;
  showLanguages: string[];
  showTotalEpisodes: number | null;
  showMediaType: string | null;
  showPublisher: string | null;
  showImageUrl: string | null;
  showCopyrights: SpotifyCopyright[];
};

type SpotifyImage = { url?: string };
type TokenResponse = { access_token?: string; expires_in?: number };
type EpisodeResponse = {
  id?: string;
  name?: string;
  description?: string;
  duration_ms?: number;
  release_date?: string;
  release_date_precision?: string;
  explicit?: boolean;
  languages?: string[];
  is_playable?: boolean;
  restrictions?: { reason?: string };
  images?: SpotifyImage[];
  show?: {
    name?: string;
    description?: string;
    explicit?: boolean;
    languages?: string[];
    total_episodes?: number;
    media_type?: string;
    publisher?: string;
    images?: SpotifyImage[];
    copyrights?: { text?: string; type?: string }[];
  };
};

let cachedToken: { value: string; expiresAt: number } | null = null;

export function spotifyUnavailableMessage(market: string): string {
  return `This episode is not available in ${market}`;
}

export function spotifyEpisodeCaption(episode: SpotifyEpisode, youtubeChannel: ShowYouTubeChannel | null = null): string {
  return JSON.stringify({
    name: episode.name,
    description: episode.description.slice(0, 4000),
    durationMs: episode.durationMs,
    releaseDate: episode.releaseDate,
    releaseDatePrecision: episode.releaseDatePrecision,
    explicit: episode.explicit,
    languages: episode.languages,
    isPlayable: episode.isPlayable,
    restrictionReason: episode.restrictionReason,
    imageUrl: episode.imageUrl,
    showName: episode.showName,
    showDescription: episode.showDescription.slice(0, 4000),
    showExplicit: episode.showExplicit,
    showLanguages: episode.showLanguages,
    showTotalEpisodes: episode.showTotalEpisodes,
    showMediaType: episode.showMediaType,
    showPublisher: episode.showPublisher,
    showImageUrl: episode.showImageUrl,
    showCopyrights: episode.showCopyrights,
    youtubeChannel,
  });
}

export async function fetchSpotifyEpisode(sourceUrl: string, fetchImpl: typeof fetch = fetch): Promise<SpotifyEpisode> {
  const clientId = env.SPOTIFY_CLIENT_ID;
  const clientSecret = env.SPOTIFY_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new PermanentError('Spotify is not configured');

  const link = spotifyLinkFromText(sourceUrl);
  if (!link || link.kind !== 'episode') throw new PermanentError('Paste a Spotify episode link');

  const market = (env.SPOTIFY_MARKET || 'IN').toUpperCase();
  const token = await spotifyToken(clientId, clientSecret, fetchImpl);
  const lookup = new URL(`https://api.spotify.com/v1/episodes/${link.id}`);
  lookup.searchParams.set('market', market);
  const response = await fetchImpl(lookup, {
    headers: { Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(15000),
  });
  if (response.status === 404) throw new PermanentError('This episode is no longer available');
  if (response.status === 401 || response.status === 403) throw new PermanentError(spotifyUnavailableMessage(market));
  if (response.status === 429) throw new Error('Spotify is busy. This episode will be tried again');
  if (!response.ok) throw new Error('The Spotify episode could not be reached');

  const episode = (await response.json()) as EpisodeResponse;
  if (!episode.id || !episode.name?.trim()) throw new PermanentError('This episode is no longer available');
  const playable = episode.is_playable !== false;
  const restrictionReason = episode.restrictions?.reason?.trim() || null;
  if (!playable || restrictionReason) throw new PermanentError(spotifyUnavailableMessage(market));

  const show = episode.show;
  return {
    id: episode.id,
    url: link.url,
    name: episode.name.trim(),
    description: episode.description?.trim() || '',
    durationMs: episode.duration_ms ?? 0,
    releaseDate: episode.release_date?.trim() || null,
    releaseDatePrecision: episode.release_date_precision?.trim() || null,
    explicit: episode.explicit === true,
    languages: textList(episode.languages),
    isPlayable: playable,
    restrictionReason,
    imageUrl: firstImage(episode.images),
    showName: show?.name?.trim() || 'Spotify',
    showDescription: show?.description?.trim() || '',
    showExplicit: show?.explicit === true,
    showLanguages: textList(show?.languages),
    showTotalEpisodes: typeof show?.total_episodes === 'number' ? show.total_episodes : null,
    showMediaType: show?.media_type?.trim() || null,
    showPublisher: show?.publisher?.trim() || null,
    showImageUrl: firstImage(show?.images),
    showCopyrights: (show?.copyrights ?? [])
      .map((entry) => ({ text: entry.text?.trim() || '', type: entry.type?.trim() || '' }))
      .filter((entry) => entry.text.length > 0),
  };
}

function textList(values: string[] | undefined): string[] {
  return (values ?? []).map((value) => value.trim()).filter((value) => value.length > 0);
}

function firstImage(images: SpotifyImage[] | undefined): string | null {
  const url = images?.find((image) => image.url?.trim())?.url?.trim();
  return url || null;
}

async function spotifyToken(clientId: string, clientSecret: string, fetchImpl: typeof fetch): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) return cachedToken.value;
  const body = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: clientId,
    client_secret: clientSecret,
  });
  const response = await fetchImpl('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
    signal: AbortSignal.timeout(15000),
  });
  if (response.status === 401 || response.status === 403) throw new PermanentError('Spotify is not configured');
  if (!response.ok) throw new Error('Spotify could not be reached');
  const token = (await response.json()) as TokenResponse;
  if (!token.access_token) throw new PermanentError('Spotify is not configured');
  cachedToken = { value: token.access_token, expiresAt: Date.now() + (token.expires_in ?? 3600) * 1000 };
  return token.access_token;
}
