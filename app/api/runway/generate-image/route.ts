import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/middleware'
import pool from '@/lib/db'
import { GoogleGenAI } from '@google/genai'

export async function POST(request: NextRequest) {
  try {
    const { prompt, settings } = await request.json()

    console.log('🎨 Gemini Image Generation Request:', { 
      prompt: prompt?.substring(0, 50), 
      settings 
    })

    // Get authenticated user first
    const user = await getAuthUser(request)
    
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    if (!prompt) {
      return NextResponse.json(
        { error: 'Prompt is required' },
        { status: 400 }
      )
    }

    // Check if API key exists
    const apiKey = process.env.GEMINI_IMAGE_API_KEY || process.env.VEO_API_KEY || process.env.GEMINI_API_KEY
    if (!apiKey) {
      console.error('❌ Gemini API key not configured')
      return NextResponse.json(
        { error: 'Gemini API key not configured' },
        { status: 500 }
      )
    }

    // Deduct credits for text-to-image generation with gen4_image (5 for standard, 8 for high quality) - Use direct database query instead of API call
    const client = await pool.connect()
    
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
      
      // Imagen 3 costs 2 credits regardless of quality
      const requiredCredits = 2

      // Check if user has enough credits
      if (currentCredits.remaining_credits < requiredCredits) {
        await client.query('ROLLBACK')
        return NextResponse.json(
          { 
            error: `Insufficient credits. You need ${requiredCredits} credits for image generation.`,
            remaining: currentCredits.remaining_credits,
            required: requiredCredits
          },
          { status: 400 }
        )
      }

      // Deduct credits
      const newUsedCredits = currentCredits.used_credits + requiredCredits
      const newRemainingCredits = currentCredits.total_credits - newUsedCredits

      await client.query(
        `UPDATE credits 
         SET used_credits = $1, remaining_credits = $2
         WHERE user_id = $3`,
        [newUsedCredits, newRemainingCredits, user.id]
      )

      // Record transaction
      await client.query(
        `INSERT INTO credit_transactions 
         (user_id, action_type, credits_used, model_used, description)
         VALUES ($1, $2, $3, $4, $5)`,
        [user.id, 'image_generation', requiredCredits, 'gemini-imagen-3', `Image generation: ${prompt.substring(0, 50)}...`]
      )

      await client.query('COMMIT')
      
      console.log('💳 Credits deducted successfully:', {
        remaining: newRemainingCredits,
        used: requiredCredits
      })
      
    } catch (error: any) {
      await client.query('ROLLBACK')
      client.release()
      throw error
    } finally {
      client.release()
    }

    // Use the prompt exactly as provided - no modifications
    const enhancedPrompt = prompt
    
    // Initialize Google GenAI client
    const client_gemini = new GoogleGenAI({ apiKey })

    console.log('🎨 Generating image with Gemini Imagen 3...')
    console.log('Prompt:', enhancedPrompt.substring(0, 100))

    // Text-to-Image mode using Imagen 3 Pro (higher quality)
    const response = await client_gemini.models.generateImages({
      model: 'imagen-3.0-generate-001', // Imagen 3 Pro - $0.134/image, higher quality
      prompt: enhancedPrompt,
      config: {
        numberOfImages: 1,
        aspectRatio: settings?.aspectRatio === '16:9' ? '16:9' : 
                    settings?.aspectRatio === '9:16' ? '9:16' : 
                    settings?.aspectRatio === '4:5' ? '3:4' : '1:1',
      }
    })

    console.log('Imagen response received')

    if (!response.generatedImages || response.generatedImages.length === 0) {
      // Check if there's a filter reason
      const filterReason = (response as any).filterReason
      if (filterReason) {
        return NextResponse.json(
          { 
            error: 'Image generation blocked by safety filters',
            message: `Content was filtered: ${filterReason}. Please try a different prompt.`
          },
          { status: 400 }
        )
      }
      throw new Error('No image generated - the model returned empty results')
    }

    const generatedImage = response.generatedImages[0]
    
    if (!generatedImage.image?.imageBytes) {
      throw new Error('Generated image has no data')
    }

    const imageData = `data:image/png;base64,${generatedImage.image.imageBytes}`
    console.log('✅ Image generated successfully')

    return NextResponse.json({
      success: true,
      prompt: prompt,
      enhancedPrompt: enhancedPrompt,
      imageData: imageData,
      settings: settings,
      model: 'gemini-imagen-3',
      timestamp: new Date().toISOString()
    })

  } catch (error: any) {
    console.error('Gemini Image Generation Error:', error)
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    })
    
    return NextResponse.json(
      { 
        error: 'Failed to generate image', 
        message: error.message || 'Unknown error occurred',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    )
  }
}
