import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, Text, View } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { refreshLibrary, useLibrary } from '@/library';
import { supabase } from '@/supabase';

export function FolderPicker({ itemId, folderId }: { itemId: string; folderId: string | null }) {
  const library = useLibrary();
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const folders = library.folders;

  async function moveTo(next: string | null) {
    if (saving || next === folderId) return;
    setSaving(true);
    const { error } = await supabase.from('items').update({ folder_id: next }).eq('id', itemId);
    setSaving(false);
    if (error) {
      Alert.alert('Could not move', error.message);
      return;
    }
    await queryClient.invalidateQueries({ queryKey: ['items'] });
    await refreshLibrary();
  }

  return (
    <View className="mt-6">
      <Text className="text-xs font-semibold uppercase tracking-wide text-slate-400">Folder</Text>
      {!library.ready ? (
        <ActivityIndicator color="#1d4ed8" style={{ marginTop: 12 }} />
      ) : library.error && folders.length === 0 ? (
        <Text className="mt-3 text-sm leading-5 text-red-700">{library.error}</Text>
      ) : folders.length === 0 ? (
        <Text className="mt-3 text-sm leading-5 text-slate-500">
          Create a folder in the Folders tab, then move this save into it.
        </Text>
      ) : (
        <View className="mt-3 flex-row flex-wrap">
          <FolderChoice label="No folder" selected={folderId === null} disabled={saving} onPress={() => void moveTo(null)} />
          {folders.map((folder) => (
            <FolderChoice
              key={folder.id}
              label={folder.name}
              selected={folder.id === folderId}
              disabled={saving}
              onPress={() => void moveTo(folder.id)}
            />
          ))}
        </View>
      )}
    </View>
  );
}

function FolderChoice({
  label,
  selected,
  disabled,
  onPress,
}: {
  label: string;
  selected: boolean;
  disabled: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      className={`mb-2 mr-2 rounded-full px-3 py-1.5 ${selected ? 'bg-blue-700' : 'bg-blue-50'}`}
    >
      <Text className={`text-sm font-medium ${selected ? 'text-white' : 'text-blue-700'}`}>{label}</Text>
    </Pressable>
  );
}
