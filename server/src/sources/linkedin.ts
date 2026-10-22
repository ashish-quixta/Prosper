import ogs from 'open-graph-scraper';
import { env } from '../env';
import { linkedinLinkFromText, type LinkedInLink } from '../linkedinUrl';

const PREVIEW_REASON = 'Based on the public preview. Paste the full post for a better briefing.';

export type LinkedInPreview = {
  title: string;
  text: string;
};

export function linkedInPreviewEnabled(): boolean {
  return env.LINKEDIN_PREVIEW_FETCH_ENABLED !== 'false';
}

export async function resolveLinkedInUrl(input: string): Promise<string> {
  const link = linkedinLinkFromText(input);
  const start = link?.url ?? input.trim();
  if (!start.includes('lnkd.in')) return start;

  let current = start;
  for (let hop = 0; hop < 5; hop += 1) {
    const response = await fetch(current, {
      method: 'GET',
      redirect: 'manual',
      signal: AbortSignal.timeout(5000),
    });
    if (response.status < 300 || response.status >= 400) return current;
    const location = response.headers.get('location');
    if (!location) return current;
    current = new URL(location, current).toString();
  }
  return current;
}

export async function fetchLinkedInPreview(url: string): Promise<LinkedInPreview | null> {
  try {
    const outcome = await ogs({ url, timeout: 8, onlyGetOpenGraphInfo: true });
    if (outcome.error) return null;
    const title = outcome.result.ogTitle?.trim() ?? '';
    const text = outcome.result.ogDescription?.trim() ?? '';
    if (!title && !text) return null;
    return { title: title || 'LinkedIn post', text };
  } catch {
    return null;
  }
}

export function previewMissingReason(): string {
  return PREVIEW_REASON;
}

export function resolvedLinkedInLink(url: string): LinkedInLink | null {
  return linkedinLinkFromText(url);
}
