import { describe, expect, it } from 'vitest';
import { instagramLinkFromText } from '../instagramUrl';

describe('instagramLinkFromText', () => {
  it('reads a reel link out of shared text and drops tracking params', () => {
    const link = instagramLinkFromText(
      'Look at this https://www.instagram.com/reel/AbC123_x/?igsh=abc&utm_source=ig_web_button',
    );
    expect(link).toEqual({
      shortcode: 'AbC123_x',
      kind: 'reel',
      url: 'https://www.instagram.com/reel/AbC123_x/',
    });
  });

  it('canonicalizes post, reels, tv, and instagr.am links', () => {
    expect(instagramLinkFromText('https://instagr.am/p/Post123/')?.url).toBe('https://www.instagram.com/p/Post123/');
    expect(instagramLinkFromText('https://instagram.com/reels/Reel123')?.kind).toBe('reel');
    expect(instagramLinkFromText('https://www.instagram.com/tv/Tv123/')?.kind).toBe('tv');
  });

  it('returns null when the text has no post link', () => {
    expect(instagramLinkFromText('https://www.instagram.com/someuser/')).toBeNull();
    expect(instagramLinkFromText('not a link')).toBeNull();
  });
});
