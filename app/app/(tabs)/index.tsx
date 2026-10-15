import { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Pressable, RefreshControl, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useQueryClient } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import { ItemCard } from '@/components/ItemCard';
import { useItems, type HomeSection } from '@/hooks/useItems';
import { saveAudio } from '@/saveAudio';
import { savePdf } from '@/savePdf';
import { saveScreenshot } from '@/saveScreenshot';
import type { SavedItem } from '@/savedItem';

export default function HomeScreen() {
  const [section, setSection] = useState<HomeSection>('screenshot');
  const [saving, setSaving] = useState(false);
  const queryClient = useQueryClient();
  const screenshots = useItems('screenshot');
  const pdfs = useItems('pdf');
  const audio = useItems('audio');
  const instagram = useItems('instagram');
  const itemsQuery =
    section === 'screenshot' ? screenshots : section === 'pdf' ? pdfs : section === 'audio' ? audio : instagram;
  const items = useMemo(() => itemsQuery.data?.pages.flat() ?? [], [itemsQuery.data]);

  async function choosePdf() {
    const DocumentPicker = await import('expo-document-picker');
    const picked = await DocumentPicker.getDocumentAsync({
      type: 'application/pdf',
      copyToCacheDirectory: true,
    });
    if (picked.canceled || !picked.assets[0]) return;
    const file = picked.assets[0];
    if (file.mimeType && file.mimeType !== 'application/pdf') {
      Alert.alert('Could not save', 'Choose a PDF.');
      return;
    }

    setSaving(true);
    try {
      await savePdf(file.uri, file.size);
      await queryClient.invalidateQueries({ queryKey: ['items'] });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'The PDF could not be saved';
      Alert.alert('Could not save', message);
    } finally {
      setSaving(false);
    }
  }

  async function chooseAudio() {
    const DocumentPicker = await import('expo-document-picker');
    const picked = await DocumentPicker.getDocumentAsync({
      type: ['audio/*'],
      copyToCacheDirectory: true,
    });
    if (picked.canceled || !picked.assets[0]) return;
    const file = picked.assets[0];
    if (file.mimeType && !file.mimeType.startsWith('audio/')) {
      Alert.alert('Could not save', 'Choose a voice note audio file.');
      return;
    }

    setSaving(true);
    try {
      await saveAudio(file.uri, file.mimeType, file.size);
      await queryClient.invalidateQueries({ queryKey: ['items'] });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'The voice note could not be saved';
      Alert.alert('Could not save', message);
    } finally {
      setSaving(false);
    }
  }

  async function choosePhoto() {
    const picked = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 1,
    });
    if (picked.canceled || !picked.assets[0]) return;

    setSaving(true);
    try {
      await saveScreenshot(picked.assets[0].uri);
      await queryClient.invalidateQueries({ queryKey: ['items'] });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'The photo could not be saved';
      Alert.alert('Could not save', message);
    } finally {
      setSaving(false);
    }
  }

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
      ListHeaderComponent={
        <View className="mb-4">
          <SectionSwitch section={section} onChange={setSection} />
          {section === 'screenshot' || section === 'pdf' || section === 'audio' ? (
            <Pressable
              onPress={() => {
                void (section === 'pdf' ? choosePdf() : section === 'audio' ? chooseAudio() : choosePhoto());
              }}
              disabled={saving}
              className="mt-4 items-center rounded-2xl bg-blue-700 px-4 py-3 active:bg-blue-800"
            >
              {saving ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text className="text-base font-semibold text-white">
                  {section === 'pdf' ? 'Choose a PDF' : section === 'audio' ? 'Choose a voice note' : 'Choose a photo'}
                </Text>
              )}
            </Pressable>
          ) : null}
          <Text className="mt-3 text-center text-sm leading-5 text-slate-500">{helperText(section)}</Text>
        </View>
      }
      ListEmptyComponent={<EmptySection section={section} />}
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

function helperText(section: HomeSection): string {
  if (section === 'screenshot') return 'Or share a photo to PROSPOR from another app.';
  if (section === 'pdf') return 'Choose a PDF from your phone. The summary appears on the card.';
  if (section === 'audio') return 'Choose a voice note from your phone. The summary appears on the card.';
  return 'Reels you send to the Instagram bot show up here.';
}

function SectionSwitch({
  section,
  onChange,
}: {
  section: HomeSection;
  onChange: (section: HomeSection) => void;
}) {
  return (
    <View className="flex-row rounded-2xl bg-blue-50 p-1">
      <SectionButton label="Screenshot" selected={section === 'screenshot'} onPress={() => onChange('screenshot')} />
      <SectionButton label="PDF" selected={section === 'pdf'} onPress={() => onChange('pdf')} />
      <SectionButton label="Voice" selected={section === 'audio'} onPress={() => onChange('audio')} />
      <SectionButton label="Instagram" selected={section === 'instagram'} onPress={() => onChange('instagram')} />
    </View>
  );
}

function SectionButton({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} className={`flex-1 rounded-xl py-2 ${selected ? 'bg-white' : ''}`}>
      <Text className={`text-center text-sm font-semibold ${selected ? 'text-blue-700' : 'text-slate-500'}`}>
        {label}
      </Text>
    </Pressable>
  );
}

function EmptySection({ section }: { section: HomeSection }) {
  const icon =
    section === 'pdf'
      ? 'document-text-outline'
      : section === 'audio'
        ? 'mic-outline'
        : section === 'screenshot'
          ? 'image-outline'
          : 'logo-instagram';
  const title =
    section === 'pdf'
      ? 'No PDFs yet'
      : section === 'audio'
        ? 'No voice notes yet'
        : section === 'screenshot'
          ? 'No screenshots yet'
          : 'No Instagram saves yet';
  const body =
    section === 'pdf'
      ? 'Choose a PDF from your phone. The summary appears on the card.'
      : section === 'audio'
        ? 'Choose a voice note from your phone. The summary appears on the card.'
        : section === 'screenshot'
          ? 'Choose a photo, or share one into PROSPOR. The summary appears on the card.'
          : 'Send a reel to the bot. It will show up here.';
  return (
    <View className="items-center px-4 py-8">
      <View className="items-center rounded-3xl border border-blue-100 bg-blue-50 px-6 py-10">
        <View className="mb-4 h-14 w-14 items-center justify-center rounded-2xl bg-white">
          <Ionicons name={icon} size={28} color="#1d4ed8" />
        </View>
        <Text className="text-center text-lg font-semibold text-slate-900">{title}</Text>
        <Text className="mt-2 text-center text-base leading-6 text-slate-500">{body}</Text>
      </View>
    </View>
  );
}
