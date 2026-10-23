export type SpotifyLink = {
  kind: 'episode' | 'show';
  id: string;
  url: string;
  embedUrl: string | null;
};

const webPattern = /https?:\/\/(?:[\w.-]+\.)?spotify\.com\/(?:embed\/)?(episode|show)\/([A-Za-z0-9]+)/i;
const uriPattern = /spotify:(episode|show):([A-Za-z0-9]+)/i;

export function spotifyLinkFromText(input: string): SpotifyLink | null {
  const web = input.match(webPattern);
  const uri = web ? null : input.match(uriPattern);
  const kind = (web?.[1] ?? uri?.[1])?.toLowerCase();
  const id = web?.[2] ?? uri?.[2];
  if ((kind !== 'episode' && kind !== 'show') || !id) return null;
  return {
    kind,
    id,
    url: `https://open.spotify.com/${kind}/${id}`,
    embedUrl: kind === 'episode' ? `https://open.spotify.com/embed/episode/${id}` : null,
  };
}
