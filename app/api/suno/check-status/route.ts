import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/middleware'

const SUNO_API_KEY = process.env.SUNO_API_KEY
const SUNO_API_URL = 'https://api.sunoapi.org/api/v1'

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request)
    
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const searchParams = request.nextUrl.searchParams
    const taskId = searchParams.get('taskId')

    if (!taskId) {
      return NextResponse.json(
        { error: 'taskId is required' },
        { status: 400 }
      )
    }

    console.log('🔍 Checking Suno task status:', taskId)

    // Call Suno API to get task status
    // Correct endpoint: /generate/record-info with taskId query parameter
    const sunoResponse = await fetch(`${SUNO_API_URL}/generate/record-info?taskId=${taskId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${SUNO_API_KEY}`,
        'Content-Type': 'application/json'
      }
    })
    
    console.log('🌐 Suno API URL called:', `${SUNO_API_URL}/generate/record-info?taskId=${taskId}`)
    console.log('📡 Response status:', sunoResponse.status)

    if (!sunoResponse.ok) {
      const errorData = await sunoResponse.json().catch(() => ({ msg: 'API request failed' }))
      console.error('❌ Suno Status Check Error:', errorData)
      throw new Error(errorData.msg || `Suno API error: ${sunoResponse.status}`)
    }

    const sunoData = await sunoResponse.json()
    console.log('📊 Raw Suno API Response:', JSON.stringify(sunoData, null, 2))
    
    // Check if response has error code
    if (sunoData.code !== undefined && sunoData.code !== 200) {
      throw new Error(sunoData.msg || 'Status check failed')
    }

    // Extract task data
    const taskData = sunoData.data
    if (!taskData) {
      throw new Error('No task data in response')
    }

    // Map status from Suno API to our format
    // PENDING, TEXT_SUCCESS, FIRST_SUCCESS, SUCCESS, GENERATE_AUDIO_FAILED, etc.
    const sunoStatus = taskData.status
    let status = 'processing'
    
    if (sunoStatus === 'SUCCESS') {
      status = 'complete'
    } else if (sunoStatus.includes('FAILED') || sunoStatus.includes('ERROR')) {
      status = 'failed'
    } else if (sunoStatus === 'PENDING' || sunoStatus === 'TEXT_SUCCESS' || sunoStatus === 'FIRST_SUCCESS') {
      status = 'processing'
    }

    console.log('📝 Task Status:', sunoStatus, '→', status)

    // Extract songs from response.sunoData
    const songs = taskData.response?.sunoData || []
    console.log('🎵 Songs found:', songs.length)
    
    if (songs.length > 0) {
      console.log('🎵 First song:', JSON.stringify(songs[0], null, 2))
    }

    // Transform songs to our format
    const transformedSongs = songs.map((song: any) => ({
      id: song.id,
      title: song.title,
      audioUrl: song.audioUrl,
      streamUrl: song.streamAudioUrl,
      imageUrl: song.imageUrl,
      duration: song.duration,
      tags: song.tags,
      prompt: song.prompt,
      modelName: song.modelName,
      createTime: song.createTime
    }))

    return NextResponse.json({
      success: true,
      taskId: taskId,
      status: status,
      songs: transformedSongs,
      progress: status === 'complete' ? 100 : status === 'processing' ? 50 : 0,
      timestamp: new Date().toISOString()
    })

  } catch (error: any) {
    console.error('Suno status check error:', error)
    
    return NextResponse.json(
      { 
        error: 'Failed to check music status', 
        message: error.message || 'Unknown error occurred'
      },
      { status: 500 }
    )
  }
}
