import { NextResponse } from 'next/server';
import { getAllUsers, getUserById, updateUser, deleteUser, createNotification } from '@/lib/db/users.repo';
import { requireAdmin, requireUser } from '@/lib/auth';

// GET /api/users - Get all users or single user by id (admin only)
export async function GET(request) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (id) {
      const user = await getUserById(id);
      if (!user) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }
      const { passwordHash: _, ...safeUser } = user;
      return NextResponse.json(safeUser);
    }
    
    const users = (await getAllUsers()).map(({ passwordHash: _, ...user }) => user);
    return NextResponse.json(users);
  } catch (error) {
    console.error('Get users error:', error);
    return NextResponse.json({ error: 'Failed to get users' }, { status: 500 });
  }
}

// PUT /api/users - Update a user
export async function PUT(request) {
  const updates = await request.json();
  
  if (!updates.id) {
    return NextResponse.json({ error: 'User id required' }, { status: 400 });
  }
  
  const auth = await requireUser();
  if (auth instanceof NextResponse) return auth;
  
  // Non-admins can only update their own profile
  if (auth.role !== 'author' && auth.userId !== updates.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  
  // Fetch existing user
  const existingUser = await getUserById(updates.id);
  if (!existingUser) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  // Non-admins can only change specific fields
  if (auth.role !== 'author') {
    const allowedFields = ['name', 'profile'];
    const restrictedFields = ['role', 'isBanned', 'passwordHash', 'subscriptionStatus', 'subscriptionExpiry', 'activatedByPurchase', 'stats'];
    
    for (const field of restrictedFields) {
      if (updates[field] !== undefined && updates[field] !== existingUser[field]) {
        return NextResponse.json({ error: 'Forbidden: Cannot modify ' + field }, { status: 403 });
      }
    }
  }

  // Merge updates into existing user
  const updatedUser = {
    ...existingUser,
    ...updates,
    // Ensure we don't accidentally unset stats if not provided
    stats: updates.stats || existingUser.stats
  };

  // Detect purchase activation (admin only)
  if (auth.role === 'author' && updates.activatedByPurchase && !existingUser.activatedByPurchase) {
      await createNotification(
          'purchase',
          `Subscription activated: ${existingUser.name} (${existingUser.email})`,
          existingUser.id,
          { email: existingUser.email, name: existingUser.name, type: 'paid' }
      );
  }
  
  try {
    const saved = await updateUser(updatedUser);
    const { passwordHash: _, ...safeUser } = saved;
    return NextResponse.json(safeUser);
  } catch (dbError) {
    console.error('API: Database update error:', dbError);
    return NextResponse.json({ error: 'Database update failed', details: dbError.message }, { status: 500 });
  }
}

// DELETE /api/users - Delete a user (admin only)
export async function DELETE(request) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  try {
    const { id } = await request.json();
    
    if (!id) {
      return NextResponse.json({ error: 'User id required' }, { status: 400 });
    }
    
    try {
      const result = await deleteUser(id);
      return NextResponse.json({ success: true, message: 'User permanently deleted' });
    } catch (dbError) {
      console.error('Delete user DB error:', dbError);
      return NextResponse.json({ error: dbError.message || 'Failed to delete user from database' }, { status: 500 });
    }
  } catch (error) {
    console.error('Delete user error:', error);
    return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 });
  }
}
