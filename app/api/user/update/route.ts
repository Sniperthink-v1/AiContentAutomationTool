import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { UpdateUserRequest } from '@/lib/types/user'
import { getAuthUser } from '@/lib/middleware'

export async function PUT(request: NextRequest) {
  try {
    // Get authenticated user - users can ONLY update their own profile
    const authUser = await getAuthUser(request)
    if (!authUser) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body: UpdateUserRequest = await request.json()

    console.log('📝 Update User Request:', {
      userId: authUser.id,
      firstName: body.firstName,
      lastName: body.lastName,
      bio: body.bio?.substring(0, 50)
    })

    const {
      firstName,
      lastName,
      username,
      bio,
      avatarUrl,
      instagramAccessToken,
      instagramUserId
    } = body

    // Build dynamic update query
    const updates: string[] = []
    const values: any[] = []
    let paramCount = 1

    if (firstName !== undefined) {
      updates.push(`first_name = $${paramCount++}`)
      values.push(firstName)
    }
    if (lastName !== undefined) {
      updates.push(`last_name = $${paramCount++}`)
      values.push(lastName)
    }
    if (username !== undefined) {
      updates.push(`username = $${paramCount++}`)
      values.push(username)
    }
    if (bio !== undefined) {
      updates.push(`bio = $${paramCount++}`)
      values.push(bio)
    }
    if (avatarUrl !== undefined) {
      updates.push(`avatar_url = $${paramCount++}`)
      values.push(avatarUrl)
    }
    if (instagramAccessToken !== undefined) {
      updates.push(`instagram_access_token = $${paramCount++}`)
      values.push(instagramAccessToken)
    }
    if (instagramUserId !== undefined) {
      updates.push(`instagram_user_id = $${paramCount++}`)
      values.push(instagramUserId)
    }

    if (updates.length === 0) {
      console.log('❌ No fields to update')
      return NextResponse.json(
        { success: false, error: 'No fields to update' },
        { status: 400 }
      )
    }

    // Use authenticated user's ID - NOT from request body
    values.push(authUser.id)

    const sqlQuery = `UPDATE users 
       SET ${updates.join(', ')}, updated_at = NOW()
       WHERE id = $${paramCount}
       RETURNING *`
    
    console.log('🔍 SQL Query:', sqlQuery)
    console.log('🔍 Values:', values)

    const result = await query(sqlQuery, values)

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      )
    }

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
        instagramAccessToken: user.instagram_access_token,
        instagramUserId: user.instagram_user_id,
        updatedAt: user.updated_at
      },
      message: 'User updated successfully'
    })

  } catch (error: any) {
    console.error('Update User Error:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to update user', 
        details: error.message 
      },
      { status: 500 }
    )
  }
}
