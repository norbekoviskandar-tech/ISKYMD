import { NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

if (!process.env.AUTH_SECRET || process.env.AUTH_SECRET.length < 32) {
  throw new Error('AUTH_SECRET must be set and at least 32 characters long');
}

const secret = new TextEncoder().encode(process.env.AUTH_SECRET);

async function verifySession(token) {
  try {
    const { payload } = await jwtVerify(token, secret);
    return payload;
  } catch (error) {
    return null;
  }
}

export async function middleware(request) {
  const { pathname } = request.nextUrl;

  // Allow public routes
  const publicRoutes = ['/', '/auth', '/products', '/solutions', '/contact-us', '/privacy-policy', '/terms-of-use', '/refund-policy'];
  const isPublicRoute = publicRoutes.some(route => pathname === route || pathname.startsWith(route + '/'));

  // Allow auth API routes
  if (pathname.startsWith('/api/auth/')) {
    return NextResponse.next();
  }

  // Check for session cookie (basic JWT verification without DB access)
  const token = request.cookies.get('session')?.value;
  const session = token ? await verifySession(token) : null;

  // Protect /author/* pages (except /author/login)
  if ((pathname.startsWith('/author/') || pathname === '/author') && pathname !== '/author/login') {
    if (!session) {
      return NextResponse.redirect(new URL('/author/login', request.url));
    }
    if (session.role !== 'author') {
      return NextResponse.redirect(new URL('/student/dashboard', request.url));
    }
  }

  // Protect /student/* pages
  if (pathname.startsWith('/student/')) {
    if (!session) {
      return NextResponse.redirect(new URL('/auth', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
