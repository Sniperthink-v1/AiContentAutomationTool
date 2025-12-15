import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/middleware'
import { uploadToR2 } from '@/lib/storage'
import { v4 as uuidv4 } from 'uuid'

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser(req)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await req.formData()
    const file = formData.get('file') as File
    
    if (!file) {
      return NextResponse.json({ 
        error: 'No file provided' 
      }, { status: 400 })
    }

    // Validate file type
    const validTypes = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/m4a', 'audio/ogg']
    if (!validTypes.includes(file.type) && !file.name.match(/\.(mp3|wav|m4a|ogg)$/i)) {
      return NextResponse.json({ 
        error: 'Invalid file type. Supported: MP3, WAV, M4A, OGG' 
      }, { status: 400 })
    }

    // Validate file size (max 50MB)
    const maxSize = 50 * 1024 * 1024 // 50MB
    if (file.size > maxSize) {
      return NextResponse.json({ 
        error: 'File too large. Maximum size is 50MB' 
      }, { status: 400 })
    }

    console.log('Uploading audio file:', {
      name: file.name,
      type: file.type,
      size: `${(file.size / 1024 / 1024).toFixed(2)}MB`
    })

    // Upload to Cloudflare R2
    const buffer = await file.arrayBuffer()
    const fileExt = file.name.split('.').pop() || 'mp3'
    const fileName = `audio_${user.id}_${uuidv4()}.${fileExt}`
    const filePath = `audio/${fileName}`
    
    const result = await uploadToR2(Buffer.from(buffer), filePath, file.type)

    if (!result.success) {
      console.error('R2 upload failed:', result.error)
      throw new Error(result.error || 'Failed to upload audio to R2')
    }

    console.log('Audio uploaded successfully to R2:', result.url)

    return NextResponse.json({
      success: true,
      audioUrl: result.url,
      format: fileExt,
      size: file.size,
      message: 'Audio uploaded successfully to R2'
    })
  } catch (error: any) {
    console.error('Audio upload error:', error)
    return NextResponse.json({ 
      error: error.message || 'Failed to upload audio' 
    }, { status: 500 })
  }
}
