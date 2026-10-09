import { summarizeCaption, summarizeReel } from '../ai/summarize';
import { statusFromUnderstanding, type Summary } from '../ai/summary';
import { downloadReel } from '../sources/reel';
import { supabase } from '../supabase';
import { errorMessage, failureStatus, limitedCaptionReason, reelFallback } from './errors';

export type ClaimedItem = {
  id: string;
  attempts: number;
  media_url: string | null;
  caption: string | null;
};

const skipped = new Set<string>();

export async function processItem(item: ClaimedItem): Promise<void> {
  if (!item.media_url) {
    if (!skipped.has(item.id)) {
      skipped.add(item.id);
      console.error('worker skipped item without a reel', { itemId: item.id });
    }
    await releaseItem(item);
    return;
  }

  let video;
  try {
    video = await downloadReel(item.media_url);
  } catch (err) {
    if (reelFallback(err, item.caption) === 'caption' && item.caption) {
      await saveCaptionSummary(item.id, item.caption);
      return;
    }
    throw err;
  }

  const summary = await summarizeReel(item.id, item.caption, video);

  if (!summary) {
    const { error } = await supabase
      .from('items')
      .update({
        status: 'limited',
        title: fallbackTitle(item.caption),
        summary: 'A summary could not be read from this reel.',
        error: 'The summary could not be read',
        media_url: null,
      })
      .eq('id', item.id);
    if (error) throw new Error(error.message);
    return;
  }

  const status = statusFromUnderstanding(summary.understanding);
  await writeSummary(item.id, summary, status, status === 'limited' ? summary.missingReason : null);
}

export async function markItemFailed(item: ClaimedItem, err: unknown): Promise<void> {
  const retry = failureStatus(item.attempts, err) === 'saving';
  const update = {
    status: retry ? 'saving' : 'failed',
    error: errorMessage(err),
  } as const;

  console.error('item process failed', { itemId: item.id, attempts: item.attempts, message: update.error });
  const { error } = await supabase.from('items').update(update).eq('id', item.id);
  if (error) console.error('item failure update failed', { itemId: item.id, message: error.message });
}

async function releaseItem(item: ClaimedItem): Promise<void> {
  const { error } = await supabase
    .from('items')
    .update({ status: 'saving', attempts: Math.max(0, item.attempts - 1) })
    .eq('id', item.id)
    .eq('status', 'summarising');
  if (error) throw new Error(error.message);
}

async function saveCaptionSummary(itemId: string, caption: string): Promise<void> {
  const summary = await summarizeCaption(itemId, caption);
  if (!summary) {
    const { error } = await supabase
      .from('items')
      .update({
        status: 'limited',
        title: fallbackTitle(caption),
        summary: 'A summary could not be read from this reel.',
        error: limitedCaptionReason(null),
        media_url: null,
      })
      .eq('id', itemId);
    if (error) throw new Error(error.message);
    return;
  }

  await writeSummary(itemId, summary, 'limited', limitedCaptionReason(summary.missingReason));
}

async function writeSummary(
  itemId: string,
  summary: Summary,
  status: 'ready' | 'limited',
  error: string | null,
): Promise<void> {
  const { error: writeError } = await supabase
    .from('items')
    .update({
      status,
      title: summary.title,
      summary: summary.summary,
      key_points: summary.keyPoints,
      tags: summary.tags,
      error,
      media_url: null,
    })
    .eq('id', itemId);
  if (writeError) throw new Error(writeError.message);
}

function fallbackTitle(caption: string | null): string {
  const title = caption?.trim().slice(0, 80);
  return title ? title : 'Saved reel';
}
