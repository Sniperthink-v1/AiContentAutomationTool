import { NextRequest, NextResponse } from 'next/server'
import { clearSessionCookie } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    // Since we're using JWT (stateless), we just clear the cookie
    // No need to delete from database as we don't store JWT sessions
    
    const response = NextResponse.json({
      success: true,
      message: 'Logged out successfully'
    })

    // Clear the session cookie
    response.headers.set('Set-Cookie', clearSessionCookie())

    return response
  } catch (error: any) {
    console.error('Logout error:', error)
    return NextResponse.json(
      { success: false, error: 'Logout failed' },
      { status: 500 }
    )
  }
}
