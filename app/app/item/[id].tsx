import { ActivityIndicator, ScrollView, Text, View } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { StatusBadge } from '@/components/StatusBadge';
import { useItem } from '@/hooks/useItem';
import { itemHeading, platformLabel } from '@/savedItem';

export default function ItemScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const id = typeof params.id === 'string' ? params.id : '';
  const itemQuery = useItem(id);

  if (itemQuery.isPending) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator color="#1d4ed8" />
      </View>
    );
  }

  if (itemQuery.isError) {
    return (
      <View className="flex-1 items-center justify-center bg-white px-8">
        <Text className="text-center text-base leading-6 text-red-700">{itemQuery.error.message}</Text>
      </View>
    );
  }

  const item = itemQuery.data;
  if (!item) {
    return (
      <>
        <Stack.Screen options={{ title: 'Save' }} />
        <View className="flex-1 items-center justify-center bg-white px-8">
          <Text className="text-center text-base leading-6 text-slate-500">This save is not available.</Text>
        </View>
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: 'Save' }} />
      <ScrollView style={{ flex: 1, backgroundColor: '#ffffff' }} contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
        <Text className="text-sm font-medium text-blue-700">{platformLabel(item.platform)}</Text>
        <Text className="mt-2 text-2xl font-semibold leading-8 text-slate-900">{itemHeading(item)}</Text>
        <View className="mt-4">
          <StatusBadge status={item.status} />
        </View>
        {item.summary ? (
          <Text className="mt-6 text-base leading-6 text-slate-700">{item.summary}</Text>
        ) : null}
        {item.keyPoints.length > 0 ? (
          <View className="mt-6">
            <Text className="text-xs font-semibold uppercase tracking-wide text-slate-400">Key points</Text>
            {item.keyPoints.map((point) => (
              <Text key={point} className="mt-3 text-base leading-6 text-slate-800">
                {`•  ${point}`}
              </Text>
            ))}
          </View>
        ) : null}
        {item.tags.length > 0 ? (
          <View className="mt-6 flex-row flex-wrap">
            {item.tags.map((tag) => (
              <View key={tag} className="mb-2 mr-2 rounded-full bg-blue-50 px-3 py-1.5">
                <Text className="text-sm font-medium text-blue-700">{`#${tag}`}</Text>
              </View>
            ))}
          </View>
        ) : null}
      </ScrollView>
    </>
  );
}
