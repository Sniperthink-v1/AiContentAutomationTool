import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/middleware'

// Check single clip generation status
// This is a lightweight endpoint for polling individual clip regeneration
export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const user = await getAuthUser(request)
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const operationName = searchParams.get('operationName')
    const clipIndex = searchParams.get('clipIndex')

    if (!operationName) {
      return NextResponse.json(
        { success: false, error: 'Operation name is required' },
        { status: 400 }
      )
    }

    const apiKey = process.env.VEO_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: 'Veo API key not configured' },
        { status: 500 }
      )
    }

    // Use REST API to check operation status
    const statusUrl = `https://generativelanguage.googleapis.com/v1beta/${operationName}?key=${apiKey}`
    const statusResponse = await fetch(statusUrl)
    
    if (!statusResponse.ok) {
      const errorText = await statusResponse.text()
      console.error(`Status check failed:`, errorText)
      return NextResponse.json({
        success: true,
        status: 'processing',
        clipIndex: parseInt(clipIndex || '0'),
        message: 'Still processing...'
      })
    }
    
    const operation = await statusResponse.json()
    console.log(`Clip ${clipIndex} operation status:`, JSON.stringify(operation, null, 2))

    if (operation.done) {
      if (operation.error) {
        return NextResponse.json({
          success: false,
          status: 'failed',
          clipIndex: parseInt(clipIndex || '0'),
          error: operation.error.message || 'Operation failed'
        })
      }

      // Check for video in the response
      const response = operation.response || operation.result || operation
      const generatedSamples = response?.generateVideoResponse?.generatedSamples || []
      const generatedVideos = response?.generatedVideos || response?.videos || []
      
      let videoUrl = ''
      
      // Try the Veo 3.1 response structure
      if (generatedSamples.length > 0) {
        const sample = generatedSamples[0]
        if (sample.video?.uri) {
          videoUrl = sample.video.uri
          if (!videoUrl.includes('key=')) {
            videoUrl = videoUrl.includes('?') 
              ? `${videoUrl}&key=${apiKey}`
              : `${videoUrl}?key=${apiKey}`
          }
        }
      }
      
      // Fallback to other structures
      if (!videoUrl && generatedVideos.length > 0) {
        const video = generatedVideos[0]
        if (video.video?.uri) {
          const uri = video.video.uri
          videoUrl = uri.startsWith('http') 
            ? uri 
            : `https://generativelanguage.googleapis.com/v1beta/${uri}?key=${apiKey}&alt=media`
        } else if (video.uri) {
          videoUrl = video.uri.startsWith('http')
            ? video.uri
            : `https://generativelanguage.googleapis.com/v1beta/${video.uri}?key=${apiKey}&alt=media`
        } else if (video.httpUri) {
          videoUrl = video.httpUri
        } else if (video.url) {
          videoUrl = video.url
        }
      }
      
      // Check for video directly in response
      if (!videoUrl && response?.video?.uri) {
        const uri = response.video.uri
        videoUrl = uri.startsWith('http')
          ? uri
          : `https://generativelanguage.googleapis.com/v1beta/${uri}?key=${apiKey}&alt=media`
      }
      
      if (videoUrl) {
        return NextResponse.json({
          success: true,
          status: 'complete',
          clipIndex: parseInt(clipIndex || '0'),
          videoUrl: videoUrl,
          mimeType: 'video/mp4'
        })
      } else {
        return NextResponse.json({
          success: false,
          status: 'failed',
          clipIndex: parseInt(clipIndex || '0'),
          error: 'No video URL in response'
        })
      }
    } else {
      return NextResponse.json({
        success: true,
        status: 'processing',
        clipIndex: parseInt(clipIndex || '0'),
        message: 'Clip is being generated...'
      })
    }

  } catch (error) {
    console.error('Clip status check error:', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
