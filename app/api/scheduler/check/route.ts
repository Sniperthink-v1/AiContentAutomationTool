import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/db'
import { postImage, postVideo } from '@/lib/instagram'

export async function GET(request: NextRequest) {
  try {
    // Verify cron secret for automated cron jobs (Vercel cron or external)
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET
    
    // Allow access if:
    // 1. Request comes from Vercel cron (checks x-vercel-cron header)
    // 2. Request has valid CRON_SECRET in authorization header
    const isVercelCron = request.headers.get('x-vercel-cron') === '1'
    const hasValidSecret = cronSecret && authHeader === `Bearer ${cronSecret}`
    
    if (!isVercelCron && !hasValidSecret) {
      console.log('⚠️ Unauthorized scheduler check attempt')
      return NextResponse.json(
        { success: false, error: 'Unauthorized - Invalid cron secret' },
        { status: 401 }
      )
    }

    console.log('🔍 Checking for scheduled posts...')
    const now = new Date().toISOString()
    
    // Get all scheduled posts that are due
    const result = await pool.query(
      `SELECT d.id, d.original_prompt, d.enhanced_script, d.video_url, d.thumbnail_url, 
              d.scheduled_date, d.user_id,
              si.access_token, si.platform_user_id
       FROM drafts d
       INNER JOIN social_integrations si 
         ON d.user_id = si.user_id 
         AND si.platform = 'instagram' 
         AND si.is_active = true
       WHERE d.status = 'scheduled' 
         AND d.scheduled_date <= $1
         AND si.access_token IS NOT NULL
         AND si.platform_user_id IS NOT NULL
       ORDER BY d.scheduled_date ASC
       LIMIT 10`,
      [now]
    )

    const duePosts = result.rows
    console.log(`📋 Found ${duePosts.length} posts due for publishing`)

    const results = []

    for (const post of duePosts) {
      try {
        const mediaUrl = post.video_url || post.thumbnail_url
        if (!mediaUrl) {
          console.log(`⚠️ Skipping post ${post.id} - no media`)
          continue
        }

        const postType = post.video_url ? 'reel' : 'image'
        const caption = post.enhanced_script || post.original_prompt || ''

        console.log(`📤 Publishing post ${post.id} to Instagram...`)

        // Post to Instagram
        let mediaId
        if (postType === 'reel') {
          mediaId = await postVideo(
            post.platform_user_id,
            post.access_token,
            mediaUrl,
            caption,
            true
          )
        } else {
          mediaId = await postImage(
            post.platform_user_id,
            post.access_token,
            mediaUrl,
            caption
          )
        }

        // Update status to published
        await pool.query(
          `UPDATE drafts 
           SET status = 'published', 
               posted_at = NOW(),
               instagram_media_id = $1
           WHERE id = $2`,
          [mediaId, post.id]
        )

        console.log(`✅ Post ${post.id} published successfully (Media ID: ${mediaId})`)
        results.push({
          id: post.id,
          success: true,
          mediaId
        })

      } catch (error: any) {
        console.error(`❌ Failed to publish post ${post.id}:`, error.message)
        
        // Mark as failed
        await pool.query(
          `UPDATE drafts 
           SET status = 'failed', 
               error_message = $1
           WHERE id = $2`,
          [error.message, post.id]
        )

        results.push({
          id: post.id,
          success: false,
          error: error.message
        })
      }
    }

    const published = results.filter(r => r.success).length
    const failed = results.filter(r => !r.success).length

    return NextResponse.json({
      success: true,
      checked: duePosts.length,
      published,
      failed,
      results
    })

  } catch (error: any) {
    console.error('❌ Scheduler check error:', error)
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
