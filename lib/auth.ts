import bcrypt from 'bcryptjs'
import { SignJWT, jwtVerify } from 'jose'

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'your-secret-key-change-in-production'
)

export interface SessionPayload {
  userId: string
  email: string
  firstName: string
  lastName: string
  expiresAt: Date
}

// Hash password
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10)
}

// Verify password
export async function verifyPassword(
  password: string,
  hashedPassword: string
): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword)
}

// Create JWT session token with user data
export async function createSession(
  userId: string,
  email: string,
  firstName: string,
  lastName: string
): Promise<string> {
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
  
  const token = await new SignJWT({ userId, email, firstName, lastName })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('7d')
    .setIssuedAt()
    .sign(JWT_SECRET)

  return token
}

// Verify JWT session token
export async function verifySession(token: string): Promise<SessionPayload | null> {
  try {
    const verified = await jwtVerify(token, JWT_SECRET)
    const payload = verified.payload as any
    
    return {
      userId: payload.userId,
      email: payload.email,
      firstName: payload.firstName,
      lastName: payload.lastName,
      expiresAt: new Date(payload.exp! * 1000)
    }
  } catch (error) {
    return null
  }
}

// Get session from cookies
export function getSessionFromCookie(cookieHeader: string | null): string | null {
  if (!cookieHeader) return null
  
  const cookies = cookieHeader.split(';').map(c => c.trim())
  const sessionCookie = cookies.find(c => c.startsWith('session='))
  
  if (!sessionCookie) return null
  
  return sessionCookie.split('=')[1]
}

// Create session cookie string
export function createSessionCookie(token: string): string {
  const maxAge = 7 * 24 * 60 * 60 // 7 days in seconds
  
  return `session=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}; ${
    process.env.NODE_ENV === 'production' ? 'Secure;' : ''
  }`
}

// Clear session cookie
export function clearSessionCookie(): string {
  return 'session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0'
}
