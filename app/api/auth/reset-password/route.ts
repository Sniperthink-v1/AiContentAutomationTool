import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/db'
import { hashPassword } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const { token, password } = await request.json()

    // Validation
    if (!token || !password) {
      return NextResponse.json(
        { success: false, error: 'Token and password are required' },
        { status: 400 }
      )
    }

    if (password.length < 8) {
      return NextResponse.json(
        { success: false, error: 'Password must be at least 8 characters' },
        { status: 400 }
      )
    }

    // Find valid reset token
    const tokenResult = await pool.query(
      `SELECT pr.*, u.email FROM password_resets pr
       JOIN users u ON pr.user_id = u.id
       WHERE pr.token = $1 AND pr.used = FALSE AND pr.expires_at > NOW()`,
      [token]
    )

    if (tokenResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Invalid or expired reset link. Please request a new one.' },
        { status: 400 }
      )
    }

    const resetData = tokenResult.rows[0]

    // Hash new password
    const passwordHash = await hashPassword(password)

    // Update user password
    await pool.query(
      'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2',
      [passwordHash, resetData.user_id]
    )

    // Mark token as used
    await pool.query(
      'UPDATE password_resets SET used = TRUE WHERE id = $1',
      [resetData.id]
    )

    // Invalidate all existing sessions for security
    await pool.query(
      'DELETE FROM sessions WHERE user_id = $1',
      [resetData.user_id]
    )

    return NextResponse.json({
      success: true,
      message: 'Password reset successful. Please login with your new password.'
    })
  } catch (error: any) {
    console.error('Reset password error:', error)
    return NextResponse.json(
      { success: false, error: 'Password reset failed. Please try again.' },
      { status: 500 }
    )
  }
}
