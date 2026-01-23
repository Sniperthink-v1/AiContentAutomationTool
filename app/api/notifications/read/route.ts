import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/middleware'
import { query as dbQuery } from '@/lib/db'

// POST - Mark notification(s) as read
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request)
    
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { notificationId, markAll } = await request.json()

    if (markAll) {
      // Mark all notifications as read
      await dbQuery(
        'UPDATE notifications SET "read" = TRUE WHERE user_id = $1 AND "read" = FALSE',
        [user.id]
      )
      return NextResponse.json({ success: true, message: 'All notifications marked as read' })
    }

    if (notificationId) {
      // Mark single notification as read
      await dbQuery(
        'UPDATE notifications SET "read" = TRUE WHERE id = $1 AND user_id = $2',
        [notificationId, user.id]
      )
      return NextResponse.json({ success: true, message: 'Notification marked as read' })
    }

    return NextResponse.json(
      { success: false, error: 'No notification specified' },
      { status: 400 }
    )

  } catch (error) {
    console.error('Failed to mark notification as read:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update notification' },
      { status: 500 }
    )
  }
}
