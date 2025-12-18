import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/middleware'

// Proxy download to avoid CORS issues with R2
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request)
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const url = searchParams.get('url')
    const filename = searchParams.get('filename') || 'download'

    if (!url) {
      return NextResponse.json({ success: false, error: 'URL is required' }, { status: 400 })
    }

    // Only allow downloads from our R2 bucket or Google's API
    const allowedDomains = [
      'pub-5d2e0793863742dbaeef0a683ee01333.r2.dev',
      'generativelanguage.googleapis.com'
    ]
    
    const urlObj = new URL(url)
    if (!allowedDomains.some(domain => urlObj.hostname.includes(domain))) {
      return NextResponse.json({ success: false, error: 'Invalid download URL' }, { status: 400 })
    }

    // Fetch the file
    const response = await fetch(url)
    if (!response.ok) {
      return NextResponse.json({ 
        success: false, 
        error: `Failed to fetch file: ${response.statusText}` 
      }, { status: response.status })
    }

    const contentType = response.headers.get('content-type') || 'application/octet-stream'
    const buffer = await response.arrayBuffer()

    // Return the file with proper headers for download
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': buffer.byteLength.toString(),
        'Cache-Control': 'no-cache'
      }
    })
  } catch (error) {
    console.error('Download proxy error:', error)
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Download failed' 
    }, { status: 500 })
  }
}
