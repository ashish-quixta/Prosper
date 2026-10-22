import { describe, expect, it } from 'vitest';
import { linkedinLinkFromText } from '../linkedinUrl';

describe('linkedinLinkFromText', () => {
  it('reads a share URN from a feed URL and drops tracking params', () => {
    const link = linkedinLinkFromText(
      'See this https://www.linkedin.com/feed/update/urn:li:share:7182736450192837465/?utm_source=share&trk=public_post',
    );
    expect(link?.urn).toBe('urn:li:share:7182736450192837465');
    expect(link?.embedUrl).toBe('https://www.linkedin.com/embed/feed/update/urn:li:share:7182736450192837465');
    expect(link?.mayNotEmbed).toBe(false);
    expect(link?.url).not.toContain('utm_source');
  });

  it('reads share, ugcPost, and activity ids from post slugs', () => {
    expect(linkedinLinkFromText('https://www.linkedin.com/posts/ada_title-share-1234567890123456789-AbCd')?.kind).toBe(
      'share',
    );
    expect(linkedinLinkFromText('https://www.linkedin.com/posts/ada_title-ugcPost-1234567890123456789-AbCd')?.urn).toBe(
      'urn:li:ugcPost:1234567890123456789',
    );
    const activity = linkedinLinkFromText(
      'https://www.linkedin.com/posts/ada_title-activity-1234567890123456789-AbCd',
    );
    expect(activity?.kind).toBe('activity');
    expect(activity?.mayNotEmbed).toBe(true);
  });

  it('parses an embed iframe and a short link without a URN', () => {
    const iframe =
      '<iframe src="https://www.linkedin.com/embed/feed/update/urn:li:ugcPost:99887766" height="600"></iframe>';
    expect(linkedinLinkFromText(iframe)?.urn).toBe('urn:li:ugcPost:99887766');
    const short = linkedinLinkFromText('https://lnkd.in/gAbCdEf');
    expect(short?.url).toContain('lnkd.in');
    expect(short?.urn).toBeNull();
  });

  it('returns null for a non-LinkedIn link', () => {
    expect(linkedinLinkFromText('https://example.com/posts/activity-123')).toBeNull();
    expect(linkedinLinkFromText('not a link')).toBeNull();
  });
});
