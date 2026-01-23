import { NextRequest, NextResponse } from 'next/server'
import { uploadToR2 } from '@/lib/storage'
import { getAuthUser } from '@/lib/middleware'

export async function POST(request: NextRequest) {
  try {
    // Require authentication for uploads
    const user = await getAuthUser(request)
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Debug: Check if env vars are loaded
    console.log('🔍 Environment check:', {
      hasAccountId: !!process.env.R2_ACCOUNT_ID,
      hasAccessKey: !!process.env.R2_ACCESS_KEY_ID,
      hasSecretKey: !!process.env.R2_SECRET_ACCESS_KEY,
      hasBucket: !!process.env.R2_BUCKET_NAME,
      hasPublicUrl: !!process.env.R2_PUBLIC_URL
    })

    const contentType = request.headers.get('content-type') || ''
    
    let file: File | null = null
    let folder = ''
    let buffer: Buffer
    let mimeType: string
    let fileExt: string

    // Handle JSON request (URL-based upload)
    if (contentType.includes('application/json')) {
      const body = await request.json()
      const { file: fileUrl, type } = body
      
      if (!fileUrl) {
        return NextResponse.json(
          { success: false, error: 'No file URL provided' },
          { status: 400 }
        )
      }
      
      folder = type || ''
      
      // If it's a data URL (base64)
      if (fileUrl.startsWith('data:')) {
        const matches = fileUrl.match(/^data:([^;]+);base64,(.+)$/)
        if (!matches) {
          return NextResponse.json(
            { success: false, error: 'Invalid data URL format' },
            { status: 400 }
          )
        }
        mimeType = matches[1]
        buffer = Buffer.from(matches[2], 'base64')
        fileExt = mimeType.split('/')[1] || 'png'
      } 
      // If it's an HTTP URL, download it
      else if (fileUrl.startsWith('http')) {
        const response = await fetch(fileUrl)
        if (!response.ok) {
          return NextResponse.json(
            { success: false, error: 'Failed to download file from URL' },
            { status: 400 }
          )
        }
        const arrayBuffer = await response.arrayBuffer()
        buffer = Buffer.from(arrayBuffer)
        mimeType = response.headers.get('content-type') || 'image/png'
        fileExt = mimeType.split('/')[1]?.split(';')[0] || 'png'
      } else {
        return NextResponse.json(
          { success: false, error: 'Invalid file URL' },
          { status: 400 }
        )
      }
    }
    // Handle FormData request (file upload)
    else if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData()
      file = formData.get('file') as File
      // Support both 'folder' and 'type' parameters for compatibility
      folder = (formData.get('folder') as string) || (formData.get('type') as string) || ''

      if (!file) {
        return NextResponse.json(
          { success: false, error: 'No file provided' },
          { status: 400 }
        )
      }

      // Validate file size (max 100MB for videos, 50MB for audio, 10MB for images)
      const isVideo = file.type.startsWith('video/')
      const isAudio = file.type.startsWith('audio/')
      const maxSize = isVideo ? 100 * 1024 * 1024 : isAudio ? 50 * 1024 * 1024 : 10 * 1024 * 1024
      if (file.size > maxSize) {
        return NextResponse.json(
          { 
            success: false, 
            error: `File too large. Max size: ${maxSize / 1024 / 1024}MB` 
          },
          { status: 400 }
        )
      }

      // Convert File to Buffer
      const arrayBuffer = await file.arrayBuffer()
      buffer = Buffer.from(arrayBuffer)
      mimeType = file.type
      fileExt = file.name.split('.').pop() || 'bin'
    } else {
      return NextResponse.json(
        { success: false, error: 'Invalid content type. Use multipart/form-data or application/json' },
        { status: 400 }
      )
    }

    // Generate unique filename
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
    const filePath = folder ? `${folder}/${fileName}` : fileName

    // Upload to Cloudflare R2
    const result = await uploadToR2(buffer, filePath, mimeType)
    
    if (!result.success) {
      console.error('R2 upload error:', result.error)
      return NextResponse.json(
        { success: false, error: `Upload failed: ${result.error}` },
        { status: 500 }
      )
    }

    console.log('✅ File uploaded to R2:', { path: filePath, url: result.url })

    return NextResponse.json({
      success: true,
      url: result.url,
      path: filePath
    })

  } catch (error: unknown) {
    console.error('Upload error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to upload file',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
