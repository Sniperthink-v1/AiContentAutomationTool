import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/db'
import { getAuthUser } from '@/lib/middleware'

export async function POST(request: NextRequest) {
  try {
    const { amount, description } = await request.json()

    if (!amount || amount <= 0) {
      return NextResponse.json(
        { success: false, error: 'Invalid amount' },
        { status: 400 }
      )
    }

    // Get authenticated user
    const user = await getAuthUser(request)
    
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Add credits
    const result = await pool.query(
      'UPDATE credits SET total_credits = total_credits + $1, remaining_credits = remaining_credits + $1 WHERE user_id = $2 RETURNING total_credits, remaining_credits',
      [amount, user.id]
    )

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      total_credits: result.rows[0].total_credits,
      remaining_credits: result.rows[0].remaining_credits,
      added: amount,
      description: description || 'Credit addition'
    })

  } catch (error: any) {
    console.error('Error adding credits:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to add credits', details: error.message },
      { status: 500 }
    )
  }
}
