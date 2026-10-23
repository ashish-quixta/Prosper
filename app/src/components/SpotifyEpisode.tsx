import { Component, useEffect, useState, type ComponentType, type ReactNode } from 'react';
import { ActivityIndicator, Image, Linking, Pressable, Text, TurboModuleRegistry, View } from 'react-native';
import {
  formatDuration,
  restrictionLabel,
  spotifyEpisodeFromCaption,
  type SpotifyYouTubeChannelView,
} from '@/spotifyEpisode';
import { spotifyLinkFromText } from '@/spotifyUrl';
import { formatCount, formatPublished } from '@/youtubeFacts';

export function SpotifyEpisode({ caption, sourceUrl }: { caption: string | null; sourceUrl: string | null }) {
  const episode = spotifyEpisodeFromCaption(caption);
  const link = sourceUrl ? spotifyLinkFromText(sourceUrl) : null;
  const duration = episode ? formatDuration(episode.durationMs) : null;
  const cover = episode?.imageUrl || episode?.showImageUrl;
  const youtubeChannel = episode?.youtubeChannel ?? null;
  const creatorName =
    youtubeChannel && episode && !sameLabel(youtubeChannel.channelTitle, episode.showName)
      ? youtubeChannel.channelTitle
      : episode?.showPublisher && !sameLabel(episode.showPublisher, episode.showName)
        ? episode.showPublisher
        : null;
  const creatorLine = [
    creatorName,
    youtubeChannel?.subscriberCount != null ? `${formatCount(youtubeChannel.subscriberCount)} subscribers` : null,
  ]
    .filter(Boolean)
    .join(' · ');
  const audience = youtubeChannel ? youtubeCountLine(youtubeChannel) : null;
  const published = youtubeChannel?.publishedAt ? formatPublished(youtubeChannel.publishedAt) : null;
  const details = episode
    ? [
        episode.explicit ? 'Explicit' : null,
        episode.languages.length > 0 ? episode.languages.join(', ') : null,
        episode.showTotalEpisodes !== null ? `${episode.showTotalEpisodes} episodes` : null,
        episode.showPublisher && !sameLabel(episode.showPublisher, creatorName ?? '') && !sameLabel(episode.showPublisher, episode.showName)
          ? episode.showPublisher
          : null,
        episode.showMediaType,
        episode.showExplicit ? 'Explicit show' : null,
        episode.restrictionReason ? restrictionLabel(episode.restrictionReason) : null,
      ]
        .filter(Boolean)
        .join(' · ')
    : '';
  if (!episode && !link) return null;

  return (
    <View className="mt-6">
      {cover ? (
        <Image source={{ uri: cover }} style={{ width: 180, height: 180, borderRadius: 16 }} resizeMode="contain" />
      ) : null}
      {episode ? (
        <>
          <Text className="mt-3 text-sm font-semibold text-slate-900">
            {[episode.showName, duration, episode.releaseDate ?? published].filter(Boolean).join(' · ')}
          </Text>
          {creatorLine ? <Text className="mt-1 text-sm leading-5 text-slate-700">{creatorLine}</Text> : null}
          {details ? <Text className="mt-1 text-sm leading-5 text-slate-500">{details}</Text> : null}
          {episode.description ? (
            <Text className="mt-3 text-base leading-6 text-slate-700">{episode.description}</Text>
          ) : null}
          {audience ? <Text className="mt-3 text-sm leading-5 text-slate-600">{audience}</Text> : null}
          {episode.showDescription && episode.showDescription !== episode.description ? (
            <View className="mt-4">
              <Text className="text-xs font-semibold uppercase tracking-wide text-slate-400">About</Text>
              <Text className="mt-2 text-base leading-6 text-slate-700">{episode.showDescription}</Text>
              {episode.showLanguages.length > 0 ? (
                <Text className="mt-2 text-sm leading-5 text-slate-500">{episode.showLanguages.join(', ')}</Text>
              ) : null}
            </View>
          ) : null}
          {episode.showCopyrights.length > 0 ? (
            <View className="mt-4">
              {episode.showCopyrights.map((entry) => (
                <Text key={`${entry.type}-${entry.text}`} className="mt-1 text-sm leading-5 text-slate-500">
                  {entry.text}
                </Text>
              ))}
            </View>
          ) : null}
          {youtubeChannel && youtubeChannel.chapters.length > 0 ? (
            <View className="mt-4">
              <Text className="text-xs font-semibold uppercase tracking-wide text-slate-400">Timestamps</Text>
              {youtubeChannel.chapters.map((chapter) => (
                <Text key={`${chapter.at}-${chapter.label}`} className="mt-3 text-base leading-6 text-slate-800">
                  {`${chapter.at}  ${chapter.label}`}
                </Text>
              ))}
            </View>
          ) : null}
          {youtubeChannel?.description ? (
            <Text className="mt-3 text-sm leading-5 text-slate-600">{youtubeChannel.description}</Text>
          ) : null}
        </>
      ) : null}
      {link?.embedUrl ? <SpotifyEmbed url={link.embedUrl} /> : null}
      {sourceUrl || youtubeChannel?.videoTitle ? (
        <View className="mt-4 flex-row">
          {sourceUrl ? (
            <Pressable onPress={() => void Linking.openURL(sourceUrl)} className="mr-6">
              <Text className="text-base font-semibold text-blue-700">Listen</Text>
            </Pressable>
          ) : null}
          {youtubeChannel?.videoTitle ? (
            <Pressable onPress={() => void Linking.openURL(youtubeChannel.url)}>
              <Text className="text-base font-semibold text-blue-700">Watch</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

function sameLabel(left: string, right: string): boolean {
  return left.trim().toLowerCase() === right.trim().toLowerCase();
}

function youtubeCountLine(channel: SpotifyYouTubeChannelView): string | null {
  const parts = [
    channel.viewCount == null ? null : `${formatCount(channel.viewCount)} views`,
    channel.likeCount == null ? null : `${formatCount(channel.likeCount)} likes`,
    channel.commentCount == null ? null : `${formatCount(channel.commentCount)} comments`,
  ].filter((part): part is string => part != null);
  return parts.length > 0 ? parts.join(' · ') : null;
}

function SpotifyEmbed({ url }: { url: string }) {
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
    return <Text className="mt-3 text-sm leading-5 text-slate-500">Open in Spotify to play this episode.</Text>;
  }
  if (!EmbedView) return <ActivityIndicator color="#1d4ed8" style={{ marginTop: 12 }} />;

  return (
    <EmbedBoundary>
      <View className="mt-3 overflow-hidden rounded-2xl">
        <EmbedView source={{ uri: url }} style={{ height: 232 }} />
      </View>
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
      return <Text className="mt-3 text-sm leading-5 text-slate-500">Open in Spotify to play this episode.</Text>;
    }
    return this.props.children;
  }
}
