import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  Text,
  TextInput,
  View,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { type Folder } from '@/hooks/useFolders';
import { refreshLibrary, useLibrary } from '@/library';
import { supabase } from '@/supabase';

export default function FoldersScreen() {
  const library = useLibrary();
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const folders = library.folders;

  async function createFolder() {
    const trimmed = name.trim();
    if (!trimmed || saving) return;
    setSaving(true);
    const { error } = await supabase.from('folders').insert({ name: trimmed });
    setSaving(false);
    if (error?.code === '23505') {
      Alert.alert('Could not create', 'You already have a folder with that name.');
      return;
    }
    if (error) {
      Alert.alert('Could not create', error.message);
      return;
    }
    setName('');
    await queryClient.invalidateQueries({ queryKey: ['folders'] });
    await refreshLibrary();
  }

  if (!library.ready) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator color="#1d4ed8" />
      </View>
    );
  }

  if (library.error && library.folders.length === 0 && library.items.length === 0) {
    return (
      <View className="flex-1 items-center justify-center bg-white px-8">
        <Text className="text-center text-base leading-6 text-red-700">{library.error}</Text>
      </View>
    );
  }

  return (
    <FlatList<Folder>
      data={folders}
      keyExtractor={(folder) => folder.id}
      style={{ flex: 1, backgroundColor: '#ffffff' }}
      contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 20, paddingTop: 16, paddingBottom: 24 }}
      ListHeaderComponent={
        <View className="mb-4">
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Folder name"
            placeholderTextColor="#94a3b8"
            className="rounded-2xl border border-blue-100 px-4 py-3 text-base text-slate-900"
          />
          <Pressable
            onPress={() => {
              void createFolder();
            }}
            disabled={saving || name.trim().length === 0}
            className="mt-3 items-center rounded-2xl bg-blue-700 px-4 py-3 active:bg-blue-800"
          >
            {saving ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text className="text-base font-semibold text-white">Create folder</Text>
            )}
          </Pressable>
        </View>
      }
      renderItem={({ item }) => <FolderRow folder={item} />}
      ListEmptyComponent={<EmptyFolders />}
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
  );
}

function FolderRow({ folder }: { folder: Folder }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(folder.name);
  const [saving, setSaving] = useState(false);

  async function rename() {
    const trimmed = name.trim();
    if (!trimmed || saving) return;
    if (trimmed === folder.name) {
      setEditing(false);
      return;
    }
    setSaving(true);
    const { error } = await supabase.from('folders').update({ name: trimmed }).eq('id', folder.id);
    setSaving(false);
    if (error?.code === '23505') {
      Alert.alert('Could not rename', 'You already have a folder with that name.');
      return;
    }
    if (error) {
      Alert.alert('Could not rename', error.message);
      return;
    }
    setEditing(false);
    await queryClient.invalidateQueries({ queryKey: ['folders'] });
    await refreshLibrary();
  }

  function confirmDelete() {
    Alert.alert('Delete folder', 'Saves in this folder stay in your library.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => void remove() },
    ]);
  }

  async function remove() {
    const { error } = await supabase.from('folders').delete().eq('id', folder.id);
    if (error) {
      Alert.alert('Could not delete', error.message);
      return;
    }
    await queryClient.invalidateQueries({ queryKey: ['folders'] });
    await queryClient.invalidateQueries({ queryKey: ['items'] });
    await refreshLibrary();
  }

  if (editing) {
    return (
      <View className="mb-3 rounded-3xl border border-blue-100 bg-white px-4 py-4">
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="Folder name"
          placeholderTextColor="#94a3b8"
          className="rounded-2xl border border-blue-100 px-4 py-3 text-base text-slate-900"
        />
        <View className="mt-3 flex-row">
          <Pressable
            onPress={() => {
              setName(folder.name);
              setEditing(false);
            }}
            className="mr-2 flex-1 items-center rounded-2xl border border-blue-100 px-4 py-3"
          >
            <Text className="text-base font-semibold text-blue-700">Cancel</Text>
          </Pressable>
          <Pressable
            onPress={() => {
              void rename();
            }}
            disabled={saving}
            className="ml-2 flex-1 items-center rounded-2xl bg-blue-700 px-4 py-3"
          >
            {saving ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text className="text-base font-semibold text-white">Save</Text>
            )}
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View className="mb-3 rounded-3xl border border-blue-100 bg-white px-4 py-4">
      <Pressable
        onPress={() => router.push(`/folder/${folder.id}`)}
        className="flex-row items-center"
      >
        <View className="h-10 w-10 items-center justify-center rounded-2xl bg-blue-50">
          <Ionicons name="folder" size={20} color="#1d4ed8" />
        </View>
        <Text className="ml-3 flex-1 text-base font-semibold text-slate-900" numberOfLines={1}>
          {folder.name}
        </Text>
      </Pressable>
      <View className="mt-3 flex-row">
        <Pressable
          onPress={() => {
            setName(folder.name);
            setEditing(true);
          }}
          className="mr-2 flex-1 items-center rounded-2xl border border-blue-100 px-4 py-3"
        >
          <Text className="text-base font-semibold text-blue-700">Rename</Text>
        </Pressable>
        <Pressable
          onPress={confirmDelete}
          className="ml-2 flex-1 items-center rounded-2xl border border-blue-100 px-4 py-3"
        >
          <Text className="text-base font-semibold text-red-700">Delete</Text>
        </Pressable>
      </View>
    </View>
  );
}

function EmptyFolders() {
  return (
    <View className="items-center px-4 py-8">
      <View className="items-center rounded-3xl border border-blue-100 bg-blue-50 px-6 py-10">
        <View className="mb-4 h-14 w-14 items-center justify-center rounded-2xl bg-white">
          <Ionicons name="folder-open-outline" size={28} color="#1d4ed8" />
        </View>
        <Text className="text-center text-lg font-semibold text-slate-900">No folders yet</Text>
        <Text className="mt-2 text-center text-base leading-6 text-slate-500">
          Name a folder above, then move a save into it from the save screen.
        </Text>
      </View>
    </View>
  );
}
