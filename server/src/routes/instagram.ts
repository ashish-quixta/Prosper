import { Router } from 'express';
import { requireUser } from '../auth';
import { env } from '../env';
import { processInstagramWebhook } from '../instagramHandle';
import { signatureIsValid, subscriptionChallenge } from '../instagramWebhook';
import { createLinkCode, linkCodeExpiry } from '../linkCode';
import { supabase } from '../supabase';

export const instagramRouter = Router();

instagramRouter.get('/webhooks/instagram', (req, res) => {
  if (!env.META_VERIFY_TOKEN) {
    console.error('missing META_VERIFY_TOKEN');
    res.sendStatus(403);
    return;
  }

  const challenge = subscriptionChallenge(req.query, env.META_VERIFY_TOKEN);
  if (!challenge) {
    res.sendStatus(403);
    return;
  }

  res.status(200).type('text/plain').send(challenge);
});

instagramRouter.post('/webhooks/instagram', (req, res) => {
  if (!env.META_APP_SECRET) {
    console.error('missing META_APP_SECRET');
    res.sendStatus(403);
    return;
  }
  if (!req.rawBody || !signatureIsValid(req.rawBody, env.META_APP_SECRET, req.get('x-hub-signature-256'))) {
    res.sendStatus(403);
    return;
  }

  res.sendStatus(200);
  void processInstagramWebhook(req.body).catch((err: unknown) => {
    console.error('instagram webhook failed', err);
  });
});

instagramRouter.post('/instagram/code', requireUser, async (req, res) => {
  const userId = req.userId;
  if (!userId) {
    res.status(401).json({ code: 'unauthorized', message: 'Sign in again' });
    return;
  }

  try {
    const created = await insertLinkCode(userId);
    res.json(created);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not create a code';
    console.error('link code insert failed', { userId, message });
    res.status(500).json({ code: 'internal_error', message: 'Could not create a code' });
  }
});

async function insertLinkCode(userId: string): Promise<{ code: string; expiresAt: string }> {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const code = createLinkCode();
    const expiresAt = linkCodeExpiry();
    const { error } = await supabase.from('link_codes').insert({
      code,
      user_id: userId,
      expires_at: expiresAt,
    });
    if (!error) return { code, expiresAt };
    if (error.code !== '23505') throw new Error(error.message);
  }
  throw new Error('Could not create a code');
}
