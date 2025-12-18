import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/middleware'
import pool from '@/lib/db'
import { GoogleGenAI } from '@google/genai'

// Regenerate a single clip with new/edited prompt
// This is used when user wants to edit one clip before combining
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
      prompt, // The new/edited prompt for this clip
      clipIndex = 0, // Which clip this is (for reference)
      videoStyle = 'cinematic', 
      aspectRatio = '16:9',
      sourceImage, // Optional: base64 image for image-to-video mode
      inputType = 'text-to-video'
    } = body

    if (!prompt || !prompt.trim()) {
      return NextResponse.json(
        { success: false, error: 'Prompt is required' },
        { status: 400 }
      )
    }

    // Calculate credit cost (15 credits per second for Veo 3.1, each clip is 8 seconds)
    const creditCost = 15 * 8

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

    const apiKey = process.env.VEO_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: 'Veo API key not configured' },
        { status: 500 }
      )
    }

    // Initialize Google Gen AI client with Veo API key
    const client = new GoogleGenAI({ apiKey })

    // Enhance prompt based on video style
    let enhancedPrompt = prompt
    if (videoStyle === 'dialogue') {
      enhancedPrompt = prompt // Keep as-is for dialogue
    } else if (videoStyle === 'cinematic') {
      enhancedPrompt = `Cinematic, photorealistic, high quality: ${prompt}`
    } else if (videoStyle === 'animation') {
      enhancedPrompt = `Creative 3D animation style, vibrant colors: ${prompt}`
    }

    console.log(`Regenerating clip ${clipIndex + 1} with prompt:`, enhancedPrompt.substring(0, 100))

    // Build generation config
    const generateConfig: any = {
      aspectRatio: aspectRatio,
      numberOfVideos: 1,
      durationSeconds: 8, // Each Veo clip is 8 seconds
    }

    // Build request options based on input type
    const requestOptions: any = {
      model: 'veo-3.1-fast-generate-preview',
      config: generateConfig,
    }

    // If image-to-video mode with source image
    if (inputType === 'image-to-video' && sourceImage) {
      let imageData = sourceImage
      let mimeType = 'image/png'
      
      if (sourceImage.startsWith('data:')) {
        const matches = sourceImage.match(/^data:([^;]+);base64,(.+)$/)
        if (matches) {
          mimeType = matches[1]
          imageData = matches[2]
        }
      }

      requestOptions.image = {
        imageBytes: imageData,
        mimeType: mimeType
      }
      if (enhancedPrompt) {
        requestOptions.prompt = enhancedPrompt
      }
    } else {
      requestOptions.prompt = enhancedPrompt
    }

    // Start video generation with Veo 3.1 Fast
    const operation = await client.models.generateVideos(requestOptions)

    if (!operation.name) {
      return NextResponse.json(
        { success: false, error: 'No operation name returned' },
        { status: 500 }
      )
    }

    console.log(`Clip regeneration operation started:`, operation.name)

    // Deduct credits
    await pool.query(
      `UPDATE credits 
       SET remaining_credits = remaining_credits - $1,
           used_credits = used_credits + $1
       WHERE user_id = $2`,
      [creditCost, user.id]
    )

    // Record the transaction
    await pool.query(
      `INSERT INTO credit_transactions (user_id, action_type, credits_used, model_used, description)
       VALUES ($1, $2, $3, $4, $5)`,
      [user.id, 'video_regeneration', creditCost, 'veo-3.1-fast', `Clip ${clipIndex + 1} regeneration - ${videoStyle} style`]
    )

    // Get updated credits
    const updatedCredits = await pool.query(
      'SELECT remaining_credits FROM credits WHERE user_id = $1',
      [user.id]
    )

    return NextResponse.json({
      success: true,
      operationName: operation.name,
      clipIndex: clipIndex,
      message: `Regenerating clip ${clipIndex + 1}...`,
      creditsUsed: creditCost,
      remainingCredits: updatedCredits.rows[0]?.remaining_credits || 0
    })

  } catch (error) {
    console.error('Clip regeneration error:', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
