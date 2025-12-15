import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { CreateUserRequest } from '@/lib/types/user'
import { getAuthUser } from '@/lib/middleware'

export async function POST(request: NextRequest) {
  try {
    const body: CreateUserRequest = await request.json()

    const {
      email,
      firstName,
      lastName,
      username,
      bio,
      avatarUrl
    } = body

    // Validate required fields
    if (!email) {
      return NextResponse.json(
        { success: false, error: 'Email is required' },
        { status: 400 }
      )
    }

    // Check if user already exists
    const existingUser = await query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    )

    if (existingUser.rows.length > 0) {
      return NextResponse.json(
        { success: false, error: 'User with this email already exists' },
        { status: 409 }
      )
    }

    // Insert user into database
    const result = await query(
      `INSERT INTO users 
        (email, first_name, last_name, username, bio, avatar_url) 
       VALUES ($1, $2, $3, $4, $5, $6) 
       RETURNING *`,
      [
        email,
        firstName || null,
        lastName || null,
        username || null,
        bio || null,
        avatarUrl || null
      ]
    )

    const user = result.rows[0]

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        username: user.username,
        bio: user.bio,
        avatarUrl: user.avatar_url,
        createdAt: user.created_at
      },
      message: 'User created successfully'
    }, { status: 201 })

  } catch (error: any) {
    console.error('Create User Error:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to create user', 
        details: error.message 
      },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    // Get authenticated user from session
    const authUser = await getAuthUser(request)
    if (!authUser) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    console.log('👤 Get User Request for:', authUser.id)

    // Get full user details from database
    const result = await query('SELECT * FROM users WHERE id = $1', [authUser.id])

    console.log(`📊 Found ${result.rows.length} user(s)`)

    if (result.rows.length === 0) {
      console.log('❌ User not found')
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      )
    }

    const user = result.rows[0]
    console.log('✅ User loaded:', { id: user.id, email: user.email, name: `${user.first_name} ${user.last_name}` })

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        username: user.username,
        bio: user.bio,
        avatarUrl: user.avatar_url,
        instagramAccessToken: user.instagram_access_token,
        instagramUserId: user.instagram_user_id,
        createdAt: user.created_at,
        updatedAt: user.updated_at
      }
    })

  } catch (error: any) {
    console.error('❌ Get User Error:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to get user', 
        details: error.message 
      },
      { status: 500 }
    )
  }
}
