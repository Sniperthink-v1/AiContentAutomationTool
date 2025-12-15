import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/middleware'
import pool from '@/lib/db'
import { GoogleGenAI } from '@google/genai'

// Function to analyze image and get detailed character description using Gemini
async function analyzeImageForCharacter(imageData: string, mimeType: string): Promise<string> {
  const geminiApiKey = process.env.GEMINI_API_KEY || process.env.VEO_API_KEY
  if (!geminiApiKey) {
    throw new Error('Gemini API key not configured')
  }

  const geminiClient = new GoogleGenAI({ apiKey: geminiApiKey })
  
  const analysisPrompt = `Analyze this image and provide a DETAILED description of the character/subject for video generation consistency. Include:
1. Physical appearance (face shape, skin tone, hair color/style, eye color, age estimate)
2. Clothing and accessories (exact colors, patterns, style)
3. Body posture and positioning
4. Any distinctive features or characteristics
5. Overall style/mood of the image

Format the response as a concise but detailed character description that can be used to maintain visual consistency across multiple video clips. Start with "Character description:" and be specific about visual details.`

  try {
    const response = await geminiClient.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: [{
        role: 'user',
        parts: [
          { text: analysisPrompt },
          { 
            inlineData: {
              mimeType: mimeType,
              data: imageData
            }
          }
        ]
      }]
    })

    const description = response.text || ''
    console.log('Character analysis result:', description.substring(0, 200))
    return description
  } catch (error) {
    console.error('Error analyzing image:', error)
    return '' // Return empty string if analysis fails, video gen will still work
  }
}

