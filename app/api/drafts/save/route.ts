import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { CreateDraftRequest } from '@/lib/types/draft'
import { getAuthUser } from '@/lib/middleware'
import { sendNotification } from '@/lib/notifications'

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

    const body: CreateDraftRequest = await request.json()

    const {
      id, // Draft ID for updates
      originalPrompt,
      enhancedScript,
      videoUrl,
      thumbnailUrl,
      settings,
      status = 'generating'
    } = body

    // Use default values if prompts are empty
    const finalOriginalPrompt = originalPrompt || 'AI Generated Video'
    const finalEnhancedScript = enhancedScript || originalPrompt || 'AI Generated Video'

    // If ID provided, update existing draft
    if (id) {
      const result = await query(
        `UPDATE drafts 
         SET original_prompt = $1, 
             enhanced_script = $2, 
             video_url = $3, 
             thumbnail_url = $4, 
             settings = $5, 
             status = $6, 
             updated_at = NOW()
         WHERE id = $7 AND user_id = $8
         RETURNING *`,
        [
          finalOriginalPrompt,
          finalEnhancedScript,
          videoUrl || null,
          thumbnailUrl || null,
          JSON.stringify(settings),
          status,
          id,
          user.id
        ]
      )

      if (result.rowCount === 0) {
        return NextResponse.json(
          { success: false, error: 'Draft not found or not authorized' },
          { status: 404 }
        )
      }

      const draft = result.rows[0]

      return NextResponse.json({
        success: true,
        draftId: draft.id,
        draft: {
          id: draft.id,
          originalPrompt: draft.original_prompt,
          enhancedScript: draft.enhanced_script,
          videoUrl: draft.video_url,
          thumbnailUrl: draft.thumbnail_url,
          settings: draft.settings,
          status: draft.status,
          createdAt: draft.created_at,
          scheduledDate: draft.scheduled_date,
          postedAt: draft.posted_at
        },
        message: 'Draft updated successfully'
      })
    }

    // Insert new draft into database with user_id
    const result = await query(
      `INSERT INTO drafts 
        (user_id, original_prompt, enhanced_script, video_url, thumbnail_url, settings, status) 
       VALUES ($1, $2, $3, $4, $5, $6, $7) 
       RETURNING *`,
      [
        user.id,
        finalOriginalPrompt,
        finalEnhancedScript,
        videoUrl || null,
        thumbnailUrl || null,
        JSON.stringify(settings),
        status
      ]
    )

    const draft = result.rows[0]

    // Send notification about saved draft
    await sendNotification({
      userId: user.id,  // user.id is already a UUID string
      title: 'Draft Saved',
      message: `Your draft "${finalOriginalPrompt.substring(0, 50)}${finalOriginalPrompt.length > 50 ? '...' : ''}" has been saved`,
      type: 'success',
      link: '/dashboard/posts',
      metadata: { draftId: draft.id }
    })

    return NextResponse.json({
      success: true,
      draftId: draft.id,
      draft: {
        id: draft.id,
        originalPrompt: draft.original_prompt,
        enhancedScript: draft.enhanced_script,
        videoUrl: draft.video_url,
        thumbnailUrl: draft.thumbnail_url,
        settings: draft.settings,
        status: draft.status,
        createdAt: draft.created_at
      },
      message: 'Draft saved successfully'
    }, { status: 201 })

  } catch (error: any) {
    console.error('Save Draft Error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to save draft', 
        message: error.message 
      },
      { status: 500 }
    )
  }
}
