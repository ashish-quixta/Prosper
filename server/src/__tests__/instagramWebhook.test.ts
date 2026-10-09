import { createHmac } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { linkCodeFromText, readInboundMessages, signatureIsValid, subscriptionChallenge } from '../instagramWebhook';

const secret = 'test-app-secret';
const rawBody = Buffer.from('{"object":"instagram"}');

describe('signatureIsValid', () => {
  const header = `sha256=${createHmac('sha256', secret).update(rawBody).digest('hex')}`;

  it('accepts the Meta signature of the raw body', () => {
    expect(signatureIsValid(rawBody, secret, header)).toBe(true);
  });

  it('rejects a missing, truncated, or wrong signature', () => {
    expect(signatureIsValid(rawBody, secret, undefined)).toBe(false);
    expect(signatureIsValid(rawBody, secret, header.slice(0, -2))).toBe(false);
    expect(signatureIsValid(rawBody, 'other-secret', header)).toBe(false);
  });
});

describe('subscriptionChallenge', () => {
  it('returns the challenge when the verify token matches', () => {
    expect(
      subscriptionChallenge(
        { hub: { mode: 'subscribe', verify_token: 'verify-me', challenge: '12345' } },
        'verify-me',
      ),
    ).toBe('12345');
    expect(
      subscriptionChallenge(
        { 'hub.mode': 'subscribe', 'hub.verify_token': 'verify-me', 'hub.challenge': '99' },
        'verify-me',
      ),
    ).toBe('99');
  });

  it('returns nothing when the token does not match', () => {
    expect(
      subscriptionChallenge({ hub: { mode: 'subscribe', verify_token: 'nope', challenge: '1' } }, 'verify-me'),
    ).toBeNull();
  });
});

describe('readInboundMessages', () => {
  it('reads a text message and a reel', () => {
    const messages = readInboundMessages({
      object: 'instagram',
      entry: [
        {
          id: '17841430679272640',
          messaging: [
            {
              sender: { id: '111' },
              message: { mid: 'm-text', text: 'ab23cd' },
            },
            {
              sender: { id: '222' },
              message: {
                mid: 'm-reel',
                attachments: [
                  {
                    type: 'ig_reel',
                    payload: { title: 'A caption', url: 'https://example.com/reel.mp4' },
                  },
                ],
              },
            },
          ],
        },
      ],
    });

    expect(messages).toEqual([
      { senderId: '111', mid: 'm-text', echo: false, text: 'ab23cd', media: null },
      {
        senderId: '222',
        mid: 'm-reel',
        echo: false,
        text: null,
        media: { type: 'ig_reel', url: 'https://example.com/reel.mp4', title: 'A caption', hasReelVideoId: false },
      },
    ]);
    expect(linkCodeFromText(' ab23cd ')).toBe('AB23CD');
    expect(linkCodeFromText('hello')).toBeNull();
  });

  it('marks echoes and ignores attachments that are not a reel or post', () => {
    const [echo, image] = readInboundMessages({
      entry: [
        {
          messaging: [
            { sender: { id: '1' }, message: { mid: 'm1', text: 'Connected', is_echo: true } },
            {
              sender: { id: '2' },
              message: { mid: 'm2', attachments: [{ type: 'image', payload: { url: 'https://example.com/a.jpg' } }] },
            },
          ],
        },
      ],
    });

    expect(echo?.echo).toBe(true);
    expect(image?.media).toBeNull();
  });
});
