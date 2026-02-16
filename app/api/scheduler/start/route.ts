import { NextRequest, NextResponse } from 'next/server'

// This endpoint just triggers a check immediately
// For recurring checks, use the cron job in vercel.json

export async function GET(request: NextRequest) {
  try {
    // Verify cron secret for automated cron jobs
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET
    
    // Allow access if:
    // 1. Request comes from Vercel cron (checks x-vercel-cron header)
    // 2. Request has valid CRON_SECRET in authorization header
    const isVercelCron = request.headers.get('x-vercel-cron') === '1'
    const hasValidSecret = cronSecret && authHeader === `Bearer ${cronSecret}`
    
    if (!isVercelCron && !hasValidSecret) {
      console.log('⚠️ Unauthorized scheduler start attempt')
      return NextResponse.json(
        { success: false, error: 'Unauthorized - Invalid cron secret' },
        { status: 401 }
      )
    }

    // Just run a check immediately
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    
    // Pass through the authorization header for the check endpoint
    const headers = new Headers()
    if (authHeader) {
      headers.set('authorization', authHeader)
    }
    if (isVercelCron) {
      headers.set('x-vercel-cron', '1')
    }
    
    const response = await fetch(`${baseUrl}/api/scheduler/check`, {
      headers
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
