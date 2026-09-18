import { NextResponse } from 'next/server';
import { getNotifications, markNotificationRead } from '@/lib/db/users.repo';
import { requireUser } from '@/lib/auth';

export async function GET(request) {
  const auth = await requireUser();
  if (auth instanceof NextResponse) return auth;

  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const onlyUnread = searchParams.get('unread') === 'true';
    
    // Users can only see their own notifications
    const notifications = await getNotifications(auth.userId, limit, onlyUnread);
    return NextResponse.json(notifications);
  } catch (error) {
    console.error('API: Get notifications error:', error);
    return NextResponse.json({ error: 'Failed to fetch notifications' }, { status: 500 });
  }
}

export async function PUT(request) {
  const auth = await requireUser();
  if (auth instanceof NextResponse) return auth;

  try {
    const { id } = await request.json();
    if (!id) return NextResponse.json({ error: 'Notification ID required' }, { status: 400 });
    
    // Verify notification belongs to user
    const { getNotificationById } = await import('@/lib/db/users.repo');
    const notification = await getNotificationById(id);
    if (notification && notification.userId !== auth.userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    const success = await markNotificationRead(id);
    return NextResponse.json({ success });
  } catch (error) {
    console.error('API: Update notification error:', error);
    return NextResponse.json({ error: 'Failed to update notification' }, { status: 500 });
  }
}
