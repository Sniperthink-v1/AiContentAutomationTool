import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/middleware'
import pool from '@/lib/db'
import { notifyPhotoGenerated, notifyLowCredits } from '@/lib/notifications'

export async function POST(request: NextRequest) {
  try {
    const { prompt, sourceImage, settings } = await request.json()

    console.log('🎨 Runway Image-to-Image Request:', { 
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

    if (!sourceImage) {
      return NextResponse.json(
        { error: 'Source image is required for image-to-image generation' },
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

    const requiredCredits = 2  // gen4_image_turbo costs 2 credits for any resolution

    // CHECK credits first (but don't deduct yet)
    const checkResult = await pool.query(
      'SELECT * FROM credits WHERE user_id = $1',
      [user.id]
    )

    if (checkResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'User credits not found' },
        { status: 400 }
      )
    }

    const currentCredits = checkResult.rows[0]

    // Check if user has enough credits
    if (currentCredits.remaining_credits < requiredCredits) {
      return NextResponse.json(
        { 
          error: 'Insufficient credits. You need 2 credits for image-to-image generation.',
          remaining: currentCredits.remaining_credits,
          required: requiredCredits
        },
        { status: 400 }
      )
    }

    // Create detailed prompt with style and settings
    const style = settings?.style || 'photorealistic'
    const mood = settings?.mood || 'vibrant'
    const lighting = settings?.lighting || 'natural'
    
    let detailedPrompt = `${prompt}. Style: ${style}. Mood: ${mood}. Lighting: ${lighting}. Professional quality, detailed, sharp focus.`
    
    // Runway API has 1000 character limit for promptText
    if (detailedPrompt.length > 1000) {
      detailedPrompt = detailedPrompt.substring(0, 997) + '...'
    }

    // Map aspect ratio to Runway format
    const aspectRatioMap: { [key: string]: string } = {
      '1:1': '1024:1024',
      '4:5': '1080:1440',
      '9:16': '720:1280',
      '16:9': '1280:720'
    }
    
    const ratio = aspectRatioMap[settings?.aspectRatio || '1:1'] || '1024:1024'

    console.log('🎬 Calling Runway API with:', { 
      model: 'gen4_image_turbo',
      promptLength: detailedPrompt.length,
      ratio,
      hasReferenceImage: true
    })

    // Make API call to Runway Gen-4 Image Turbo for image-to-image
    const runwayResponse = await fetch('https://api.dev.runwayml.com/v1/text_to_image', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.RUNWAY_API_KEY}`,
        'Content-Type': 'application/json',
        'X-Runway-Version': '2024-11-06'
      },
      body: JSON.stringify({
        model: 'gen4_image_turbo',
        promptText: detailedPrompt,
        ratio: ratio,
        referenceImages: [{
          uri: sourceImage,
          weight: 0.8
        }]
      })
    })

    if (!runwayResponse.ok) {
      const errorData = await runwayResponse.json().catch(() => ({ message: 'API request failed' }))
      console.error('❌ Runway API Error:', {
        status: runwayResponse.status,
        statusText: runwayResponse.statusText,
        error: JSON.stringify(errorData, null, 2)
      })
      return NextResponse.json(
        { error: errorData.message || errorData.error || `Runway API error: ${runwayResponse.status}` },
        { status: 500 }
      )
    }

    const runwayData = await runwayResponse.json()
    console.log('✅ Runway API Response:', { 
      taskId: runwayData.id,
      status: runwayData.status,
      fullResponse: JSON.stringify(runwayData).substring(0, 500)
    })
    
    // Runway returns task ID for async generation
    const taskId = runwayData.id

    if (!taskId) {
      console.error('❌ No task ID returned from Runway:', runwayData)
      return NextResponse.json(
        { error: 'No task ID returned from Runway API' },
        { status: 500 }
      )
    }

    // Poll for completion
    let imageUrl = null
    let attempts = 0
    const maxAttempts = 60 // 5 minutes max wait

    console.log(`🔄 Starting to poll for task ${taskId}...`)

    while (!imageUrl && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 5000)) // Wait 5 seconds
      attempts++
      
      console.log(`🔄 Poll attempt ${attempts}/${maxAttempts} for task ${taskId}`)

      try {
        const statusResponse = await fetch(`https://api.dev.runwayml.com/v1/tasks/${taskId}`, {
          headers: {
            'Authorization': `Bearer ${process.env.RUNWAY_API_KEY}`,
            'X-Runway-Version': '2024-11-06'
          }
        })

        if (!statusResponse.ok) {
          console.error(`❌ Status check failed: ${statusResponse.status} ${statusResponse.statusText}`)
          continue
        }

        const statusData = await statusResponse.json()
        console.log(`📊 Task status: ${statusData.status}`, {
          progress: statusData.progress,
          hasOutput: !!statusData.output,
          hasArtifacts: !!statusData.artifacts
        })

        if (statusData.status === 'SUCCEEDED') {
          imageUrl = statusData.output?.[0] || statusData.artifacts?.[0]?.url
          console.log(`✅ Task succeeded! Image URL: ${imageUrl?.substring(0, 100)}...`)
          break
        } else if (statusData.status === 'FAILED') {
          const failureReason = statusData.failure || statusData.error || 'Image transformation failed'
          console.error('❌ Task failed:', failureReason)
          
          // Provide user-friendly error messages for common failures
          let userMessage = failureReason
          if (failureReason.toLowerCase().includes('content moderation') || 
              failureReason.toLowerCase().includes('moderation')) {
            userMessage = 'Your prompt was blocked by content moderation. Please try a different prompt that doesn\'t include sensitive content (violence, adult themes, etc.)'
          } else if (failureReason.toLowerCase().includes('nsfw')) {
            userMessage = 'Your image or prompt contains content that is not allowed. Please use appropriate content.'
          }
          
          // Don't deduct credits on failure
          return NextResponse.json(
            { error: userMessage },
            { status: 400 } // Use 400 for user-caused errors, not 500
          )
        }
      } catch (pollError: any) {
        console.error(`❌ Poll error on attempt ${attempts}:`, pollError.message)
        // Continue polling despite errors
      }
    }

    if (!imageUrl) {
      console.error(`❌ Timeout after ${attempts} attempts`)
      // Don't deduct credits on timeout
      return NextResponse.json(
        { error: 'Image transformation timed out after 5 minutes' },
        { status: 500 }
      )
    }

    console.log('🖼️ Fetching generated image...')

    // SUCCESS! Now deduct credits
    const client = await pool.connect()
    try {
      await client.query('BEGIN')

      // Get fresh credits and deduct
      const freshCredits = await client.query(
        'SELECT * FROM credits WHERE user_id = $1 FOR UPDATE',
        [user.id]
      )

      const credits = freshCredits.rows[0]
      const newUsedCredits = credits.used_credits + requiredCredits
      const newRemainingCredits = credits.total_credits - newUsedCredits

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
        [user.id, 'image_to_image', requiredCredits, 'runway-gen4-image-turbo', `Image transformation: ${prompt.substring(0, 50)}...`]
      )

      await client.query('COMMIT')
      
      console.log('💳 Credits deducted AFTER success:', {
        remaining: newRemainingCredits,
        used: requiredCredits
      })

      // Send notification for successful image generation
      await notifyPhotoGenerated(parseInt(user.id), prompt.substring(0, 30))
      
      // Send low credits warning if below 50
      if (newRemainingCredits < 50) {
        await notifyLowCredits(parseInt(user.id), newRemainingCredits)
      }
    } catch (dbError) {
      await client.query('ROLLBACK')
      console.error('Failed to deduct credits:', dbError)
      // Still return the image even if credit deduction fails
    } finally {
      client.release()
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
    console.error('Runway Image-to-Image Error:', error)
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    })
    
    return NextResponse.json(
      { 
        error: 'Failed to transform image', 
        message: error.message || 'Unknown error occurred',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    )
  }
}
