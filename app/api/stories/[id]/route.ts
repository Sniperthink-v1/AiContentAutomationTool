import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/db'
import { getAuthUser } from '@/lib/middleware'

// Delete a story
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Get authenticated user
    const user = await getAuthUser(request)
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { id } = await params

    // Delete only if story belongs to the user
    const result = await pool.query(
      'DELETE FROM stories WHERE id = $1 AND user_id = $2 RETURNING *',
      [id, user.id]
    )

    if (result.rowCount === 0) {
      return NextResponse.json(
        { success: false, error: 'Story not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Story deleted successfully'
    })
  } catch (error: any) {
    console.error('Error deleting story:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to delete story', details: error.message },
      { status: 500 }
    )
  }
}

// Update a story
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Get authenticated user
    const user = await getAuthUser(request)
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { id } = await params
    const body = await request.json()
    const { scheduledTime, status, caption } = body

    const updates: string[] = []
    const values: any[] = []
    let paramCount = 1

    if (scheduledTime) {
      updates.push(`scheduled_time = $${paramCount++}`)
      values.push(scheduledTime)
    }
    if (status) {
      updates.push(`status = $${paramCount++}`)
      values.push(status)
    }
    if (caption !== undefined) {
      updates.push(`caption = $${paramCount++}`)
      values.push(caption)
    }

    if (updates.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No fields to update' },
        { status: 400 }
      )
    }

    values.push(id)
    values.push(user.id)
    const query = `UPDATE stories SET ${updates.join(', ')} WHERE id = $${paramCount} AND user_id = $${paramCount + 1} RETURNING *`

    const result = await pool.query(query, values)

    if (result.rowCount === 0) {
      return NextResponse.json(
        { success: false, error: 'Story not found' },
        { status: 404 }
      )
    }

    const story = result.rows[0]

    return NextResponse.json({
      success: true,
      story: {
        id: story.id,
        type: story.type,
        url: story.url,
        thumbnail: story.thumbnail,
        scheduledTime: story.scheduled_time,
        status: story.status,
        duration: story.duration,
        caption: story.caption,
        stickers: story.stickers,
        createdAt: story.created_at
      }
    })
  } catch (error: any) {
    console.error('Error updating story:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update story', details: error.message },
      { status: 500 }
    )
  }
}
