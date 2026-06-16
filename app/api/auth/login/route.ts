import { cookies } from 'next/headers';
import { makeToken, AUTH_COOKIE, COOKIE_MAX_AGE } from '@/lib/auth';

export async function POST(request: Request) {
  const { password } = await request.json();
  if (password !== (process.env.PASSWORD || 'password123')) {
    return Response.json({ error: 'パスワードが違います' }, { status: 401 });
  }
  const cookieStore = await cookies();
  cookieStore.set(AUTH_COOKIE, makeToken(), {
    httpOnly: true,
    secure: true,
    sameSite: 'strict',
    maxAge: COOKIE_MAX_AGE,
    path: '/',
  });
  return Response.json({ ok: true });
}
