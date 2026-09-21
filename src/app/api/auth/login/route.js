import { NextResponse } from 'next/server';
import { getUserByEmail, updateUserPasswordHash } from '@/lib/db/users.repo';
import { hashPassword, verifyPassword } from '@/lib/password';
import { createSession } from '@/lib/auth';
import { cookies } from 'next/headers';
import { checkLoginRateLimit, recordFailedLogin, resetLoginAttempts } from '@/lib/rate-limiter';

export async function POST(request) {
  try {
    const { email: rawEmail, password } = await request.json();
    const email = rawEmail?.trim();

    if (!email || !password) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 400 });
    }

    // Get client IP for rate limiting
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || 
               request.headers.get('x-real-ip') || 
               'unknown';

    // Check rate limit
    const rateLimit = checkLoginRateLimit(email, ip);
    if (!rateLimit.allowed) {
      return NextResponse.json({ error: rateLimit.message }, { status: 429 });
    }

    const user = await getUserByEmail(email);
    
    if (!user) {
      recordFailedLogin(email, ip);
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    const { valid, needsUpgrade } = await verifyPassword(password, user.passwordHash);
    if (!valid) {
      recordFailedLogin(email, ip);
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    // Upgrade old unsalted SHA-256 hashes to scrypt on successful login
    if (needsUpgrade) {
      try {
        await updateUserPasswordHash(user.id, await hashPassword(password));
      } catch (upgradeError) {
        console.error('Password hash upgrade failed:', upgradeError);
      }
    }

    if (user.isBanned) {
      return NextResponse.json({ error: 'Access Denied: Account Suspended' }, { status: 403 });
    }

    // Reset rate limit on successful login
    resetLoginAttempts(email, ip);

    // Create JWT session
    const token = await createSession(user.id, user.role);
    
    // Set httpOnly, Secure, SameSite=Lax cookie
    const cookieStore = await cookies();
    cookieStore.set('session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
    });

    // Don't send passwordHash to client
    const { passwordHash: _, ...safeUser } = user;
    return NextResponse.json(safeUser);
  } catch (error) {
    console.error('Login error:', error);
    const isDev = process.env.NODE_ENV !== 'production';
    return NextResponse.json(
      { error: 'Login failed', ...(isDev && { detail: error.message }) },
      { status: 500 }
    );
  }
}
