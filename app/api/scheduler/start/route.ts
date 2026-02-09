import { NextRequest, NextResponse } from 'next/server'

// This endpoint just triggers a check immediately
// For recurring checks, use the cron job in vercel.json

export async function GET(request: NextRequest) {
  try {
    // Just run a check immediately
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const response = await fetch(`${baseUrl}/api/scheduler/check`, {
      headers: request.headers
    })
    const data = await response.json()

    return NextResponse.json({
      success: true,
      message: 'Scheduler check triggered',
      result: data
    })

  } catch (error: any) {
    console.error('Failed to trigger scheduler:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}
