import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { supabase } from '@/supabase';

export default function SettingsScreen() {
  const [error, setError] = useState<string | null>(null);

  async function signOut() {
    setError(null);
    try {
      const { GoogleSignin } = await import('@react-native-google-signin/google-signin');
      await GoogleSignin.signOut();
    } catch {
      // No Google session on this device.
    }
    const { error: authError } = await supabase.auth.signOut();
    if (authError) setError(authError.message);
  }

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <Text style={{ fontSize: 24, marginBottom: 24 }}>Settings</Text>
      <Pressable
        onPress={signOut}
        style={{ backgroundColor: '#111', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 8 }}
      >
        <Text style={{ color: '#fff' }}>Sign out</Text>
      </Pressable>
      {error ? <Text style={{ color: '#b00020', marginTop: 16, textAlign: 'center' }}>{error}</Text> : null}
    </View>
  );
}
