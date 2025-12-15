import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/db'
import { hashPassword, createSession, createSessionCookie } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const { firstName, lastName, email, password } = await request.json()

    // Validation
    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: 'Email and password are required' },
        { status: 400 }
      )
    }

    if (password.length < 8) {
      return NextResponse.json(
        { success: false, error: 'Password must be at least 8 characters' },
        { status: 400 }
      )
    }

    // Check if user exists
    const existingUser = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [email.toLowerCase()]
    )

    if (existingUser.rows.length > 0) {
      return NextResponse.json(
        { success: false, error: 'Email already registered' },
        { status: 409 }
      )
    }

    // Hash password
    const passwordHash = await hashPassword(password)

    // Create user
    const result = await pool.query(
      `INSERT INTO users (email, password_hash, first_name, last_name)
       VALUES ($1, $2, $3, $4)
       RETURNING id, email, first_name, last_name`,
      [email.toLowerCase(), passwordHash, firstName, lastName]
    )

    const user = result.rows[0]

    // Create initial credits (1000)
    await pool.query(
      `INSERT INTO credits (user_id, total_credits, used_credits, remaining_credits)
       VALUES ($1, 1000, 0, 1000)`,
      [user.id]
    )

    // Create session with user data in JWT
    const sessionToken = await createSession(
      user.id,
      user.email,
      user.first_name,
      user.last_name
    )
    const sessionCookie = createSessionCookie(sessionToken)

    // Save session to database
    await pool.query(
      `INSERT INTO sessions (user_id, session_token, expires_at, ip_address, user_agent)
       VALUES ($1, $2, NOW() + INTERVAL '7 days', $3, $4)`,
      [
        user.id,
        sessionToken,
        request.headers.get('x-forwarded-for') || 'unknown',
        request.headers.get('user-agent') || 'unknown'
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
    console.error('Signup error:', error)
    return NextResponse.json(
      { success: false, error: 'Registration failed. Please try again.' },
      { status: 500 }
    )
  }
}
