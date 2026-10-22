import { Component, useEffect, useState, type ComponentType, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  TurboModuleRegistry,
  View,
} from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { FolderPicker } from '@/components/FolderPicker';
import { XPost } from '@/components/XPost';
import { YoutubeFacts } from '@/components/YoutubeFacts';
import { StatusBadge } from '@/components/StatusBadge';
import { useItem } from '@/hooks/useItem';
import { refreshLibrary, useLibrary } from '@/library';
import { linkedinLinkFromText } from '@/linkedinUrl';
import { itemHeading, platformLabel, type SavedItem } from '@/savedItem';
import { supabase } from '@/supabase';

export default function ItemScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const id = typeof params.id === 'string' ? params.id : '';
  const itemQuery = useItem(id);
  const library = useLibrary();
  const local = library.items.find((entry) => entry.id === id) ?? null;
  const item = itemQuery.isSuccess ? itemQuery.data : local;

  if (!item && (itemQuery.isPending || !library.ready)) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator color="#1d4ed8" />
      </View>
    );
  }

  if (!item && itemQuery.isError && !local) {
    return (
      <View className="flex-1 items-center justify-center bg-white px-8">
        <Text className="text-center text-base leading-6 text-red-700">{itemQuery.error.message}</Text>
      </View>
    );
  }

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
        <FolderPicker itemId={item.id} folderId={item.folderId} />
        {item.platform === 'youtube' ? <YoutubeFacts caption={item.caption} /> : null}
        {item.platform === 'x' ? <XPost caption={item.caption} sourceUrl={item.sourceUrl} /> : null}
        {item.platform === 'linkedin' && item.sourceUrl ? <LinkedInPost item={item} /> : null}
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

function LinkedInPost({ item }: { item: SavedItem }) {
  const queryClient = useQueryClient();
  const [embedCode, setEmbedCode] = useState('');
  const [postText, setPostText] = useState('');
  const [saving, setSaving] = useState(false);
  const link = item.sourceUrl ? linkedinLinkFromText(item.sourceUrl) : null;
  const openUrl = item.sourceUrl ?? link?.url;

  async function saveEmbedCode() {
    const parsed = linkedinLinkFromText(embedCode);
    if (!parsed?.embedUrl) {
      Alert.alert('Could not use that', 'Paste the embed code from LinkedIn.');
      return;
    }
    setSaving(true);
    const { error } = await supabase.from('items').update({ source_url: parsed.embedUrl }).eq('id', item.id);
    setSaving(false);
    if (error) {
      Alert.alert('Could not save', error.message);
      return;
    }
    setEmbedCode('');
    await queryClient.invalidateQueries({ queryKey: ['items', item.id] });
  }

  async function savePostText() {
    const text = postText.trim();
    if (!text) return;
    setSaving(true);
    const { error } = await supabase
      .from('items')
      .update({ caption: text, status: 'saving', error: 'PASTED_TEXT' })
      .eq('id', item.id);
    setSaving(false);
    if (error) {
      Alert.alert('Could not save', error.message);
      return;
    }
    setPostText('');
    await queryClient.invalidateQueries({ queryKey: ['items', item.id] });
    await queryClient.invalidateQueries({ queryKey: ['items'] });
    await refreshLibrary();
  }

  return (
    <View className="mt-6">
      {link?.embedUrl ? <LinkedInEmbed url={link.embedUrl} /> : null}
      {link?.mayNotEmbed ? (
        <Text className="mt-3 text-sm leading-5 text-slate-500">
          This link may not embed. Use LinkedIn’s menu, choose Embed this post, and paste the code.
        </Text>
      ) : null}
      <TextInput
        value={embedCode}
        onChangeText={setEmbedCode}
        placeholder="Paste the embed code if the post is blank"
        placeholderTextColor="#94a3b8"
        autoCapitalize="none"
        autoCorrect={false}
        className="mt-3 rounded-2xl border border-blue-100 px-4 py-3 text-base text-slate-900"
      />
      <Pressable
        onPress={() => {
          void saveEmbedCode();
        }}
        disabled={saving}
        className="mt-3 items-center rounded-2xl border border-blue-100 px-4 py-3"
      >
        <Text className="text-base font-semibold text-blue-700">Use embed code</Text>
      </Pressable>
      {openUrl ? (
        <Pressable
          onPress={() => {
            void Linking.openURL(openUrl);
          }}
          className="mt-3 items-center rounded-2xl bg-blue-700 px-4 py-3"
        >
          <Text className="text-base font-semibold text-white">Open on LinkedIn</Text>
        </Pressable>
      ) : null}
      <TextInput
        value={postText}
        onChangeText={setPostText}
        placeholder="Paste the full post for a better briefing"
        placeholderTextColor="#94a3b8"
        multiline
        className="mt-4 min-h-24 rounded-2xl border border-blue-100 px-4 py-3 text-base text-slate-900"
      />
      <Pressable
        onPress={() => {
          void savePostText();
        }}
        disabled={saving}
        className="mt-3 items-center rounded-2xl border border-blue-100 px-4 py-3"
      >
        <Text className="text-base font-semibold text-blue-700">Brief the pasted text</Text>
      </Pressable>
    </View>
  );
}

function LinkedInEmbed({ url }: { url: string }) {
  const nativeMissing = TurboModuleRegistry.get('RNCWebViewModule') == null;
  const [EmbedView, setEmbedView] = useState<ComponentType<{ source: { uri: string }; style: { height: number } }> | null>(
    null,
  );
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (nativeMissing) return;
    let active = true;
    void import('react-native-webview')
      .then((mod) => {
        if (active) setEmbedView(() => mod.WebView);
      })
      .catch(() => {
        if (active) setFailed(true);
      });
    return () => {
      active = false;
    };
  }, [nativeMissing]);

  if (nativeMissing || failed) {
    return (
      <Text className="text-sm leading-5 text-slate-500">
        The post embed appears after the next app build. Open on LinkedIn to see it now.
      </Text>
    );
  }
  if (!EmbedView) return <ActivityIndicator color="#1d4ed8" />;

  return (
    <EmbedBoundary>
      <EmbedView source={{ uri: url }} style={{ height: 600 }} />
    </EmbedBoundary>
  );
}

class EmbedBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError(): { failed: boolean } {
    return { failed: true };
  }

  render() {
    if (this.state.failed) {
      return (
        <Text className="text-sm leading-5 text-slate-500">
          The post embed appears after the next app build. Open on LinkedIn to see it now.
        </Text>
      );
    }
    return this.props.children;
  }
}
