import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/middleware'
import pool from '@/lib/db'

// Model configurations with credit costs per second and API endpoints
const MODEL_CONFIGS = {
  'gen4_turbo': {
    name: 'RunwayML Gen4 Turbo',
    creditsPerSecond: 5,
    input: 'image',
    output: 'video',
    description: 'Image to Video - Fast generation',
    endpoint: 'image_to_video',
    model: 'gen4_turbo'
  },
  'veo3.1_fast': {
    name: 'Veo 3.1 Fast',
    creditsPerSecond: 15,
    input: 'text-or-image',
    output: 'video',
    description: 'Text or Image to Video - High quality',
    endpoint: 'image_to_video',
    model: 'veo3.1_fast'
  },
  'upscale_v1': {
    name: 'Upscale V1',
    creditsPerSecond: 2,
    input: 'video',
    output: 'video',
    description: 'Video to Video - Enhance quality',
    endpoint: 'image_to_video',
    model: 'upscale_v1'
  }
}

export async function POST(request: NextRequest) {
  try {
    const { prompt, model, duration, sourceImage, sourceVideo, aspectRatio } = await request.json()

    // Get authenticated user first
    const user = await getAuthUser(request)
    
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Validate inputs
    if (!model || !MODEL_CONFIGS[model as keyof typeof MODEL_CONFIGS]) {
      return NextResponse.json(
        { error: 'Invalid model selected' },
        { status: 400 }
      )
    }

    // Different duration validation based on model
    const modelConfig = MODEL_CONFIGS[model as keyof typeof MODEL_CONFIGS]
    
    // Veo 3.1 uses 8-second clips, others use 5/10/15
    const validDurations = model === 'veo3.1_fast' 
      ? [8, 16, 24, 32] 
      : [5, 10, 15]
    
    if (!duration || !validDurations.includes(duration)) {
      return NextResponse.json(
        { error: `Duration must be ${validDurations.join(', ')} seconds for ${model}` },
        { status: 400 }
      )
    }

    // Validate input based on model type
    if (modelConfig.input === 'image' && !sourceImage) {
      return NextResponse.json(
        { error: 'Source image is required for gen4_turbo (image-to-video)' },
        { status: 400 }
      )
    }

    if (modelConfig.input === 'text-or-image') {
      // veo3.1_fast requires either prompt or sourceImage
      if (!prompt && !sourceImage) {
        return NextResponse.json(
          { error: 'Text prompt or source image is required for veo3.1_fast' },
          { status: 400 }
        )
      }
    }

    if (modelConfig.input === 'video' && !sourceVideo) {
      return NextResponse.json(
        { error: 'Source video is required for upscale_v1 (video-to-video)' },
        { status: 400 }
      )
    }

    // Calculate required credits
    const requiredCredits = modelConfig.creditsPerSecond * duration

    // Check if RUNWAY_API_KEY exists
    if (!process.env.RUNWAY_API_KEY) {
      return NextResponse.json(
        { error: 'Runway API key not configured' },
        { status: 500 }
      )
    }

    // Deduct credits - Use direct database query
    const client = await pool.connect()
    let remainingCredits = 0
    
    try {
      await client.query('BEGIN')

      // Get current credits
      const creditsResult = await client.query(
        'SELECT * FROM credits WHERE user_id = $1 FOR UPDATE',
        [user.id]
      )

      if (creditsResult.rows.length === 0) {
        throw new Error('User credits not found')
      }

      const currentCredits = creditsResult.rows[0]

      // Check if user has enough credits
      if (currentCredits.remaining_credits < requiredCredits) {
        await client.query('ROLLBACK')
        return NextResponse.json(
          { 
            error: 'Insufficient credits',
            remaining: currentCredits.remaining_credits,
            required: requiredCredits
          },
          { status: 400 }
        )
      }

      // Deduct credits
      const newUsedCredits = currentCredits.used_credits + requiredCredits
      const newRemainingCredits = currentCredits.total_credits - newUsedCredits
      remainingCredits = newRemainingCredits

      await client.query(
        `UPDATE credits 
         SET used_credits = $1, remaining_credits = $2
         WHERE user_id = $3`,
        [newUsedCredits, newRemainingCredits, user.id]
      )

      // Record transaction
      const actionType = modelConfig.input === 'video' ? 'video_upscale' : 
                        modelConfig.input === 'image' ? 'image_to_video' : 
                        'text_to_video'
                        
      await client.query(
        `INSERT INTO credit_transactions 
         (user_id, action_type, credits_used, model_used, duration, description)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [user.id, actionType, requiredCredits, model, duration, `${modelConfig.description}: ${prompt?.substring(0, 50) || 'video generation'}...`]
      )

      await client.query('COMMIT')
      
    } catch (error: any) {
      await client.query('ROLLBACK')
      client.release()
      throw error
    } finally {
      client.release()
    }

    // Make API call to Runway image_to_video endpoint
    const runwayEndpoint = 'https://api.dev.runwayml.com/v1/image_to_video'
    
    // Build request body based on model type
    let requestBody: any = {
      model: modelConfig.model,
      duration: duration
    }

    // Add promptImage for image-based models
    if (sourceImage && (model === 'gen4_turbo' || model === 'veo3.1_fast')) {
      requestBody.promptImage = sourceImage
    }

    // Add promptVideo for video upscaling
    if (sourceVideo && model === 'upscale_v1') {
      requestBody.promptVideo = sourceVideo
    }

    // Add promptText for text-based generation (veo3.1_fast supports text)
    if (prompt && (model === 'veo3.1_fast' || model === 'gen4_turbo')) {
      // Truncate prompt to 1000 characters if needed
      const truncatedPrompt = prompt.length > 1000 ? prompt.substring(0, 997) + '...' : prompt
      requestBody.promptText = truncatedPrompt
    }

    // Add aspect ratio if provided - map to Runway's expected format
    if (aspectRatio) {
      const aspectRatioMap: { [key: string]: string } = {
        '9:16': '720:1280',      // Portrait (Stories/Reels)
        '16:9': '1280:720',      // Landscape (YouTube)
        '1:1': '960:960',        // Square
        '4:5': '832:1104',       // Portrait Feed
        '5:4': '1104:832',       // Landscape Feed
        '21:9': '1584:672',      // Ultra-wide
        // Already in Runway format
        '1280:720': '1280:720',
        '720:1280': '720:1280',
        '1104:832': '1104:832',
        '832:1104': '832:1104',
        '960:960': '960:960',
        '1584:672': '1584:672'
      }
      requestBody.ratio = aspectRatioMap[aspectRatio] || '720:1280' // Default to portrait
    }

    // Watermark setting
    requestBody.watermark = false
    
    const runwayResponse = await fetch(runwayEndpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.RUNWAY_API_KEY}`,
        'Content-Type': 'application/json',
        'X-Runway-Version': '2024-11-06'
      },
      body: JSON.stringify(requestBody)
    })

    if (!runwayResponse.ok) {
      const errorData = await runwayResponse.json().catch(() => ({ message: 'API request failed' }))
      console.error('Runway API Error:', errorData)
      throw new Error(errorData.message || `Runway API error: ${runwayResponse.status}`)
    }

    const runwayData = await runwayResponse.json()
    
    // Runway returns task ID for async generation
    const taskId = runwayData.id

    // Poll for completion
    let videoUrl = null
    let attempts = 0
    const maxAttempts = 120 // 10 minutes max wait (5 sec intervals)

    while (!videoUrl && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 5000)) // Wait 5 seconds

      const statusResponse = await fetch(`https://api.dev.runwayml.com/v1/tasks/${taskId}`, {
        headers: {
          'Authorization': `Bearer ${process.env.RUNWAY_API_KEY}`,
          'X-Runway-Version': '2024-11-06'
        }
      })

      if (!statusResponse.ok) {
        console.error('Status check failed:', statusResponse.status)
        attempts++
        continue
      }

      const statusData = await statusResponse.json()

      if (statusData.status === 'SUCCEEDED') {
        videoUrl = statusData.output?.[0] || statusData.artifacts?.[0]?.url
        break
      } else if (statusData.status === 'FAILED') {
        throw new Error(statusData.failure || 'Video generation failed')
      }

      attempts++
    }

    if (!videoUrl) {
      throw new Error('Video generation timed out')
    }

    return NextResponse.json({
      success: true,
      videoUrl: videoUrl,
      model: model,
      duration: duration,
      creditsUsed: requiredCredits,
      remainingCredits: remainingCredits,
      timestamp: new Date().toISOString()
    })

  } catch (error: any) {
    console.error('Runway video generation error:', error)
    
    return NextResponse.json(
      { 
        error: 'Failed to generate video', 
        message: error.message || 'Unknown error occurred',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    )
  }
}

// GET endpoint to fetch model configurations
export async function GET() {
  return NextResponse.json({
    success: true,
    models: MODEL_CONFIGS
  })
}
