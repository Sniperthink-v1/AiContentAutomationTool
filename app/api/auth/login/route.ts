import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/db'
import { verifyPassword, createSession, createSessionCookie } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()

    // Validation
    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: 'Email and password are required' },
        { status: 400 }
      )
    }

    // Find user
    const result = await pool.query(
      'SELECT * FROM users WHERE email = $1 AND is_active = true',
      [email.toLowerCase()]
    )

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Invalid email or password' },
        { status: 401 }
      )
    }

    const user = result.rows[0]

    // Verify password
    const isValid = await verifyPassword(password, user.password_hash)

    if (!isValid) {
      return NextResponse.json(
        { success: false, error: 'Invalid email or password' },
        { status: 401 }
      )
    }

    // Update last login
    await pool.query(
      'UPDATE users SET last_login = NOW() WHERE id = $1',
      [user.id]
    )

    // Create session with user data in JWT
    const sessionToken = await createSession(
      user.id,
      user.email,
      user.first_name || '',
      user.last_name || ''
    )
    const sessionCookie = createSessionCookie(sessionToken)

    // Save session to database
    const userAgent = (request.headers.get('user-agent') || 'unknown').substring(0, 250) // Truncate to 250 chars
    
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
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name
      }
    })

    response.headers.set('Set-Cookie', sessionCookie)

    return response
  } catch (error: any) {
    console.error('Login error:', error)
    return NextResponse.json(
      { success: false, error: 'Login failed. Please try again.' },
      { status: 500 }
    )
  }
}
