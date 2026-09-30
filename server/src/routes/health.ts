import { Router } from 'express';
import { supabase } from '../supabase';

export const healthRouter = Router();

healthRouter.get('/health', async (_req, res) => {
  const { error } = await supabase.from('items').select('id').limit(1);
  if (error) {
    res.status(500).json({ ok: false, db: 'error', message: error.message });
    return;
  }
  res.json({ ok: true, db: 'ok' });
});
