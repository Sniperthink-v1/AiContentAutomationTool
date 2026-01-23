import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenAI, Modality } from '@google/genai'
import { getAuthUser } from '@/lib/middleware'
import pool from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const { prompt, settings, mode, sourceImage } = await request.json()

    console.log('🎨 Gemini Image Generation Request:', { 
      mode,
      prompt: prompt?.substring(0, 50),
      hasSourceImage: !!sourceImage,
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

    // Check if API key exists - use the dedicated image generation key
    const apiKey = process.env.GEMINI_IMAGE_API_KEY || process.env.VEO_API_KEY || process.env.GEMINI_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Gemini API key not configured' },
        { status: 500 }
      )
    }

    // Check and deduct 2 credits directly from database
    const client = await pool.connect()
    try {
      await client.query('BEGIN')

      const creditsResult = await client.query(
        'SELECT * FROM credits WHERE user_id = $1 FOR UPDATE',
        [user.id]
      )

      if (creditsResult.rows.length === 0) {
        throw new Error('User credits not found')
      }

      const currentCredits = creditsResult.rows[0]
      const requiredCredits = 2

      if (currentCredits.remaining_credits < requiredCredits) {
        await client.query('ROLLBACK')
        return NextResponse.json(
          { 
            error: `Insufficient credits. You need ${requiredCredits} credits.`,
            remaining: currentCredits.remaining_credits,
            required: requiredCredits
          },
          { status: 400 }
        )
      }

      const newUsedCredits = currentCredits.used_credits + requiredCredits
      const newRemainingCredits = currentCredits.total_credits - newUsedCredits

      await client.query(
        `UPDATE credits 
         SET used_credits = $1, remaining_credits = $2
         WHERE user_id = $3`,
        [newUsedCredits, newRemainingCredits, user.id]
      )

      await client.query(
        `INSERT INTO credit_transactions 
         (user_id, action_type, credits_used, model_used, description)
         VALUES ($1, $2, $3, $4, $5)`,
        [user.id, mode === 'image-to-image' ? 'image_to_image' : 'image_generation', requiredCredits, 'gemini-imagen-3', `Image generation: ${prompt.substring(0, 50)}...`]
      )

      await client.query('COMMIT')
      
      console.log('💳 Credits deducted successfully:', {
        remaining: newRemainingCredits,
        used: requiredCredits
      })
      
    } catch (error: any) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }

    // Initialize Google GenAI client
    const genaiClient = new GoogleGenAI({ apiKey })

    // Use the prompt exactly as provided by the user - no style modifications
    const enhancedPrompt = prompt

    console.log('🎨 Generating image with Imagen 3...')
    console.log('Prompt:', enhancedPrompt.substring(0, 100))

    let imageData: string = ''

    if (mode === 'image-to-image' && sourceImage) {
      // Image-to-Image mode using Gemini's multimodal capabilities
      // Use gemini-2.0-flash for image editing with vision
      
      // Extract base64 data from data URL
      let imageBase64 = sourceImage
      let mimeType = 'image/png'
      
      if (sourceImage.startsWith('data:')) {
        const matches = sourceImage.match(/^data:([^;]+);base64,(.+)$/)
        if (matches) {
          mimeType = matches[1]
          imageBase64 = matches[2]
        }
      }

      // For image-to-image, we use Gemini's image generation with reference
      const response = await genaiClient.models.generateContent({
        model: 'gemini-2.0-flash-exp',
        contents: [{
          role: 'user',
          parts: [
            { 
              inlineData: {
                mimeType: mimeType,
                data: imageBase64
              }
            },
            { 
              text: `Transform this image based on the following description. Keep the main subject but apply these changes: ${enhancedPrompt}. Generate a new image.`
            }
          ]
        }],
        config: {
          responseModalities: [Modality.TEXT, Modality.IMAGE],
        }
      })

      // Extract image from response
      const parts = response.candidates?.[0]?.content?.parts || []
      let foundImage = false
      
      for (const part of parts) {
        if (part.inlineData) {
          imageData = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`
          foundImage = true
          break
        }
      }

      if (!foundImage) {
        // Fallback: Generate new image with Imagen if editing didn't work
        console.log('Image editing not available, falling back to text-to-image generation')
        const imagenResponse = await genaiClient.models.generateImages({
          model: 'imagen-3.0-fast-generate-001', // Imagen 3 Fast - available model
          prompt: enhancedPrompt,
          config: {
            numberOfImages: 1,
            aspectRatio: settings?.aspectRatio === '16:9' ? '16:9' : 
                        settings?.aspectRatio === '9:16' ? '9:16' : 
                        settings?.aspectRatio === '4:5' ? '3:4' : '1:1',
          }
        })

        if (!imagenResponse.generatedImages || imagenResponse.generatedImages.length === 0) {
          throw new Error('No image generated')
        }

        const generatedImage = imagenResponse.generatedImages[0]
        imageData = `data:image/png;base64,${generatedImage.image?.imageBytes}`
      }

    } else {
      // Text-to-Image mode using Imagen 3 Fast
      const response = await genaiClient.models.generateImages({
        model: 'imagen-3.0-fast-generate-001', // Imagen 3 Fast - available model
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

      imageData = `data:image/png;base64,${generatedImage.image.imageBytes}`
    }

    console.log('✅ Image generated successfully')

    return NextResponse.json({
      success: true,
      prompt: prompt,
      enhancedPrompt: enhancedPrompt,
      imageData: imageData,
      settings: settings,
      mode: mode || 'text-to-image',
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

    // Handle specific error types
    if (error.message?.includes('SAFETY') || error.message?.includes('blocked')) {
      return NextResponse.json(
        { 
          error: 'Content blocked by safety filters',
          message: 'Your prompt was blocked by safety filters. Please try a different description.'
        },
        { status: 400 }
      )
    }

    if (error.message?.includes('quota') || error.message?.includes('rate')) {
      return NextResponse.json(
        { 
          error: 'API rate limit reached',
          message: 'Too many requests. Please wait a moment and try again.'
        },
        { status: 429 }
      )
    }
    
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
