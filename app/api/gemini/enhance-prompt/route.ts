import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { getAuthUser } from '@/lib/middleware'
import pool from '@/lib/db'

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

    const { prompt, settings } = await request.json()

    if (!prompt) {
      return NextResponse.json(
        { error: 'Prompt is required' },
        { status: 400 }
      )
    }

    // Check AI credits before processing
    const creditsResult = await pool.query(
      'SELECT ai_credits FROM credits WHERE user_id = $1',
      [user.id]
    )

    if (creditsResult.rows.length === 0 || creditsResult.rows[0].ai_credits < 5) {
      return NextResponse.json(
        { error: 'Insufficient AI credits. You need 5 AI credits for this enhancement.' },
        { status: 400 }
      )
    }

    // Check if API key exists
    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { error: 'Gemini API key not configured' },
        { status: 500 }
      )
    }

    // Initialize Gemini AI
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
    
    // Try multiple models with retry logic
    const models = ['gemini-2.0-flash', 'gemini-2.0-flash-exp', 'gemini-1.5-flash']
    let lastError: any = null
    let enhancedScript = ''
    let clips: string[] = []

    // Check if this is for Veo 3.1 (multi-clip generation)
    const isVeo = settings?.isVeo || false
    const clipCount = settings?.clipCount || 1
    const videoStyle = settings?.videoStyle || 'cinematic'
    const noCaptions = settings?.noCaptions !== false // Default to true (no captions)

    // No captions instruction
    const noCaptionsInstruction = noCaptions 
      ? `\n\nCRITICAL: Do NOT include any text overlays, captions, titles, subtitles, or on-screen text in the video. The video should be pure visual content without any written words appearing on screen. No floating text, no title cards, no text animations.`
      : ''

    // Create detailed instruction for video script enhancement
    let enhancementInstruction = ''
    
    if (isVeo && clipCount > 1) {
      // Generate multiple clips for Veo 3.1
      enhancementInstruction = `
You are a professional video script writer for AI video generation. The user wants to create a ${settings?.duration || 8}-second video using Veo 3.1 AI.

Since Veo 3.1 generates 8-second clips, you need to create ${clipCount} separate clip descriptions that will be combined into one seamless video.

User's video idea: "${prompt}"

Video settings:
- Total Duration: ${settings?.duration || 8} seconds
- Number of Clips: ${clipCount} (each clip is 8 seconds)
- Video Style: ${videoStyle === 'dialogue' ? 'With dialogue and sound effects' : videoStyle === 'animation' ? 'Creative animation style' : 'Cinematic realism'}
- Visual Style: ${settings?.style || 'cinematic'}
${noCaptionsInstruction}

IMPORTANT: Create ${clipCount} detailed clip descriptions. Each clip should:
1. Be a complete, standalone 8-second scene description
2. Flow naturally into the next clip
3. Be detailed enough for AI video generation
4. Include camera movements, lighting, and atmosphere
${videoStyle === 'dialogue' ? '5. Include dialogue in quotes and describe sound effects' : ''}
${noCaptions ? '6. NO text, titles, captions, or on-screen text of any kind' : ''}

Format your response EXACTLY like this:

Clip 1: [Detailed description of first 8-second scene. Include specific visual details, camera movements, lighting, and action.]

Clip 2: [Detailed description of second 8-second scene that continues from Clip 1...]

${clipCount > 2 ? `Clip 3: [Detailed description of third 8-second scene...]` : ''}
${clipCount > 3 ? `Clip 4: [Detailed description of fourth 8-second scene...]` : ''}

Make each clip description vivid and specific for AI video generation. Ensure smooth transitions between clips.
`
    } else {
      // Standard single enhancement
      enhancementInstruction = `
You are a professional video script writer. Take the following basic video idea and expand it into a detailed, cinematic video script suitable for AI video generation.

User's basic idea: "${prompt}"

Video settings:
- Style: ${settings?.style || 'cinematic'}
- Duration: ${settings?.duration || 30} seconds
- Camera: ${settings?.cameraStyle || 'dynamic'}
${noCaptionsInstruction}

Please create a detailed video script that includes:
1. **Scene Description**: Visual details, setting, atmosphere
2. **Camera Movements**: Specific camera angles, movements (pan, zoom, tracking shots)
3. **Lighting**: Time of day, mood lighting, color temperature
4. **Transitions**: How scenes flow together
5. **Key Moments**: Highlight important visual beats
6. **Audio Suggestions**: Background music style, sound effects
${noCaptions ? '7. NO text overlays, titles, captions, or on-screen text' : ''}

Format your response as a clear, detailed script that can be directly used for video generation. Be specific and visual in your descriptions.
`
    }

    // Try each model with retry logic
    for (const modelName of models) {
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          const model = genAI.getGenerativeModel({ model: modelName })
          const result = await model.generateContent(enhancementInstruction)
          const response = await result.response
          enhancedScript = response.text()
          
          if (enhancedScript) {
            break // Success, exit retry loop
          }
        } catch (error: any) {
          lastError = error
          
          // If not overloaded error, try next model
          if (!error.message?.includes('overloaded') && error.status !== 503) {
            break // Try next model
          }
          
          // Wait before retry (exponential backoff)
          if (attempt < 2) {
            await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000))
          }
        }
      }
      
      if (enhancedScript) {
        break // Success, exit model loop
      }
    }
    
    // If all attempts failed, throw last error
    if (!enhancedScript) {
      throw lastError || new Error('Failed to generate enhanced script')
    }

    // Parse clips from the enhanced script for Veo 3.1
    if (isVeo && clipCount > 1) {
      const clipRegex = /Clip\s*(\d+)\s*[:\-]\s*([\s\S]*?)(?=Clip\s*\d+|$)/gi
      const matches = [...enhancedScript.matchAll(clipRegex)]
      if (matches.length > 0) {
        clips = matches.map(m => m[2].trim())
      }
    }

    // Deduct 5 AI credits after successful enhancement
    await pool.query(
      'UPDATE credits SET ai_credits = ai_credits - 5 WHERE user_id = $1',
      [user.id]
    )

    return NextResponse.json({
      success: true,
      originalPrompt: prompt,
      enhancedScript: enhancedScript,
      clips: clips.length > 0 ? clips : undefined,
      clipCount: clips.length > 0 ? clips.length : 1,
      timestamp: new Date().toISOString(),
      aiCreditsDeducted: 5
    })

  } catch (error: any) {
    console.error('Gemini API Error:', error)
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    })
    
    // Check if it's an API overload error
    if (error.message?.includes('overloaded') || error.status === 503) {
      return NextResponse.json(
        { 
          error: 'AI service is currently busy. Please try again in a few moments.',
          message: 'Service temporarily unavailable'
        },
        { status: 503 }
      )
    }
    
    return NextResponse.json(
      { 
        error: 'Failed to enhance prompt', 
        message: error.message || 'Unknown error occurred',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    )
  }
}
