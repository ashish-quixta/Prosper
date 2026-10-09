import { PermanentError, WebPageError } from '../worker/errors';

export const REEL_BYTE_LIMIT = 50 * 1024 * 1024;
export const INLINE_REEL_BYTES = 15 * 1024 * 1024;

export type ReelVideo = {
  bytes: Buffer;
  mimeType: string;
};

export function reelDelivery(byteLength: number): 'inline' | 'file' {
  return byteLength <= INLINE_REEL_BYTES ? 'inline' : 'file';
}

const DOWNLOAD_HEADERS: Record<string, string>[] = [
  { 'User-Agent': 'curl/8.7.1', Accept: '*/*' },
  {
    'User-Agent':
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    Accept: '*/*',
    Referer: 'https://www.instagram.com/',
  },
];

export async function downloadReel(
  url: string,
  fetchImpl: typeof fetch = fetch,
  maxBytes = REEL_BYTE_LIMIT,
): Promise<ReelVideo> {
  let lastPage: WebPageError | null = null;
  for (const headers of DOWNLOAD_HEADERS) {
    try {
      return await readReel(url, fetchImpl, maxBytes, headers);
    } catch (err) {
      if (!(err instanceof WebPageError)) throw err;
      lastPage = err;
    }
  }
  throw lastPage ?? new WebPageError('Reel video link returned a web page');
}

async function readReel(
  url: string,
  fetchImpl: typeof fetch,
  maxBytes: number,
  headers: Record<string, string>,
): Promise<ReelVideo> {
  let response: Response;
  try {
    response = await fetchImpl(url, { redirect: 'follow', headers, signal: AbortSignal.timeout(60_000) });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`Reel download failed (${message})`);
  }

  if (response.status === 404 || response.status === 410) {
    throw new PermanentError('Reel video is no longer available');
  }
  if (!response.ok) {
    throw new Error(`Reel download failed (${response.status})`);
  }

  const declared = Number(response.headers.get('content-length'));
  if (Number.isFinite(declared) && declared > maxBytes) {
    throw new PermanentError('Reel video is larger than 50 MB');
  }

  const headerType = response.headers.get('content-type')?.split(';')[0]?.trim().toLowerCase() ?? '';
  if (headerType.startsWith('text/') || headerType.includes('html')) {
    throw new WebPageError(`Reel video link returned ${response.status} ${headerType || 'unknown type'} from ${responseHost(response)}`);
  }
  const mimeType = headerType.startsWith('video/') ? headerType : 'video/mp4';

  if (!response.body) throw new Error('Reel download had no body');

  const chunks: Buffer[] = [];
  let total = 0;
  const reader = response.body.getReader();
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel();
      throw new PermanentError('Reel video is larger than 50 MB');
    }
    chunks.push(Buffer.from(value));
  }

  if (total === 0) throw new Error('Reel download was empty');
  return { bytes: Buffer.concat(chunks), mimeType };
}

function responseHost(response: Response): string {
  try {
    return new URL(response.url).host || 'unknown';
  } catch {
    return 'unknown';
  }
}
