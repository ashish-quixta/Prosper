import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { supabase } from '@/supabase';

export default function HomeScreen() {
  const [supabaseStatus, setSupabaseStatus] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ error }) => {
      if (!error) setSupabaseStatus('Supabase: connected');
    });
  }, []);

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Text>Home</Text>
      {/* TODO: remove this Supabase status in Step 4 */}
      {supabaseStatus ? <Text>{supabaseStatus}</Text> : null}
    </View>
  );
}
