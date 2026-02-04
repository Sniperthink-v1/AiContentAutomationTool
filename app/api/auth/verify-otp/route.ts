import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/db'
import { createSession, createSessionCookie } from '@/lib/auth'
import crypto from 'crypto'

export async function POST(request: NextRequest) {
  try {
    const { email, otp, purpose = 'login' } = await request.json()

    // Validation
    if (!email || !otp) {
      return NextResponse.json(
        { success: false, error: 'Email and OTP are required' },
        { status: 400 }
      )
    }

    // Find valid OTP
    const otpResult = await pool.query(
      `SELECT * FROM email_otps 
       WHERE email = $1 AND otp = $2 AND purpose = $3 
       AND verified = FALSE AND expires_at > NOW()
       ORDER BY created_at DESC LIMIT 1`,
      [email.toLowerCase(), otp, purpose]
    )

    if (otpResult.rows.length === 0) {
      // Increment attempts for the latest OTP
      await pool.query(
        `UPDATE email_otps SET attempts = attempts + 1 
         WHERE email = $1 AND purpose = $2 AND verified = FALSE 
         AND expires_at > NOW()`,
        [email.toLowerCase(), purpose]
      )

      // Check if max attempts reached
      const attemptsResult = await pool.query(
        `SELECT attempts FROM email_otps 
         WHERE email = $1 AND purpose = $2 AND verified = FALSE 
         AND expires_at > NOW()
         ORDER BY created_at DESC LIMIT 1`,
        [email.toLowerCase(), purpose]
      )

      if (attemptsResult.rows.length > 0 && attemptsResult.rows[0].attempts >= 5) {
        // Invalidate the OTP after 5 failed attempts
        await pool.query(
          `UPDATE email_otps SET verified = TRUE 
           WHERE email = $1 AND purpose = $2 AND verified = FALSE`,
          [email.toLowerCase(), purpose]
        )
        return NextResponse.json(
          { success: false, error: 'Too many incorrect attempts. Please request a new code.' },
          { status: 400 }
        )
      }

      return NextResponse.json(
        { success: false, error: 'Invalid or expired verification code' },
        { status: 400 }
      )
    }

    // Mark OTP as verified
    await pool.query(
      'UPDATE email_otps SET verified = TRUE WHERE id = $1',
      [otpResult.rows[0].id]
    )

    // Handle based on purpose
    if (purpose === 'login') {
      // Login the user
      const userResult = await pool.query(
        'SELECT * FROM users WHERE email = $1 AND is_active = TRUE',
        [email.toLowerCase()]
      )

      if (userResult.rows.length === 0) {
        return NextResponse.json(
          { success: false, error: 'User not found' },
          { status: 404 }
        )
      }

      const user = userResult.rows[0]

      // Update last login
      await pool.query(
        'UPDATE users SET last_login = NOW(), email_verified = TRUE WHERE id = $1',
        [user.id]
      )

      // Create session
      const sessionToken = await createSession(
        user.id,
        user.email,
        user.first_name || '',
        user.last_name || ''
      )
      const sessionCookie = createSessionCookie(sessionToken)

      // Save session to database
      const userAgent = (request.headers.get('user-agent') || 'unknown').substring(0, 250)
      await pool.query(
        `INSERT INTO sessions (user_id, session_token, expires_at, ip_address, user_agent)
         VALUES ($1, $2, NOW() + INTERVAL '7 days', $3, $4)`,
        [
          user.id,
          sessionToken,
          request.headers.get('x-forwarded-for') || 'unknown',
          userAgent
        ]
      )

      const response = NextResponse.json({
        success: true,
        message: 'Login successful',
        user: {
          id: user.id,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name
        }
      })

      response.headers.set('Set-Cookie', sessionCookie)
      return response
    }

    if (purpose === 'reset') {
      // Generate password reset token
      const resetToken = crypto.randomBytes(32).toString('hex')
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000) // 1 hour

      // Find user
      const userResult = await pool.query(
        'SELECT id FROM users WHERE email = $1',
        [email.toLowerCase()]
      )

      if (userResult.rows.length === 0) {
        return NextResponse.json(
          { success: false, error: 'User not found' },
          { status: 404 }
        )
      }

      // Store reset token
      await pool.query(
        `INSERT INTO password_resets (user_id, token, expires_at)
         VALUES ($1, $2, $3)`,
        [userResult.rows[0].id, resetToken, expiresAt]
      )

      return NextResponse.json({
        success: true,
        message: 'OTP verified. You can now reset your password.',
        resetToken
      })
    }

    if (purpose === 'signup') {
      return NextResponse.json({
        success: true,
        message: 'Email verified. You can now complete your registration.',
        emailVerified: true
      })
    }

    return NextResponse.json({ success: true, message: 'OTP verified successfully' })
  } catch (error: any) {
    console.error('Verify OTP error:', error)
    return NextResponse.json(
      { success: false, error: 'Verification failed. Please try again.' },
      { status: 500 }
    )
  }
}
