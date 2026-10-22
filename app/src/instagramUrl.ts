export type InstagramLink = {
  url: string;
  shortcode: string;
  kind: 'p' | 'reel' | 'tv';
};

const instagramLinkPattern =
  /https?:\/\/(?:www\.)?(?:instagram\.com|instagr\.am)\/(?:share\/)?(?:p|reel|reels|tv)\/([A-Za-z0-9_-]+)/i;

export function instagramLinkFromText(input: string): InstagramLink | null {
  const match = input.match(instagramLinkPattern);
  if (!match?.[1]) return null;

  const shortcode = match[1];
  const kindMatch = match[0].match(/\/(p|reels|reel|tv)\//i)?.[1]?.toLowerCase();
  const kind = kindMatch === 'reel' || kindMatch === 'reels' ? 'reel' : kindMatch === 'tv' ? 'tv' : 'p';
  const pathKind = kind === 'p' ? 'p' : kind;

  return {
    shortcode,
    kind,
    url: `https://www.instagram.com/${pathKind}/${shortcode}/`,
  };
}
