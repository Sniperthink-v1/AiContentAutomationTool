import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getAuthUser } from '@/lib/middleware';

// POST /api/instagram/disconnect - Disconnect Instagram account
export async function POST(request: NextRequest) {
  try {
    // Get authenticated user
    const user = await getAuthUser(request);
    
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      );
    }

    // Remove Instagram integration from database for this user
    const result = await pool.query(
      "UPDATE social_integrations SET is_active = false, access_token = NULL, updated_at = NOW() WHERE user_id = $1 AND platform = 'instagram'",
      [user.id]
    );

    console.log(`Instagram disconnected for user ${user.id}`);

    // Create response
    const response = NextResponse.json({
      success: true,
      message: 'Instagram disconnected successfully'
    });

    // Clear Instagram cookies
    response.cookies.set('ig_access_token', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 0,
      path: '/',
    });

    response.cookies.set('ig_user_id', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 0,
      path: '/',
    });

    response.cookies.set('ig_username', '', {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 0,
      path: '/',
    });

    return response;

  } catch (error) {
    console.error('Instagram disconnect error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to disconnect Instagram' },
      { status: 500 }
    );
  }
}
