const GRAPH_VERSION = 'v26.0';

const FILE_FIELDS = 'attachments{file_url,mime_type,name,video_data{url},image_data{url}}';
const SHARE_FIELDS = 'shares{id,type,url}';

export type GraphMessageShape = {
  keys: string[];
  attachmentCount: number;
  shareCount: number;
  types: string[];
  mimes: string[];
  hosts: string[];
};

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

export function describeGraphMessage(body: unknown): GraphMessageShape {
  const root = asRecord(body);
  const attachments = listedRecords(root, 'attachments');
  const shares = listedRecords(root, 'shares');
  const items = [...attachments, ...shares];
  return {
    keys: root ? Object.keys(root) : [],
    attachmentCount: attachments.length,
    shareCount: shares.length,
    types: unique(items.map((item) => textField(item, 'type'))),
    mimes: unique(items.map((item) => textField(item, 'mime_type'))),
    hosts: unique(collectUrls(body).map((url) => urlHost(url))),
  };
}

export async function fetchReelFileUrl(
  mid: string,
  accessToken: string,
  fetchImpl: typeof fetch = fetch,
): Promise<string | null> {
  const attachmentBody = await graphMessage(mid, FILE_FIELDS, accessToken, fetchImpl, 'instagram attachment lookup failed');
  if (!attachmentBody) return null;

  const fileUrl = fileUrlFromGraphMessage(attachmentBody);
  console.log('instagram attachment lookup', {
    mid,
    found: Boolean(fileUrl),
    host: fileUrl ? urlHost(fileUrl) : null,
    ...describeGraphMessage(attachmentBody),
  });
  if (fileUrl) return fileUrl;

  const shareBody = await graphMessage(mid, SHARE_FIELDS, accessToken, fetchImpl, 'instagram share lookup failed');
  if (!shareBody) return null;

  const shareUrl = fileUrlFromGraphMessage(shareBody);
  console.log('instagram share lookup', {
    mid,
    found: Boolean(shareUrl),
    host: shareUrl ? urlHost(shareUrl) : null,
    ...describeGraphMessage(shareBody),
  });
  return shareUrl;
}

async function graphMessage(
  mid: string,
  fields: string,
  accessToken: string,
  fetchImpl: typeof fetch,
  failureLabel: string,
): Promise<unknown | null> {
  const endpoint = `https://graph.instagram.com/${GRAPH_VERSION}/${encodeURIComponent(mid)}?fields=${encodeURIComponent(fields)}`;
  let response: Response;
  try {
    response = await fetchImpl(endpoint, {
      headers: { Authorization: `Bearer ${accessToken}` },
      signal: AbortSignal.timeout(15_000),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(failureLabel, { mid, message });
    return null;
  }

  if (!response.ok) {
    console.error(failureLabel, { mid, status: response.status });
    return null;
  }

  return response.json();
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

export function urlHost(url: string): string | null {
  try {
    return new URL(url).host;
  } catch {
    return null;
  }
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function listedRecords(root: Record<string, unknown> | null, key: string): Record<string, unknown>[] {
  const value = root?.[key];
  const data = Array.isArray(value) ? value : asRecord(value)?.data;
  if (!Array.isArray(data)) return [];
  return data.flatMap((entry) => {
    const record = asRecord(entry);
    return record ? [record] : [];
  });
}

function textField(record: Record<string, unknown>, key: string): string | null {
  const value = record[key];
  return typeof value === 'string' && value.length > 0 ? value : null;
}

function unique(values: Array<string | null>): string[] {
  return [...new Set(values.filter((value): value is string => Boolean(value)))];
}
