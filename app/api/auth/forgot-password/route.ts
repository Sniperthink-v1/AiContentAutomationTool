import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/db'
import crypto from 'crypto'
import { sendPasswordResetEmail } from '@/lib/email'

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()

    // Validation
    if (!email) {
      return NextResponse.json(
        { success: false, error: 'Email is required' },
        { status: 400 }
      )
    }

    // Find user (don't reveal if user exists or not for security)
    const userResult = await pool.query(
      'SELECT id, email, first_name FROM users WHERE email = $1 AND is_active = TRUE',
      [email.toLowerCase()]
    )

    // Always return success message to prevent email enumeration
    if (userResult.rows.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'If an account exists with this email, you will receive a password reset link.'
      })
    }

    const user = userResult.rows[0]

    // Rate limiting: Check for recent reset requests (max 3 per hour)
    const recentResets = await pool.query(
      `SELECT COUNT(*) as count FROM password_resets 
       WHERE user_id = $1 AND created_at > NOW() - INTERVAL '1 hour'`,
      [user.id]
    )

    if (parseInt(recentResets.rows[0].count) >= 3) {
      return NextResponse.json(
        { success: false, error: 'Too many reset requests. Please try again in an hour.' },
        { status: 429 }
      )
    }

    // Invalidate previous reset tokens
    await pool.query(
      'UPDATE password_resets SET used = TRUE WHERE user_id = $1 AND used = FALSE',
      [user.id]
    )

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex')
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000) // 1 hour

    // Store reset token
    await pool.query(
      `INSERT INTO password_resets (user_id, token, expires_at)
       VALUES ($1, $2, $3)`,
      [user.id, resetToken, expiresAt]
    )

    // Send reset email
    const emailResult = await sendPasswordResetEmail(email, resetToken, user.first_name)

    if (!emailResult.success) {
      console.error('Failed to send reset email:', emailResult.error)
      return NextResponse.json(
        { success: false, error: 'Failed to send reset email. Please try again.' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'If an account exists with this email, you will receive a password reset link.'
    })
  } catch (error: any) {
    console.error('Forgot password error:', error)
    return NextResponse.json(
      { success: false, error: 'Something went wrong. Please try again.' },
      { status: 500 }
    )
  }
}
