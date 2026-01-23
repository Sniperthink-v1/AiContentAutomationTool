import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/middleware'
import pool from '@/lib/db'

// POST - Create a new notification (admin/system use)
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request)
    
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { title, message, type, link, metadata } = await request.json()

    if (!title || !message) {
      return NextResponse.json(
        { success: false, error: 'Title and message are required' },
        { status: 400 }
      )
    }

    try {
      await pool.query(
        `INSERT INTO notifications (user_id, title, message, type, link, metadata)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [user.id, title, message, type || 'info', link || null, metadata ? JSON.stringify(metadata) : null]
      )
      return NextResponse.json({ success: true, message: 'Notification created' })
    } catch (dbError) {
      console.error('DB Error:', dbError)
      return NextResponse.json(
        { success: false, error: 'Failed to create notification' },
        { status: 500 }
      )
    }

  } catch (error) {
    console.error('Failed to create notification:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create notification' },
      { status: 500 }
    )
  }
}
