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

export type ReelAttachment = {
  type: 'ig_reel' | 'ig_post';
  url: string;
  title: string | null;
  hasReelVideoId: boolean;
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

export function linkCodeFromText(text: string): string | null {
  const code = text.trim().toUpperCase();
  if (!/^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$/.test(code)) return null;
  return code;
}

function reelAttachment(attachments: z.infer<typeof Attachment>[] | undefined): ReelAttachment | null {
  const match = attachments?.find((attachment) => attachment.type === 'ig_reel' || attachment.type === 'ig_post');
  const url = match?.payload?.url;
  if (!match || !url) return null;
  return {
    type: match.type as 'ig_reel' | 'ig_post',
    url,
    title: match.payload?.title ?? null,
    hasReelVideoId: match.payload?.reel_video_id !== undefined,
  };
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
