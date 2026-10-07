import { z } from 'zod';
import { supabase } from '@/supabase';

const LinkCodeResponse = z.object({
  code: z.string().regex(/^[A-Z2-9]{6}$/),
  expiresAt: z.string().min(1),
});

const ErrorResponse = z.object({
  message: z.string(),
});

export async function createInstagramCode(): Promise<{ code: string; expiresAt: string }> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error('Sign in again');

  const serverUrl = process.env.EXPO_PUBLIC_SERVER_URL?.replace(/\/$/, '');
  if (!serverUrl) throw new Error('Server address is missing');

  const response = await fetch(`${serverUrl}/instagram/code`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  const body: unknown = await response.json();
  if (!response.ok) {
    const parsed = ErrorResponse.safeParse(body);
    throw new Error(parsed.success ? parsed.data.message : 'Could not create a code');
  }
  return LinkCodeResponse.parse(body);
}
