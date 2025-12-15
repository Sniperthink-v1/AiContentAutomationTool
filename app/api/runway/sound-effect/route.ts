import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/middleware'
import pool from '@/lib/db'
import RunwayML from '@runwayml/sdk'

const client = new RunwayML({
  apiKey: process.env.RUNWAY_API_SECRET!
})

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser(req)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { 
      promptText,
      duration,
      loop = false
    } = await req.json()

    if (!promptText || promptText.trim().length === 0) {
      return NextResponse.json({ 
        error: 'promptText is required' 
      }, { status: 400 })
    }

    if (promptText.length > 3000) {
      return NextResponse.json({ 
        error: 'promptText must be 3000 characters or less' 
      }, { status: 400 })
    }

    if (duration && (duration < 0.5 || duration > 30)) {
      return NextResponse.json({ 
        error: 'duration must be between 0.5 and 30 seconds' 
      }, { status: 400 })
    }

    console.log('Starting sound effect generation...', {
      promptText,
      duration,
      loop
    })

    // Calculate required credits
    const effectDuration = duration || 5 // Default 5 seconds if not specified
    const requiredCredits = Math.ceil(effectDuration / 6) // 1 credit per 6 seconds

    // Check AI credits balance
    const creditsResult = await pool.query(
      'SELECT ai_credits FROM credits WHERE user_id = $1',
      [user.id]
    )

    if (creditsResult.rows.length === 0) {
      return NextResponse.json({ 
        error: 'User credits not found' 
      }, { status: 404 })
    }

    const currentCredits = creditsResult.rows[0].ai_credits || 0

    if (currentCredits < requiredCredits) {
      return NextResponse.json({ 
        error: 'Insufficient AI credits',
        required: requiredCredits,
        current: currentCredits
      }, { status: 400 })
    }

    // Deduct credits upfront for sound effects
    await pool.query(
      'UPDATE credits SET ai_credits = ai_credits - $1 WHERE user_id = $2',
      [requiredCredits, user.id]
    )

    // Start sound effect generation task
    const task = await client.soundEffect.create({
      model: 'eleven_text_to_sound_v2',
      promptText,
      ...(duration !== undefined && { duration }),
      loop
    })

    console.log('Sound effect task created:', task.id)

    return NextResponse.json({ 
      success: true, 
      taskId: task.id,
      message: 'Sound effect generation started. Poll /api/runway/check-task to get status.',
      estimatedDuration: duration || 'auto',
      creditsDeducted: requiredCredits,
      costInfo: `${requiredCredits} AI credits deducted (1 credit / 6 seconds)`
    })
  } catch (error: any) {
    console.error('Sound effect error:', error)
    return NextResponse.json({ 
      error: error.message || 'Failed to generate sound effect' 
    }, { status: 500 })
  }
}
