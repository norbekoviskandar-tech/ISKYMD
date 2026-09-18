import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { getUserById } from './db/users.repo';
import { NextResponse } from 'next/server';

const secret = new TextEncoder().encode(process.env.AUTH_SECRET || 'fallback-secret-change-in-production');

export async function createSession(userId, role) {
  const token = await new SignJWT({ userId, role })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(secret);

  return token;
}

export async function verifySession(token) {
  try {
    const { payload } = await jwtVerify(token, secret);
    return payload;
  } catch (error) {
    return null;
  }
}

export async function getSession(request) {
  const cookieStore = cookies();
  const token = cookieStore.get('session')?.value;
  
  if (!token) {
    return null;
  }

  const payload = await verifySession(token);
  if (!payload) {
    return null;
  }

  // Re-read user from database to get current role and isBanned status
  const user = await getUserById(payload.userId);
  if (!user || user.isBanned) {
    return null;
  }

  return {
    userId: user.id,
    role: user.role,
    email: user.email,
    name: user.name,
  };
}

export async function requireUser(request) {
  const session = await getSession(request);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return session;
}

export async function requireRole(request, requiredRole) {
  const session = await getSession(request);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  if (session.role !== requiredRole) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  
  return session;
}

export async function requireAdmin(request) {
  return requireRole(request, 'admin');
}
