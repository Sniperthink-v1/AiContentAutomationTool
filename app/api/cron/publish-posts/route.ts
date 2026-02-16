import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/db'
import { postImage, postVideo, postCarousel } from '@/lib/instagram'

// This endpoint should be called by a cron job every minute
// For Vercel: Add to vercel.json with cron schedule
// For other platforms: Use external cron service like cron-job.org

export async function GET(request: NextRequest) {
  try {
    // Verify cron secret for security
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET
    
    // Allow access if:
    // 1. Request comes from Vercel cron (checks x-vercel-cron header)
    // 2. Request has valid CRON_SECRET in authorization header
    const isVercelCron = request.headers.get('x-vercel-cron') === '1'
    const hasValidSecret = cronSecret && authHeader === `Bearer ${cronSecret}`
    
    if (!isVercelCron && !hasValidSecret) {
      console.log('⚠️ Unauthorized publish-posts cron attempt')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('🕐 Running scheduled posts publisher...')

    // Get all scheduled posts/drafts that are due
    const now = new Date().toISOString()
    
    let result
    try {
      result = await pool.query(
        `SELECT d.*, si.access_token as ig_access_token, si.platform_user_id as ig_user_id 
         FROM drafts d
         JOIN social_integrations si ON d.user_id = si.user_id AND si.platform = 'instagram'
         WHERE d.status = 'scheduled' 
         AND d.scheduled_date <= $1
         AND si.access_token IS NOT NULL
         AND si.platform_user_id IS NOT NULL
         AND si.is_active = true
         AND (si.token_expires_at IS NULL OR si.token_expires_at > NOW())
         ORDER BY d.scheduled_date ASC
         LIMIT 10`,
        [now]
      )
    } catch (dbError) {
      console.error('❌ Database query error:', dbError)
      return NextResponse.json(
        { 
          success: false, 
          error: 'Database error',
          details: dbError instanceof Error ? dbError.message : 'Unknown database error'
        },
        { status: 500 }
      )
    }

    const duePosts = result.rows
    console.log(`📋 Found ${duePosts.length} posts due for publishing`)

    const results = {
      processed: 0,
      published: 0,
      failed: 0,
      errors: [] as string[]
    }

    for (const post of duePosts) {
      results.processed++
      
      try {
        console.log(`📤 Publishing post ${post.id} for user ${post.user_id}...`)
        
        // Check if the URL is valid
        if (!post.media_url) {
          throw new Error('Post media URL is missing')
        }

        let mediaId: string

        // Determine post type and publish accordingly
        const mediaType = post.media_type || 'image'
        const caption = post.caption || ''

        if (mediaType === 'video' || mediaType === 'reel') {
          mediaId = await postVideo(
            post.ig_user_id,
            post.ig_access_token,
            post.media_url,
            caption,
            mediaType === 'reel'
          )
        } else if (mediaType === 'carousel' && post.carousel_items) {
          const items = typeof post.carousel_items === 'string' 
            ? JSON.parse(post.carousel_items) 
            : post.carousel_items
          mediaId = await postCarousel(
            post.ig_user_id,
            post.ig_access_token,
            items,
            caption
          )
        } else {
          // Default to image post
          mediaId = await postImage(
            post.ig_user_id,
            post.ig_access_token,
            post.media_url,
            caption
          )
        }

        // Update post status to published
        await pool.query(
          `UPDATE drafts 
           SET status = 'published', posted_at = NOW(), instagram_media_id = $1
           WHERE id = $2`,
          [mediaId, post.id]
        )

        console.log(`✅ Post ${post.id} published successfully (media ID: ${mediaId})`)
        results.published++

        // Create notification for user
        await pool.query(
          `INSERT INTO notifications (user_id, type, title, message, data)
           VALUES ($1, 'post_published', 'Post Published', 'Your scheduled post has been published to Instagram!', $2)`,
          [post.user_id, JSON.stringify({ postId: post.id, mediaId })]
        )

      } catch (error: any) {
        console.error(`❌ Failed to publish post ${post.id}:`, error.message)
        results.failed++
        results.errors.push(`Post ${post.id}: ${error.message}`)

        // Update post status to failed
        await pool.query(
          `UPDATE drafts 
           SET status = 'failed', error_message = $1
           WHERE id = $2`,
          [error.message, post.id]
        )

        // Notify user of failure
        await pool.query(
          `INSERT INTO notifications (user_id, type, title, message, data)
           VALUES ($1, 'post_failed', 'Post Publishing Failed', $2, $3)`,
          [post.user_id, `Failed to publish your scheduled post: ${error.message}`, JSON.stringify({ postId: post.id, error: error.message })]
        )
      }
    }

    console.log(`📊 Publishing complete: ${results.published} published, ${results.failed} failed`)

    return NextResponse.json({
      success: true,
      message: 'Post publishing job completed',
      results
    })

  } catch (error: any) {
    console.error('❌ Cron job error:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}

// Also support POST for some cron services
export async function POST(request: NextRequest) {
  return GET(request)
}
