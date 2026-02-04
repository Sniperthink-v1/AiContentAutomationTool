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

// Helper to download a video from URL with retry logic and longer timeout
async function downloadVideo(url: string, outputPath: string, maxRetries = 3): Promise<void> {
  let lastError: Error | null = null
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`Downloading video (attempt ${attempt}/${maxRetries})...`)
      
      // Use AbortController for custom timeout (120 seconds)
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 120000) // 2 minutes
      
      try {
        const response = await fetch(url, { 
          signal: controller.signal,
          // Add keepalive to maintain connection
          keepalive: true
        })
        
        clearTimeout(timeoutId)
        
        if (!response.ok) {
          throw new Error(`Failed to download video: ${response.statusText}`)
        }
        
        const buffer = await response.arrayBuffer()
        await writeFile(outputPath, Buffer.from(buffer))
        console.log(`✅ Download successful (${Math.round(buffer.byteLength / 1024 / 1024)}MB)`)
        return // Success!
      } catch (fetchError: any) {
        clearTimeout(timeoutId)
        if (fetchError.name === 'AbortError') {
          throw new Error('Download timeout after 2 minutes')
        }
        throw fetchError
      }
    } catch (error: any) {
      lastError = error
      console.error(`Download attempt ${attempt} failed:`, error.message)
      
      // If this wasn't the last attempt, wait before retrying (exponential backoff)
      if (attempt < maxRetries) {
        const waitTime = Math.min(1000 * Math.pow(2, attempt - 1), 10000) // Max 10 seconds
        console.log(`Waiting ${waitTime}ms before retry...`)
        await new Promise(resolve => setTimeout(resolve, waitTime))
      }
    }
  }
  
  throw lastError || new Error('Failed to download video after all retries')
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

    // Use /tmp on Vercel (serverless), fallback to cwd/tmp locally
    const isVercel = process.env.VERCEL === '1' || process.env.VERCEL_ENV
    const getTempDir = () => isVercel 
      ? '/tmp/video-combine' 
      : path.join(process.cwd(), 'tmp', 'video-combine')

    // If only one video, download, upload to R2, and return
    if (videoUrls.length === 1) {
      // Download single video
      const tempDir = getTempDir()
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
    const tempDir = getTempDir()
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
      // Use longer crossfade with dissolve transition for seamless, cinematic blending
      console.log('Combining videos with ultra-smooth dissolve transitions...')
      
      // SMOOTH TRANSITION SETTINGS:
      // - dissolve: Gradual pixel-by-pixel blend (most natural, no visible "cut")
      // - 1.5 second duration: Long enough to feel seamless, short enough to not drag
      // - Exponential audio crossfade (exp curves): Sounds more natural than linear
      // - High quality encoding with motion interpolation
      
      if (downloadedFiles.length === 2) {
        // Two clips: ultra-smooth dissolve with 1.5 second overlap
        const crossfadeDuration = 1.5
        const offset1 = 6.5 // Start transition 1.5s before end of clip (8 - 1.5 = 6.5)
        // Use dissolve transition with easing for most natural look
        const ffmpegCommand = `ffmpeg -i "${downloadedFiles[0]}" -i "${downloadedFiles[1]}" -filter_complex "[0:v]setpts=PTS-STARTPTS[v0];[1:v]setpts=PTS-STARTPTS[v1];[v0][v1]xfade=transition=dissolve:duration=${crossfadeDuration}:offset=${offset1}:easing=easeInOutSine[v];[0:a]aformat=sample_fmts=fltp:sample_rates=44100:channel_layouts=stereo[a0];[1:a]aformat=sample_fmts=fltp:sample_rates=44100:channel_layouts=stereo[a1];[a0][a1]acrossfade=d=${crossfadeDuration}:c1=exp:c2=exp[a]" -map "[v]" -map "[a]" -c:v libx264 -preset slow -crf 17 -pix_fmt yuv420p -movflags +faststart -b:v 10M -maxrate 12M -bufsize 24M -c:a aac -b:a 256k -ar 44100 "${outputPath}" -y`
        
        try {
          await execAsync(ffmpegCommand)
        } catch (ffmpegError: unknown) {
          console.log('Dissolve transition failed, trying fade transition...')
          // Fallback: simple fade which is also very smooth
          const fallbackCommand = `ffmpeg -i "${downloadedFiles[0]}" -i "${downloadedFiles[1]}" -filter_complex "[0:v][1:v]xfade=transition=fade:duration=${crossfadeDuration}:offset=${offset1}[v];[0:a][1:a]acrossfade=d=${crossfadeDuration}:c1=exp:c2=exp[a]" -map "[v]" -map "[a]" -c:v libx264 -preset medium -crf 19 -pix_fmt yuv420p -movflags +faststart -c:a aac -b:a 192k "${outputPath}" -y`
          await execAsync(fallbackCommand)
        }
      } else if (downloadedFiles.length === 3) {
        // Three clips: chain ultra-smooth dissolves with 1.5 second overlaps
        const crossfadeDuration = 1.5
        const offset1 = 6.5  // First transition at 6.5s
        const offset2 = 13.0 // Second transition (6.5 + 8 - 1.5 = 13)
        const ffmpegCommand = `ffmpeg -i "${downloadedFiles[0]}" -i "${downloadedFiles[1]}" -i "${downloadedFiles[2]}" -filter_complex "[0:v]setpts=PTS-STARTPTS[v0];[1:v]setpts=PTS-STARTPTS[v1];[2:v]setpts=PTS-STARTPTS[v2];[v0][v1]xfade=transition=dissolve:duration=${crossfadeDuration}:offset=${offset1}:easing=easeInOutSine[vfade1];[vfade1][v2]xfade=transition=dissolve:duration=${crossfadeDuration}:offset=${offset2}:easing=easeInOutSine[v];[0:a]aformat=sample_fmts=fltp:sample_rates=44100:channel_layouts=stereo[a0];[1:a]aformat=sample_fmts=fltp:sample_rates=44100:channel_layouts=stereo[a1];[2:a]aformat=sample_fmts=fltp:sample_rates=44100:channel_layouts=stereo[a2];[a0][a1]acrossfade=d=${crossfadeDuration}:c1=exp:c2=exp[afade1];[afade1][a2]acrossfade=d=${crossfadeDuration}:c1=exp:c2=exp[a]" -map "[v]" -map "[a]" -c:v libx264 -preset slow -crf 17 -pix_fmt yuv420p -movflags +faststart -b:v 10M -maxrate 12M -bufsize 24M -c:a aac -b:a 256k -ar 44100 "${outputPath}" -y`
        
        try {
          await execAsync(ffmpegCommand)
        } catch (ffmpegError: unknown) {
          console.log('Dissolve transition failed, trying fade transition...')
          const fallbackCommand = `ffmpeg -i "${downloadedFiles[0]}" -i "${downloadedFiles[1]}" -i "${downloadedFiles[2]}" -filter_complex "[0:v][1:v]xfade=transition=fade:duration=${crossfadeDuration}:offset=${offset1}[vfade1];[vfade1][2:v]xfade=transition=fade:duration=${crossfadeDuration}:offset=${offset2}[v];[0:a][1:a]acrossfade=d=${crossfadeDuration}:c1=exp:c2=exp[afade1];[afade1][2:a]acrossfade=d=${crossfadeDuration}:c1=exp:c2=exp[a]" -map "[v]" -map "[a]" -c:v libx264 -preset medium -crf 19 -pix_fmt yuv420p -movflags +faststart -c:a aac -b:a 192k "${outputPath}" -y`
          await execAsync(fallbackCommand)
        }
      } else if (downloadedFiles.length === 4) {
        // Four clips: chain ultra-smooth dissolves with 1.5 second overlaps
        const crossfadeDuration = 1.5
        const offset1 = 6.5   // First transition
        const offset2 = 13.0  // Second transition
        const offset3 = 19.5  // Third transition (13 + 8 - 1.5 = 19.5)
        const ffmpegCommand = `ffmpeg -i "${downloadedFiles[0]}" -i "${downloadedFiles[1]}" -i "${downloadedFiles[2]}" -i "${downloadedFiles[3]}" -filter_complex "[0:v]setpts=PTS-STARTPTS[v0];[1:v]setpts=PTS-STARTPTS[v1];[2:v]setpts=PTS-STARTPTS[v2];[3:v]setpts=PTS-STARTPTS[v3];[v0][v1]xfade=transition=dissolve:duration=${crossfadeDuration}:offset=${offset1}:easing=easeInOutSine[vfade1];[vfade1][v2]xfade=transition=dissolve:duration=${crossfadeDuration}:offset=${offset2}:easing=easeInOutSine[vfade2];[vfade2][v3]xfade=transition=dissolve:duration=${crossfadeDuration}:offset=${offset3}:easing=easeInOutSine[v];[0:a]aformat=sample_fmts=fltp:sample_rates=44100:channel_layouts=stereo[a0];[1:a]aformat=sample_fmts=fltp:sample_rates=44100:channel_layouts=stereo[a1];[2:a]aformat=sample_fmts=fltp:sample_rates=44100:channel_layouts=stereo[a2];[3:a]aformat=sample_fmts=fltp:sample_rates=44100:channel_layouts=stereo[a3];[a0][a1]acrossfade=d=${crossfadeDuration}:c1=exp:c2=exp[afade1];[afade1][a2]acrossfade=d=${crossfadeDuration}:c1=exp:c2=exp[afade2];[afade2][a3]acrossfade=d=${crossfadeDuration}:c1=exp:c2=exp[a]" -map "[v]" -map "[a]" -c:v libx264 -preset slow -crf 17 -pix_fmt yuv420p -movflags +faststart -b:v 10M -maxrate 12M -bufsize 24M -c:a aac -b:a 256k -ar 44100 "${outputPath}" -y`
        
        try {
          await execAsync(ffmpegCommand)
        } catch (ffmpegError: unknown) {
          console.log('Dissolve transition failed, trying fade transition...')
          const fallbackCommand = `ffmpeg -i "${downloadedFiles[0]}" -i "${downloadedFiles[1]}" -i "${downloadedFiles[2]}" -i "${downloadedFiles[3]}" -filter_complex "[0:v][1:v]xfade=transition=fade:duration=${crossfadeDuration}:offset=${offset1}[vfade1];[vfade1][2:v]xfade=transition=fade:duration=${crossfadeDuration}:offset=${offset2}[vfade2];[vfade2][3:v]xfade=transition=fade:duration=${crossfadeDuration}:offset=${offset3}[v];[0:a][1:a]acrossfade=d=${crossfadeDuration}:c1=exp:c2=exp[afade1];[afade1][2:a]acrossfade=d=${crossfadeDuration}:c1=exp:c2=exp[afade2];[afade2][3:a]acrossfade=d=${crossfadeDuration}:c1=exp:c2=exp[a]" -map "[v]" -map "[a]" -c:v libx264 -preset medium -crf 19 -pix_fmt yuv420p -movflags +faststart -c:a aac -b:a 192k "${outputPath}" -y`
          await execAsync(fallbackCommand)
        }
      } else {
        // Fallback for 5+ clips - use dissolve with dynamic offset calculation
        console.log(`Building smooth transition chain for ${downloadedFiles.length} clips...`)
        const crossfadeDuration = 1.5
        const clipDuration = 8 // Assuming 8 second clips
        
        // Build inputs
        let inputs = downloadedFiles.map((f, i) => `-i "${f}"`).join(' ')
        
        // Build video filter chain
        let videoFilter = ''
        let audioFilter = ''
        
        // Normalize all video streams
        for (let i = 0; i < downloadedFiles.length; i++) {
          videoFilter += `[${i}:v]setpts=PTS-STARTPTS[v${i}];`
          audioFilter += `[${i}:a]aformat=sample_fmts=fltp:sample_rates=44100:channel_layouts=stereo[a${i}];`
        }
        
        // Chain video crossfades
        let prevVideoLabel = 'v0'
        for (let i = 1; i < downloadedFiles.length; i++) {
          const offset = (clipDuration - crossfadeDuration) + (i - 1) * (clipDuration - crossfadeDuration)
          const newLabel = i === downloadedFiles.length - 1 ? 'v' : `vfade${i}`
          videoFilter += `[${prevVideoLabel}][v${i}]xfade=transition=dissolve:duration=${crossfadeDuration}:offset=${offset.toFixed(1)}[${newLabel}];`
          prevVideoLabel = newLabel
        }
        
        // Chain audio crossfades
        let prevAudioLabel = 'a0'
        for (let i = 1; i < downloadedFiles.length; i++) {
          const newLabel = i === downloadedFiles.length - 1 ? 'a' : `afade${i}`
          audioFilter += `[${prevAudioLabel}][a${i}]acrossfade=d=${crossfadeDuration}:c1=exp:c2=exp[${newLabel}];`
          prevAudioLabel = newLabel
        }
        
        // Remove trailing semicolon
        const filterComplex = (videoFilter + audioFilter).slice(0, -1)
        
        const ffmpegCommand = `ffmpeg ${inputs} -filter_complex "${filterComplex}" -map "[v]" -map "[a]" -c:v libx264 -preset medium -crf 19 -pix_fmt yuv420p -movflags +faststart -c:a aac -b:a 192k "${outputPath}" -y`
        
        try {
          await execAsync(ffmpegCommand)
        } catch (ffmpegError: unknown) {
          console.log('Smooth transition failed, using simple concat fallback...')
          const concatContent = downloadedFiles.map(file => `file '${file.replace(/\\/g, '/')}'`).join('\n')
          await writeFile(concatListPath, concatContent)
          const fallbackCommand = `ffmpeg -f concat -safe 0 -i "${concatListPath}" -c:v libx264 -c:a aac "${outputPath}" -y`
          await execAsync(fallbackCommand)
        }
      }

      console.log('Videos combined successfully with seamless dissolve transitions (1.5s blend)')

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
