import { useMemo } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Stack, useLocalSearchParams } from 'expo-router';
import { AddSavedPosts } from '@/components/AddSavedPosts';
import { ItemCard } from '@/components/ItemCard';
import { useLibrary } from '@/library';
import type { SavedItem } from '@/savedItem';

export default function FolderScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const id = typeof params.id === 'string' ? params.id : '';
  const library = useLibrary();
  const folder = library.folders.find((entry) => entry.id === id) ?? null;
  const items = useMemo(() => library.items.filter((item) => item.folderId === id), [library.items, id]);

  if (!library.ready) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator color="#1d4ed8" />
      </View>
    );
  }

  if (!folder && library.error) {
    return (
      <View className="flex-1 items-center justify-center bg-white px-8">
        <Text className="text-center text-base leading-6 text-red-700">{library.error}</Text>
      </View>
    );
  }

  if (!folder) {
    return (
      <>
        <Stack.Screen options={{ title: 'Folder' }} />
        <View className="flex-1 items-center justify-center bg-white px-8">
          <Text className="text-center text-base leading-6 text-slate-500">This folder is not available.</Text>
        </View>
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: folder.name }} />
      <FlatList<SavedItem>
        data={items}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <ItemCard item={item} />}
        style={{ flex: 1, backgroundColor: '#ffffff' }}
        contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 20, paddingTop: 16, paddingBottom: 24 }}
        ListHeaderComponent={<AddSavedPosts folderId={folder.id} />}
        ListEmptyComponent={
          <View className="items-center px-4 py-8">
            <View className="items-center rounded-3xl border border-blue-100 bg-blue-50 px-6 py-10">
              <View className="mb-4 h-14 w-14 items-center justify-center rounded-2xl bg-white">
                <Ionicons name="folder-open-outline" size={28} color="#1d4ed8" />
              </View>
              <Text className="text-center text-lg font-semibold text-slate-900">Nothing in this folder</Text>
              <Text className="mt-2 text-center text-base leading-6 text-slate-500">
                Tap Add saved posts and choose posts you already saved.
              </Text>
            </View>
          </View>
        }
        refreshControl={
          <RefreshControl
            refreshing={library.refreshing}
            onRefresh={() => {
              void library.refresh();
            }}
            tintColor="#1d4ed8"
          />
        }
      />
    </>
  );
}
