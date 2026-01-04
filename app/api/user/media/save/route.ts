import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/middleware'
import pool from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request)
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { imageUrl, imageData, prompt, enhancedPrompt, model, mode, sourceImageUrl, settings } = await request.json()

    if (!imageUrl && !imageData) {
      return NextResponse.json({ success: false, error: 'Image URL or data is required' }, { status: 400 })
    }

    // Use imageUrl if provided, otherwise store base64 data URL
    const urlToStore = imageUrl || imageData

    // Ensure prompts are saved (never null)
    const finalPrompt = prompt || 'AI Generated Image'
    const finalEnhancedPrompt = enhancedPrompt || null
    
    const result = await pool.query(
      `INSERT INTO ai_images (user_id, prompt, enhanced_prompt, image_url, source_image_url, model, mode, settings, credits_used)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING id`,
      [
        user.id,
        finalPrompt,
        finalEnhancedPrompt,
        urlToStore,
        sourceImageUrl || null,
        model || 'unknown',
        mode || 'text-to-image',
        JSON.stringify(settings || {}),
        0  // Credits already deducted during generation
      ]
    )

    return NextResponse.json({
      success: true,
      id: result.rows[0].id,
      message: 'Image saved to My Media!'
    })

  } catch (error: any) {
    console.error('Error saving image:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to save image',
      details: error.message 
    }, { status: 500 })
  }
}
