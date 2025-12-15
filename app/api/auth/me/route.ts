import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/middleware'

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request)

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      )
    }

    return NextResponse.json({
      success: true,
      user
    })
  } catch (error: any) {
    console.error('Auth check error:', error)
    return NextResponse.json(
      { success: false, error: 'Authentication check failed' },
      { status: 500 }
    )
  }
}
