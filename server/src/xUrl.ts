export type XLink = {
  id: string;
  url: string;
};

const linkPattern = /https?:\/\/(?:[\w.-]+\.)?(?:x\.com|twitter\.com)\/[^\s"'<>]+/i;

export function xLinkFromText(input: string): XLink | null {
  const match = input.match(linkPattern);
  if (!match?.[0]) return null;

  let url: URL;
  try {
    url = new URL(match[0].replace(/[),.;]+$/, ''));
  } catch {
    return null;
  }

  const host = url.hostname.toLowerCase().replace(/^www\./, '');
  if (host !== 'x.com' && host !== 'twitter.com' && !host.endsWith('.x.com') && !host.endsWith('.twitter.com')) {
    return null;
  }

  const parts = url.pathname.split('/').filter(Boolean);
  const statusIndex = parts.findIndex((part) => part === 'status' || part === 'statuses');
  const id = statusIndex >= 0 ? parts[statusIndex + 1] : '';
  if (!id || !/^\d+$/.test(id)) return null;

  return { id, url: `https://x.com/i/web/status/${id}` };
}
