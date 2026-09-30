import { useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
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
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <Text style={{ fontSize: 24, marginBottom: 24 }}>Sign in</Text>
      <Pressable
        onPress={signInWithGoogle}
        disabled={loading}
        style={{ backgroundColor: '#111', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 8 }}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={{ color: '#fff' }}>Continue with Google</Text>
        )}
      </Pressable>
      {error ? <Text style={{ color: '#b00020', marginTop: 16, textAlign: 'center' }}>{error}</Text> : null}
    </View>
  );
}
