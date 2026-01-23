import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/middleware'
import { query as dbQuery } from '@/lib/db'

// GET - Fetch user notifications
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request)
    
    if (!user) {
      console.log('Notifications API: No authenticated user found')
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    console.log('Notifications API: Fetching for user ID:', user.id)

    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '20')
    const unreadOnly = searchParams.get('unread') === 'true'

    let sqlQuery = `
      SELECT id, title, message, type, "read", link, metadata, created_at
      FROM notifications
      WHERE user_id = $1
    `
    
    if (unreadOnly) {
      sqlQuery += ` AND "read" = FALSE`
    }
    
    sqlQuery += ` ORDER BY created_at DESC LIMIT $2`

    const result = await dbQuery(sqlQuery, [user.id, limit])
    console.log('Notifications API: Found', result.rows.length, 'notifications')

    // Get unread count
    const unreadResult = await dbQuery(
      'SELECT COUNT(*) as count FROM notifications WHERE user_id = $1 AND "read" = FALSE',
      [user.id]
    )

    return NextResponse.json({
      success: true,
      notifications: result.rows.map((n: any) => ({
        ...n,
        time: getRelativeTime(n.created_at)
      })),
      unreadCount: parseInt(unreadResult.rows[0].count)
    })

  } catch (error: any) {
    console.error('Failed to fetch notifications:', error)
    console.error('Error details:', error.message)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch notifications', details: error.message },
      { status: 500 }
    )
  }
}

// Helper function to get relative time
function getRelativeTime(date: Date): string {
  const now = new Date()
  const notificationDate = new Date(date)
  const diffMs = now.getTime() - notificationDate.getTime()
  const diffSecs = Math.floor(diffMs / 1000)
  const diffMins = Math.floor(diffSecs / 60)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)
  const diffWeeks = Math.floor(diffDays / 7)
  const diffMonths = Math.floor(diffDays / 30)

  if (diffSecs < 60) return 'Just now'
  if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays} days ago`
  if (diffWeeks === 1) return '1 week ago'
  if (diffWeeks < 4) return `${diffWeeks} weeks ago`
  if (diffMonths === 1) return '1 month ago'
  if (diffMonths < 12) return `${diffMonths} months ago`
  
  // Format as readable date for older notifications
  return notificationDate.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: notificationDate.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
  })
}
