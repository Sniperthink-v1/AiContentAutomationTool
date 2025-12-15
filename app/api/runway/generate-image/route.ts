import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/middleware'
import pool from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const { prompt, settings } = await request.json()

    console.log('🎨 Runway Image Generation Request:', { 
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
    if (!process.env.RUNWAY_API_KEY) {
      console.error('❌ Runway API key not configured')
      return NextResponse.json(
        { error: 'Runway API key not configured' },
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
      
      // Calculate credits based on quality setting: 5 for standard, 8 for high/ultra
      const isHighQuality = settings?.quality === 'high' || settings?.quality === 'ultra'
      const requiredCredits = isHighQuality ? 8 : 5

      // Check if user has enough credits
      if (currentCredits.remaining_credits < requiredCredits) {
        await client.query('ROLLBACK')
        return NextResponse.json(
          { 
            error: `Insufficient credits. You need ${requiredCredits} credits for ${isHighQuality ? 'high quality' : 'standard quality'} image generation.`,
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
        [user.id, 'image_generation', requiredCredits, 'runway-gen4-image', `Image generation: ${prompt.substring(0, 50)}...`]
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

    // Create detailed prompt with style and settings (max 1000 characters)
    const style = settings?.style || 'photorealistic'
    const mood = settings?.mood || 'vibrant'
    const lighting = settings?.lighting || 'natural'
    const quality = settings?.quality || 'high'
    
    let detailedPrompt = `${prompt}. Style: ${style}. Mood: ${mood}. Lighting: ${lighting}. ${quality === 'ultra' ? '4K resolution, ' : quality === 'high' ? 'High resolution, ' : ''}professional quality, detailed, sharp focus.`
    
    // Runway API has 1000 character limit for promptText
    if (detailedPrompt.length > 1000) {
      detailedPrompt = detailedPrompt.substring(0, 997) + '...'
    }

    // Map aspect ratio to Runway format (must use exact ratio strings from API)
    const aspectRatioMap: { [key: string]: string } = {
      '1:1': '1024:1024',
      '4:5': '1080:1440',
      '9:16': '720:1280',
      '16:9': '1280:720'
    }
    
    const ratio = aspectRatioMap[settings?.aspectRatio || '1:1'] || '1024:1024'

    console.log('🎬 Calling Runway API with:', { 
      model: 'gen4_image',
      promptLength: detailedPrompt.length,
      ratio
    })

    // Make API call to Runway Gen-4 Image for text-to-image
    const runwayResponse = await fetch('https://api.dev.runwayml.com/v1/text_to_image', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.RUNWAY_API_KEY}`,
        'Content-Type': 'application/json',
        'X-Runway-Version': '2024-11-06'
      },
      body: JSON.stringify({
        model: 'gen4_image',
        promptText: detailedPrompt,
        ratio: ratio
      })
    })

    if (!runwayResponse.ok) {
      const errorData = await runwayResponse.json().catch(() => ({ message: 'API request failed' }))
      console.error('❌ Runway API Error:', {
        status: runwayResponse.status,
        statusText: runwayResponse.statusText,
        error: JSON.stringify(errorData, null, 2)
      })
      throw new Error(errorData.message || errorData.error || `Runway API error: ${runwayResponse.status}`)
    }

    const runwayData = await runwayResponse.json()
    console.log('✅ Runway API Response:', { 
      taskId: runwayData.id,
      status: runwayData.status 
    })
    
    // Runway returns task ID for async generation
    const taskId = runwayData.id

    // Poll for completion
    let imageUrl = null
    let attempts = 0
    const maxAttempts = 60 // 5 minutes max wait

    while (!imageUrl && attempts < maxAttempts) {
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
        imageUrl = statusData.output?.[0] || statusData.artifacts?.[0]?.url
        break
      } else if (statusData.status === 'FAILED') {
        throw new Error(statusData.failure || 'Image generation failed')
      }

      attempts++
    }

    if (!imageUrl) {
      throw new Error('Image generation timed out')
    }

    // Fetch the image and convert to base64
    const imageResponse = await fetch(imageUrl)
    const imageBuffer = await imageResponse.arrayBuffer()
    const base64Image = Buffer.from(imageBuffer).toString('base64')
    const imageData = `data:image/png;base64,${base64Image}`

    return NextResponse.json({
      success: true,
      prompt: prompt,
      enhancedPrompt: detailedPrompt,
      imageData: imageData,
      imageUrl: imageUrl,
      settings: settings,
      timestamp: new Date().toISOString()
    })

  } catch (error: any) {
    console.error('Runway Image Generation Error:', error)
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
