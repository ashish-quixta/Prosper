import { PermanentError } from '../worker/errors';

const PDF_BYTE_LIMIT = 10 * 1024 * 1024;
const DOWNLOAD_MS = 20_000;

export type GoogleFileKind = 'doc' | 'slides';

export type GoogleFile = {
  kind: GoogleFileKind;
  id: string;
  url: string;
  exportUrl: string;
};

const googleUrlPattern = /https?:\/\/docs\.google\.com\/(?:document|presentation)\/d\/[^\s"'<>]+/i;

export function googleFileFromText(input: string): GoogleFile | null {
  const match = input.match(googleUrlPattern);
  if (!match?.[0]) return null;
  let parsed: URL;
  try {
    parsed = new URL(match[0].replace(/[),.;!?]+$/, ''));
  } catch {
    return null;
  }
  const segments = parsed.pathname.split('/').filter(Boolean);
  const kind = segments[0] === 'document' ? 'doc' : segments[0] === 'presentation' ? 'slides' : null;
  const idIndex = segments.indexOf('d');
  const id = idIndex >= 0 ? segments[idIndex + 1] : '';
  if (!kind || !id || id === 'e' || !/^[A-Za-z0-9_-]+$/.test(id)) return null;
  const url =
    kind === 'doc'
      ? `https://docs.google.com/document/d/${id}/edit`
      : `https://docs.google.com/presentation/d/${id}/edit`;
  const exportUrl =
    kind === 'doc'
      ? `https://docs.google.com/document/d/${id}/export?format=pdf`
      : `https://docs.google.com/presentation/d/${id}/export/pdf`;
  return { kind, id, url, exportUrl };
}

export async function downloadGooglePdf(file: GoogleFile): Promise<Buffer> {
  let response: Response;
  try {
    response = await fetch(file.exportUrl, {
      redirect: 'follow',
      signal: AbortSignal.timeout(DOWNLOAD_MS),
      headers: { 'User-Agent': 'PROSPOR' },
    });
  } catch {
    throw new Error('The Google file could not be reached');
  }

  const finalUrl = response.url || file.exportUrl;
  if (!response.ok || isSignInPage(finalUrl)) {
    throw new PermanentError('Share this file as Anyone with the link, then paste it again.');
  }

  const bytes = Buffer.from(await response.arrayBuffer());
  if (bytes.length === 0 || bytes.length > PDF_BYTE_LIMIT || !bytes.subarray(0, 5).toString('utf8').startsWith('%PDF')) {
    throw new PermanentError(
      bytes.length > PDF_BYTE_LIMIT
        ? 'This file is larger than 10 MB'
        : 'Share this file as Anyone with the link, then paste it again.',
    );
  }
  return bytes;
}

function isSignInPage(url: string): boolean {
  try {
    const host = new URL(url).hostname.toLowerCase();
    return host === 'accounts.google.com' || host.endsWith('.accounts.google.com');
  } catch {
    return false;
  }
}
