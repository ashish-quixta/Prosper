import { z } from 'zod';

export const summaryJsonSchema = {
  type: 'object',
  properties: {
    title: { type: 'string' },
    summary: { type: 'string' },
    keyPoints: { type: 'array', items: { type: 'string' } },
    tags: { type: 'array', items: { type: 'string' } },
    understanding: { type: 'string', enum: ['full', 'partial', 'none'] },
    missingReason: { anyOf: [{ type: 'string' }, { type: 'null' }] },
  },
  required: ['title', 'summary', 'keyPoints', 'tags', 'understanding', 'missingReason'],
} as const;

const SummaryOutput = z.object({
  title: z.string().min(1).max(80),
  summary: z.string().min(1),
  keyPoints: z.array(z.string().min(1)).max(15),
  tags: z.array(z.string().min(1)).max(6),
  understanding: z.enum(['full', 'partial', 'none']),
  missingReason: z.string().nullable(),
});

export type Summary = z.infer<typeof SummaryOutput>;

export function parseSummary(input: unknown): Summary | null {
  let value = input;
  if (typeof input === 'string') {
    const trimmed = input
      .trim()
      .replace(/^```json\s*/i, '')
      .replace(/```$/, '')
      .trim();
    try {
      value = JSON.parse(trimmed);
    } catch {
      return null;
    }
  }
  if (!value || typeof value !== 'object') return null;

  const record = value as Record<string, unknown>;
  const parsed = SummaryOutput.safeParse({
    title: typeof record.title === 'string' ? record.title.trim().slice(0, 80) : record.title,
    summary: typeof record.summary === 'string' ? record.summary.trim() : record.summary,
    keyPoints: stringList(record.keyPoints, 15),
    tags: stringList(record.tags, 6)
      .map((tag) => tag.replace(/^#/, '').toLowerCase())
      .filter((tag) => tag.length > 0),
    understanding: record.understanding,
    missingReason:
      record.missingReason == null || record.missingReason === ''
        ? null
        : typeof record.missingReason === 'string'
          ? record.missingReason.trim()
          : record.missingReason,
  });
  if (!parsed.success) return null;
  return parsed.data;
}

export function statusFromUnderstanding(understanding: Summary['understanding']): 'ready' | 'limited' {
  return understanding === 'full' ? 'ready' : 'limited';
}

function stringList(value: unknown, max: number): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim())
    .filter((item) => item.length > 0)
    .slice(0, max);
}
