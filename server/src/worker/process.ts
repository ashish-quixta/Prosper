import {
  summarizeAudio,
  summarizeCaption,
  summarizePdf,
  summarizeReel,
  summarizeLinkedInText,
  summarizeScreenshot,
  summarizeX,
  summarizeYoutube,
} from '../ai/summarize';
import { statusFromUnderstanding, type Summary } from '../ai/summary';
import { downloadGooglePdf, googleFileFromText } from '../sources/googleDoc';
import { downloadReel } from '../sources/reel';
import { deleteScreenshot, downloadAudio, downloadPdf, downloadScreenshot } from '../sources/screenshot';
import {
  fetchLinkedInPreview,
  linkedInPreviewEnabled,
  previewMissingReason,
  resolveLinkedInUrl,
} from '../sources/linkedin';
import {
  fetchYouTubeDetails,
  parseDescriptionChapters,
  wantsYouTubeChapters,
  youtubeFactsCaption,
  type YouTubeChapter,
  type YouTubeDetails,
} from '../sources/youtube';
import { supabase } from '../supabase';
import { linkedinLinkFromText } from '../linkedinUrl';
import { fetchXPost, xPostCaption } from '../sources/x';
import { xLinkFromText } from '../xUrl';
import { youtubeLinkFromText } from '../youtubeUrl';
import { errorMessage, failureStatus, limitedCaptionReason, PermanentError, reelFallback } from './errors';

export type ClaimedItem = {
  id: string;
  attempts: number;
  media_url: string | null;
  image_path: string | null;
  capture_method: string | null;
  caption: string | null;
  source_url: string | null;
  platform: string | null;
  error: string | null;
  youtube_kind: string | null;
};

const skipped = new Set<string>();

