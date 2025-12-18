import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { getAuthUser } from '@/lib/middleware'
import pool from '@/lib/db'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)

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

    const { caption } = await request.json()

    if (!caption || caption.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'Caption is required' },
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
        { error: 'Insufficient AI credits. You need 5 AI credits for this improvement.' },
        { status: 400 }
      )
    }

    const promptText = `You are a professional social media copywriter. Improve the following caption by:
1. Fixing any grammar and spelling mistakes
2. Making it more engaging and natural
3. Maintaining the original tone and message
4. Keeping it concise and suitable for social media

Original caption: "${caption}"

Return ONLY the improved caption without any explanations or additional text.`

    // Try multiple models with retry logic
    const models = ['gemini-2.5-flash', 'gemini-flash-latest', 'gemini-2.0-flash-exp']
    let lastError: any = null
    let improvedCaption = ''

    for (const modelName of models) {
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          const model = genAI.getGenerativeModel({ model: modelName })
          const result = await model.generateContent(promptText)
          improvedCaption = result.response.text().trim()
          
          if (improvedCaption) {
            break // Success
          }
        } catch (error: any) {
          lastError = error
          
          // If not overloaded, try next model
          if (!error.message?.includes('overloaded') && error.status !== 503) {
            break
          }
          
          // Exponential backoff
          if (attempt < 2) {
            await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000))
          }
        }
      }
      
      if (improvedCaption) {
        break
      }
    }
    
    if (!improvedCaption) {
      throw lastError || new Error('Failed to improve caption')
    }

    // Remove quotes if present
    const finalCaption = improvedCaption.replace(/^["']|["']$/g, '')

    // Deduct 5 AI credits after successful improvement
    await pool.query(
      'UPDATE credits SET ai_credits = ai_credits - 5 WHERE user_id = $1',
      [user.id]
    )

    return NextResponse.json({
      success: true,
      original: caption,
      improved: finalCaption,
      aiCreditsDeducted: 5
    })

  } catch (error: any) {
    console.error('Error improving caption:', error)
    
    // Check if it's an API overload error
    if (error.message?.includes('overloaded') || error.status === 503) {
      return NextResponse.json(
        { success: false, error: 'AI service is currently busy. Please try again in a few moments.' },
        { status: 503 }
      )
    }
    
    return NextResponse.json(
      { success: false, error: 'Failed to improve caption', details: error.message },
      { status: 500 }
    )
  }
}
