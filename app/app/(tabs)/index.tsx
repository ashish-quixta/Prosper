import { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Pressable, RefreshControl, Text, TextInput, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useQueryClient } from '@tanstack/react-query';
import * as Clipboard from 'expo-clipboard';
import * as ImagePicker from 'expo-image-picker';
import { ItemCard } from '@/components/ItemCard';
import { itemMatchesSection, youtubeKindFromSection, type HomeSection } from '@/hooks/useItems';
import { refreshLibrary, useLibrary } from '@/library';
import { saveAudio } from '@/saveAudio';
import { saveInstagramLink } from '@/saveInstagramLink';
import { saveLinkedInLink } from '@/saveLinkedInLink';
import { savePdf } from '@/savePdf';
import { saveScreenshot } from '@/saveScreenshot';
import { saveGoogleFile } from '@/saveGoogleFile';
import { saveSpotifyLink } from '@/saveSpotifyLink';
import { saveXLink } from '@/saveXLink';
import { saveYoutubeLink } from '@/saveYoutubeLink';
import type { SavedItem } from '@/savedItem';

export default function HomeScreen() {
  const [section, setSection] = useState<HomeSection>('screenshot');
  const [saving, setSaving] = useState(false);
  const [linkText, setLinkText] = useState('');
  const queryClient = useQueryClient();
  const library = useLibrary();
  const items = useMemo(
    () => library.items.filter((item) => itemMatchesSection(item, section)),
    [library.items, section],
  );

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
      await refreshLibrary();
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
      await refreshLibrary();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'The voice note could not be saved';
      Alert.alert('Could not save', message);
    } finally {
      setSaving(false);
    }
  }

  async function submitLink(value: string) {
    setSaving(true);
    try {
      const youtubeKind = youtubeKindFromSection(section);
      if (youtubeKind) await saveYoutubeLink(value, youtubeKind);
      else if (section === 'doc' || section === 'slides') await saveGoogleFile(value, section);
      else if (section === 'linkedin') await saveLinkedInLink(value);
      else if (section === 'x') await saveXLink(value);
      else if (section === 'spotify') await saveSpotifyLink(value);
      else await saveInstagramLink(value);
      setLinkText('');
      await queryClient.invalidateQueries({ queryKey: ['items'] });
      await refreshLibrary();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'The link could not be saved';
      Alert.alert('Could not save', message);
    } finally {
      setSaving(false);
    }
  }

  async function pasteLink() {
    const text = await Clipboard.getStringAsync();
    setLinkText(text);
    await submitLink(text);
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
      await refreshLibrary();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'The photo could not be saved';
      Alert.alert('Could not save', message);
    } finally {
      setSaving(false);
    }
  }

  if (!library.ready) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator color="#1d4ed8" />
      </View>
    );
  }

  if (library.error && library.items.length === 0) {
    return (
      <View className="flex-1 items-center justify-center bg-white px-8">
        <Text className="text-center text-base leading-6 text-red-700">{library.error}</Text>
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
          {section === 'instagram' ||
          section === 'linkedin' ||
          section === 'x' ||
          section === 'spotify' ||
          section === 'doc' ||
          section === 'slides' ||
          youtubeKindFromSection(section) ? (
            <View className="mt-4">
              <TextInput
                value={linkText}
                onChangeText={setLinkText}
                placeholder={linkPlaceholder(section)}
                placeholderTextColor="#94a3b8"
                autoCapitalize="none"
                autoCorrect={false}
                className="rounded-2xl border border-blue-100 px-4 py-3 text-base text-slate-900"
              />
              <View className="mt-3 flex-row">
                <Pressable
                  onPress={() => {
                    void pasteLink();
                  }}
                  disabled={saving}
                  className="mr-2 flex-1 items-center rounded-2xl border border-blue-100 px-4 py-3"
                >
                  <Text className="text-base font-semibold text-blue-700">Paste</Text>
                </Pressable>
                <Pressable
                  onPress={() => {
                    void submitLink(linkText);
                  }}
                  disabled={saving}
                  className="ml-2 flex-1 items-center rounded-2xl bg-blue-700 px-4 py-3 active:bg-blue-800"
                >
                  {saving ? (
                    <ActivityIndicator color="#ffffff" />
                  ) : (
                    <Text className="text-base font-semibold text-white">Save link</Text>
                  )}
                </Pressable>
              </View>
            </View>
          ) : null}
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

function linkPlaceholder(section: HomeSection): string {
  const kind = youtubeKindFromSection(section);
  if (kind === 'short') return 'Paste a YouTube Short link';
  if (kind === 'video') return 'Paste a YouTube video link';
  if (kind === 'podcast') return 'Paste a YouTube podcast link';
  if (section === 'doc') return 'Paste a Google Docs link';
  if (section === 'slides') return 'Paste a Google Slides link';
  if (section === 'linkedin') return 'Paste a LinkedIn post link';
  if (section === 'x') return 'Paste an X post link';
  if (section === 'spotify') return 'Paste a Spotify episode link';
  return 'Paste an Instagram post or reel link';
}

function helperText(section: HomeSection): string {
  const kind = youtubeKindFromSection(section);
  if (section === 'screenshot') return 'Or share a photo to PROSPOR from another app.';
  if (section === 'pdf') return 'Choose a PDF from your phone. The summary appears on the card.';
  if (section === 'audio') return 'Choose a voice note from your phone. The summary appears on the card.';
  if (kind === 'short') return 'Paste a Short. The briefing comes from the video when it is public.';
  if (kind === 'video') return 'Paste a video. The briefing comes from the video when it is public.';
  if (kind === 'podcast') return 'Paste a podcast episode. The briefing comes from the video when it is public.';
  if (section === 'doc') return 'Share the Doc as Anyone with the link, then paste it.';
  if (section === 'slides') return 'Share the deck as Anyone with the link, then paste it.';
  if (section === 'linkedin') return 'Paste a post link. The original post shows in LinkedIn’s embed.';
  if (section === 'x') return 'Paste a post link, or share it from X. A few public replies are included.';
  if (section === 'spotify') return 'Paste an episode link, or share it from Spotify. The briefing uses the public description.';
  return 'Paste a post or reel link. For the words in the reel, add a screenshot.';
}

function SectionSwitch({
  section,
  onChange,
}: {
  section: HomeSection;
  onChange: (section: HomeSection) => void;
}) {
  return (
    <View className="rounded-2xl bg-blue-50 p-1">
      <View className="flex-row">
        <SectionButton label="Shot" selected={section === 'screenshot'} onPress={() => onChange('screenshot')} />
        <SectionButton label="PDF" selected={section === 'pdf'} onPress={() => onChange('pdf')} />
        <SectionButton label="Voice" selected={section === 'audio'} onPress={() => onChange('audio')} />
      </View>
      <View className="mt-1 flex-row">
        <SectionButton label="IG" selected={section === 'instagram'} onPress={() => onChange('instagram')} />
        <SectionButton label="LI" selected={section === 'linkedin'} onPress={() => onChange('linkedin')} />
        <SectionButton label="X" selected={section === 'x'} onPress={() => onChange('x')} />
      </View>
      <View className="mt-1 flex-row">
        <SectionButton label="YT Short" selected={section === 'youtube-short'} onPress={() => onChange('youtube-short')} />
        <SectionButton label="YT Video" selected={section === 'youtube-video'} onPress={() => onChange('youtube-video')} />
        <SectionButton
          label="YT Podcast"
          selected={section === 'youtube-podcast'}
          onPress={() => onChange('youtube-podcast')}
        />
      </View>
      <View className="mt-1 flex-row">
        <SectionButton label="Docs" selected={section === 'doc'} onPress={() => onChange('doc')} />
        <SectionButton label="Slides" selected={section === 'slides'} onPress={() => onChange('slides')} />
        <SectionButton label="Spotify" selected={section === 'spotify'} onPress={() => onChange('spotify')} />
      </View>
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
          : section === 'doc' || section === 'slides'
            ? 'document-text-outline'
            : youtubeKindFromSection(section)
            ? 'logo-youtube'
            : section === 'spotify'
              ? 'musical-notes'
              : section === 'x'
              ? 'logo-twitter'
              : section === 'linkedin'
              ? 'logo-linkedin'
              : 'logo-instagram';
  const title =
    section === 'pdf'
      ? 'No PDFs yet'
      : section === 'audio'
        ? 'No voice notes yet'
        : section === 'screenshot'
          ? 'No screenshots yet'
          : youtubeKindFromSection(section) === 'short'
            ? 'No YouTube Shorts yet'
            : youtubeKindFromSection(section) === 'video'
              ? 'No YouTube videos yet'
              : youtubeKindFromSection(section) === 'podcast'
                ? 'No YouTube podcasts yet'
                : section === 'doc'
                  ? 'No Google Docs yet'
                  : section === 'slides'
                    ? 'No Google Slides yet'
                : section === 'spotify'
                  ? 'No Spotify episodes yet'
                : section === 'x'
                  ? 'No X posts yet'
                : section === 'linkedin'
              ? 'No LinkedIn posts yet'
              : 'No Instagram saves yet';
  const body =
    section === 'pdf'
      ? 'Choose a PDF from your phone. The summary appears on the card.'
      : section === 'audio'
        ? 'Choose a voice note from your phone. The summary appears on the card.'
        : section === 'screenshot'
          ? 'Choose a photo, or share one into PROSPOR. The summary appears on the card.'
          : section === 'doc' || section === 'slides'
            ? 'Share the file as Anyone with the link, then paste it. The briefing appears on the card.'
            : youtubeKindFromSection(section)
            ? 'Paste a link for this YouTube section. The briefing appears on the card.'
            : section === 'spotify'
              ? 'Paste a Spotify episode link, or share one from Spotify. The briefing uses the public description.'
            : section === 'x'
              ? 'Paste an X post link, or share one from X. The briefing includes a few public replies.'
            : section === 'linkedin'
              ? 'Paste a LinkedIn post link. Open it to see the embed and the preview briefing.'
              : 'Paste a post or reel link, or send a reel to the bot. A screenshot gives the briefing.';
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
