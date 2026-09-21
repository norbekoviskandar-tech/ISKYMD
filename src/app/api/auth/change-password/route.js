import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import { getUserById, updateUserPasswordHash } from '@/lib/db/users.repo';
import { hashPassword, verifyPassword } from '@/lib/password';
import { checkLoginRateLimit, recordFailedLogin, resetLoginAttempts } from '@/lib/rate-limiter';

// POST /api/auth/change-password
// Body: { currentPassword, newPassword } - always applies to the logged-in user.
export async function POST(request) {
  const auth = await requireUser();
  if (auth instanceof NextResponse) return auth;

  try {
    const { currentPassword, newPassword } = await request.json();

    if (!currentPassword || !newPassword) {
      return NextResponse.json({ error: 'Current and new password are required' }, { status: 400 });
    }
    if (typeof newPassword !== 'string' || newPassword.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
    }

    const user = await getUserById(auth.userId);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const ip = request.headers.get('x-forwarded-for')?.split(',')[0] ||
               request.headers.get('x-real-ip') ||
               'unknown';

    const rateLimit = checkLoginRateLimit(user.email, ip);
    if (!rateLimit.allowed) {
      return NextResponse.json({ error: rateLimit.message }, { status: 429 });
    }

    const { valid } = await verifyPassword(currentPassword, user.passwordHash);
    if (!valid) {
      recordFailedLogin(user.email, ip);
      return NextResponse.json({ error: 'Current password incorrect' }, { status: 401 });
    }

    resetLoginAttempts(user.email, ip);
    await updateUserPasswordHash(user.id, await hashPassword(newPassword));
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Change password error:', error);
    return NextResponse.json({ error: 'Failed to change password' }, { status: 500 });
  }
}
