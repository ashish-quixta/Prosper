import { useMemo } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { ItemCard } from '@/components/ItemCard';
import { useItems } from '@/hooks/useItems';
import type { SavedItem } from '@/savedItem';

export default function HomeScreen() {
  const itemsQuery = useItems();
  const items = useMemo(
    () => itemsQuery.data?.pages.flat() ?? [],
    [itemsQuery.data],
  );

  if (itemsQuery.isPending) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator color="#1d4ed8" />
      </View>
    );
  }

  if (itemsQuery.isError) {
    return (
      <View className="flex-1 items-center justify-center bg-white px-8">
        <Text className="text-center text-base leading-6 text-red-700">{itemsQuery.error.message}</Text>
      </View>
    );
  }

  return (
    <FlatList<SavedItem>
      data={items}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => <ItemCard item={item} />}
      contentContainerStyle={{
        flexGrow: 1,
        paddingHorizontal: 20,
        paddingTop: 16,
        paddingBottom: 24,
      }}
      style={{ flex: 1, backgroundColor: '#ffffff' }}
      ListEmptyComponent={<EmptyLibrary />}
      refreshControl={
        <RefreshControl
          refreshing={itemsQuery.isRefetching && !itemsQuery.isFetchingNextPage}
          onRefresh={() => {
            void itemsQuery.refetch();
          }}
          tintColor="#1d4ed8"
        />
      }
      onEndReached={() => {
        if (itemsQuery.hasNextPage && !itemsQuery.isFetchingNextPage) {
          void itemsQuery.fetchNextPage();
        }
      }}
      ListFooterComponent={
        itemsQuery.isFetchingNextPage ? (
          <ActivityIndicator color="#1d4ed8" style={{ marginVertical: 16 }} />
        ) : null
      }
    />
  );
}

function EmptyLibrary() {
  return (
    <View className="flex-1 items-center justify-center px-4">
      <View className="items-center rounded-3xl border border-blue-100 bg-blue-50 px-6 py-10">
        <View className="mb-4 h-14 w-14 items-center justify-center rounded-2xl bg-white">
          <Ionicons name="bookmark-outline" size={28} color="#1d4ed8" />
        </View>
        <Text className="text-center text-lg font-semibold text-slate-900">Nothing saved yet</Text>
        <Text className="mt-2 text-center text-base leading-6 text-slate-500">
          Saves will show up here.
        </Text>
      </View>
    </View>
  );
}
