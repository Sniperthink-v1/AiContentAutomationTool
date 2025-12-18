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
      `SELECT * FROM credit_transactions 
       WHERE user_id = $1 
       ORDER BY created_at DESC 
       LIMIT 50`,
      [user.id]
    )

    return NextResponse.json({
      success: true,
      transactions: result.rows
    })

  } catch (error: any) {
    console.error('Error fetching credit history:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch history', details: error.message },
      { status: 500 }
    )
  }
}
