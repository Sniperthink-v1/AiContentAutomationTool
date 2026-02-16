import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/db'
import { postStory } from '@/lib/instagram'

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
      console.log('⚠️ Unauthorized publish-stories cron attempt')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('🕐 Running scheduled stories publisher...')

    // Get all scheduled stories that are due
    const now = new Date().toISOString()
    
    const result = await pool.query(
      `SELECT s.*, si.access_token as ig_access_token, si.platform_user_id as ig_user_id 
       FROM stories s
       JOIN social_integrations si ON s.user_id = si.user_id AND si.platform = 'instagram'
       WHERE s.status = 'scheduled' 
       AND s.scheduled_time <= $1
       AND si.access_token IS NOT NULL
       AND si.platform_user_id IS NOT NULL
       AND si.is_active = true
       AND (si.token_expires_at IS NULL OR si.token_expires_at > NOW())
       ORDER BY s.scheduled_time ASC
       LIMIT 10`,
      [now]
    )

    const dueStories = result.rows
    console.log(`📋 Found ${dueStories.length} stories due for publishing`)

    const results = {
      processed: 0,
      published: 0,
      failed: 0,
      errors: [] as string[]
    }

    for (const story of dueStories) {
      results.processed++
      
      try {
        console.log(`📤 Publishing story ${story.id} for user ${story.user_id}...`)
        
        // Check if the URL is valid
        if (!story.url) {
          throw new Error('Story URL is missing')
        }

        // Post to Instagram
        const isVideo = story.type === 'video'
        const mediaId = await postStory(
          story.ig_user_id,
          story.ig_access_token,
          story.url,
          isVideo
        )

        // Update story status to published
        await pool.query(
          `UPDATE stories 
           SET status = 'published', posted_at = NOW(), instagram_media_id = $1
           WHERE id = $2`,
          [mediaId, story.id]
        )

        console.log(`✅ Story ${story.id} published successfully (media ID: ${mediaId})`)
        results.published++

        // Create notification for user
        await pool.query(
          `INSERT INTO notifications (user_id, type, title, message, data)
           VALUES ($1, 'story_published', 'Story Published', 'Your scheduled story has been posted to Instagram!', $2)`,
          [story.user_id, JSON.stringify({ storyId: story.id, mediaId })]
        )

      } catch (error: any) {
        console.error(`❌ Failed to publish story ${story.id}:`, error.message)
        results.failed++
        results.errors.push(`Story ${story.id}: ${error.message}`)

        // Update story status to failed
        await pool.query(
          `UPDATE stories 
           SET status = 'failed', error_message = $1
           WHERE id = $2`,
          [error.message, story.id]
        )

        // Notify user of failure
        await pool.query(
          `INSERT INTO notifications (user_id, type, title, message, data)
           VALUES ($1, 'story_failed', 'Story Publishing Failed', $2, $3)`,
          [story.user_id, `Failed to publish your scheduled story: ${error.message}`, JSON.stringify({ storyId: story.id, error: error.message })]
        )
      }
    }

    console.log(`📊 Publishing complete: ${results.published} published, ${results.failed} failed`)

    return NextResponse.json({
      success: true,
      message: 'Story publishing job completed',
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
