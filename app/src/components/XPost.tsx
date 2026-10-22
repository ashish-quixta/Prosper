import { Linking, Pressable, Text, View } from 'react-native';
import { xPostFromCaption } from '@/xPost';

export function XPost({ caption, sourceUrl }: { caption: string | null; sourceUrl: string | null }) {
  const post = xPostFromCaption(caption);
  if (!post && !sourceUrl) return null;

  return (
    <View className="mt-6">
      {post ? (
        <>
          <Text className="text-sm font-semibold text-slate-900">
            {post.authorUsername ? `${post.authorName} (@${post.authorUsername})` : post.authorName}
          </Text>
          {post.text ? <Text className="mt-2 text-base leading-6 text-slate-800">{post.text}</Text> : null}
          {post.replies.length > 0 ? (
            <View className="mt-4">
              <Text className="text-xs font-semibold uppercase tracking-wide text-slate-400">Replies</Text>
              {post.replies.map((reply) => (
                <Text key={`${reply.authorUsername}-${reply.text}`} className="mt-3 text-base leading-6 text-slate-700">
                  {reply.authorUsername ? `@${reply.authorUsername}: ${reply.text}` : reply.text}
                </Text>
              ))}
            </View>
          ) : null}
        </>
      ) : null}
      {sourceUrl ? (
        <Pressable onPress={() => void Linking.openURL(sourceUrl)} className="mt-4">
          <Text className="text-base font-semibold text-blue-700">Open on X</Text>
        </Pressable>
      ) : null}
    </View>
  );
}