export async function processItem(item: ClaimedItem): Promise<void> {
  if (item.image_path) {
    if (item.capture_method === 'pdf') await processPdf(item.id, item.image_path);
    else if (item.capture_method === 'audio') await processAudio(item.id, item.image_path);
    else await processScreenshot(item.id, item.image_path);
    return;
  }

  if (item.source_url && (item.capture_method === 'doc' || item.capture_method === 'slides')) {
    await processGoogleFile(item.id, item.source_url, item.capture_method);
    return;
  }

  if (
    item.source_url &&
    (item.platform === 'youtube' || youtubeLinkFromText(item.source_url))
  ) {
    await processYoutube(item.id, item.source_url, item.youtube_kind);
    return;
  }

  if (item.source_url && (item.platform === 'x' || xLinkFromText(item.source_url))) {
    await processX(item.id, item.source_url);
    return;
  }

  if (item.source_url && (item.platform === 'linkedin' || linkedinLinkFromText(item.source_url))) {
    await processLinkedIn(item);
    return;
  }

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

async function processGoogleFile(itemId: string, sourceUrl: string, captureMethod: string): Promise<void> {
  const expected = captureMethod === 'slides' ? 'slides' : 'doc';
  const file = googleFileFromText(sourceUrl);
  if (!file || file.kind !== expected) {
    throw new PermanentError(expected === 'doc' ? 'Paste a Google Docs link' : 'Paste a Google Slides link');
  }

  const pdf = await downloadGooglePdf(file);
  const summary = await summarizePdf(itemId, pdf);
  const fallback = expected === 'doc' ? 'Google Doc' : 'Google Slides';
  if (!summary) {
    const { error } = await supabase
      .from('items')
      .update({
        status: 'limited',
        title: fallback,
        summary: 'A summary could not be read from this file.',
        error: 'The summary could not be read',
        source_url: file.url,
      })
      .eq('id', itemId);
    if (error) throw new Error(error.message);
    return;
  }

  const status = statusFromUnderstanding(summary.understanding);
  await writeSummary(itemId, summary, status, status === 'limited' ? summary.missingReason : null, false, {
    source_url: file.url,
    titleFallback: fallback,
    platform: 'other',
  });
}

async function processPdf(itemId: string, imagePath: string): Promise<void> {
  const pdf = await downloadPdf(imagePath);
  const summary = await summarizePdf(itemId, pdf);
  if (!summary) {
    const { error } = await supabase
      .from('items')
      .update({
        status: 'limited',
        title: 'PDF',
        summary: 'A summary could not be read from this PDF.',
        error: 'The summary could not be read',
        image_path: null,
      })
      .eq('id', itemId);
    if (error) throw new Error(error.message);
  } else {
    const status = statusFromUnderstanding(summary.understanding);
    await writeSummary(itemId, summary, status, status === 'limited' ? summary.missingReason : null, true);
  }
  await removeStoredFile(itemId, imagePath);
}

async function processX(itemId: string, sourceUrl: string): Promise<void> {
  const post = await fetchXPost(sourceUrl);
  const summary = await summarizeX(itemId, post);
  const caption = xPostCaption(post);
  const fallback = post.authorUsername ? `@${post.authorUsername}` : 'X post';
  if (!summary) {
    const { error } = await supabase
      .from('items')
      .update({
        status: 'limited',
        title: fallback,
        caption,
        summary: 'The post was saved, but a briefing could not be read.',
        error: 'SUMMARY_FAILED',
        source_url: post.url,
        platform: 'x',
      })
      .eq('id', itemId);
    if (error) throw new Error(error.message);
    return;
  }

  const status = statusFromUnderstanding(summary.understanding);
  await writeSummary(itemId, summary, status, status === 'limited' ? summary.missingReason : null, false, {
    caption,
    source_url: post.url,
    titleFallback: fallback,
    platform: 'x',
  });
}

async function processLinkedIn(item: ClaimedItem): Promise<void> {
  const sourceUrl = item.source_url ?? '';
  if (item.error === 'PASTED_TEXT' && item.caption?.trim()) {
    const summary = await summarizeLinkedInText(item.id, item.caption, 'pasted');
    if (!summary) {
      await markLinkedInLimited(item.id, sourceUrl, item.caption, 'LinkedIn post', 'A briefing could not be read from this text.', 'SUMMARY_FAILED');
      return;
    }
    const status = statusFromUnderstanding(summary.understanding);
    await writeSummary(item.id, summary, status, status === 'limited' ? summary.missingReason : null, false, {
      caption: item.caption,
      source_url: sourceUrl,
      platform: 'linkedin',
    });
    return;
  }

  const resolved = await resolveLinkedInUrl(sourceUrl).catch(() => sourceUrl);
  const preview = linkedInPreviewEnabled() ? await fetchLinkedInPreview(resolved) : null;
  if (!preview?.text) {
    await markLinkedInLimited(
      item.id,
      resolved,
      null,
      'LinkedIn post',
      'This link did not include the post text. Paste the post, or add a screenshot.',
      'TEXT_UNAVAILABLE',
    );
    return;
  }

  const summary = await summarizeLinkedInText(item.id, `${preview.title}\n${preview.text}`, 'preview');
  if (!summary) {
    await markLinkedInLimited(
      item.id,
      resolved,
      preview.text,
      preview.title,
      'The preview was saved, but a briefing could not be read.',
      'SUMMARY_FAILED',
    );
    return;
  }

  await writeSummary(item.id, summary, 'limited', previewMissingReason(), false, {
    caption: preview.text,
    source_url: resolved,
    platform: 'linkedin',
    titleFallback: preview.title.slice(0, 80),
  });
}

async function markLinkedInLimited(
  itemId: string,
  sourceUrl: string,
  caption: string | null,
  title: string,
  summary: string,
  error: string,
): Promise<void> {
  const { error: writeError } = await supabase
    .from('items')
    .update({
      status: 'limited',
      platform: 'linkedin',
      source_url: sourceUrl,
      caption,
      title: title.slice(0, 80),
      summary,
      error,
    })
    .eq('id', itemId);
  if (writeError) throw new Error(writeError.message);
}

async function processYoutube(itemId: string, sourceUrl: string, youtubeKind: string | null): Promise<void> {
  const details = await fetchYouTubeDetails(sourceUrl);
  const withChapters = wantsYouTubeChapters(youtubeKind, details.isShort);
  const describedChapters = withChapters ? parseDescriptionChapters(details.description) : [];
  const askForChapters = withChapters && describedChapters.length === 0;
  const summary = await summarizeYoutube(itemId, details, askForChapters);
  const chapters = describedChapters.length > 0 ? describedChapters : (summary?.chapters ?? []);
  if (!summary) {
    const { error } = await supabase
      .from('items')
      .update({
        status: 'limited',
        title: details.title.slice(0, 80),
        caption: factsCaption(details, chapters),
        summary: 'YouTube details were saved, but a briefing could not be read from the video.',
        error: 'SUMMARY_FAILED',
        source_url: details.watchUrl,
        platform: 'youtube',
      })
      .eq('id', itemId);
    if (error) throw new Error(error.message);
    return;
  }

  const status = statusFromUnderstanding(summary.understanding);
  await writeSummary(itemId, summary, status, status === 'limited' ? summary.missingReason : null, false, {
    caption: factsCaption(details, chapters),
    source_url: details.watchUrl,
    titleFallback: details.title.slice(0, 80),
  });
}

function factsCaption(details: YouTubeDetails, chapters: YouTubeChapter[]): string {
  return youtubeFactsCaption({
    channelTitle: details.channelTitle,
    subscriberCount: details.subscriberCount,
    likeCount: details.likeCount,
    viewCount: details.viewCount,
    commentCount: details.commentCount,
    publishedAt: details.publishedAt,
    chapters,
    description: details.description,
  });
}

async function processAudio(itemId: string, imagePath: string): Promise<void> {
  const audio = await downloadAudio(imagePath);
  const summary = await summarizeAudio(itemId, audio);
  if (!summary) {
    const { error } = await supabase
      .from('items')
      .update({
        status: 'limited',
        title: 'Voice note',
        summary: 'A summary could not be read from this voice note.',
        error: 'The summary could not be read',
        image_path: null,
      })
      .eq('id', itemId);
    if (error) throw new Error(error.message);
  } else {
    const status = statusFromUnderstanding(summary.understanding);
    await writeSummary(itemId, summary, status, status === 'limited' ? summary.missingReason : null, true);
  }
  await removeStoredFile(itemId, imagePath);
}

async function processScreenshot(itemId: string, imagePath: string): Promise<void> {
  const jpeg = await downloadScreenshot(imagePath);
  const summary = await summarizeScreenshot(itemId, jpeg);
  if (!summary) {
    const { error } = await supabase
      .from('items')
      .update({
        status: 'limited',
        title: 'Screenshot',
        summary: 'A summary could not be read from this screenshot.',
        error: 'The summary could not be read',
        image_path: null,
      })
      .eq('id', itemId);
    if (error) throw new Error(error.message);
  } else {
    const status = statusFromUnderstanding(summary.understanding);
    await writeSummary(itemId, summary, status, status === 'limited' ? summary.missingReason : null, true);
  }

  await removeStoredFile(itemId, imagePath);
}

async function removeStoredFile(itemId: string, imagePath: string): Promise<void> {
  try {
    await deleteScreenshot(imagePath);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('stored file delete failed', { itemId, message });
  }
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
  clearImage = false,
  extras?: { caption?: string; source_url?: string; titleFallback?: string; platform?: 'youtube' | 'linkedin' | 'x' | 'other' },
): Promise<void> {
  const { error: writeError } = await supabase
    .from('items')
    .update({
      status,
      title: summary.title || extras?.titleFallback || null,
      summary: summary.summary,
      key_points: summary.keyPoints,
      tags: summary.tags,
      error,
      media_url: null,
      ...(clearImage ? { image_path: null } : {}),
      ...(extras?.caption !== undefined ? { caption: extras.caption } : {}),
      ...(extras?.source_url !== undefined
        ? { source_url: extras.source_url, platform: extras.platform ?? 'youtube' }
        : {}),
    })
    .eq('id', itemId);
  if (writeError) throw new Error(writeError.message);
}

function fallbackTitle(caption: string | null): string {
  const title = caption?.trim().slice(0, 80);
  return title ? title : 'Saved reel';
}
