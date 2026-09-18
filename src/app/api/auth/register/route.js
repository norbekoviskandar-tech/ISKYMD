import { NextResponse } from 'next/server';
import { getUserByEmail, createUser, createNotification } from '@/lib/db/users.repo';
import crypto from 'crypto';
import { checkRegisterRateLimit, recordRegisterAttempt } from '@/lib/rate-limiter';

// Simple hash function (same as client-side for compatibility)
function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

export async function POST(request) {
  try {
    const { name, email, password } = await request.json();

    if (!name || !email || !password) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Get client IP for rate limiting
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || 
               request.headers.get('x-real-ip') || 
               'unknown';

    // Check rate limit
    const rateLimit = checkRegisterRateLimit(ip);
    if (!rateLimit.allowed) {
      return NextResponse.json({ error: rateLimit.message }, { status: 429 });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: 'Invalid email format' }, { status: 400 });
    }

    // Validate password length (min 8)
    if (password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
    }

    // Check if user exists
    const existing = getUserByEmail(email);
    if (existing) {
      return NextResponse.json({ error: 'User already exists' }, { status: 409 });
    }

    const passwordHash = hashPassword(password);
    const user = createUser({
      id: crypto.randomUUID(),
      name,
      email,
      passwordHash,
      role: 'student',
      isBanned: 0,
      subscriptionStatus: 'inactive',
      createdAt: new Date().toISOString(),
      stats: { attempted: 0, correct: 0, tests: 0 }
    });

    // Record the successful registration attempt
    recordRegisterAttempt(ip);

    // Notify administrators
    createNotification(
      'registration',
      `New student enrollment: ${name} (${email})`,
      user.id,
      { email, name }
    );

    // Don't send passwordHash to client
    const { passwordHash: _, ...safeUser } = user;
    return NextResponse.json(safeUser, { status: 201 });
  } catch (error) {
    console.error('Register error:', error);
    return NextResponse.json({ error: 'Registration failed' }, { status: 500 });
  }
}
