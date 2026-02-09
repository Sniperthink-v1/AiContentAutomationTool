import { NextRequest, NextResponse } from 'next/server'

// This endpoint starts a background scheduler that checks every minute
let schedulerInterval: NodeJS.Timeout | null = null

export async function GET(request: NextRequest) {
  try {
    // Clear existing interval if any
    if (schedulerInterval) {
      clearInterval(schedulerInterval)
      schedulerInterval = null
    }

    // Start new interval - check every minute
    schedulerInterval = setInterval(async () => {
      try {
        console.log('⏰ Auto-scheduler running...')
        const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/scheduler/check`)
        const data = await response.json()
        
        if (data.success && data.published > 0) {
          console.log(`✅ Auto-published ${data.published} post(s)`)
        }
      } catch (error) {
        console.error('Auto-scheduler error:', error)
      }
    }, 60 * 1000) // Check every 1 minute

    // Also run immediately
    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/scheduler/check`)
    const data = await response.json()

    return NextResponse.json({
      success: true,
      message: 'Scheduler started - checking every 1 minute',
      initialCheck: data
    })

  } catch (error: any) {
    console.error('Failed to start scheduler:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    if (schedulerInterval) {
      clearInterval(schedulerInterval)
      schedulerInterval = null
    }

    return NextResponse.json({
      success: true,
      message: 'Scheduler stopped'
    })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}
