import { useState } from 'react';
import { ActivityIndicator, Image, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '@/supabase';

const WEB_CLIENT_ID = '1054808966862-j6rcnlo4dtciqq7cq0aoqgtu883han07.apps.googleusercontent.com';

export default function SignInScreen() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function signInWithGoogle() {
    setLoading(true);
    setError(null);
    try {
      const { GoogleSignin } = await import('@react-native-google-signin/google-signin');
      GoogleSignin.configure({ webClientId: WEB_CLIENT_ID });
      await GoogleSignin.hasPlayServices();
      const response = await GoogleSignin.signIn();
      if (response.type !== 'success') return;

      const idToken = response.data.idToken;
      if (!idToken) {
        setError('Google did not return a sign-in token. Try again.');
        return;
      }

      const { error: authError } = await supabase.auth.signInWithIdToken({
        provider: 'google',
        token: idToken,
      });
      if (authError) setError(authError.message);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not sign in with Google.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#ffffff' }}>
      <View className="flex-1 justify-center px-6">
        <Pressable
          onPress={signInWithGoogle}
          disabled={loading}
          className="h-14 flex-row items-center justify-center rounded-2xl border-2 border-blue-700 bg-white active:bg-blue-50 disabled:opacity-70"
          style={{
            shadowColor: '#1d4ed8',
            shadowOpacity: 0.08,
            shadowRadius: 16,
            shadowOffset: { width: 0, height: 8 },
            elevation: 2,
          }}
        >
          {loading ? (
            <ActivityIndicator color="#1d4ed8" />
          ) : (
            <>
              <Image
                source={require('../assets/images/google-logo.png')}
                style={{ width: 22, height: 22 }}
                accessibilityIgnoresInvertColors
              />
              <Text className="ml-3 text-base font-semibold text-slate-800">Continue with Google</Text>
            </>
          )}
        </Pressable>
        {error ? <Text className="mt-4 text-center text-sm text-red-700">{error}</Text> : null}
      </View>
    </SafeAreaView>
  );
}
