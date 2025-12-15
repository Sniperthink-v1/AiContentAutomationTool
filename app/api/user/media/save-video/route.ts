import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/middleware'
import pool from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request)
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { videoUrl, prompt, enhancedPrompt, model, mode, duration, sourceMediaUrl, settings } = await request.json()

    if (!videoUrl) {
      return NextResponse.json({ success: false, error: 'Video URL is required' }, { status: 400 })
    }

    const result = await pool.query(
      `INSERT INTO ai_videos (user_id, prompt, enhanced_prompt, video_url, source_media_url, model, mode, duration, settings, credits_used)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING id`,
      [
        user.id,
        prompt || '',
        enhancedPrompt || '',
        videoUrl,
        sourceMediaUrl || null,
        model || 'unknown',
        mode || 'text-to-video',
        duration || 8,
        JSON.stringify(settings || {}),
        0  // Credits already deducted during generation
      ]
    )

    return NextResponse.json({
      success: true,
      id: result.rows[0].id,
      message: 'Video saved to My Media!'
    })

  } catch (error: any) {
    console.error('Error saving video:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to save video',
      details: error.message 
    }, { status: 500 })
  }
}
