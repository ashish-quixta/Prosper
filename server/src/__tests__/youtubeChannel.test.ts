import { describe, expect, it } from 'vitest';
import {
  canLookUpShowChannel,
  canLookUpShowVideo,
  channelTitleMatches,
  pickMatchingChannel,
  pickMatchingVideo,
  pickVideoOnChannel,
  channelSearchQuery,
} from '../sources/youtubeChannel';

describe('canLookUpShowChannel', () => {
  it('requires both the podcast name and the publisher', () => {
    expect(canLookUpShowChannel('Huberman Lab', 'Scicomm Media')).toBe(true);
    expect(canLookUpShowChannel('Huberman Lab', null)).toBe(false);
    expect(canLookUpShowChannel('Spotify', 'Scicomm Media')).toBe(false);
  });
});

describe('channelTitleMatches', () => {
  it('matches a channel titled like the podcast', () => {
    expect(channelTitleMatches('Huberman Lab', 'Huberman Lab', 'Scicomm Media')).toBe(true);
  });

  it('matches the publisher when the channel uses that name', () => {
    expect(channelTitleMatches('Andrew Huberman', 'Huberman Lab', 'Andrew Huberman')).toBe(true);
  });

  it('matches after dropping podcast from the title', () => {
    expect(channelTitleMatches('Lex Fridman', 'Lex Fridman Podcast', 'Lex Fridman')).toBe(true);
  });

  it('rejects a channel that only shares a short first name', () => {
    expect(channelTitleMatches('Ashish Kumar Vlogs', 'How to Be Strong', 'Ashish')).toBe(false);
  });

  it('rejects an unrelated channel', () => {
    expect(channelTitleMatches('MrBeast', 'The Daily', 'The New York Times')).toBe(false);
  });
});

describe('pickMatchingChannel', () => {
  it('keeps the first channel whose title matches', () => {
    const picked = pickMatchingChannel(
      [
        { channelId: 'a', title: 'Random', description: '' },
        { channelId: 'b', title: 'The Daily', description: '' },
      ],
      'The Daily',
      'The New York Times',
    );
    expect(picked?.channelId).toBe('b');
  });

  it('returns null when none match', () => {
    expect(
      pickMatchingChannel([{ channelId: 'a', title: 'MrBeast', description: '' }], 'The Daily', 'The New York Times'),
    ).toBeNull();
  });
});

describe('canLookUpShowVideo', () => {
  it('allows a named show when Spotify has no publisher', () => {
    expect(
      canLookUpShowVideo(
        'Fake Names & Secret Identities: How Intelligence Agents Operate | David Bickford | FO569 Raj Shamani',
        'Figuring Out with Raj Shamani',
        null,
      ),
    ).toBe(true);
    expect(canLookUpShowVideo('Short', 'Figuring Out with Raj Shamani', null)).toBe(false);
    expect(canLookUpShowVideo('How markets moved today', 'The Daily', null)).toBe(false);
  });
});

describe('pickMatchingVideo', () => {
  const episode = 'Fake Names & Secret Identities: How Intelligence Agents Operate | David Bickford | FO569 Raj Shamani';
  const show = 'Figuring Out with Raj Shamani';

  it('keeps the creator video and skips reposts', () => {
    const picked = pickMatchingVideo(
      [
        {
          videoId: 'clip',
          title: 'How Intelligence Agents Lie? | Fake Names & Secret Identities | David Bickford',
          channelTitle: 'BOLcast India',
        },
        {
          videoId: 'full',
          title: 'How Intelligence Agents Lie, Recruit & Run Secret Operations | David Bickford | FO569 Raj Shamani',
          channelTitle: 'Raj Shamani',
        },
      ],
      episode,
      show,
      null,
    );
    expect(picked?.videoId).toBe('full');
  });

  it('rejects another episode from the same channel', () => {
    expect(
      pickMatchingVideo(
        [
          {
            videoId: 'other',
            title: 'How I Built a Company | FO100 Raj Shamani',
            channelTitle: 'Raj Shamani',
          },
        ],
        episode,
        show,
        null,
      ),
    ).toBeNull();
  });

  it('matches a host channel when the show uses a different title', () => {
    const picked = pickMatchingVideo(
      [
        {
          videoId: 'repost',
          title: 'How to Speak Clearly and With Confidence | Matt Abrahams',
          channelTitle: 'Motivation Clips',
        },
        {
          videoId: 'host',
          title: 'How to Speak Clearly and With Confidence | Matt Abrahams',
          channelTitle: 'Andrew Huberman',
        },
      ],
      'How to Speak Clearly & With Confidence | Matt Abrahams',
      'Huberman Lab',
      null,
    );
    expect(picked?.videoId).toBe('host');
  });

  it('prefers the longer upload when both titles match the episode', () => {
    const title = 'How Intelligence Agents Lie, Recruit & Run Secret Operations | David Bickford | FO569 Raj Shamani';
    const picked = pickMatchingVideo(
      [
        { videoId: 'short', title, channelTitle: 'Raj Shamani', durationSeconds: 480 },
        { videoId: 'full', title, channelTitle: 'Raj Shamani', durationSeconds: 6912 },
      ],
      episode,
      show,
      null,
    );
    expect(picked?.videoId).toBe('full');
  });
});

describe('channelSearchQuery', () => {
  it('drops an episode number that is not part of the video title', () => {
    expect(channelSearchQuery('“This Is The Most Important Subject I’ve Ever Covered” - Robert Greene - #1162')).toBe(
      'This Is The Most Important Subject I’ve Ever Covered - Robert Greene -',
    );
  });
});

describe('pickVideoOnChannel', () => {
  it('keeps the episode on the channel named in the show notes', () => {
    const picked = pickVideoOnChannel(
      [
        {
          videoId: 'other',
          title: 'A different conversation about cities',
          channelTitle: 'Modern Wisdom',
          durationSeconds: 4000,
        },
        {
          videoId: 'episode',
          title: 'Robert Greene on the Sublime and Rediscovering Wonder',
          channelTitle: 'Modern Wisdom',
          durationSeconds: 8000,
        },
      ],
      'Robert Greene on the Sublime and Rediscovering Wonder',
      'Modern Wisdom',
    );
    expect(picked?.videoId).toBe('episode');
  });
});
