const GRAPH_VERSION = 'v26.0';

const FILE_FIELDS = 'attachments{file_url,mime_type,name,video_data{url},image_data{url}}';

export function isInstagramPage(url: string): boolean {
  try {
    const host = new URL(url).hostname.toLowerCase();
    return host === 'instagram.com' || host.endsWith('.instagram.com');
  } catch {
    return false;
  }
}

export function fileUrlFromGraphMessage(body: unknown): string | null {
  const urls = collectUrls(body).filter(isMediaHost);
  urls.sort((left, right) => mediaRank(left) - mediaRank(right));
  return urls[0] ?? null;
}

export async function fetchReelFileUrl(
  mid: string,
  accessToken: string,
  fetchImpl: typeof fetch = fetch,
): Promise<string | null> {
  const endpoint = `https://graph.instagram.com/${GRAPH_VERSION}/${encodeURIComponent(mid)}?fields=${encodeURIComponent(FILE_FIELDS)}`;
  let response: Response;
  try {
    response = await fetchImpl(endpoint, {
      headers: { Authorization: `Bearer ${accessToken}` },
      signal: AbortSignal.timeout(15_000),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('instagram attachment lookup failed', { mid, message });
    return null;
  }

  if (!response.ok) {
    console.error('instagram attachment lookup failed', { mid, status: response.status });
    return null;
  }

  const fileUrl = fileUrlFromGraphMessage(await response.json());
  console.log('instagram attachment lookup', {
    mid,
    found: Boolean(fileUrl),
    host: fileUrl ? safeHost(fileUrl) : null,
  });
  return fileUrl;
}

function collectUrls(value: unknown, found: string[] = []): string[] {
  if (typeof value === 'string' && /^https?:\/\//i.test(value)) {
    found.push(value);
    return found;
  }
  if (Array.isArray(value)) {
    for (const entry of value) collectUrls(entry, found);
    return found;
  }
  if (value && typeof value === 'object') {
    for (const entry of Object.values(value)) collectUrls(entry, found);
  }
  return found;
}

function isMediaHost(url: string): boolean {
  try {
    const host = new URL(url).hostname.toLowerCase();
    return host.endsWith('.fbsbx.com') || host.endsWith('.fbcdn.net') || host.endsWith('.cdninstagram.com') || host === 'cdninstagram.com';
  } catch {
    return false;
  }
}

function mediaRank(url: string): number {
  const lower = url.toLowerCase();
  if (lower.includes('lookaside.fbsbx.com')) return 0;
  if (/\.(mp4|mov|m4v)(\?|$)/.test(lower) || lower.includes('video')) return 1;
  if (/\.(jpe?g|png|webp|gif)(\?|$)/.test(lower)) return 3;
  return 2;
}

function safeHost(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return 'unknown';
  }
}
