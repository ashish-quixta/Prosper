export type LinkedInKind = 'share' | 'ugcPost' | 'activity';

export type LinkedInLink = {
  url: string;
  urn: string | null;
  kind: LinkedInKind | null;
  embedUrl: string | null;
  mayNotEmbed: boolean;
};

const linkedInPattern = /https?:\/\/(?:[\w.-]+\.)?(?:linkedin\.com|lnkd\.in)\/[^\s"'<>]+/i;
const urnPattern = /urn:li:(share|ugcPost|activity):(\d+)/i;
const slugPattern = /-(share|ugcPost|activity)-(\d+)/i;

export function extractLinkedInUrl(text: string): string | null {
  const iframe = text.match(/src=["']([^"']+)["']/i)?.[1];
  const source = decode(iframe ?? text);
  const match = source.match(linkedInPattern);
  return match?.[0]?.replace(/[),.;]+$/, '') ?? null;
}

export function linkedinLinkFromText(input: string): LinkedInLink | null {
  const found = extractLinkedInUrl(input);
  if (!found) return null;

  let parsed: URL;
  try {
    parsed = new URL(found);
  } catch {
    return null;
  }

  const host = parsed.hostname.replace(/^www\./i, '').toLowerCase();
  if (host !== 'lnkd.in' && host !== 'linkedin.com' && !host.endsWith('.linkedin.com')) return null;

  const url = stripTracking(parsed);
  const decoded = decode(url);
  const urnMatch = decoded.match(urnPattern) ?? decoded.match(slugPattern);
  if (!urnMatch?.[1] || !urnMatch[2]) {
    return { url, urn: null, kind: null, embedUrl: null, mayNotEmbed: true };
  }

  const kind = normalizeKind(urnMatch[1]);
  const urn = `urn:li:${kind}:${urnMatch[2]}`;
  return {
    url,
    urn,
    kind,
    embedUrl: `https://www.linkedin.com/embed/feed/update/${urn}`,
    mayNotEmbed: kind === 'activity',
  };
}

function normalizeKind(value: string): LinkedInKind {
  const lower = value.toLowerCase();
  if (lower === 'share') return 'share';
  if (lower === 'ugcpost') return 'ugcPost';
  return 'activity';
}

function stripTracking(parsed: URL): string {
  for (const key of [...parsed.searchParams.keys()]) {
    const lower = key.toLowerCase();
    if (lower.startsWith('utm_') || lower === 'trk' || lower.startsWith('trk')) parsed.searchParams.delete(key);
  }
  return parsed.toString();
}

function decode(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}
