import { createHmac, timingSafeEqual } from 'node:crypto';
import { z } from 'zod';

const MediaPayload = z.object({
  url: z.string().min(1).optional(),
  title: z.string().optional(),
  reel_video_id: z.union([z.string(), z.number()]).optional(),
});

const Attachment = z.object({
  type: z.string(),
  payload: MediaPayload.optional(),
});

const Message = z.object({
  mid: z.string().optional(),
  text: z.string().optional(),
  is_echo: z.boolean().optional(),
  is_self: z.boolean().optional(),
  attachments: z.array(Attachment).optional(),
});

const MessagingEvent = z.object({
  sender: z.object({ id: z.union([z.string(), z.number()]) }).optional(),
  message: Message.optional(),
});

const WebhookBody = z.object({
  entry: z
    .array(
      z.object({
        messaging: z.array(MessagingEvent).optional(),
      }),
    )
    .optional(),
});

const SAVE_TYPES = new Set(['ig_reel', 'ig_post', 'reel', 'video']);

export type ReelAttachment = {
  type: 'ig_reel' | 'ig_post' | 'reel' | 'video';
  url: string;
  title: string | null;
  hasReelVideoId: boolean;
  reelVideoId: string | null;
};

export type WebhookField = {
  type: string;
  keys: string[];
  hosts: string[];
};

export type InboundInstagramMessage = {
  senderId: string | null;
  mid: string | null;
  echo: boolean;
  text: string | null;
  media: ReelAttachment | null;
};

export function signatureIsValid(rawBody: Buffer, appSecret: string, header: string | undefined): boolean {
  if (!header) return false;
  const expected = `sha256=${createHmac('sha256', appSecret).update(rawBody).digest('hex')}`;
  const actual = Buffer.from(header.trim().toLowerCase());
  const wanted = Buffer.from(expected);
  if (actual.length !== wanted.length) return false;
  return timingSafeEqual(actual, wanted);
}

export function subscriptionChallenge(query: object, verifyToken: string): string | null {
  const hub = readHub(query);
  if (hub.mode === 'subscribe' && hub.token === verifyToken && hub.challenge) return hub.challenge;
  return null;
}

export function readInboundMessages(body: unknown): InboundInstagramMessage[] {
  const parsed = WebhookBody.safeParse(body);
  if (!parsed.success) return [];

  const messages: InboundInstagramMessage[] = [];
  for (const entry of parsed.data.entry ?? []) {
    for (const event of entry.messaging ?? []) {
      const message = event.message;
      messages.push({
        senderId: event.sender?.id === undefined ? null : String(event.sender.id),
        mid: message?.mid ?? null,
        echo: message?.is_echo === true || message?.is_self === true,
        text: message?.text ?? null,
        media: reelAttachment(message?.attachments),
      });
    }
  }
  return messages;
}

export function webhookAttachmentFields(body: unknown, mid: string | null): WebhookField[] {
  for (const message of rawMessages(body)) {
    if (mid && message.mid !== mid) continue;
    return message.attachments.map(attachmentField);
  }
  return [];
}

export function linkCodeFromText(text: string): string | null {
  const code = text.trim().toUpperCase();
  if (!/^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$/.test(code)) return null;
  return code;
}

function reelAttachment(attachments: z.infer<typeof Attachment>[] | undefined): ReelAttachment | null {
  const matches = (attachments ?? []).filter((attachment) => SAVE_TYPES.has(attachment.type) && attachment.payload?.url);
  const page = matches.find((attachment) => attachment.type === 'ig_reel' || attachment.type === 'ig_post' || attachment.type === 'reel');
  const file = matches.find((attachment) => isFileHost(attachment.payload?.url ?? ''));
  const match = file ?? page;
  const url = match?.payload?.url;
  if (!match || !url) return null;
  const videoId = page?.payload?.reel_video_id ?? match.payload?.reel_video_id;
  return {
    type: match.type as ReelAttachment['type'],
    url,
    title: page?.payload?.title ?? match.payload?.title ?? null,
    hasReelVideoId: videoId !== undefined,
    reelVideoId: videoId === undefined ? null : String(videoId),
  };
}

function isFileHost(url: string): boolean {
  try {
    const host = new URL(url).hostname.toLowerCase();
    return host.endsWith('.fbsbx.com') || host.endsWith('.fbcdn.net') || host.endsWith('.cdninstagram.com') || host === 'cdninstagram.com';
  } catch {
    return false;
  }
}

function rawMessages(body: unknown): Array<{ mid: string | null; attachments: unknown[] }> {
  const entries = record(body)?.entry;
  if (!Array.isArray(entries)) return [];
  const messages: Array<{ mid: string | null; attachments: unknown[] }> = [];
  for (const entry of entries) {
    const messaging = record(entry)?.messaging;
    if (!Array.isArray(messaging)) continue;
    for (const event of messaging) {
      const message = record(record(event)?.message);
      const mid = message?.mid;
      const attachments = message?.attachments;
      messages.push({
        mid: typeof mid === 'string' ? mid : null,
        attachments: Array.isArray(attachments) ? attachments : [],
      });
    }
  }
  return messages;
}

function attachmentField(attachment: unknown): WebhookField {
  const item = record(attachment);
  const payload = record(item?.payload);
  return {
    type: typeof item?.type === 'string' ? item.type : 'unknown',
    keys: payload ? Object.keys(payload) : [],
    hosts: urlHosts(payload),
  };
}

function urlHosts(value: unknown, found: string[] = []): string[] {
  if (typeof value === 'string' && /^https?:\/\//i.test(value)) {
    try {
      found.push(new URL(value).host);
    } catch {
      return found;
    }
    return found;
  }
  if (Array.isArray(value)) {
    for (const entry of value) urlHosts(entry, found);
    return [...new Set(found)];
  }
  if (value && typeof value === 'object') {
    for (const entry of Object.values(value)) urlHosts(entry, found);
  }
  return [...new Set(found)];
}

function record(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function readHub(query: object): { mode?: string; token?: string; challenge?: string } {
  const record = query as Record<string, unknown>;
  const nested = record.hub;
  if (nested && typeof nested === 'object' && !Array.isArray(nested)) {
    const hub = nested as Record<string, unknown>;
    return {
      mode: asString(hub.mode),
      token: asString(hub.verify_token),
      challenge: asString(hub.challenge),
    };
  }
  return {
    mode: asString(record['hub.mode']),
    token: asString(record['hub.verify_token']),
    challenge: asString(record['hub.challenge']),
  };
}

function asString(value: unknown): string | undefined {
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return String(value);
  if (Array.isArray(value)) return asString(value[0]);
  return undefined;
}
