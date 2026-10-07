import { useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { createInstagramCode } from '@/api';
import { supabase } from '@/supabase';

export default function SettingsScreen() {
  const [error, setError] = useState<string | null>(null);
  const [code, setCode] = useState<string | null>(null);
  const [codeError, setCodeError] = useState<string | null>(null);
  const [creatingCode, setCreatingCode] = useState(false);
  const [copied, setCopied] = useState(false);

  async function connectInstagram() {
    setCreatingCode(true);
    setCodeError(null);
    setCopied(false);
    try {
      const created = await createInstagramCode();
      setCode(created.code);
    } catch (err) {
      setCode(null);
      setCodeError(err instanceof Error ? err.message : 'Could not create a code');
    } finally {
      setCreatingCode(false);
    }
  }

  async function copyCode() {
    if (!code) return;
    try {
      const Clipboard = await import('expo-clipboard');
      await Clipboard.setStringAsync(code);
      setCopied(true);
    } catch {
      setCodeError('Press and hold the code to copy it.');
    }
  }

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
    <View className="flex-1 bg-blue-50 px-5 pt-6">
      <View className="mb-4 rounded-3xl bg-white p-5">
        <View className="mb-4 h-12 w-12 items-center justify-center rounded-2xl bg-blue-50">
          <Ionicons name="logo-instagram" size={24} color="#1d4ed8" />
        </View>
        <Text className="text-lg font-semibold text-slate-900">Connect Instagram</Text>
        <Text className="mt-1 text-base leading-6 text-slate-500">
          Send this code in a message to get.prospor.ai. It expires in 10 minutes.
        </Text>
        {code ? (
          <Text selectable className="mt-5 text-center text-3xl font-semibold tracking-widest text-slate-900">
            {code}
          </Text>
        ) : null}
        <Pressable
          onPress={code ? copyCode : connectInstagram}
          disabled={creatingCode}
          className="mt-5 items-center rounded-2xl border-2 border-blue-700 bg-white py-3.5 active:bg-blue-50 disabled:opacity-70"
        >
          {creatingCode ? (
            <ActivityIndicator color="#1d4ed8" />
          ) : (
            <Text className="text-base font-semibold text-blue-700">
              {code ? (copied ? 'Copied' : 'Copy code') : 'Get a code'}
            </Text>
          )}
        </Pressable>
        {code ? (
          <Pressable onPress={connectInstagram} disabled={creatingCode} className="mt-3 items-center py-2">
            <Text className="text-sm font-medium text-slate-500">Get a new code</Text>
          </Pressable>
        ) : null}
        {codeError ? <Text className="mt-4 text-center text-sm text-red-700">{codeError}</Text> : null}
      </View>
      <View className="rounded-3xl bg-white p-5">
        <View className="mb-4 h-12 w-12 items-center justify-center rounded-2xl bg-blue-50">
          <Ionicons name="person-outline" size={24} color="#1d4ed8" />
        </View>
        <Text className="text-lg font-semibold text-slate-900">Account</Text>
        <Text className="mt-1 text-base leading-6 text-slate-500">Signed in with Google.</Text>
        <Pressable
          onPress={signOut}
          className="mt-5 items-center rounded-2xl bg-blue-700 py-3.5 active:bg-blue-800"
        >
          <Text className="text-base font-semibold text-white">Sign out</Text>
        </Pressable>
        {error ? <Text className="mt-4 text-center text-sm text-red-700">{error}</Text> : null}
      </View>
    </View>
  );
}
