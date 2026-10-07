import { useEffect, useState, type ReactNode } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { OpeningScreen } from '@/components/OpeningScreen';
import { supabase } from '@/supabase';
import '../global.css';

SplashScreen.preventAutoHideAsync().catch(() => {});

const queryClient = new QueryClient();

function AuthGate({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setSignedIn(session !== null);
      setReady(true);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!ready) return;
    const onSignIn = segments[0] === 'sign-in';
    if (!signedIn && !onSignIn) router.replace('/sign-in');
    else if (signedIn && onSignIn) router.replace('/');
  }, [ready, signedIn, segments, router]);

  if (!ready) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator color="#1d4ed8" />
      </View>
    );
  }

  return children;
}

export default function RootLayout() {
  const [showIntro, setShowIntro] = useState(true);

  return (
    <View className="flex-1">
      <QueryClientProvider client={queryClient}>
        <AuthGate>
          <StatusBar style={showIntro ? 'light' : 'dark'} />
          <Stack
            screenOptions={{
              headerStyle: { backgroundColor: '#ffffff' },
              headerShadowVisible: false,
              headerTintColor: '#1d4ed8',
              headerTitleStyle: { color: '#0f172a', fontWeight: '600' },
              contentStyle: { backgroundColor: '#ffffff' },
            }}
          >
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="sign-in" options={{ headerShown: false }} />
          </Stack>
        </AuthGate>
      </QueryClientProvider>
      {showIntro ? <OpeningScreen onFinish={() => setShowIntro(false)} /> : null}
    </View>
  );
}
