import { describe, expect, it } from 'vitest';
import { googleFileFromText } from '../sources/googleDoc';

describe('googleFileFromText', () => {
  it('reads a Google Doc link', () => {
    const file = googleFileFromText('https://docs.google.com/document/d/abc_DEF-123/edit?usp=sharing');
    expect(file).toMatchObject({
      kind: 'doc',
      id: 'abc_DEF-123',
      exportUrl: 'https://docs.google.com/document/d/abc_DEF-123/export?format=pdf',
    });
  });

  it('reads a Google Slides link', () => {
    const file = googleFileFromText('See https://docs.google.com/presentation/d/slideId1/edit');
    expect(file?.kind).toBe('slides');
    expect(file?.exportUrl).toBe('https://docs.google.com/presentation/d/slideId1/export/pdf');
  });

  it('ignores other links', () => {
    expect(googleFileFromText('https://example.com/document/d/abc')).toBeNull();
    expect(googleFileFromText('no link')).toBeNull();
  });
});
