import { randomInt } from 'node:crypto';

const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function createLinkCode(nextIndex: () => number = randomIndex): string {
  let code = '';
  for (let i = 0; i < 6; i += 1) {
    code += alphabet[nextIndex() % alphabet.length];
  }
  return code;
}

export function linkCodeExpiry(now = new Date()): string {
  return new Date(now.getTime() + 10 * 60 * 1000).toISOString();
}

function randomIndex(): number {
  return randomInt(alphabet.length);
}
