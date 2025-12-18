import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/db'
import { getAuthUser } from '@/lib/middleware'

export async function GET(request: NextRequest) {
  try {
    // Get authenticated user
    const user = await getAuthUser(request)
    
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const result = await pool.query(
      'SELECT * FROM credits WHERE user_id = $1',
      [user.id]
    )

    if (result.rows.length === 0) {
      // Create new user with 1000 regular credits and 500 AI credits
      const insertResult = await pool.query(
        `INSERT INTO credits (user_id, total_credits, used_credits, remaining_credits, ai_credits)
         VALUES ($1, 1000, 0, 1000, 500)
         RETURNING *`,
        [user.id]
      )
      
      return NextResponse.json({
        success: true,
        credits: insertResult.rows[0]
      })
    }

    return NextResponse.json({
      success: true,
      credits: result.rows[0]
    })

  } catch (error: any) {
    console.error('Error fetching credits:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch credits', details: error.message },
      { status: 500 }
    )
  }
}
