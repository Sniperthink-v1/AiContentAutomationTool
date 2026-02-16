import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/db'
import { getAuthUser } from '@/lib/middleware'

export async function GET(request: NextRequest) {
  try {
    // Require authentication to view scheduled posts
    const user = await getAuthUser(request)
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const now = new Date().toISOString()
    
    // Get scheduled posts ONLY for the authenticated user
    const result = await pool.query(
      `SELECT d.id, d.original_prompt, d.scheduled_date, d.status, d.user_id,
              si.access_token, si.platform_user_id
       FROM drafts d
       LEFT JOIN social_integrations si ON d.user_id = si.user_id AND si.platform = 'instagram'
       WHERE d.status = 'scheduled' AND d.user_id = $1
       ORDER BY d.scheduled_date ASC`,
      [user.id]
    )

    const scheduled = result.rows.map(row => ({
      id: row.id,
      prompt: row.original_prompt?.substring(0, 50),
      scheduledDate: row.scheduled_date,
      status: row.status,
      isDue: new Date(row.scheduled_date) <= new Date(now),
      hasInstagram: !!row.access_token && !!row.platform_user_id
    }))

    return NextResponse.json({
      success: true,
      currentTime: now,
      scheduledPosts: scheduled,
      dueCount: scheduled.filter(p => p.isDue).length
    })

  } catch (error: any) {
    console.error('Test scheduled error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error.message,
        stack: error.stack
      },
      { status: 500 }
    )
  }
}
