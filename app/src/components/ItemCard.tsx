import { Pressable, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { StatusBadge } from '@/components/StatusBadge';
import { itemHeading, platformLabel, type Platform, type SavedItem } from '@/savedItem';

export function ItemCard({ item }: { item: SavedItem }) {
  const router = useRouter();

  return (
    <Pressable
      onPress={() => router.push(`/item/${item.id}`)}
      className="mb-3 rounded-3xl border border-blue-100 bg-white px-4 py-4 active:bg-blue-50"
    >
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center">
          <PlatformMark platform={item.platform} />
          <Text className="ml-2 text-sm font-medium text-slate-500">{platformLabel(item.platform)}</Text>
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

function PlatformMark({ platform }: { platform: Platform }) {
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
          : 'link-outline';

  return (
    <View className="h-7 w-7 items-center justify-center rounded-full bg-blue-50">
      <Ionicons name={name} size={16} color="#1d4ed8" />
    </View>
  );
}
