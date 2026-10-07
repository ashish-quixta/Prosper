import { describe, expect, it } from 'vitest';
import { createLinkCode, linkCodeExpiry } from '../linkCode';

describe('createLinkCode', () => {
  it('builds a 6 character code from the alphabet', () => {
    expect(createLinkCode(() => 0)).toBe('AAAAAA');
    expect(createLinkCode(() => 1)).toBe('BBBBBB');
  });
});

describe('linkCodeExpiry', () => {
  it('is 10 minutes after the given time', () => {
    const now = new Date('2026-10-07T10:00:00.000Z');
    expect(linkCodeExpiry(now)).toBe('2026-10-07T10:10:00.000Z');
  });
});
