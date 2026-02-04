import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/db'
import { generateOTP, sendOTPEmail } from '@/lib/email'

export async function POST(request: NextRequest) {
  try {
    const { email, purpose = 'login' } = await request.json()

    // Validation
    if (!email) {
      return NextResponse.json(
        { success: false, error: 'Email is required' },
        { status: 400 }
      )
    }

    if (!['login', 'signup', 'reset'].includes(purpose)) {
      return NextResponse.json(
        { success: false, error: 'Invalid purpose' },
        { status: 400 }
      )
    }

    // Check if user exists (for login/reset, user must exist; for signup, user must NOT exist)
    const userResult = await pool.query(
      'SELECT id, email, first_name FROM users WHERE email = $1',
      [email.toLowerCase()]
    )

    const userExists = userResult.rows.length > 0

    if (purpose === 'login' || purpose === 'reset') {
      if (!userExists) {
        // Don't reveal that user doesn't exist for security
        return NextResponse.json({
          success: true,
          message: 'If an account exists with this email, you will receive a verification code.'
        })
      }
    }

    if (purpose === 'signup' && userExists) {
      return NextResponse.json(
        { success: false, error: 'Email already registered. Please login instead.' },
        { status: 409 }
      )
    }

    // Rate limiting: Check for recent OTPs (max 3 per 10 minutes)
    const recentOTPs = await pool.query(
      `SELECT COUNT(*) as count FROM email_otps 
       WHERE email = $1 AND created_at > NOW() - INTERVAL '10 minutes'`,
      [email.toLowerCase()]
    )

    if (parseInt(recentOTPs.rows[0].count) >= 3) {
      return NextResponse.json(
        { success: false, error: 'Too many OTP requests. Please try again in 10 minutes.' },
        { status: 429 }
      )
    }

    // Generate OTP
    const otp = generateOTP()
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000) // 10 minutes

    // Invalidate previous OTPs for this email and purpose
    await pool.query(
      `UPDATE email_otps SET verified = TRUE 
       WHERE email = $1 AND purpose = $2 AND verified = FALSE`,
      [email.toLowerCase(), purpose]
    )

    // Store OTP in database
    await pool.query(
      `INSERT INTO email_otps (email, otp, purpose, expires_at)
       VALUES ($1, $2, $3, $4)`,
      [email.toLowerCase(), otp, purpose, expiresAt]
    )

    // Send OTP email
    const emailResult = await sendOTPEmail(email, otp, purpose)

    if (!emailResult.success) {
      console.error('Failed to send OTP email:', emailResult.error)
      return NextResponse.json(
        { success: false, error: 'Failed to send verification code. Please try again.' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Verification code sent to your email.',
      expiresIn: 600 // 10 minutes in seconds
    })
  } catch (error: any) {
    console.error('Send OTP error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to send verification code. Please try again.' },
      { status: 500 }
    )
  }
}
