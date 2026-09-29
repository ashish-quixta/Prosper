import express, { type NextFunction, type Request, type Response } from 'express';
import { env } from './env';
import { healthRouter } from './routes/health';

const app = express();

app.use(
  express.json({
    verify: (req, _res, buf) => {
      (req as Request).rawBody = buf;
    },
  }),
);

app.use(healthRouter);

app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  const message = err instanceof Error ? err.message : 'Internal server error';
  console.error(err);
  res.status(500).json({ code: 'internal_error', message });
});

app.listen(env.PORT, () => {
  console.log(`listening on ${env.PORT}`);
});
