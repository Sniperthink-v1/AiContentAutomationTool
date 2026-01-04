import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/middleware'
import pool from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const { prompt, settings } = await request.json()

    console.log('🎨 Image Generation Request:', { 
      prompt: prompt?.substring(0, 50), 
      settings 
    })

    // Get authenticated user
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

    // Deduct credits (5 credits for 720p, 8 credits for 1080p with gen4_image)
    const client = await pool.connect()
    const requiredCredits = settings?.quality === 'high' ? 8 : 5
    
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
        `UPDATE credits SET used_credits = $1, remaining_credits = $2 WHERE user_id = $3`,
        [newUsedCredits, newRemainingCredits, user.id]
      )

      await client.query(
        `INSERT INTO credit_transactions (user_id, action_type, credits_used, model_used, description)
         VALUES ($1, $2, $3, $4, $5)`,
        [user.id, 'image_generation', requiredCredits, 'runway-gen4-image', `Image: ${prompt.substring(0, 50)}...`]
      )

      await client.query('COMMIT')
      console.log('💳 Credits deducted:', { remaining: newRemainingCredits, used: requiredCredits })
      
    } catch (error: any) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }

    console.log('🎬 Generating image with Runway gen4_image...')
    console.log('Prompt:', prompt.substring(0, 100))

    // Map aspect ratio to Runway format
    const aspectRatioMap: { [key: string]: string } = {
      '1:1': '1024:1024',
      '4:5': '1080:1440',
      '9:16': '720:1280',
      '16:9': '1280:720'
    }
    
    const ratio = aspectRatioMap[settings?.aspectRatio || '1:1'] || '1024:1024'

    const runwayApiKey = process.env.RUNWAY_API_KEY
    if (!runwayApiKey) {
      throw new Error('Runway API key not configured')
    }

    // Runway has 1000 character limit - truncate if needed
    const truncatedPrompt = prompt.length > 1000 ? prompt.substring(0, 997) + '...' : prompt
    console.log(`Prompt length: ${prompt.length}, using: ${truncatedPrompt.length} characters`)

    // Use Runway gen4_image for text-to-image (don't include referenceImages field at all)
    const runwayResponse = await fetch('https://api.dev.runwayml.com/v1/text_to_image', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${runwayApiKey}`,
        'Content-Type': 'application/json',
        'X-Runway-Version': '2024-11-06'
      },
      body: JSON.stringify({
        model: 'gen4_image',
        promptText: truncatedPrompt,
        ratio: ratio
      })
    })

    if (!runwayResponse.ok) {
      const errorData = await runwayResponse.json().catch(() => ({ message: 'API request failed' }))
      console.error('Runway API Error:', errorData)
      throw new Error(errorData.message || `Runway API error: ${runwayResponse.status}`)
    }

    const runwayData = await runwayResponse.json()
    const taskId = runwayData.id

    if (!taskId) {
      throw new Error('No task ID returned from Runway')
    }

    // Poll for completion
    let imageUrl = null
    let attempts = 0
    const maxAttempts = 60

    console.log(`🔄 Polling for task ${taskId}...`)

    while (!imageUrl && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 5000))
      attempts++

      const statusResponse = await fetch(`https://api.dev.runwayml.com/v1/tasks/${taskId}`, {
        headers: {
          'Authorization': `Bearer ${runwayApiKey}`,
          'X-Runway-Version': '2024-11-06'
        }
      })

      if (statusResponse.ok) {
        const statusData = await statusResponse.json()
        
        if (statusData.status === 'SUCCEEDED') {
          imageUrl = statusData.output?.[0] || statusData.artifacts?.[0]?.url
          break
        } else if (statusData.status === 'FAILED') {
          throw new Error(statusData.failure || 'Image generation failed')
        }
      }
    }

    if (!imageUrl) {
      throw new Error('Image generation timed out')
    }

    // Fetch and convert image to base64
    const imageResponse = await fetch(imageUrl)
    const imageBuffer = await imageResponse.arrayBuffer()
    const base64Image = Buffer.from(imageBuffer).toString('base64')
    const imageData = `data:image/png;base64,${base64Image}`

    console.log('✅ Image generated successfully with Runway gen4_image')

    return NextResponse.json({
      success: true,
      prompt: prompt,
      enhancedPrompt: prompt,
      imageData: imageData,
      settings: settings,
      model: 'runway-gen4-image',
      timestamp: new Date().toISOString()
    })

  } catch (error: any) {
    console.error('Image Generation Error:', error)
    
    return NextResponse.json(
      { 
        error: 'Failed to generate image', 
        message: error.message || 'Unknown error'
      },
      { status: 500 }
    )
  }
}
