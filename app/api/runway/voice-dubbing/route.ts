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
      audioUri, 
      targetLang = 'en',
      disableVoiceCloning = false,
      dropBackgroundAudio = false,
      numSpeakers 
    } = await req.json()

    if (!audioUri) {
      return NextResponse.json({ 
        error: 'audioUri is required' 
      }, { status: 400 })
    }

    // Validate target language
    const validLangs = [
      'en', 'hi', 'pt', 'zh', 'es', 'fr', 'de', 'ja', 'ar', 'ru', 
      'ko', 'id', 'it', 'nl', 'tr', 'pl', 'sv', 'fil', 'ms', 'ro', 
      'uk', 'el', 'cs', 'da', 'fi', 'bg', 'hr', 'sk', 'ta'
    ]
    
    if (!validLangs.includes(targetLang)) {
      return NextResponse.json({ 
        error: `Invalid target language. Must be one of: ${validLangs.join(', ')}` 
      }, { status: 400 })
    }

    console.log('Starting voice dubbing task...', {
      audioUri,
      targetLang,
      disableVoiceCloning,
      dropBackgroundAudio,
      numSpeakers
    })

    // Check AI credits balance (will deduct after task completes)
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
    const estimatedCredits = 5 // Estimate: 1 credit / 2 sec, assume ~10 sec audio

    if (currentCredits < estimatedCredits) {
      return NextResponse.json({ 
        error: 'Insufficient AI credits',
        required: estimatedCredits,
        current: currentCredits
      }, { status: 400 })
    }

    // Start voice dubbing task
    const task = await client.voiceDubbing.create({
      model: 'eleven_voice_dubbing',
      audioUri,
      targetLang,
      ...(disableVoiceCloning !== undefined && { disableVoiceCloning }),
      ...(dropBackgroundAudio !== undefined && { dropBackgroundAudio }),
      ...(numSpeakers !== undefined && { numSpeakers })
    })

    console.log('Voice dubbing task created:', task.id)

    return NextResponse.json({ 
      success: true, 
      taskId: task.id,
      message: 'Voice dubbing task started. Poll /api/runway/check-task to get status.',
      costInfo: 'Credits will be deducted based on output duration (1 credit / 2 seconds)'
    })
  } catch (error: any) {
    console.error('Voice dubbing error:', error)
    return NextResponse.json({ 
      error: error.message || 'Failed to start voice dubbing' 
    }, { status: 500 })
  }
}
