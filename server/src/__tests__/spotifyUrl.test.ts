import { describe, expect, it } from 'vitest';
import { spotifyUnavailableMessage } from '../sources/spotify';
import { spotifyLinkFromText } from '../spotifyUrl';

describe('spotifyLinkFromText', () => {
  it('reads an episode link out of share text', () => {
    const text = 'Listen https://open.spotify.com/episode/4iV5W9uYEdYUVa79Axb7Rh?si=abc';
    expect(spotifyLinkFromText(text)).toEqual({
      kind: 'episode',
      id: '4iV5W9uYEdYUVa79Axb7Rh',
      url: 'https://open.spotify.com/episode/4iV5W9uYEdYUVa79Axb7Rh',
    });
  });

  it('reads an embed link and a spotify uri', () => {
    expect(spotifyLinkFromText('https://open.spotify.com/embed/episode/4iV5W9uYEdYUVa79Axb7Rh')?.kind).toBe('episode');
    expect(spotifyLinkFromText('spotify:episode:4iV5W9uYEdYUVa79Axb7Rh')?.id).toBe('4iV5W9uYEdYUVa79Axb7Rh');
  });

  it('recognises a show page', () => {
    expect(spotifyLinkFromText('https://open.spotify.com/show/38bS44xjbVVZ3No3ByF1dJ')?.kind).toBe('show');
    expect(spotifyLinkFromText('no link here')).toBeNull();
  });
});

describe('spotifyUnavailableMessage', () => {
  it('names the market', () => {
    expect(spotifyUnavailableMessage('IN')).toBe('This episode is not available in IN');
  });
});
