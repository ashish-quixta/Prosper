import express from 'express';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Server } from 'node:http';
import { healthRouter } from '../routes/health';

describe('GET /health', () => {
  let server: Server;
  let url: string;

  beforeAll(async () => {
    const app = express();
    app.use(healthRouter);
    server = app.listen(0);
    await new Promise<void>((resolve) => server.once('listening', resolve));
    const address = server.address();
    if (!address || typeof address === 'string') {
      throw new Error('test server did not bind a port');
    }
    url = `http://127.0.0.1:${address.port}/health`;
  });

  afterAll(async () => {
    await new Promise<void>((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });
  });

  it('returns ok', async () => {
    const response = await fetch(url);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true, db: 'ok' });
  });
});
