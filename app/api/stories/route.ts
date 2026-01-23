import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/db'
import { getAuthUser } from '@/lib/middleware'

// Save a new story
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
    const { 
      type,
      url,
      thumbnail,
      scheduledTime,
      status = 'scheduled',
      duration = 5,
      caption,
      stickers
    } = body

    if (!type || !url || !scheduledTime) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const userId = user.id

    const result = await pool.query(
      `INSERT INTO stories (user_id, type, url, thumbnail, scheduled_time, status, duration, caption, stickers)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [userId, type, url, thumbnail, scheduledTime, status, duration, caption, stickers ? JSON.stringify(stickers) : null]
    )

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
    console.error('Error saving story:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to save story', details: error.message },
      { status: 500 }
    )
  }
}

// Get all stories
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
    const status = searchParams.get('status')

    const userId = user.id

    let query = 'SELECT * FROM stories WHERE user_id = $1'
    const params: any[] = [userId]

    if (status) {
      query += ' AND status = $2'
      params.push(status)
    }

    query += ' ORDER BY scheduled_time DESC'

    const result = await pool.query(query, params)

    const stories = result.rows.map(story => ({
      id: story.id,
      type: story.type,
      url: story.url,
      thumbnail: story.thumbnail,
      scheduledTime: story.scheduled_time,
      status: story.status,
      duration: story.duration,
      caption: story.caption,
      stickers: story.stickers,
      createdAt: story.created_at,
      postedAt: story.posted_at
    }))

    return NextResponse.json({ success: true, stories })
  } catch (error: any) {
    console.error('Error fetching stories:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch stories', details: error.message },
      { status: 500 }
    )
  }
}
