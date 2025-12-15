import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { getAuthUser } from '@/lib/middleware'

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

    const searchParams = request.nextUrl.searchParams
    const status = searchParams.get('status')
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = parseInt(searchParams.get('offset') || '0')

    // Build query based on filters - ALWAYS filter by user_id
    let queryText = `
      SELECT 
        id, 
        user_id,
        original_prompt, 
        enhanced_script, 
        video_url, 
        thumbnail_url, 
        settings, 
        status,
        scheduled_date,
        created_at,
        updated_at
      FROM drafts
      WHERE user_id = $1
    `
    const queryParams: any[] = [user.id]

    // Filter by status if provided
    if (status) {
      queryParams.push(status)
      queryText += ` AND status = $${queryParams.length}`
    }

    // Add ordering and pagination
    queryText += ` ORDER BY created_at DESC LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}`
    queryParams.push(limit, offset)

    // Execute query
    const result = await query(queryText, queryParams)

    // Get total count for this user
    let countQuery = 'SELECT COUNT(*) as total FROM drafts WHERE user_id = $1'
    const countParams: any[] = [user.id]
    if (status) {
      countQuery += ' AND status = $2'
      countParams.push(status)
    }
    const countResult = await query(countQuery, countParams)

    const total = parseInt(countResult.rows[0].total)

    return NextResponse.json({
      success: true,
      drafts: result.rows.map((row: any) => ({
        id: row.id,
        userId: row.user_id,
        originalPrompt: row.original_prompt,
        enhancedScript: row.enhanced_script,
        videoUrl: row.video_url,
        thumbnailUrl: row.thumbnail_url,
        settings: row.settings,
        status: row.status,
        scheduledDate: row.scheduled_date,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      })),
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total
      }
    })

  } catch (error: any) {
    console.error('List Drafts Error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to fetch drafts', 
        message: error.message 
      },
      { status: 500 }
    )
  }
}
