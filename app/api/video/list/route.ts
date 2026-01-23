import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/db'
import { getAuthUser } from '@/lib/middleware'

// GET - List user's videos for the editor
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request)
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch videos from database
    // This would be from a videos table or combined from generated videos
    try {
      const result = await pool.query(
        `SELECT id, title as name, video_url as url, thumbnail_url as thumbnail,
                duration, created_at
         FROM videos
         WHERE user_id = $1
         ORDER BY created_at DESC
         LIMIT 50`,
        [user.id]
      )

      return NextResponse.json({
        success: true,
        videos: result.rows || []
      })
    } catch (e) {
      // Table might not exist yet, return empty array
      return NextResponse.json({
        success: true,
        videos: []
      })
    }
  } catch (error: any) {
    console.error('Error fetching videos:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
