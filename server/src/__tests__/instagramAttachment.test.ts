import { describe, expect, it } from 'vitest';
import { fetchReelFileUrl, fileUrlFromGraphMessage, isInstagramPage } from '../instagramAttachment';

describe('isInstagramPage', () => {
  it('recognises a reel page and ignores a file host', () => {
    expect(isInstagramPage('https://www.instagram.com/reel/abc/')).toBe(true);
    expect(isInstagramPage('https://lookaside.fbsbx.com/ig_messaging_cdn/?asset_id=1')).toBe(false);
  });
});

describe('fileUrlFromGraphMessage', () => {
  it('prefers the reel file over a preview image', () => {
    const file = fileUrlFromGraphMessage({
      attachments: {
        data: [
          {
            image_data: { url: 'https://scontent.cdninstagram.com/photo.jpg' },
            video_data: { url: 'https://lookaside.fbsbx.com/ig_messaging_cdn/?asset_id=9' },
          },
        ],
      },
    });
    expect(file).toBe('https://lookaside.fbsbx.com/ig_messaging_cdn/?asset_id=9');
  });

  it('ignores the public reel page', () => {
    expect(fileUrlFromGraphMessage({ url: 'https://www.instagram.com/reel/abc/' })).toBeNull();
  });
});

describe('fetchReelFileUrl', () => {
  it('returns the file url from a successful lookup', async () => {
    const fetchImpl: typeof fetch = async () =>
      new Response(
        JSON.stringify({
          attachments: { data: [{ video_data: { url: 'https://lookaside.fbsbx.com/ig_messaging_cdn/?asset_id=3' } }] },
        }),
        { status: 200 },
      );

    await expect(fetchReelFileUrl('mid-1', 'token', fetchImpl)).resolves.toBe(
      'https://lookaside.fbsbx.com/ig_messaging_cdn/?asset_id=3',
    );
  });

  it('returns nothing when Instagram has no file', async () => {
    const fetchImpl: typeof fetch = async () => new Response(JSON.stringify({ error: { message: 'nope' } }), { status: 400 });
    await expect(fetchReelFileUrl('mid-1', 'token', fetchImpl)).resolves.toBeNull();
  });
});
