export class PermanentError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PermanentError';
  }
}

export class WebPageError extends PermanentError {
  constructor(message: string) {
    super(message);
    this.name = 'WebPageError';
  }
}

export function isPermanent(err: unknown): boolean {
  return err instanceof PermanentError;
}

export function failureStatus(attempts: number, err: unknown): 'saving' | 'failed' {
  if (isPermanent(err) || attempts >= 3) return 'failed';
  return 'saving';
}

export function errorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  return String(err);
}

export const CAPTION_ONLY_REASON = 'The video file was not included, so this summary is from the caption only.';

export function reelFallback(err: unknown, caption: string | null): 'caption' | 'fail' {
  if (!(err instanceof WebPageError)) return 'fail';
  if (!caption?.trim()) return 'fail';
  return 'caption';
}

export function limitedCaptionReason(missingReason: string | null): string {
  const extra = missingReason?.trim();
  if (!extra || extra === CAPTION_ONLY_REASON) return CAPTION_ONLY_REASON;
  return `${CAPTION_ONLY_REASON} ${extra}`;
}
