import { describe, expect, it } from 'vitest';
import { downloadReel, reelDelivery } from '../sources/reel';
import { PermanentError } from '../worker/errors';

describe('reelDelivery', () => {
  it('sends a short video inline and a larger one through the file upload', () => {
    expect(reelDelivery(1024)).toBe('inline');
    expect(reelDelivery(15 * 1024 * 1024)).toBe('inline');
    expect(reelDelivery(15 * 1024 * 1024 + 1)).toBe('file');
  });
});

describe('downloadReel', () => {
  it('returns a small mp4 body', async () => {
    const body = new Uint8Array([1, 2, 3, 4]);
    const fetchImpl: typeof fetch = async () =>
      new Response(body, { status: 200, headers: { 'content-type': 'video/mp4' } });

    const video = await downloadReel('https://example.com/reel.mp4', fetchImpl, 50);
    expect(video.mimeType).toBe('video/mp4');
    expect(video.bytes).toEqual(Buffer.from(body));
  });

  it('treats a missing video as permanent', async () => {
    const fetchImpl: typeof fetch = async () => new Response('gone', { status: 404 });
    await expect(downloadReel('https://example.com/reel.mp4', fetchImpl)).rejects.toBeInstanceOf(PermanentError);
  });

  it('stops when the video is larger than the cap', async () => {
    const fetchImpl: typeof fetch = async () =>
      new Response(new Uint8Array([1, 2, 3, 4, 5]), {
        status: 200,
        headers: { 'content-type': 'video/mp4' },
      });

    await expect(downloadReel('https://example.com/reel.mp4', fetchImpl, 4)).rejects.toBeInstanceOf(PermanentError);
  });

  it('treats an html page as a missing video', async () => {
    const fetchImpl: typeof fetch = async () =>
      new Response('<html></html>', { status: 200, headers: { 'content-type': 'text/html' } });
    await expect(downloadReel('https://example.com/reel.mp4', fetchImpl)).rejects.toBeInstanceOf(PermanentError);
  });

  it('tries a browser download when the first response is a web page', async () => {
    let calls = 0;
    const fetchImpl: typeof fetch = async (_url, init) => {
      calls += 1;
      const userAgent = new Headers(init?.headers).get('user-agent') ?? '';
      if (calls === 1) {
        expect(userAgent).toContain('curl');
        return new Response('<html></html>', { status: 200, headers: { 'content-type': 'text/html' } });
      }
      expect(userAgent.toLowerCase()).toContain('mozilla');
      return new Response(new Uint8Array([1, 2, 3, 4]), { status: 200, headers: { 'content-type': 'video/mp4' } });
    };

    const video = await downloadReel('https://example.com/reel.mp4', fetchImpl, 50);
    expect(video.bytes).toEqual(Buffer.from([1, 2, 3, 4]));
    expect(calls).toBe(2);
  });
});