// Veo 3.1 video generation using Google Gen AI SDK
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
      prompt, 
      scriptSections, // Array of clip descriptions for multi-clip generation
      videoStyle = 'cinematic', // 'dialogue', 'cinematic', 'animation'
      aspectRatio = '16:9',
      duration = 8, // Total duration (8, 16, 24, or 32 seconds)
      sourceImage, // Base64 image for image-to-video mode
      inputType = 'text-to-video', // 'image-to-video' or 'text-to-video'
    } = body

    // Determine clips to generate
    const clips = scriptSections && scriptSections.length > 0 
      ? scriptSections 
      : [prompt]
    
    const clipCount = clips.length

    // For image-to-video, a prompt is optional (we'll use the character description)
    // For text-to-video, a prompt is required
    if (inputType === 'text-to-video' && (!clips[0] || !clips[0].trim())) {
      return NextResponse.json(
        { success: false, error: 'Prompt is required for text-to-video' },
        { status: 400 }
      )
    }

    // For image-to-video without a prompt, use a default
    if (inputType === 'image-to-video' && (!clips[0] || !clips[0].trim())) {
      clips[0] = 'Animate this image naturally with subtle movements and bring it to life'
    }

    // Calculate credit cost (15 credits per second for Veo 3.1)
    // Each clip is 8 seconds
    const creditCost = 15 * clipCount * 8

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

    // If image-to-video mode, analyze the image FIRST to get character description
    let characterDescription = ''
    let imageData = ''
    let imageMimeType = 'image/png'
    
    if (inputType === 'image-to-video' && sourceImage) {
      // Extract base64 data from data URL if present
      imageData = sourceImage
      
      if (sourceImage.startsWith('data:')) {
        const matches = sourceImage.match(/^data:([^;]+);base64,(.+)$/)
        if (matches) {
          imageMimeType = matches[1]
          imageData = matches[2]
        }
      }
      
      // Analyze image to get detailed character description (happens automatically)
      console.log('Analyzing image for character description...')
      characterDescription = await analyzeImageForCharacter(imageData, imageMimeType)
      console.log('Character description obtained:', characterDescription ? 'Yes' : 'No')
    }

    // Generate videos for each clip
    const operationNames: string[] = []
    
    for (let i = 0; i < clips.length; i++) {
      const clipPrompt = clips[i]
      
      // Enhance prompt based on video style
      let enhancedPrompt = clipPrompt
      if (videoStyle === 'dialogue') {
        enhancedPrompt = clipPrompt // Keep as-is for dialogue (includes dialogue cues)
      } else if (videoStyle === 'cinematic') {
        enhancedPrompt = `Cinematic, photorealistic, high quality: ${clipPrompt}`
      } else if (videoStyle === 'animation') {
        enhancedPrompt = `Creative 3D animation style, vibrant colors: ${clipPrompt}`
      }

      console.log(`Starting Veo 3.1 Fast generation for clip ${i + 1}/${clipCount}:`, enhancedPrompt.substring(0, 100))
      console.log(`Input type: ${inputType}, Has source image: ${!!sourceImage}`)

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

      // Handle image-to-video mode with character description
      if (inputType === 'image-to-video' && sourceImage && imageData) {
        // SMART IMAGE-TO-VIDEO:
        // Clip 1: Use the image directly (animate the image)
        // Clips 2+: Use the AI-generated character description for consistency
        
        if (i === 0) {
          // FIRST CLIP: Animate the image directly
          requestOptions.image = {
            imageBytes: imageData,
            mimeType: imageMimeType
          }
          // Add character description to prompt for better consistency
          if (characterDescription) {
            requestOptions.prompt = `${enhancedPrompt}. ${characterDescription}`
          } else if (enhancedPrompt) {
            requestOptions.prompt = enhancedPrompt
          }
          console.log(`Clip ${i + 1}/${clips.length}: Using image directly for first clip`)
        } else {
          // SUBSEQUENT CLIPS: Use detailed character description from image analysis
          // This maintains character consistency without re-showing the image
          if (characterDescription) {
            const characterPrompt = `IMPORTANT - MAINTAIN EXACT CHARACTER CONSISTENCY: ${characterDescription}

Generate this scene with the EXACT same character described above. The character must look identical to the previous clip - same face, hair, clothing, and all visual details.

Scene to generate: ${enhancedPrompt}`
            requestOptions.prompt = characterPrompt
            console.log(`Clip ${i + 1}/${clips.length}: Using character description for consistency`)
          } else {
            // Fallback if character analysis failed
            requestOptions.prompt = `Continue with the exact same character from the previous scene. Maintain perfect visual consistency. Scene: ${enhancedPrompt}`
            console.log(`Clip ${i + 1}/${clips.length}: Using fallback continuation prompt`)
          }
        }
      } else {
        // Text-to-video mode (no image)
        requestOptions.prompt = enhancedPrompt
      }

      // Start video generation with Veo 3.1 Fast using SDK
      const operation = await client.models.generateVideos(requestOptions)

      if (!operation.name) {
        return NextResponse.json(
          { success: false, error: `No operation name returned for clip ${i + 1}` },
          { status: 500 }
        )
      }

      console.log(`Clip ${i + 1} operation started:`, operation.name)
      operationNames.push(operation.name)
      
      // Small delay between API calls to avoid rate limiting
      if (i < clips.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 2000))
      }
    }

    // Deduct credits after starting all generations
    await pool.query(
      `UPDATE credits 
       SET remaining_credits = remaining_credits - $1,
           used_credits = used_credits + $1
       WHERE user_id = $2`,
      [creditCost, user.id]
    )

    // Record the transaction
    let actionDescription = ''
    if (inputType === 'image-to-video') {
      actionDescription = `Image to Video - ${videoStyle} style - ${duration}s (${clipCount} clips)`
    } else {
      actionDescription = `Text to Video - ${videoStyle} style - ${duration}s (${clipCount} clips)`
    }
    
    await pool.query(
      `INSERT INTO credit_transactions (user_id, action_type, credits_used, model_used, description)
       VALUES ($1, $2, $3, $4, $5)`,
      [user.id, 'video_generation', creditCost, 'veo-3.1-fast', actionDescription]
    )

    // Get updated credits
    const updatedCredits = await pool.query(
      'SELECT remaining_credits FROM credits WHERE user_id = $1',
      [user.id]
    )

    return NextResponse.json({
      success: true,
      operationNames: operationNames,
      operationName: operationNames[0], // For backwards compatibility
      clipCount: clipCount,
      message: `Video generation started for ${clipCount} clip${clipCount > 1 ? 's' : ''}`,
      videoStyle,
      duration,
      creditsUsed: creditCost,
      remainingCredits: updatedCredits.rows[0]?.remaining_credits || 0
    })

  } catch (error: any) {
    console.error('Gemini video generation error:', error)
    
    // Handle specific error types with user-friendly messages
    const errorMessage = error?.message || error?.toString() || 'Internal server error'
    let userMessage = errorMessage
    let statusCode = 500
    
    // Check for quota/rate limit errors
    if (errorMessage.includes('429') || 
        errorMessage.includes('quota') || 
        errorMessage.includes('RESOURCE_EXHAUSTED') ||
        errorMessage.includes('rate limit')) {
      userMessage = 'API quota exceeded. The daily limit for video generation has been reached. Please try again tomorrow or upgrade your plan at https://ai.google.dev/pricing'
      statusCode = 429
    } else if (errorMessage.includes('401') || errorMessage.includes('UNAUTHENTICATED')) {
      userMessage = 'API authentication failed. Please check your Veo API key configuration.'
      statusCode = 401
    } else if (errorMessage.includes('content') || errorMessage.includes('moderation') || errorMessage.includes('safety')) {
      userMessage = 'Your prompt was blocked by content moderation. Please try a different prompt.'
      statusCode = 400
    }
    
    return NextResponse.json(
      { success: false, error: userMessage },
      { status: statusCode }
    )
  }
}
