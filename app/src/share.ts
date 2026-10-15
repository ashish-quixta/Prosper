import { useEffect, useRef, useState } from 'react';
import { Alert } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { useShareIntentContext } from 'expo-share-intent';
import { saveScreenshot } from '@/saveScreenshot';
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
    if (!file) {
      resetShareIntent();
      return;
    }

    saving.current = true;
    void saveScreenshot(file.path)
      .then(async () => {
        await queryClient.invalidateQueries({ queryKey: ['items'] });
        Alert.alert('Saved to PROSPOR');
      })
      .catch((err: unknown) => {
        const message = err instanceof Error ? err.message : 'The photo could not be saved';
        Alert.alert('Could not save', message);
      })
      .finally(() => {
        saving.current = false;
        resetShareIntent();
      });
  }, [hasShareIntent, queryClient, resetShareIntent, shareIntent.files, signedIn]);

  return null;
}
