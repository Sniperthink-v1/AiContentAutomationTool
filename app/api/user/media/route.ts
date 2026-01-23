import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/db'
import { getAuthUser } from '@/lib/middleware'

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request)
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    // Get pagination parameters
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '50') // Default 50 items
    const offset = parseInt(searchParams.get('offset') || '0')

    // Fetch both images and videos with LIMIT, combine and sort by date
    const imagesQuery = `
      SELECT 
        id, 
        'photo' as type,
        image_url as url, 
        prompt, 
        enhanced_prompt as "enhancedPrompt",
        model,
        created_at
      FROM ai_images 
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT $2 OFFSET $3
    `
    
    const videosQuery = `
      SELECT 
        id, 
        'video' as type,
        video_url as url, 
        prompt, 
        enhanced_prompt as "enhancedPrompt",
        model,
        created_at
      FROM ai_videos 
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT $2 OFFSET $3
    `

    const [imagesResult, videosResult] = await Promise.all([
      pool.query(imagesQuery, [user.id, limit, offset]),
      pool.query(videosQuery, [user.id, limit, offset])
    ])

    // Combine and sort by created_at descending (newest first)
    const allMedia = [
      ...imagesResult.rows,
      ...videosResult.rows
    ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

    // Get total count for pagination
    const countQuery = `
      SELECT 
        (SELECT COUNT(*) FROM ai_images WHERE user_id = $1) as image_count,
        (SELECT COUNT(*) FROM ai_videos WHERE user_id = $1) as video_count
    `
    const countResult = await pool.query(countQuery, [user.id])
    const totalCount = (countResult.rows[0]?.image_count || 0) + (countResult.rows[0]?.video_count || 0)

    return NextResponse.json({
      success: true,
      media: allMedia,
      pagination: {
        total: totalCount,
        limit,
        offset,
        hasMore: offset + allMedia.length < totalCount
      }
    })
  } catch (error: any) {
    console.error('Error fetching media:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to fetch media',
      details: error.message 
    }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await getAuthUser(request)
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { id, type } = await request.json()

    if (!id || !type) {
      return NextResponse.json({ success: false, error: 'Missing id or type' }, { status: 400 })
    }

    const table = type === 'video' ? 'ai_videos' : 'ai_images'
    
    // Make sure user owns this media item
    const result = await pool.query(
      `DELETE FROM ${table} WHERE id = $1 AND user_id = $2 RETURNING id`,
      [id, user.id]
    )

    if (result.rowCount === 0) {
      return NextResponse.json({ success: false, error: 'Media not found or not authorized' }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error deleting media:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to delete media',
      details: error.message 
    }, { status: 500 })
  }
}
