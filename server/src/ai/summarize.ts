import {
  FileState,
  GoogleGenAI,
  MediaResolution,
  PartMediaResolutionLevel,
  ThinkingLevel,
  createPartFromBase64,
  createPartFromUri,
  type Part,
} from '@google/genai';
import { env } from '../env';
import { buildCaptionSummaryPrompt, buildSummaryPrompt } from './prompt';
import { parseSummary, summaryJsonSchema, type Summary } from './summary';
import { reelDelivery, type ReelVideo } from '../sources/reel';

const FILE_READY_MS = 120_000;

export async function summarizeReel(itemId: string, caption: string | null, video: ReelVideo): Promise<Summary | null> {
  if (!env.GEMINI_API_KEY || !env.GEMINI_MODEL) {
    throw new Error('missing GEMINI_API_KEY or GEMINI_MODEL');
  }

  const ai = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });
  const uploadedName = reelDelivery(video.bytes.length) === 'file' ? await uploadVideo(ai, video) : null;

  try {
    const videoPart =
      uploadedName === null
        ? createPartFromBase64(video.bytes.toString('base64'), video.mimeType, PartMediaResolutionLevel.MEDIA_RESOLUTION_LOW)
        : createPartFromUri(uploadedName.uri, uploadedName.mimeType, PartMediaResolutionLevel.MEDIA_RESOLUTION_LOW);

    for (let attempt = 0; attempt < 2; attempt += 1) {
      const text = await generateSummary(ai, env.GEMINI_MODEL, itemId, caption, videoPart);
      const summary = parseSummary(text);
      if (summary) return summary;
    }
    return null;
  } finally {
    if (uploadedName?.name) {
      try {
        await ai.files.delete({ name: uploadedName.name });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.error('gemini file delete failed', { itemId, message });
      }
    }
  }
}

export async function summarizeCaption(itemId: string, caption: string): Promise<Summary | null> {
  if (!env.GEMINI_API_KEY || !env.GEMINI_MODEL_LITE) {
    throw new Error('missing GEMINI_API_KEY or GEMINI_MODEL_LITE');
  }

  const ai = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const response = await ai.models.generateContent({
      model: env.GEMINI_MODEL_LITE,
      contents: buildCaptionSummaryPrompt(caption),
      config: {
        responseMimeType: 'application/json',
        responseJsonSchema: summaryJsonSchema,
        thinkingConfig: { thinkingLevel: ThinkingLevel.MINIMAL },
        maxOutputTokens: 2048,
      },
    });
    logSummary(itemId, env.GEMINI_MODEL_LITE, response.usageMetadata);
    const summary = parseSummary(response.text ?? '');
    if (summary) return summary;
  }
  return null;
}

async function generateSummary(
  ai: GoogleGenAI,
  model: string,
  itemId: string,
  caption: string | null,
  videoPart: Part,
): Promise<string> {
  const response = await ai.models.generateContent({
    model,
    contents: [{ text: buildSummaryPrompt(caption) }, videoPart],
    config: {
      responseMimeType: 'application/json',
      responseJsonSchema: summaryJsonSchema,
      thinkingConfig: { thinkingLevel: ThinkingLevel.MINIMAL },
      mediaResolution: MediaResolution.MEDIA_RESOLUTION_LOW,
      maxOutputTokens: 2048,
    },
  });

  logSummary(itemId, model, response.usageMetadata);
  return response.text ?? '';
}

function logSummary(
  itemId: string,
  model: string,
  usage: { promptTokenCount?: number; candidatesTokenCount?: number; thoughtsTokenCount?: number } | undefined,
): void {
  console.log('gemini summary', {
    itemId,
    model,
    promptTokens: usage?.promptTokenCount ?? 0,
    outputTokens: usage?.candidatesTokenCount ?? 0,
    thoughtsTokens: usage?.thoughtsTokenCount ?? 0,
  });
}

async function uploadVideo(ai: GoogleGenAI, video: ReelVideo): Promise<{ name: string; uri: string; mimeType: string }> {
  const blob = new Blob([new Uint8Array(video.bytes)], { type: video.mimeType });
  let file = await ai.files.upload({
    file: blob,
    config: { mimeType: video.mimeType },
  });

  const started = Date.now();
  while (file.state !== FileState.ACTIVE && file.state !== FileState.FAILED && Date.now() - started < FILE_READY_MS) {
    await delay(2000);
    if (!file.name) break;
    file = await ai.files.get({ name: file.name });
  }

  if (file.state !== FileState.ACTIVE || !file.name || !file.uri) {
    throw new Error('Reel video was not ready for summary');
  }

  return { name: file.name, uri: file.uri, mimeType: file.mimeType || video.mimeType };
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
