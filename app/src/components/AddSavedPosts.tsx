import { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Modal, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQueryClient } from '@tanstack/react-query';
import { ItemCard } from '@/components/ItemCard';
import { itemMatchesSection, type HomeSection } from '@/hooks/useItems';
import { refreshLibrary, useLibrary } from '@/library';
import type { SavedItem } from '@/savedItem';
import { supabase } from '@/supabase';

const sections: { id: HomeSection; label: string }[] = [
  { id: 'screenshot', label: 'Screenshots' },
  { id: 'pdf', label: 'PDFs' },
  { id: 'audio', label: 'Voice notes' },
  { id: 'instagram', label: 'Instagram' },
  { id: 'youtube-short', label: 'YouTube Shorts' },
  { id: 'youtube-video', label: 'YouTube videos' },
  { id: 'youtube-podcast', label: 'YouTube podcasts' },
  { id: 'linkedin', label: 'LinkedIn' },
  { id: 'x', label: 'X' },
  { id: 'spotify', label: 'Spotify' },
  { id: 'doc', label: 'Google Docs' },
  { id: 'slides', label: 'Google Slides' },
];

function sectionLabel(section: HomeSection): string {
  return sections.find((entry) => entry.id === section)?.label ?? 'Posts';
}

export function AddSavedPosts({ folderId }: { folderId: string }) {
  const [open, setOpen] = useState(false);
  const [section, setSection] = useState<HomeSection | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const library = useLibrary();
  const queryClient = useQueryClient();
  const items = useMemo(
    () =>
      section
        ? library.items.filter((item) => item.folderId !== folderId && itemMatchesSection(item, section))
        : [],
    [folderId, library.items, section],
  );

  function close() {
    setOpen(false);
    setSection(null);
    setSelected([]);
  }

  function backToSections() {
    setSection(null);
    setSelected([]);
  }

  function toggle(id: string) {
    setSelected((current) => (current.includes(id) ? current.filter((entry) => entry !== id) : [...current, id]));
  }

  async function addSelected() {
    if (selected.length === 0 || saving) return;
    setSaving(true);
    const { error } = await supabase.from('items').update({ folder_id: folderId }).in('id', selected);
    setSaving(false);
    if (error) {
      Alert.alert('Could not add', error.message);
      return;
    }
    await queryClient.invalidateQueries({ queryKey: ['items'] });
    await refreshLibrary();
    close();
  }

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        className="mb-4 items-center rounded-2xl border border-blue-100 px-4 py-3"
      >
        <Text className="text-base font-semibold text-blue-700">Add saved posts</Text>
      </Pressable>
      <Modal visible={open} animationType="slide" onRequestClose={section ? backToSections : close}>
        <SafeAreaView style={{ flex: 1, backgroundColor: '#ffffff' }}>
          <View className="flex-row items-center justify-between px-5 pb-2 pt-2">
            <Pressable onPress={section ? backToSections : close} className="py-2">
              <Text className="text-base font-semibold text-blue-700">{section ? 'Back' : 'Close'}</Text>
            </Pressable>
            <Text className="text-base font-semibold text-slate-900">
              {section ? sectionLabel(section) : 'Add to folder'}
            </Text>
            <View className="w-12" />
          </View>
          {section ? (
            <SectionPosts
              items={items}
              selected={selected}
              pending={!library.ready}
              errorMessage={!library.ready || items.length > 0 || library.items.length > 0 ? null : library.error}
              loadingMore={false}
              saving={saving}
              onToggle={toggle}
              onAdd={() => {
                void addSelected();
              }}
              onEnd={() => {}}
            />
          ) : (
            <View className="px-5 pt-2">
              <Text className="pb-4 text-sm leading-5 text-slate-500">Choose where the saved posts came from.</Text>
              {sections.map((entry) => (
                <Pressable
                  key={entry.id}
                  onPress={() => setSection(entry.id)}
                  className="mb-3 items-center rounded-2xl border border-blue-100 px-4 py-4 active:bg-blue-50"
                >
                  <Text className="text-base font-semibold text-slate-900">{entry.label}</Text>
                </Pressable>
              ))}
            </View>
          )}
        </SafeAreaView>
      </Modal>
    </>
  );
}

function SectionPosts({
  items,
  selected,
  pending,
  errorMessage,
  loadingMore,
  saving,
  onToggle,
  onAdd,
  onEnd,
}: {
  items: SavedItem[];
  selected: string[];
  pending: boolean;
  errorMessage: string | null;
  loadingMore: boolean;
  saving: boolean;
  onToggle: (id: string) => void;
  onAdd: () => void;
  onEnd: () => void;
}) {
  if (pending) {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator color="#1d4ed8" />
      </View>
    );
  }

  if (errorMessage) {
    return (
      <View className="flex-1 items-center justify-center px-8">
        <Text className="text-center text-base leading-6 text-red-700">{errorMessage}</Text>
      </View>
    );
  }

  return (
    <View className="flex-1">
      <FlatList<SavedItem>
        data={items}
        keyExtractor={(item) => item.id}
        style={{ flex: 1 }}
        contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 20, paddingBottom: 16 }}
        renderItem={({ item }) => (
          <ItemCard item={item} selected={selected.includes(item.id)} onPress={() => onToggle(item.id)} />
        )}
        ListEmptyComponent={
          <View className="flex-1 items-center justify-center px-6">
            <Text className="text-center text-base leading-6 text-slate-500">
              Nothing left to add from this section.
            </Text>
          </View>
        }
        onEndReached={onEnd}
        ListFooterComponent={
          loadingMore ? <ActivityIndicator color="#1d4ed8" style={{ marginVertical: 16 }} /> : null
        }
      />
      <View className="border-t border-blue-100 px-5 py-3">
        <Pressable
          onPress={onAdd}
          disabled={saving || selected.length === 0}
          className="items-center rounded-2xl bg-blue-700 px-4 py-3 active:bg-blue-800"
        >
          {saving ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text className="text-base font-semibold text-white">
              {selected.length === 0 ? 'Select posts' : `Add ${selected.length} to folder`}
            </Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}
