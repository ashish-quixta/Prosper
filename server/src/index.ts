import express, { type NextFunction, type Request, type Response } from 'express';
import { env } from './env';
import { healthRouter } from './routes/health';
import { instagramRouter } from './routes/instagram';
import { legalRouter } from './routes/legal';
import { startWorker } from './worker/loop';

const app = express();

app.use(
  express.json({
    verify: (req, _res, buf) => {
      (req as Request).rawBody = buf;
    },
  }),
);

app.use(healthRouter);
app.use(legalRouter);
app.use(instagramRouter);

app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  const message = err instanceof Error ? err.message : 'Internal server error';
  console.error(err);
  res.status(500).json({ code: 'internal_error', message });
});

const missingInstagram = (['META_APP_SECRET', 'META_VERIFY_TOKEN', 'IG_ACCESS_TOKEN'] as const).filter(
  (name) => !env[name],
);
if (missingInstagram.length > 0) {
  console.error(`missing ${missingInstagram.join(', ')}`);
}

const missingGemini = (['GEMINI_API_KEY', 'GEMINI_MODEL', 'GEMINI_MODEL_LITE'] as const).filter((name) => !env[name]);
if (missingGemini.length > 0) {
  console.error(`missing ${missingGemini.join(', ')}`);
}

app.listen(env.PORT, () => {
  console.log(`listening on ${env.PORT}`);
  startWorker();
});
