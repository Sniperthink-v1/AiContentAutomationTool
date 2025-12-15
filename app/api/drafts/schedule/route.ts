import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { getAuthUser } from '@/lib/middleware'

export async function POST(request: NextRequest) {
  try {
    // Get authenticated user
    const user = await getAuthUser(request)
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { draftId, scheduledDate } = body

    if (!draftId || !scheduledDate) {
      return NextResponse.json(
        { success: false, error: 'Draft ID and scheduled date are required' },
        { status: 400 }
      )
    }

    // Update draft with scheduled date - only if owned by user
    const result = await query(
      `UPDATE drafts 
       SET scheduled_date = $1, status = $2, updated_at = NOW()
       WHERE id = $3 AND user_id = $4
       RETURNING id`,
      [scheduledDate, 'scheduled', draftId, user.id]
    )

    if (result.rowCount === 0) {
      return NextResponse.json(
        { success: false, error: 'Draft not found or not authorized' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Post scheduled successfully'
    })

  } catch (error) {
    console.error('Schedule post error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to schedule post',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    // Get authenticated user
    const user = await getAuthUser(request)
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') || 'scheduled'

    // Get scheduled posts - only for this user
    const result = await query(
      `SELECT * FROM drafts 
       WHERE status = $1 AND user_id = $2
       ORDER BY scheduled_date ASC`,
      [status, user.id]
    )

    return NextResponse.json({
      success: true,
      posts: result.rows,
      count: result.rows.length
    })

  } catch (error) {
    console.error('Get scheduled posts error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to get scheduled posts',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
