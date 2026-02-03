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

    const { prompt, settings, customInstructions } = await request.json()

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
    const models = ['gemini-2.0-flash', 'gemini-2.0-pro']
    let lastError: any = null
    let enhancedPrompt = ''

    // Create detailed instruction for image prompt enhancement
    const enhancementInstruction = customInstructions 
      ? `
You are a professional AI image prompt engineer. Enhance the following image prompt based on the user's specific enhancement instructions while PRESERVING THE EXACT CORE CONCEPT.

User's prompt: "${prompt}"

User's custom enhancement instructions: "${customInstructions}"

Image settings:
- Style: ${settings?.style || 'photorealistic'}
- Aspect Ratio: ${settings?.aspectRatio || '1:1'}
- Quality: ${settings?.quality || 'high'}
- Mood: ${settings?.mood || 'vibrant'}
- Lighting: ${settings?.lighting || 'natural'}${settings?.colorPalette && settings.colorPalette !== 'none' ? `
- Color Palette: ${settings.colorPalette}` : ''}

CRITICAL RULES:
1. KEEP the user's main subject, concept, and context EXACTLY as they described
2. Apply the user's custom enhancement instructions to the prompt
3. DO NOT change the core meaning or subject
4. Focus on implementing the user's specific enhancement requests
5. Add technical details that support the user's vision
6. OUTPUT MUST BE MAXIMUM 1000 CHARACTERS - Be concise and efficient with words

Output a single, cohesive paragraph (max 1000 characters) that incorporates the user's enhancement instructions while keeping their original idea intact.
`
      : `
You are a professional AI image prompt engineer. Enhance the following image prompt by adding technical and visual refinement details while PRESERVING THE EXACT CORE CONCEPT AND CONTEXT.

User's prompt: "${prompt}"

Image settings:
- Style: ${settings?.style || 'photorealistic'}
- Aspect Ratio: ${settings?.aspectRatio || '1:1'}
- Quality: ${settings?.quality || 'high'}
- Mood: ${settings?.mood || 'vibrant'}
- Lighting: ${settings?.lighting || 'natural'}${settings?.colorPalette && settings.colorPalette !== 'none' ? `
- Color Palette: ${settings.colorPalette}` : ''}

CRITICAL RULES:
1. KEEP the user's main subject, concept, and context EXACTLY as they described
2. DO NOT change the meaning, theme, or core elements of their idea
3. ONLY ADD technical refinements like:
   - Specific visual details (textures, materials, patterns)
   - Camera/composition details (framing, perspective, depth of field)
   - Lighting specifics (direction, quality, color temperature, shadows)${settings?.colorPalette && settings.colorPalette !== 'none' ? `
   - Color refinements using ${settings.colorPalette} palette` : `
   - Natural color harmony (don't force specific color schemes unless present in original prompt)`}
   - Atmospheric details (mood, ambiance)
   - Technical quality specs (resolution, sharpness, detail level)
4. If the user mentions specific elements (people, objects, locations, actions), those MUST remain central
5. Only enhance what's already there - don't add new major elements${!settings?.colorPalette || settings.colorPalette === 'none' ? `
6. DO NOT impose a specific color palette - let colors emerge naturally from the scene unless user specified colors` : ''}
7. OUTPUT MUST BE MAXIMUM 1000 CHARACTERS - Be concise and efficient with words

Output a single, cohesive paragraph (max 1000 characters) that keeps the user's idea intact but with professional technical refinements for AI image generation.

Example: If user says "a cat sitting on a windowsill", enhance lighting/textures/atmosphere but keep it about a cat on a windowsill, not a cat in a garden.
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
