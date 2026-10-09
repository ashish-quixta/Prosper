import { env } from './env';
import { fetchReelFileUrl, isInstagramPage } from './instagramAttachment';
import {
  linkCodeFromText,
  readInboundMessages,
  type InboundInstagramMessage,
} from './instagramWebhook';
import { supabase } from './supabase';

const GRAPH_VERSION = 'v26.0';

const replies = {
  connected: 'Connected',
  saved: 'Saved',
  unlinked: 'Open PROSPOR, get a code in Settings, and send it here.',
  taken: 'This Instagram account is already connected to another PROSPOR account.',
};

export async function processInstagramWebhook(body: unknown): Promise<void> {
  const messages = readInboundMessages(body);
  if (messages.length === 0) {
    console.error('instagram webhook unknown', JSON.stringify(body));
    return;
  }

  for (const message of messages) {
    try {
      await processMessage(message, body);
    } catch (err) {
      const detail = err instanceof Error ? err.message : String(err);
      console.error('instagram message failed', { mid: message.mid, message: detail });
    }
  }
}

async function processMessage(message: InboundInstagramMessage, body: unknown): Promise<void> {
  if (message.mid) {
    const claimed = await claimMessage(message.mid);
    if (!claimed) return;
  }

  if (message.echo || !message.senderId) {
    if (!message.senderId) console.error('instagram webhook unknown', JSON.stringify(body));
    return;
  }

  const code = message.text ? linkCodeFromText(message.text) : null;
  if (code) {
    const linked = await acceptLinkCode(message.senderId, code);
    if (linked) return;
  }

  if (message.media) {
    const userId = await linkedUserId(message.senderId);
    if (!userId) {
      await reply(message.senderId, replies.unlinked);
      return;
    }
    const media = await reelMedia(message.mid, message.media.url);
    const saved = await saveReel(userId, media.mediaUrl, message.media.title, media.sourceUrl);
    if (saved) await reply(message.senderId, replies.saved);
    return;
  }

  const userId = await linkedUserId(message.senderId);
  if (!userId) {
    await reply(message.senderId, replies.unlinked);
    return;
  }

  console.error('instagram webhook unknown', JSON.stringify(body));
}

async function claimMessage(mid: string): Promise<boolean> {
  const { error } = await supabase.from('processed_messages').insert({ mid });
  if (!error) return true;
  if (error.code === '23505') return false;
  throw new Error(error.message);
}

async function acceptLinkCode(senderId: string, code: string): Promise<boolean> {
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from('link_codes')
    .select('user_id')
    .eq('code', code)
    .is('used_at', null)
    .gt('expires_at', now)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data?.user_id) return false;

  const userId = String(data.user_id);
  const { data: existing, error: lookupError } = await supabase
    .from('linked_channels')
    .select('user_id')
    .eq('instagram_id', senderId)
    .maybeSingle();
  if (lookupError) throw new Error(lookupError.message);

  if (existing && String(existing.user_id) !== userId) {
    await markCodeUsed(code);
    await reply(senderId, replies.taken);
    return true;
  }

  if (!existing) {
    const { error: insertError } = await supabase.from('linked_channels').insert({
      instagram_id: senderId,
      user_id: userId,
    });
    if (insertError) throw new Error(insertError.message);
  }

  await markCodeUsed(code);
  await reply(senderId, replies.connected);
  return true;
}

async function markCodeUsed(code: string): Promise<void> {
  const { error } = await supabase
    .from('link_codes')
    .update({ used_at: new Date().toISOString() })
    .eq('code', code);
  if (error) throw new Error(error.message);
}

async function linkedUserId(instagramId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('linked_channels')
    .select('user_id')
    .eq('instagram_id', instagramId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data?.user_id ? String(data.user_id) : null;
}

async function reelMedia(mid: string | null, pageOrFileUrl: string): Promise<{ mediaUrl: string; sourceUrl: string | null }> {
  if (!isInstagramPage(pageOrFileUrl) || !mid || !env.IG_ACCESS_TOKEN) {
    return { mediaUrl: pageOrFileUrl, sourceUrl: isInstagramPage(pageOrFileUrl) ? pageOrFileUrl : null };
  }

  const fileUrl = await fetchReelFileUrl(mid, env.IG_ACCESS_TOKEN);
  if (!fileUrl) return { mediaUrl: pageOrFileUrl, sourceUrl: pageOrFileUrl };
  return { mediaUrl: fileUrl, sourceUrl: pageOrFileUrl };
}

async function saveReel(
  userId: string,
  mediaUrl: string,
  title: string | null,
  sourceUrl: string | null,
): Promise<boolean> {
  const { error } = await supabase.from('items').insert({
    user_id: userId,
    platform: 'instagram',
    capture_method: 'bot',
    media_url: mediaUrl,
    source_url: sourceUrl,
    caption: title,
    status: 'saving',
  });
  if (error) {
    if (error.code === '23505') return true;
    console.error('instagram reel insert failed', { userId, message: error.message });
    return false;
  }
  return true;
}

async function reply(recipientId: string, text: string): Promise<void> {
  if (!env.IG_ACCESS_TOKEN) {
    console.error('missing IG_ACCESS_TOKEN');
    return;
  }

  const response = await fetch(`https://graph.instagram.com/${GRAPH_VERSION}/me/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.IG_ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      recipient: { id: recipientId },
      message: { text },
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    console.error('instagram reply failed', { status: response.status, body });
  }
}
