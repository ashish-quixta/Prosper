import { describe, expect, it } from 'vitest';
import { pickReplies, xFailure } from '../sources/x';
import { PermanentError } from '../worker/errors';
import { xLinkFromText } from '../xUrl';

describe('xLinkFromText', () => {
  it('reads an x.com status link out of share text', () => {
    const text = 'Look https://x.com/quixta/status/1234567890123456789?s=20 done';
    expect(xLinkFromText(text)).toEqual({
      id: '1234567890123456789',
      url: 'https://x.com/i/web/status/1234567890123456789',
    });
  });

  it('reads twitter.com, mobile, and web status links', () => {
    expect(xLinkFromText('https://twitter.com/name/status/42')?.id).toBe('42');
    expect(xLinkFromText('https://mobile.twitter.com/name/status/42')?.id).toBe('42');
    expect(xLinkFromText('https://x.com/i/web/status/99')?.id).toBe('99');
  });

  it('returns null when there is no post id', () => {
    expect(xLinkFromText('https://x.com/quixta')).toBeNull();
    expect(xLinkFromText('no link here')).toBeNull();
  });
});

describe('pickReplies', () => {
  it('keeps the replies with the most likes', () => {
    const replies = Array.from({ length: 10 }, (_, index) => ({
      authorName: 'Person',
      authorUsername: 'person',
      text: `Reply ${index}`,
      likeCount: index,
    }));
    const picked = pickReplies(replies);
    expect(picked).toHaveLength(8);
    expect(picked[0]?.likeCount).toBe(9);
    expect(picked[7]?.likeCount).toBe(2);
  });
});

describe('xFailure', () => {
  it('treats a missing or private post as permanent', () => {
    expect(xFailure(404)).toBeInstanceOf(PermanentError);
    expect(xFailure(403).message).toBe('This post is private');
    expect(xFailure(429)).not.toBeInstanceOf(PermanentError);
  });
});
