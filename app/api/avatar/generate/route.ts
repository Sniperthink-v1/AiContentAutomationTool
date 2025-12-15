import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/middleware'
import pool from '@/lib/db'

// Avatar/Talking Head video generation using D-ID API
// This creates videos where an image of a person speaks/lip-syncs to audio or text

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const user = await getAuthUser(request)
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const {
      sourceImage,     // Base64 image of the person/avatar
      script,          // Text for the avatar to speak
      audioUrl,        // OR provide audio URL for lip-sync
      voiceId,         // Voice ID for text-to-speech (if using script)
      voiceSettings,   // Voice settings (speed, pitch, etc.)
      expressionStyle, // 'neutral', 'happy', 'serious', 'friendly'
      movementStyle,   // 'natural', 'minimal', 'expressive'
    } = body

    console.log('🎭 Avatar Video Request:', {
      hasSourceImage: !!sourceImage,
      scriptLength: script?.length,
      hasAudioUrl: !!audioUrl,
      voiceId,
      expressionStyle,
      movementStyle
    })

    // Validate inputs
    if (!sourceImage) {
      return NextResponse.json(
        { success: false, error: 'Source image is required' },
        { status: 400 }
      )
    }

    if (!script && !audioUrl) {
      return NextResponse.json(
        { success: false, error: 'Either script text or audio URL is required' },
        { status: 400 }
      )
    }

    // Check for D-ID API key
    const didApiKey = process.env.DID_API_KEY
    if (!didApiKey) {
      console.error('❌ D-ID API key not configured')
      return NextResponse.json(
        { success: false, error: 'Avatar video API not configured. Please add DID_API_KEY to environment.' },
        { status: 500 }
      )
    }

    // Calculate credit cost (10 credits per avatar video)
    const creditCost = 10

    // Check user credits
    const creditsResult = await pool.query(
      'SELECT remaining_credits FROM credits WHERE user_id = $1',
      [user.id]
    )

    const userCredits = creditsResult.rows[0]?.remaining_credits || 0
    if (userCredits < creditCost) {
      return NextResponse.json(
        { success: false, error: `Insufficient credits. Need ${creditCost}, have ${userCredits}` },
        { status: 400 }
      )
    }

    // Prepare source image URL
    // D-ID requires a URL, so if we have base64, we need to handle it
    let imageUrl = sourceImage
    if (sourceImage.startsWith('data:')) {
      // For base64 images, D-ID accepts them directly in certain endpoints
      // Or we could upload to our storage first
      imageUrl = sourceImage
    }

    // Build D-ID API request
    // Docs: https://docs.d-id.com/reference/createtalk
    const didRequestBody: any = {
      source_url: imageUrl,
      config: {
        stitch: true, // Stitch the face onto the body
        result_format: 'mp4',
        fluent: true, // More natural speech
        pad_audio: 0.5, // Add padding at start/end
      },
      // Expression/driver settings
      driver_url: 'bank://natural', // Natural head movements
    }

    // Add script or audio
    if (script) {
      // Use text-to-speech
      didRequestBody.script = {
        type: 'text',
        input: script,
        provider: {
          type: 'microsoft', // or 'amazon', 'elevenlabs'
          voice_id: voiceId || 'en-US-JennyNeural', // Default voice
        }
      }

      // Apply voice settings if provided
      if (voiceSettings) {
        didRequestBody.script.ssml = false
        // Additional voice customization can be added here
      }
    } else if (audioUrl) {
      // Use provided audio for lip-sync
      didRequestBody.script = {
        type: 'audio',
        audio_url: audioUrl
      }
    }

    // Apply expression style
    if (expressionStyle === 'happy') {
      didRequestBody.config.expression = {
        expressions: [{ expression: 'happy', intensity: 0.5 }]
      }
    } else if (expressionStyle === 'serious') {
      didRequestBody.config.expression = {
        expressions: [{ expression: 'serious', intensity: 0.6 }]
      }
    }

    console.log('🎬 Calling D-ID API...')

    // Create the talk video
    const createResponse = await fetch('https://api.d-id.com/talks', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${didApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(didRequestBody)
    })

    if (!createResponse.ok) {
      const errorData = await createResponse.json().catch(() => ({}))
      console.error('❌ D-ID API Error:', {
        status: createResponse.status,
        error: errorData
      })

      let errorMessage = 'Failed to create avatar video'
      if (errorData.description) {
        errorMessage = errorData.description
      } else if (errorData.message) {
        errorMessage = errorData.message
      }

      return NextResponse.json(
        { success: false, error: errorMessage },
        { status: 500 }
      )
    }

    const createData = await createResponse.json()
    const talkId = createData.id
    console.log('✅ D-ID Talk created:', talkId)

    // Poll for completion
    let videoUrl = null
    let attempts = 0
    const maxAttempts = 60 // 5 minutes max

    while (!videoUrl && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 5000)) // Wait 5 seconds
      attempts++

      console.log(`🔄 Checking status (attempt ${attempts})...`)

      const statusResponse = await fetch(`https://api.d-id.com/talks/${talkId}`, {
        headers: {
          'Authorization': `Basic ${didApiKey}`,
        }
      })

      if (!statusResponse.ok) {
        console.error('Status check failed:', statusResponse.status)
        continue
      }

      const statusData = await statusResponse.json()
      console.log(`📊 Status: ${statusData.status}`)

      if (statusData.status === 'done') {
        videoUrl = statusData.result_url
        console.log('✅ Video ready!')
        break
      } else if (statusData.status === 'error' || statusData.status === 'failed') {
        console.error('❌ Generation failed:', statusData.error || statusData)
        return NextResponse.json(
          { success: false, error: statusData.error?.description || 'Avatar video generation failed' },
          { status: 500 }
        )
      }
    }

    if (!videoUrl) {
      return NextResponse.json(
        { success: false, error: 'Avatar video generation timed out' },
        { status: 500 }
      )
    }

    // SUCCESS! Deduct credits
    await pool.query(
      `UPDATE credits 
       SET remaining_credits = remaining_credits - $1,
           used_credits = used_credits + $1
       WHERE user_id = $2`,
      [creditCost, user.id]
    )

    // Record transaction
    await pool.query(
      `INSERT INTO credit_transactions 
       (user_id, action_type, credits_used, model_used, description)
       VALUES ($1, $2, $3, $4, $5)`,
      [user.id, 'avatar_video', creditCost, 'd-id', `Avatar video: ${script?.substring(0, 50) || 'audio lip-sync'}...`]
    )

    // Get updated credits
    const updatedCredits = await pool.query(
      'SELECT remaining_credits FROM credits WHERE user_id = $1',
      [user.id]
    )

    console.log('✅ Avatar video generated successfully!')

    return NextResponse.json({
      success: true,
      videoUrl: videoUrl,
      talkId: talkId,
      creditsUsed: creditCost,
      remainingCredits: updatedCredits.rows[0]?.remaining_credits
    })

  } catch (error: any) {
    console.error('Avatar Video Error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to generate avatar video' },
      { status: 500 }
    )
  }
}
