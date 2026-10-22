export type GoogleFileKind = 'doc' | 'slides';

const googleUrlPattern = /https?:\/\/docs\.google\.com\/(?:document|presentation)\/d\/[^\s"'<>]+/i;

export function googleFileFromText(input: string): { kind: GoogleFileKind; url: string } | null {
  const match = input.match(googleUrlPattern);
  if (!match?.[0]) return null;
  let parsed: URL;
  try {
    parsed = new URL(match[0].replace(/[),.;!?]+$/, ''));
  } catch {
    return null;
  }
  const segments = parsed.pathname.split('/').filter(Boolean);
  const kind = segments[0] === 'document' ? 'doc' : segments[0] === 'presentation' ? 'slides' : null;
  const idIndex = segments.indexOf('d');
  const id = idIndex >= 0 ? segments[idIndex + 1] : '';
  if (!kind || !id || id === 'e' || !/^[A-Za-z0-9_-]+$/.test(id)) return null;
  const url =
    kind === 'doc'
      ? `https://docs.google.com/document/d/${id}/edit`
      : `https://docs.google.com/presentation/d/${id}/edit`;
  return { kind, url };
}
