import { Pressable, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { StatusBadge } from '@/components/StatusBadge';
import { itemHeading, platformLabel, type SavedItem } from '@/savedItem';

export function ItemCard({
  item,
  onPress,
  selected,
}: {
  item: SavedItem;
  onPress?: () => void;
  selected?: boolean;
}) {
  const router = useRouter();

  return (
    <Pressable
      onPress={onPress ?? (() => router.push(`/item/${item.id}`))}
      className={`mb-3 rounded-3xl border bg-white px-4 py-4 active:bg-blue-50 ${selected ? 'border-blue-700' : 'border-blue-100'}`}
    >
      <View className="flex-row items-center justify-between">
        <View className="flex-1 flex-row items-center">
          {onPress ? (
            <Ionicons
              name={selected ? 'checkmark-circle' : 'ellipse-outline'}
              size={22}
              color={selected ? '#1d4ed8' : '#94a3b8'}
              style={{ marginRight: 10 }}
            />
          ) : null}
          <PlatformMark item={item} />
          <Text className="ml-2 text-sm font-medium text-slate-500">{cardLabel(item)}</Text>
        </View>
        <StatusBadge status={item.status} />
      </View>
      <Text className="mt-3 text-base font-semibold text-slate-900" numberOfLines={2}>
        {itemHeading(item)}
      </Text>
      {item.summary ? (
        <Text className="mt-1 text-sm leading-5 text-slate-500" numberOfLines={2}>
          {item.summary}
        </Text>
      ) : null}
      {item.tags.length > 0 ? (
        <Text className="mt-3 text-xs font-medium text-blue-700" numberOfLines={1}>
          {item.tags
            .slice(0, 3)
            .map((tag) => `#${tag}`)
            .join('  ')}
        </Text>
      ) : null}
    </Pressable>
  );
}

function cardLabel(item: SavedItem): string {
  if (item.captureMethod === 'screenshot') return 'Screenshot';
  if (item.captureMethod === 'pdf') return 'PDF';
  if (item.captureMethod === 'audio') return 'Voice';
  if (item.captureMethod === 'doc') return 'Doc';
  if (item.captureMethod === 'slides') return 'Slides';
  if (item.youtubeKind === 'short') return 'YT Short';
  if (item.youtubeKind === 'video') return 'YT Video';
  if (item.youtubeKind === 'podcast') return 'YT Podcast';
  return platformLabel(item.platform);
}

function PlatformMark({ item }: { item: SavedItem }) {
  if (
    item.captureMethod === 'screenshot' ||
    item.captureMethod === 'pdf' ||
    item.captureMethod === 'audio' ||
    item.captureMethod === 'doc' ||
    item.captureMethod === 'slides'
  ) {
    const icon =
      item.captureMethod === 'pdf' || item.captureMethod === 'doc'
        ? 'document-text-outline'
        : item.captureMethod === 'slides'
          ? 'easel-outline'
          : item.captureMethod === 'audio'
          ? 'mic-outline'
          : 'image-outline';
    return (
      <View className="h-7 w-7 items-center justify-center rounded-full bg-blue-50">
        <Ionicons name={icon} size={16} color="#1d4ed8" />
      </View>
    );
  }

  const platform = item.platform;
  if (platform === 'x') {
    return (
      <View className="h-7 w-7 items-center justify-center rounded-full bg-blue-50">
        <Text className="text-xs font-semibold text-blue-700">X</Text>
      </View>
    );
  }

  const name =
    platform === 'instagram'
      ? 'logo-instagram'
      : platform === 'reddit'
        ? 'logo-reddit'
        : platform === 'linkedin'
          ? 'logo-linkedin'
          : platform === 'youtube'
            ? 'logo-youtube'
            : 'link-outline';

  return (
    <View className="h-7 w-7 items-center justify-center rounded-full bg-blue-50">
      <Ionicons name={name} size={16} color="#1d4ed8" />
    </View>
  );
}
