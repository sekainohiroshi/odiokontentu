import { createHmac, timingSafeEqual } from 'crypto';

const getPassword = () => process.env.PASSWORD || 'password123';
const getSecret = () => process.env.SESSION_SECRET || 'default-secret-key';

export function makeToken(): string {
  return createHmac('sha256', getSecret()).update(getPassword()).digest('hex');
}

export function verifyToken(token: string | undefined): boolean {
  if (!token) return false;
  try {
    const expected = makeToken();
    return (
      token.length === expected.length &&
      timingSafeEqual(Buffer.from(token, 'hex'), Buffer.from(expected, 'hex'))
    );
  } catch {
    return false;
  }
}

export const AUTH_COOKIE = 'auth';
export const COOKIE_MAX_AGE = 7 * 24 * 60 * 60;
