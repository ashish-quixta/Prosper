import { useEffect, useRef, useState } from 'react';
import { Alert } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { useShareIntentContext } from 'expo-share-intent';
import { linkedinLinkFromText } from '@/linkedinUrl';
import { saveInstagramLink } from '@/saveInstagramLink';
import { saveLinkedInLink } from '@/saveLinkedInLink';
import { saveScreenshot } from '@/saveScreenshot';
import { saveSpotifyLink } from '@/saveSpotifyLink';
import { saveXLink } from '@/saveXLink';
import { refreshLibrary } from '@/library';
import { saveYoutubeLink } from '@/saveYoutubeLink';
import { spotifyLinkFromText } from '@/spotifyUrl';
import { xLinkFromText } from '@/xUrl';
import { youtubeLinkFromText } from '@/youtubeUrl';
import { supabase } from '@/supabase';

export function IncomingScreenshot() {
  const queryClient = useQueryClient();
  const { hasShareIntent, shareIntent, resetShareIntent } = useShareIntentContext();
  const [signedIn, setSignedIn] = useState(false);
  const saving = useRef(false);

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setSignedIn(session !== null);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!hasShareIntent || !signedIn || saving.current) return;
    const file = shareIntent.files?.find((entry) => entry.mimeType.startsWith('image/'));
    const sharedText = [shareIntent.webUrl, shareIntent.text].filter(Boolean).join('\n');
    const sharedYouTube = youtubeLinkFromText(sharedText);
    if (!file && sharedText.trim().length === 0) {
      resetShareIntent();
      return;
    }

    saving.current = true;
    const save = file
      ? saveScreenshot(file.path)
      : sharedYouTube
        ? saveYoutubeLink(sharedText, sharedYouTube.isShort ? 'short' : 'video')
        : xLinkFromText(sharedText)
          ? saveXLink(sharedText, 'share')
          : spotifyLinkFromText(sharedText)
            ? saveSpotifyLink(sharedText, 'share')
            : linkedinLinkFromText(sharedText)
            ? saveLinkedInLink(sharedText)
            : saveInstagramLink(sharedText);
    void save
      .then(async () => {
        await queryClient.invalidateQueries({ queryKey: ['items'] });
        await refreshLibrary();
        Alert.alert('Saved to PROSPOR');
      })
      .catch((err: unknown) => {
        const message = err instanceof Error ? err.message : 'This could not be saved';
        Alert.alert('Could not save', message);
      })
      .finally(() => {
        saving.current = false;
        resetShareIntent();
      });
  }, [hasShareIntent, queryClient, resetShareIntent, shareIntent.files, shareIntent.text, shareIntent.webUrl, signedIn]);

  return null;
}
