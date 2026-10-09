import { supabase } from '../supabase';
import { markItemFailed, processItem, type ClaimedItem } from './process';

const STUCK_MS = 10 * 60 * 1000;
const RESET_EVERY_MS = 60 * 1000;

let working = false;
let lastStuckReset = 0;

export function startWorker(): void {
  setInterval(() => {
    void tick();
  }, 3000);
}

async function tick(): Promise<void> {
  if (working) return;
  working = true;
  try {
    await releaseStuck();
    const { data, error } = await supabase.rpc('claim_items', { max_items: 5 });
    if (error) {
      console.error('claim items failed', error.message);
      return;
    }

    const items = Array.isArray(data) ? (data as ClaimedItem[]) : [];
    for (const item of items) {
      try {
        await processItem(item);
      } catch (err) {
        await markItemFailed(item, err);
      }
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('worker tick failed', message);
  } finally {
    working = false;
  }
}

async function releaseStuck(): Promise<void> {
  const now = Date.now();
  if (now - lastStuckReset < RESET_EVERY_MS) return;
  lastStuckReset = now;

  const cutoff = new Date(now - STUCK_MS).toISOString();
  const { error } = await supabase.from('items').update({ status: 'saving' }).eq('status', 'summarising').lt('updated_at', cutoff);
  if (error) console.error('stuck item reset failed', error.message);
}
