import type { NextFunction, Request, Response } from 'express';
import { supabase } from './supabase';

declare global {
  namespace Express {
    interface Request {
      userId?: string;
      rawBody?: Buffer;
    }
  }
}

export async function requireUser(req: Request, res: Response, next: NextFunction): Promise<void> {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) {
    res.status(401).json({ code: 'unauthorized', message: 'Sign in again' });
    return;
  }

  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) {
    res.status(401).json({ code: 'unauthorized', message: 'Sign in again' });
    return;
  }

  req.userId = data.user.id;
  next();
}
