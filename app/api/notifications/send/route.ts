import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/middleware'
import { sendNotification } from '@/lib/notifications'

// POST - Send a notification for the current user
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

    if (!title || !message || !type) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: title, message, type' },
        { status: 400 }
      )
    }

    const success = await sendNotification({
      userId: user.id,  // user.id is already a UUID string
      title,
      message,
      type,
      link,
      metadata
    })

    if (success) {
      return NextResponse.json({ success: true })
    } else {
      return NextResponse.json(
        { success: false, error: 'Failed to send notification' },
        { status: 500 }
      )
    }

  } catch (error: any) {
    console.error('Send notification error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to send notification', details: error.message },
      { status: 500 }
    )
  }
}
