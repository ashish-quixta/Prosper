export type XReplyView = {
  authorName: string;
  authorUsername: string;
  text: string;
};

export type XPostView = {
  authorName: string;
  authorUsername: string;
  text: string;
  hasVideo: boolean;
  replies: XReplyView[];
};

export function xPostFromCaption(caption: string | null): XPostView | null {
  if (!caption?.trim().startsWith('{')) return null;
  try {
    const parsed = JSON.parse(caption) as Partial<XPostView>;
    if (typeof parsed.text !== 'string') return null;
    const replies = Array.isArray(parsed.replies)
      ? parsed.replies.filter(
          (reply): reply is XReplyView =>
            typeof reply?.text === 'string' &&
            typeof reply.authorName === 'string' &&
            typeof reply.authorUsername === 'string',
        )
      : [];
    return {
      authorName: typeof parsed.authorName === 'string' ? parsed.authorName : 'X',
      authorUsername: typeof parsed.authorUsername === 'string' ? parsed.authorUsername : '',
      text: parsed.text,
      hasVideo: parsed.hasVideo === true,
      replies,
    };
  } catch {
    return null;
  }
}
