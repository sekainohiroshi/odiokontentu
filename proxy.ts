import { NextRequest, NextResponse } from 'next/server';

async function verifyToken(token: string | undefined): Promise<boolean> {
  if (!token) return false;
  try {
    const secret = process.env.SESSION_SECRET || 'default-secret-key';
    const password = process.env.PASSWORD || 'password123';
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(password));
    const expected = Array.from(new Uint8Array(sig))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
    return token === expected;
  } catch {
    return false;
  }
}

const PROTECTED = ['/app', '/admin', '/api/courses', '/api/config'];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isProtected = PROTECTED.some((p) => pathname.startsWith(p));
  if (!isProtected) return NextResponse.next();

  const token = request.cookies.get('auth')?.value;
  if (!(await verifyToken(token))) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/app/:path*', '/admin/:path*', '/api/courses/:path*', '/api/config'],
};
