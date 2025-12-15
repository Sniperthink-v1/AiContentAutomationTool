import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/middleware'
import { uploadToR2 } from '@/lib/storage'
import pool from '@/lib/db'
import { exec } from 'child_process'
import { promisify } from 'util'
import { writeFile, unlink, mkdir, readFile } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'
import { v4 as uuidv4 } from 'uuid'

const execAsync = promisify(exec)

// Helper to download a video from URL
async function downloadVideo(url: string, outputPath: string): Promise<void> {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Failed to download video: ${response.statusText}`)
  }
  const buffer = await response.arrayBuffer()
  await writeFile(outputPath, Buffer.from(buffer))
}

// Combine multiple video segments into one video
// This endpoint handles the concatenation of multiple 8-second Veo 3.1 clips
export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const user = await getAuthUser(request)
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { videoUrls, prompt, enhancedPrompt, model = 'veo-3.1-fast', saveToMedia = true } = body

    if (!videoUrls || !Array.isArray(videoUrls) || videoUrls.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Video URLs are required' },
        { status: 400 }
      )
    }

    // If only one video, download, upload to R2, and return
    if (videoUrls.length === 1) {
      // Download single video
      const tempDir = path.join(process.cwd(), 'tmp', 'video-combine')
      if (!existsSync(tempDir)) {
        await mkdir(tempDir, { recursive: true })
      }
      
      const sessionId = uuidv4()
      const singlePath = path.join(tempDir, `single-${sessionId}.mp4`)
      
      try {
        await downloadVideo(videoUrls[0], singlePath)
        const videoBuffer = await readFile(singlePath)
        
        // Upload to R2
        const fileName = `videos/${user.id}/${Date.now()}-single.mp4`
        const result = await uploadToR2(videoBuffer, fileName, 'video/mp4')
        
        // Cleanup
        try { await unlink(singlePath) } catch {}
        
        if (!result.success) {
          throw new Error(result.error || 'Failed to upload video')
        }
        
        // Save to ai_videos table
        if (saveToMedia) {
          await pool.query(
            `INSERT INTO ai_videos (user_id, prompt, enhanced_prompt, video_url, model, mode, duration, settings, credits_used)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
            [user.id, prompt || 'AI Generated', enhancedPrompt || prompt, result.url, model, 'text-to-video', 8, '{}', 120]
          )
        }
        
        return NextResponse.json({
          success: true,
          videoUrl: result.url,
          message: 'Single video uploaded'
        })
      } catch (err) {
        try { await unlink(singlePath) } catch {}
        throw err
      }
    }

    // Create temp directory if it doesn't exist
    const tempDir = path.join(process.cwd(), 'tmp', 'video-combine')
    if (!existsSync(tempDir)) {
      await mkdir(tempDir, { recursive: true })
    }

    const sessionId = uuidv4()
    const downloadedFiles: string[] = []
    const concatListPath = path.join(tempDir, `concat-${sessionId}.txt`)
    const outputPath = path.join(tempDir, `combined-${sessionId}.mp4`)

    try {
      // Download all video clips
      console.log(`Downloading ${videoUrls.length} video clips...`)
      for (let i = 0; i < videoUrls.length; i++) {
        const clipPath = path.join(tempDir, `clip-${sessionId}-${i}.mp4`)
        await downloadVideo(videoUrls[i], clipPath)
        downloadedFiles.push(clipPath)
        console.log(`Downloaded clip ${i + 1}/${videoUrls.length}`)
      }

      // Create concat list file for FFmpeg
      const concatContent = downloadedFiles
        .map(file => `file '${file.replace(/\\/g, '/')}'`)
        .join('\n')
      await writeFile(concatListPath, concatContent)

      // Run FFmpeg to concatenate videos
      console.log('Combining videos with FFmpeg...')
      const ffmpegCommand = `ffmpeg -f concat -safe 0 -i "${concatListPath}" -c copy "${outputPath}" -y`
      
      try {
        await execAsync(ffmpegCommand)
      } catch (ffmpegError: unknown) {
        // If copy codec fails, try re-encoding
        console.log('Copy codec failed, trying re-encode...')
        const reencodeCommand = `ffmpeg -f concat -safe 0 -i "${concatListPath}" -c:v libx264 -c:a aac -strict experimental "${outputPath}" -y`
        await execAsync(reencodeCommand)
      }

      console.log('Videos combined successfully')

      // Read combined video and upload to R2
      const videoBuffer = await readFile(outputPath)
      const fileName = `videos/${user.id}/${Date.now()}-combined.mp4`
      const result = await uploadToR2(videoBuffer, fileName, 'video/mp4')

      if (!result.success) {
        throw new Error(result.error || 'Failed to upload combined video')
      }

      console.log('Combined video uploaded:', result.url)

      // Save to ai_videos table
      const totalDuration = videoUrls.length * 8
      if (saveToMedia) {
        await pool.query(
          `INSERT INTO ai_videos (user_id, prompt, enhanced_prompt, video_url, model, mode, duration, settings, credits_used)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [user.id, prompt || 'AI Generated', enhancedPrompt || prompt, result.url, model, 'text-to-video', totalDuration, '{}', totalDuration * 15]
        )
      }

      // Cleanup temp files
      for (const file of downloadedFiles) {
        try { await unlink(file) } catch {}
      }
      try { await unlink(concatListPath) } catch {}
      try { await unlink(outputPath) } catch {}

      return NextResponse.json({
        success: true,
        videoUrl: result.url,
        numVideos: videoUrls.length,
        totalDuration: totalDuration,
        message: `Successfully combined ${videoUrls.length} video clips`
      })

    } catch (error: unknown) {
      // Cleanup on error
      for (const file of downloadedFiles) {
        try { await unlink(file) } catch {}
      }
      try { await unlink(concatListPath) } catch {}
      try { await unlink(outputPath) } catch {}

      throw error
    }

  } catch (error) {
    console.error('Video combine error:', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to combine videos' },
      { status: 500 }
    )
  }
}
