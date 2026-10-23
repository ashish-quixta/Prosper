import { describe, expect, it } from 'vitest';
import { extractYouTubeUrl, getVideoId, isShortsUrl, youtubeLinkFromText, youtubeNotesFromText } from '../youtubeUrl';
import { parseDescriptionChapters, parseIsoDuration, wantsYouTubeChapters } from '../sources/youtube';

describe('youtubeUrl', () => {
  it('reads a watch link with tracking params out of share text', () => {
    const text = 'Check this out https://www.youtube.com/watch?v=dQw4w9WgXcQ&si=abc123&t=12 more words';
    expect(extractYouTubeUrl(text)).toContain('youtube.com/watch');
    expect(getVideoId(extractYouTubeUrl(text)!)).toBe('dQw4w9WgXcQ');
    expect(youtubeLinkFromText(text)?.watchUrl).toBe('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
  });

  it('reads Shorts, youtu.be, embed, and live links', () => {
    expect(getVideoId('https://www.youtube.com/shorts/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
    expect(isShortsUrl('https://www.youtube.com/shorts/dQw4w9WgXcQ')).toBe(true);
    expect(getVideoId('https://youtu.be/dQw4w9WgXcQ?si=xyz')).toBe('dQw4w9WgXcQ');
    expect(getVideoId('https://www.youtube.com/embed/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
    expect(getVideoId('https://m.youtube.com/watch?v=dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
    expect(getVideoId('https://www.youtube.com/live/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
  });

  it('returns null for channels and playlists without a video id', () => {
    expect(getVideoId('https://www.youtube.com/@somechannel')).toBeNull();
    expect(getVideoId('https://www.youtube.com/playlist?list=PLtest')).toBeNull();
    expect(youtubeLinkFromText('no link here')).toBeNull();
  });
});

describe('youtubeNotesFromText', () => {
  it('reads a channel link and a video link from show notes', () => {
    const notes = [
      'YouTube: https://www.youtube.com/modernwisdompodcast',
      'Watch https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      'Clips https://www.youtube.com/@rajshamaniclips',
      'Guest https://www.youtube.com/@MarkBowden1',
    ].join('\n');
    const parsed = youtubeNotesFromText(notes);
    expect(parsed.videoUrls).toEqual(['https://www.youtube.com/watch?v=dQw4w9WgXcQ']);
    expect(parsed.channels).toEqual([
      { kind: 'handle', value: 'modernwisdompodcast', clip: false },
      { kind: 'handle', value: 'rajshamaniclips', clip: true },
      { kind: 'handle', value: 'MarkBowden1', clip: false },
    ]);
  });
});

describe('parseDescriptionChapters', () => {
  it('keeps creator chapters that start at the beginning', () => {
    const chapters = parseDescriptionChapters('0:00 Intro\n1:20 Pricing\n12:05 Close');
    expect(chapters).toEqual([
      { at: '0:00', label: 'Intro' },
      { at: '1:20', label: 'Pricing' },
      { at: '12:05', label: 'Close' },
    ]);
  });

  it('ignores a description that is not a chapter list', () => {
    expect(parseDescriptionChapters('The video is 1:20 long and covers pricing.')).toEqual([]);
  });
});

describe('wantsYouTubeChapters', () => {
  it('asks for a timeline on videos and podcasts only', () => {
    expect(wantsYouTubeChapters('short', false)).toBe(false);
    expect(wantsYouTubeChapters('video', true)).toBe(true);
    expect(wantsYouTubeChapters('podcast', false)).toBe(true);
    expect(wantsYouTubeChapters(null, true)).toBe(false);
  });
});

describe('parseIsoDuration', () => {
  it('parses YouTube duration strings', () => {
    expect(parseIsoDuration('PT1M2S')).toBe(62);
    expect(parseIsoDuration('PT1H')).toBe(3600);
    expect(parseIsoDuration('PT45S')).toBe(45);
  });
});
