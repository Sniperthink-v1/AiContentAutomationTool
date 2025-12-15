import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/middleware'
import RunwayML from '@runwayml/sdk'

const client = new RunwayML({
  apiKey: process.env.RUNWAY_API_SECRET!
})

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser(req)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const taskId = searchParams.get('taskId')

    if (!taskId) {
      return NextResponse.json({ 
        error: 'taskId is required' 
      }, { status: 400 })
    }

    console.log('Checking task status:', taskId)

    // Get task status from Runway
    const task = await client.tasks.retrieve(taskId)

    const status = task.status // 'PENDING', 'RUNNING', 'SUCCEEDED', 'FAILED'
    const progress = task.progress || 0

    let response: any = {
      success: true,
      taskId: task.id,
      status: status.toLowerCase(),
      progress: Math.round(progress * 100)
    }

    if (status === 'SUCCEEDED') {
      // Task completed successfully
      response.audioUrl = task.output?.[0] || (task as any).artifacts?.[0]?.url
      response.message = 'Audio generation complete!'
    } else if (status === 'FAILED') {
      response.success = false
      response.error = task.failure || 'Task failed'
      response.message = 'Audio generation failed'
    } else {
      response.message = 'Processing...'
    }

    return NextResponse.json(response)
  } catch (error: any) {
    console.error('Task check error:', error)
    return NextResponse.json({ 
      error: error.message || 'Failed to check task status' 
    }, { status: 500 })
  }
}
