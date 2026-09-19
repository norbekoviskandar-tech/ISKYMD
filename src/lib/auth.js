import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { getUserById } from './db/users.repo';
import { NextResponse } from 'next/server';

if (!process.env.AUTH_SECRET || process.env.AUTH_SECRET.length < 32) {
  throw new Error('AUTH_SECRET must be set and at least 32 characters long');
}

const secret = new TextEncoder().encode(process.env.AUTH_SECRET);

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
  const cookieStore = await cookies();
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

export async function getSessionFromToken(token) {
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

export async function requireUser() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return session;
}

export async function requireRole(requiredRole) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  if (session.role !== requiredRole) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  
  return session;
}

export async function requireAdmin(request) {
  return requireRole('author');
}

export async function requireSubscription(productId = null) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  // Authors are exempt from subscription requirement
  if (session.role === 'author') {
    return session;
  }
  
  // Query subscriptions table for active subscription
  const { queryOne } = await import('./pg');
  const now = new Date().toISOString();
  
  let query = `
    SELECT * FROM "subscriptions"
    WHERE "userId" = $1 AND status = 'active' AND "expiresAt" > $2
  `;
  const params = [session.userId, now];
  
  if (productId) {
    query += ` AND ("packageId" = $3 OR "productId" = $3)`;
    params.push(String(productId));
  }
  
  const subscription = await queryOne(query, params);
  
  if (!subscription) {
    return NextResponse.json({ error: 'Active subscription required' }, { status: 403 });
  }
  
  return session;
}
