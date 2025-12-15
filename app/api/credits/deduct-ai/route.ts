import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/db'
import { getAuthUser } from '@/lib/middleware'

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

    const { amount = 5 } = await request.json()

    // Check current AI credits balance
    const result = await pool.query(
      'SELECT ai_credits FROM credits WHERE user_id = $1',
      [user.id]
    )

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'User credits not found' },
        { status: 404 }
      )
    }

    const currentAICredits = result.rows[0].ai_credits || 0

    // Check if user has enough AI credits
    if (currentAICredits < amount) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Insufficient AI credits',
          remaining: currentAICredits,
          required: amount
        },
        { status: 400 }
      )
    }

    // Deduct AI credits - ensure it doesn't go below 0
    const updateResult = await pool.query(
      `UPDATE credits 
       SET ai_credits = GREATEST(0, ai_credits - $1)
       WHERE user_id = $2 AND ai_credits >= $1
       RETURNING *`,
      [amount, user.id]
    )

    if (updateResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Insufficient AI credits or concurrent update' },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      credits: updateResult.rows[0],
      deducted: amount
    })

  } catch (error: any) {
    console.error('Error deducting AI credits:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to deduct AI credits', details: error.message },
      { status: 500 }
    )
  }
}
