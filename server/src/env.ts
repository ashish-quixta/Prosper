import { existsSync } from 'node:fs';
import { z } from 'zod';

if (existsSync('.env')) {
  process.loadEnvFile();
}

const EnvSchema = z.object({
  SUPABASE_URL: z.string().min(1),
  SUPABASE_SECRET_KEY: z.string().min(1),
  PORT: z.preprocess(
    (value) => (value === undefined || value === '' ? 3000 : value),
    z.coerce.number().int().positive(),
  ),
  GEMINI_API_KEY: z.string().optional(),
  GEMINI_MODEL: z.string().optional(),
  GEMINI_MODEL_LITE: z.string().optional(),
  X_BEARER_TOKEN: z.string().optional(),
  META_APP_ID: z.string().optional(),
  META_APP_SECRET: z.string().optional(),
  META_VERIFY_TOKEN: z.string().optional(),
  IG_ACCESS_TOKEN: z.string().optional(),
  EXPO_ACCESS_TOKEN: z.string().optional(),
});

const parsed = EnvSchema.safeParse(process.env);

if (!parsed.success) {
  const names = [
    ...new Set(
      parsed.error.issues
        .map((issue) => issue.path[0])
        .filter((name): name is string => typeof name === 'string'),
    ),
  ];
  console.error(`missing ${names.join(', ')}`);
  process.exit(1);
}

export const env = parsed.data;
