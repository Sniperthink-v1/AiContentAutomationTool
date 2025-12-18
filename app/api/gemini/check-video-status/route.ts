import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/middleware'

// Check Veo 3.1 video generation status (supports multiple operations)
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
    const operationNamesJson = searchParams.get('operationNames')
    
    // Parse operation names (single or multiple)
    let operationNames: string[] = []
    if (operationNamesJson) {
      try {
        operationNames = JSON.parse(operationNamesJson)
      } catch {
        return NextResponse.json(
          { success: false, error: 'Invalid operationNames format' },
          { status: 400 }
        )
      }
    } else if (operationName) {
      operationNames = [operationName]
    }

    if (operationNames.length === 0) {
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

    // Check status for all operations using REST API
    const results: { done: boolean; videoUrl?: string; error?: string }[] = []
    let allDone = true
    let completedCount = 0
    
    for (const opName of operationNames) {
      try {
        // Use REST API to check operation status
        const statusUrl = `https://generativelanguage.googleapis.com/v1beta/${opName}?key=${apiKey}`
        const statusResponse = await fetch(statusUrl)
        
        if (!statusResponse.ok) {
          const errorText = await statusResponse.text()
          console.error(`Status check failed for ${opName}:`, errorText)
          results.push({ done: false, error: `API error: ${statusResponse.status}` })
          allDone = false
          continue
        }
        
        const operation = await statusResponse.json()
        console.log(`Operation ${opName} status:`, JSON.stringify(operation, null, 2))

        if (operation.done) {
          if (operation.error) {
            results.push({ done: true, error: operation.error.message || 'Operation failed' })
          } else {
            // Check for video in the response - handle different response structures
            const response = operation.response || operation.result || operation
            
            // Veo 3.1 response structure: response.generateVideoResponse.generatedSamples[0].video.uri
            const generatedSamples = response?.generateVideoResponse?.generatedSamples || []
            const generatedVideos = response?.generatedVideos || response?.videos || []
            
            console.log('Generated samples:', JSON.stringify(generatedSamples, null, 2))
            console.log('Generated videos:', JSON.stringify(generatedVideos, null, 2))
            
            let videoUrl = ''
            
            // First try the Veo 3.1 response structure
            if (generatedSamples.length > 0) {
              const sample = generatedSamples[0]
              if (sample.video?.uri) {
                // The URI is already a full URL with ?alt=media
                videoUrl = sample.video.uri
                // Add API key if not present
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
                // Check if it's already a full URL
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
            
            // Also check for video directly in response
            if (!videoUrl && response?.video?.uri) {
              const uri = response.video.uri
              videoUrl = uri.startsWith('http')
                ? uri
                : `https://generativelanguage.googleapis.com/v1beta/${uri}?key=${apiKey}&alt=media`
            }
            
            if (videoUrl) {
              console.log('Found video URL:', videoUrl)
              results.push({ done: true, videoUrl })
              completedCount++
            } else {
              console.error('No video URL found in response:', JSON.stringify(response, null, 2))
              results.push({ done: true, error: 'No video URL in response' })
            }
          }
        } else {
          results.push({ done: false })
          allDone = false
        }
      } catch (opError) {
        console.error(`Error checking operation ${opName}:`, opError)
        results.push({ done: false, error: opError instanceof Error ? opError.message : 'Failed to check status' })
        allDone = false
      }
    }

    // Return appropriate response based on status
    if (!allDone) {
      return NextResponse.json({
        success: true,
        status: 'processing',
        completedSegments: completedCount,
        totalSegments: operationNames.length,
        message: `Processing... ${completedCount}/${operationNames.length} clips complete`
      })
    }

    // All operations are done - check results
    const videoUrls = results.map(r => r.videoUrl).filter(Boolean) as string[]
    const failedCount = results.filter(r => r.error).length
    
    // If ALL clips failed, return error
    if (videoUrls.length === 0) {
      const errorMessages = results.map(r => r.error).filter(Boolean)
      return NextResponse.json({
        success: false,
        status: 'failed',
        error: errorMessages[0] || 'All video clips failed to generate',
        allErrors: errorMessages
      })
    }
    
    // If SOME clips failed but we have at least one success
    if (failedCount > 0) {
      console.log(`Partial success: ${videoUrls.length} succeeded, ${failedCount} failed`)
      // Continue with successful clips
    }
    
    if (videoUrls.length === 1) {
      // Single video - return directly
      return NextResponse.json({
        success: true,
        status: 'complete',
        videoUrl: videoUrls[0],
        mimeType: 'video/mp4',
        partialSuccess: failedCount > 0,
        failedClips: failedCount
      })
    } else {
      // Multiple videos - need to combine
      return NextResponse.json({
        success: true,
        status: 'complete',
        needsCombining: true,
        videoUrls: videoUrls,
        totalSegments: videoUrls.length,
        message: `${videoUrls.length} clips ready for combining`,
        partialSuccess: failedCount > 0,
        failedClips: failedCount
      })
    }

  } catch (error) {
    console.error('Gemini video status check error:', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
