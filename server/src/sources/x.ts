import { env } from '../env';
import { PermanentError } from '../worker/errors';
import { xLinkFromText } from '../xUrl';

export type XReply = {
  authorName: string;
  authorUsername: string;
  text: string;
  likeCount: number;
};

export type XPost = {
  id: string;
  url: string;
  authorName: string;
  authorUsername: string;
  text: string;
  hasVideo: boolean;
  replies: XReply[];
};

type XUser = { id?: string; name?: string; username?: string };
type XMedia = { type?: string; alt_text?: string };
type XTweet = {
  id?: string;
  text?: string;
  author_id?: string;
  conversation_id?: string;
  note_tweet?: { text?: string };
  public_metrics?: { like_count?: number };
  attachments?: { media_keys?: string[] };
  referenced_tweets?: { type?: string; id?: string }[];
};

const replyLimit = 8;

export function xFailure(status: number): Error {
  if (status === 404) return new PermanentError('This post is no longer available');
  if (status === 403) return new PermanentError('This post is private');
  if (status === 401) return new PermanentError('X could not read this post');
  if (status === 429) return new Error('X is busy. This post will be tried again');
  return new Error('The X post could not be reached');
}

export function pickReplies(replies: XReply[]): XReply[] {
  return [...replies]
    .filter((reply) => reply.text.trim().length > 0)
    .sort((left, right) => right.likeCount - left.likeCount)
    .slice(0, replyLimit)
    .map((reply) => ({ ...reply, text: reply.text.slice(0, 500) }));
}

export function xPostCaption(post: XPost): string {
  return JSON.stringify({
    authorName: post.authorName,
    authorUsername: post.authorUsername,
    text: post.text.slice(0, 4000),
    hasVideo: post.hasVideo,
    replies: post.replies.map((reply) => ({
      authorName: reply.authorName,
      authorUsername: reply.authorUsername,
      text: reply.text,
    })),
  });
}

export async function fetchXPost(sourceUrl: string, fetchImpl: typeof fetch = fetch): Promise<XPost> {
  const token = env.X_BEARER_TOKEN;
  if (!token) throw new PermanentError('X could not read this post');
  const link = xLinkFromText(sourceUrl);
  if (!link) throw new PermanentError('Paste an X post link');

  const lookup = new URL(`https://api.x.com/2/tweets/${link.id}`);
  lookup.searchParams.set('expansions', 'author_id,attachments.media_keys');
  lookup.searchParams.set('tweet.fields', 'note_tweet,conversation_id,attachments,public_metrics');
  lookup.searchParams.set('user.fields', 'name,username');
  lookup.searchParams.set('media.fields', 'type,alt_text');

  const response = await fetchImpl(lookup, {
    headers: { Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw xFailure(response.status);

  const body = (await response.json()) as { data?: XTweet; includes?: { users?: XUser[]; media?: XMedia[] } };
  const tweet = body.data;
  if (!tweet?.id) throw new PermanentError('This post is no longer available');

  const author = body.includes?.users?.find((user) => user.id === tweet.author_id);
  const text = (tweet.note_tweet?.text?.trim() || tweet.text?.trim() || '').slice(0, 8000);
  const media = body.includes?.media ?? [];
  const hasVideo = media.some((entry) => entry.type === 'video' || entry.type === 'animated_gif');
  const altText = media
    .map((entry) => entry.alt_text?.trim())
    .filter((entry): entry is string => Boolean(entry))
    .slice(0, 4);
  const fullText = [text, ...altText.map((entry) => `Photo description: ${entry}`)].filter(Boolean).join('\n');
  const replies = await fetchReplies(link.id, tweet.conversation_id || link.id, token, fetchImpl);

  return {
    id: link.id,
    url: link.url,
    authorName: author?.name?.trim() || 'X',
    authorUsername: author?.username?.trim() || '',
    text: fullText,
    hasVideo,
    replies: pickReplies(replies),
  };
}

async function fetchReplies(id: string, conversationId: string, token: string, fetchImpl: typeof fetch): Promise<XReply[]> {
  const search = new URL('https://api.x.com/2/tweets/search/recent');
  search.searchParams.set('query', `conversation_id:${conversationId} in_reply_to_tweet_id:${id} -is:retweet`);
  search.searchParams.set('max_results', '10');
  search.searchParams.set('expansions', 'author_id');
  search.searchParams.set('tweet.fields', 'author_id,public_metrics');
  search.searchParams.set('user.fields', 'name,username');

  const response = await fetchImpl(search, {
    headers: { Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(15000),
  });
  if (response.status === 429) throw new Error('X is busy. This post will be tried again');
  if (!response.ok) return [];

  const body = (await response.json()) as { data?: XTweet[]; includes?: { users?: XUser[] } };
  const users = body.includes?.users ?? [];
  return (body.data ?? [])
    .filter((tweet) => tweet.id !== id)
    .map((tweet) => {
      const author = users.find((user) => user.id === tweet.author_id);
      return {
        authorName: author?.name?.trim() || 'X',
        authorUsername: author?.username?.trim() || '',
        text: tweet.text?.trim() || '',
        likeCount: tweet.public_metrics?.like_count ?? 0,
      };
    });
}
