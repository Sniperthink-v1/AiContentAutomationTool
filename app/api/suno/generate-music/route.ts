import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/middleware'
import pool from '@/lib/db'

const SUNO_API_KEY = process.env.SUNO_API_KEY
const SUNO_API_URL = 'https://api.sunoapi.org/api/v1'

// Credit costs based on model and duration
const CREDIT_COSTS = {
  'V3_5': 10,  // ~2 minutes, 10 AI credits
  'V4': 15,    // ~4 minutes, 15 AI credits
  'V4_5': 20,  // ~8 minutes, 20 AI credits
  'V4_5PLUS': 25, // ~8 minutes, 25 AI credits
  'V5': 30     // ~8 minutes, fastest, 30 AI credits
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request)
    
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { 
      prompt,
      style,
      title,
      customMode = false,
      instrumental = false,
      model = 'V3_5',
      negativeTags,
      vocalGender,
      styleWeight,
      weirdnessConstraint,
      audioWeight
    } = await request.json()

    console.log('🎵 Suno Music Generation Request:', {
      customMode,
      instrumental,
      model,
      hasPrompt: !!prompt,
      hasStyle: !!style,
      hasTitle: !!title
    })

    // Validate based on customMode
    if (customMode) {
      if (instrumental) {
        if (!style || !title) {
          return NextResponse.json(
            { error: 'Custom Mode with instrumental requires style and title' },
            { status: 400 }
          )
        }
      } else {
        if (!style || !title || !prompt) {
          return NextResponse.json(
            { error: 'Custom Mode without instrumental requires style, title, and prompt' },
            { status: 400 }
          )
        }
        
        // Check prompt length based on model
        const maxPromptLength = ['V3_5', 'V4'].includes(model) ? 3000 : 5000
        if (prompt.length > maxPromptLength) {
          return NextResponse.json(
            { error: `Prompt exceeds ${maxPromptLength} characters for ${model} model` },
            { status: 400 }
          )
        }
      }
      
      // Validate style length
      const maxStyleLength = ['V3_5', 'V4'].includes(model) ? 200 : 1000
      if (style && style.length > maxStyleLength) {
        return NextResponse.json(
          { error: `Style exceeds ${maxStyleLength} characters for ${model} model` },
          { status: 400 }
        )
      }
      
      // Validate title length
      if (title && title.length > 80) {
        return NextResponse.json(
          { error: 'Title exceeds 80 characters' },
          { status: 400 }
        )
      }
    } else {
      // Non-custom mode
      if (!prompt) {
        return NextResponse.json(
          { error: 'Non-custom Mode requires a prompt' },
          { status: 400 }
        )
      }
      
      if (prompt.length > 500) {
        return NextResponse.json(
          { error: 'Prompt exceeds 500 characters for Non-custom Mode' },
          { status: 400 }
        )
      }
    }

    // Calculate required credits
    const requiredCredits = CREDIT_COSTS[model as keyof typeof CREDIT_COSTS] || 10

    // Check and deduct AI credits
    const client = await pool.connect()
    let remainingAICredits = 0
    
    try {
      await client.query('BEGIN')

      // Get current AI credits
      const creditsResult = await client.query(
        'SELECT ai_credits FROM credits WHERE user_id = $1 FOR UPDATE',
        [user.id]
      )

      if (creditsResult.rows.length === 0) {
        throw new Error('User credits not found')
      }

      const currentAICredits = creditsResult.rows[0].ai_credits || 0

      // Check if user has enough AI credits
      if (currentAICredits < requiredCredits) {
        await client.query('ROLLBACK')
        return NextResponse.json(
          { 
            error: 'Insufficient AI credits',
            remaining: currentAICredits,
            required: requiredCredits
          },
          { status: 400 }
        )
      }

      // Deduct AI credits
      remainingAICredits = currentAICredits - requiredCredits

      await client.query(
        `UPDATE credits 
         SET ai_credits = ai_credits - $1
         WHERE user_id = $2`,
        [requiredCredits, user.id]
      )

      await client.query('COMMIT')
      console.log('💳 AI Credits deducted:', { 
        used: requiredCredits, 
        remaining: remainingAICredits 
      })
      
    } catch (error: any) {
      await client.query('ROLLBACK')
      client.release()
      throw error
    } finally {
      client.release()
    }

    // Prepare Suno API request
    const sunoRequestBody: any = {
      customMode,
      instrumental,
      model,
      callBackUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/suno/callback`
    }

    // Add fields based on customMode
    if (customMode) {
      sunoRequestBody.style = style
      sunoRequestBody.title = title
      if (!instrumental && prompt) {
        sunoRequestBody.prompt = prompt
      }
    } else {
      sunoRequestBody.prompt = prompt
    }

    // Add optional parameters
    if (negativeTags) sunoRequestBody.negativeTags = negativeTags
    if (vocalGender) sunoRequestBody.vocalGender = vocalGender
    if (styleWeight !== undefined) sunoRequestBody.styleWeight = styleWeight
    if (weirdnessConstraint !== undefined) sunoRequestBody.weirdnessConstraint = weirdnessConstraint
    if (audioWeight !== undefined) sunoRequestBody.audioWeight = audioWeight

    console.log('📤 Calling Suno API:', sunoRequestBody)

    // Call Suno API
    const sunoResponse = await fetch(`${SUNO_API_URL}/generate`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUNO_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(sunoRequestBody)
    })

    if (!sunoResponse.ok) {
      const errorData = await sunoResponse.json().catch(() => ({ msg: 'API request failed' }))
      console.error('❌ Suno API Error:', {
        status: sunoResponse.status,
        error: errorData
      })
      throw new Error(errorData.msg || `Suno API error: ${sunoResponse.status}`)
    }

    const sunoData = await sunoResponse.json()
    console.log('✅ Suno API Response:', sunoData)

    if (sunoData.code !== 200) {
      throw new Error(sunoData.msg || 'Music generation failed')
    }

    return NextResponse.json({
      success: true,
      taskId: sunoData.data.taskId,
      model: model,
      creditsUsed: requiredCredits,
      remainingAICredits: remainingAICredits,
      estimatedTime: '2-3 minutes for download, 30-40 seconds for stream',
      timestamp: new Date().toISOString()
    })

  } catch (error: any) {
    console.error('Suno music generation error:', error)
    
    return NextResponse.json(
      { 
        error: 'Failed to generate music', 
        message: error.message || 'Unknown error occurred',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    )
  }
}

// GET endpoint to fetch model configurations
export async function GET() {
  return NextResponse.json({
    success: true,
    models: CREDIT_COSTS,
    limits: {
      customMode: {
        V3_5_V4: {
          prompt: 3000,
          style: 200,
          title: 80
        },
        V4_5_V4_5PLUS_V5: {
          prompt: 5000,
          style: 1000,
          title: 80
        }
      },
      nonCustomMode: {
        prompt: 500
      }
    }
  })
}
