import { NextRequest, NextResponse } from 'next/server'
import { verifySession, getSessionFromCookie } from './auth'

export interface AuthenticatedRequest extends NextRequest {
  user?: {
    id: string
    email: string
    firstName: string
    lastName: string
  }
}

export async function requireAuth(request: NextRequest) {
  const cookieHeader = request.headers.get('cookie')
  const sessionToken = getSessionFromCookie(cookieHeader)

  if (!sessionToken) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized - No session token' },
      { status: 401 }
    )
  }

  const session = await verifySession(sessionToken)

  if (!session) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized - Invalid session' },
      { status: 401 }
    )
  }

  // User data is in JWT - no DB query needed!
  return {
    user: {
      id: session.userId,
      email: session.email,
      firstName: session.firstName,
      lastName: session.lastName
    }
  }
}

export async function getAuthUser(request: NextRequest) {
  const cookieHeader = request.headers.get('cookie')
  const sessionToken = getSessionFromCookie(cookieHeader)

  if (!sessionToken) return null

  const session = await verifySession(sessionToken)
  if (!session) return null

  // User data is already in the JWT payload - no DB query needed!
  return {
    id: session.userId,
    email: session.email,
    firstName: session.firstName,
    lastName: session.lastName
  }
}
