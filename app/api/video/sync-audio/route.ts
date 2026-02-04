import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/middleware'
import { exec } from 'child_process'
import { promisify } from 'util'
import { writeFile, unlink, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'
import { v4 as uuidv4 } from 'uuid'

const execAsync = promisify(exec)

// Helper to download video from URL
async function downloadFile(url: string, outputPath: string): Promise<void> {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Failed to download file: ${response.statusText}`)
  }
  const buffer = await response.arrayBuffer()
  await writeFile(outputPath, Buffer.from(buffer))
}

// Helper to decode base64 audio and save to file
async function saveBase64Audio(base64Data: string, outputPath: string): Promise<void> {
  // Remove data URL prefix if present
  const base64Audio = base64Data.replace(/^data:audio\/[^;]+;base64,/, '')
  const buffer = Buffer.from(base64Audio, 'base64')
  await writeFile(outputPath, buffer)
}

// Combine video and custom audio using FFmpeg
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request)
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { 
      videoUrl,           // URL of the generated video (from Gemini Veo)
      customAudioUrl,     // Base64 or URL of the custom voice audio
      enableLipSync = false // Whether to apply lip-sync (advanced feature)
    } = body

    if (!videoUrl || !customAudioUrl) {
      return NextResponse.json(
        { success: false, error: 'Video URL and audio URL are required' },
        { status: 400 }
      )
    }

    // Create temp directory
    // Use /tmp on Vercel (serverless), fallback to cwd/tmp locally
    const isVercel = process.env.VERCEL === '1' || process.env.VERCEL_ENV
    const tempDir = isVercel 
      ? '/tmp/audio-sync' 
      : path.join(process.cwd(), 'tmp', 'audio-sync')
    if (!existsSync(tempDir)) {
      await mkdir(tempDir, { recursive: true })
    }

    const sessionId = uuidv4()
    const videoPath = path.join(tempDir, `video-${sessionId}.mp4`)
    const audioPath = path.join(tempDir, `audio-${sessionId}.mp3`)
    const outputPath = path.join(tempDir, `synced-${sessionId}.mp4`)

    console.log('📥 Downloading video...')
    await downloadFile(videoUrl, videoPath)

    console.log('💾 Saving custom audio...')
    if (customAudioUrl.startsWith('data:')) {
      // Base64 audio
      await saveBase64Audio(customAudioUrl, audioPath)
    } else {
      // URL audio
      await downloadFile(customAudioUrl, audioPath)
    }

    // Get video and audio durations
    console.log('⏱️ Checking durations...')
    const { stdout: videoInfo } = await execAsync(
      `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${videoPath}"`
    )
    const videoDuration = parseFloat(videoInfo.trim())

    const { stdout: audioInfo } = await execAsync(
      `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${audioPath}"`
    )
    const audioDuration = parseFloat(audioInfo.trim())

    console.log(`Video duration: ${videoDuration}s, Audio duration: ${audioDuration}s`)

    // Adjust audio to match video duration if needed
    let finalAudioPath = audioPath
    if (Math.abs(videoDuration - audioDuration) > 0.5) {
      console.log('🔧 Adjusting audio duration to match video...')
      const adjustedAudioPath = path.join(tempDir, `audio-adjusted-${sessionId}.mp3`)
      
      if (audioDuration > videoDuration) {
        // Trim audio to video length
        await execAsync(
          `ffmpeg -i "${audioPath}" -t ${videoDuration} -c copy "${adjustedAudioPath}" -y`
        )
      } else {
        // Pad audio with silence to match video length
        const silenceDuration = videoDuration - audioDuration
        await execAsync(
          `ffmpeg -i "${audioPath}" -f lavfi -i anullsrc=r=44100:cl=stereo -t ${silenceDuration} -filter_complex "[0:a][1:a]concat=n=2:v=0:a=1" "${adjustedAudioPath}" -y`
        )
      }
      
      finalAudioPath = adjustedAudioPath
    }

    console.log('🎬 Combining video and audio...')
    // Replace video audio with custom audio
    await execAsync(
      `ffmpeg -i "${videoPath}" -i "${finalAudioPath}" -c:v copy -c:a aac -b:a 192k -map 0:v:0 -map 1:a:0 -shortest "${outputPath}" -y`
    )

    // Read the output file and convert to base64 for upload
    const fs = require('fs')
    const outputBuffer = fs.readFileSync(outputPath)
    const outputBase64 = outputBuffer.toString('base64')

    // Upload to storage (you can implement R2 upload here)
    // For now, return base64 data URL
    const finalVideoUrl = `data:video/mp4;base64,${outputBase64}`

    // Cleanup temp files
    const filesToCleanup = [videoPath, audioPath, finalAudioPath, outputPath]
    for (const file of filesToCleanup) {
      try {
        if (existsSync(file)) {
          await unlink(file)
        }
      } catch (err) {
        console.warn(`Failed to cleanup ${file}:`, err)
      }
    }

    console.log('✅ Audio-video sync complete!')

    return NextResponse.json({
      success: true,
      videoUrl: finalVideoUrl,
      videoDuration,
      audioDuration,
      message: 'Video and audio synced successfully'
    })

  } catch (error: any) {
    console.error('Audio-video sync error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Failed to sync audio with video'
      },
      { status: 500 }
    )
  }
}
