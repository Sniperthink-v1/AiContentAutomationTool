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

    // Insert draft into database with user_id
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
