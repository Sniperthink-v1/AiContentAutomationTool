import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/db'
import { getAuthUser } from '@/lib/middleware'

export async function POST(request: NextRequest) {
  const client = await pool.connect()
  
  try {
    const { actionType, creditsUsed, modelUsed, duration, description } = await request.json()

    // Get authenticated user
    const user = await getAuthUser(request)
    
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Start transaction
    await client.query('BEGIN')

    // Get current credits
    const creditsResult = await client.query(
      'SELECT * FROM credits WHERE user_id = $1 FOR UPDATE',
      [user.id]
    )

    if (creditsResult.rows.length === 0) {
      throw new Error('User not found')
    }

    const currentCredits = creditsResult.rows[0]

    // Check if user has enough credits
    if (currentCredits.remaining_credits < creditsUsed) {
      await client.query('ROLLBACK')
      return NextResponse.json(
        { 
          success: false, 
          error: 'Insufficient credits',
          remaining: currentCredits.remaining_credits,
          required: creditsUsed
        },
        { status: 400 }
      )
    }

    // Deduct credits - ensure it doesn't go below 0
    const newUsedCredits = currentCredits.used_credits + creditsUsed
    const newRemainingCredits = Math.max(0, currentCredits.total_credits - newUsedCredits)

    await client.query(
      `UPDATE credits 
       SET used_credits = $1, remaining_credits = GREATEST(0, $2)
       WHERE user_id = $3`,
      [newUsedCredits, newRemainingCredits, user.id]
    )

    // Record transaction
    await client.query(
      `INSERT INTO credit_transactions 
       (user_id, action_type, credits_used, model_used, duration, description)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [user.id, actionType, creditsUsed, modelUsed, duration, description]
    )

    // Commit transaction
    await client.query('COMMIT')

    return NextResponse.json({
      success: true,
      remaining_credits: newRemainingCredits,
      credits_used: creditsUsed
    })

  } catch (error: any) {
    await client.query('ROLLBACK')
    console.error('Error deducting credits:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to deduct credits', details: error.message },
      { status: 500 }
    )
  } finally {
    client.release()
  }
}
