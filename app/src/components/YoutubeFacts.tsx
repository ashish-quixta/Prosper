import { Text, View } from 'react-native';
import { formatCount, formatPublished, youtubeFactsFromCaption, type YouTubeFacts } from '@/youtubeFacts';

export function YoutubeFacts({ caption }: { caption: string | null }) {
  const facts = youtubeFactsFromCaption(caption);
  if (!facts) return null;
  const published = facts.publishedAt ? formatPublished(facts.publishedAt) : null;
  const counts = countLine(facts);

  return (
    <View className="mt-6">
      <Text className="text-xs font-semibold uppercase tracking-wide text-slate-400">Channel</Text>
      <Text className="mt-2 text-base font-semibold text-slate-900">{facts.channelTitle}</Text>
      {facts.subscriberCount != null ? (
        <Text className="mt-1 text-sm text-slate-500">{`${formatCount(facts.subscriberCount)} subscribers`}</Text>
      ) : null}
      {counts ? <Text className="mt-2 text-sm leading-5 text-slate-600">{counts}</Text> : null}
      {published ? <Text className="mt-1 text-sm text-slate-500">{published}</Text> : null}
      {facts.chapters.length > 0 ? (
        <View className="mt-6">
          <Text className="text-xs font-semibold uppercase tracking-wide text-slate-400">Timestamps</Text>
          {facts.chapters.map((chapter) => (
            <Text key={`${chapter.at}-${chapter.label}`} className="mt-3 text-base leading-6 text-slate-800">
              {`${chapter.at}  ${chapter.label}`}
            </Text>
          ))}
        </View>
      ) : null}
    </View>
  );
}

function countLine(facts: YouTubeFacts): string | null {
  const parts = [
    facts.viewCount == null ? null : `${formatCount(facts.viewCount)} views`,
    facts.likeCount == null ? null : `${formatCount(facts.likeCount)} likes`,
    facts.commentCount == null ? null : `${formatCount(facts.commentCount)} comments`,
  ].filter((part): part is string => part != null);
  return parts.length > 0 ? parts.join(' · ') : null;
}
