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
    const models = ['gemini-2.5-flash', 'gemini-flash-latest', 'gemini-2.0-flash-exp']
    let lastError: any = null
    let enhancedPrompt = ''

    // Create detailed instruction for image prompt enhancement
    const enhancementInstruction = `
You are a professional AI image prompt engineer. Take the following basic image idea and expand it into a detailed, comprehensive prompt suitable for AI image generation.

User's basic idea: "${prompt}"

Image settings:
- Style: ${settings?.style || 'photorealistic'}
- Aspect Ratio: ${settings?.aspectRatio || '1:1'}
- Quality: ${settings?.quality || 'high'}
- Mood: ${settings?.mood || 'vibrant'}
- Lighting: ${settings?.lighting || 'natural'}
- Color Palette: ${settings?.colorPalette || 'none'}

Please create a detailed image generation prompt that includes:
1. **Main Subject**: Clear description of the primary focus
2. **Visual Details**: Textures, materials, patterns, specific features
3. **Composition**: Framing, perspective, depth of field, rule of thirds
4. **Lighting**: Direction, quality, color temperature, shadows, highlights
5. **Color Palette**: Specific colors, saturation, contrast, harmony
6. **Atmosphere & Mood**: Emotional tone, ambiance, feeling
7. **Style & Quality**: Artistic style, technical specifications, level of detail
8. **Background & Environment**: Setting, context, surrounding elements

Format your response as a single, cohesive paragraph that reads like a professional image generation prompt. Be specific, descriptive, and use visual language that an AI image generator can interpret. Focus on visual elements only - no mentions of audio, movement, or time-based elements.

Example format: "A [subject] with [specific details], [composition details], [lighting description], featuring [colors and mood], in a [style], [background and environment], [quality and technical specs]"
`

    // Try each model with retry logic
    for (const modelName of models) {
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          const model = genAI.getGenerativeModel({ model: modelName })
          const result = await model.generateContent(enhancementInstruction)
          const response = await result.response
          enhancedPrompt = response.text()
          
          if (enhancedPrompt) {
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
      
      if (enhancedPrompt) {
        break // Success, exit model loop
      }
    }
    
    // If all attempts failed, throw last error
    if (!enhancedPrompt) {
      throw lastError || new Error('Failed to generate enhanced prompt')
    }

    // Deduct 5 AI credits after successful enhancement
    await pool.query(
      'UPDATE credits SET ai_credits = ai_credits - 5 WHERE user_id = $1',
      [user.id]
    )

    return NextResponse.json({
      success: true,
      originalPrompt: prompt,
      enhancedScript: enhancedPrompt, // Keep same property name for consistency
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
