import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/middleware'
import { uploadToR2 } from '@/lib/storage'
import pool from '@/lib/db'
import ffmpeg from 'fluent-ffmpeg'
import { writeFile, unlink, mkdir, readFile } from 'fs/promises'
import path from 'path'
import { v4 as uuidv4 } from 'uuid'
import { existsSync } from 'fs'

// Interface for audio layers
interface AudioLayer {
  url: string
  type: 'voiceover' | 'music' | 'soundfx'
  volume: number
  startTime: number
}

export async function POST(req: NextRequest) {
  const tempFiles: string[] = []
  
  try {
    const user = await getAuthUser(req)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { videoUrl, audioLayers, outputFormat = 'mp4' } = await req.json()

    if (!videoUrl) {
      return NextResponse.json({ 
        error: 'videoUrl is required' 
      }, { status: 400 })
    }

    if (!audioLayers || !Array.isArray(audioLayers) || audioLayers.length === 0) {
      return NextResponse.json({ 
        error: 'At least one audio layer is required' 
      }, { status: 400 })
    }

    console.log('Starting video merge process...', {
      videoUrl,
      audioLayersCount: audioLayers.length,
      outputFormat
    })

    // Create temp directory
    // Use /tmp on Vercel (serverless), fallback to cwd/tmp locally
    const isVercel = process.env.VERCEL === '1' || process.env.VERCEL_ENV
    const tempDir = isVercel ? '/tmp' : path.join(process.cwd(), 'tmp')
    if (!existsSync(tempDir)) {
      await mkdir(tempDir, { recursive: true })
    }

    const videoId = uuidv4()
    const videoPath = path.join(tempDir, `video_${videoId}.mp4`)
    const outputPath = path.join(tempDir, `output_${videoId}.${outputFormat}`)

    tempFiles.push(videoPath, outputPath)

    // Download video file
    console.log('Downloading video...')
    const videoResponse = await fetch(videoUrl)
    if (!videoResponse.ok) {
      throw new Error('Failed to download video')
    }
    const videoBuffer = await videoResponse.arrayBuffer()
    await writeFile(videoPath, Buffer.from(videoBuffer))

    // Download all audio files
    const audioFiles: string[] = []
    for (let i = 0; i < audioLayers.length; i++) {
      const layer = audioLayers[i] as AudioLayer
      const audioPath = path.join(tempDir, `audio_${videoId}_${i}.mp3`)
      tempFiles.push(audioPath)
      
      console.log(`Downloading audio layer ${i + 1}: ${layer.type}`)
      const audioResponse = await fetch(layer.url)
      if (!audioResponse.ok) {
        throw new Error(`Failed to download audio layer ${i + 1}`)
      }
      const audioBuffer = await audioResponse.arrayBuffer()
      await writeFile(audioPath, Buffer.from(audioBuffer))
      
      audioFiles.push(audioPath)
    }

    // Merge video with audio using FFmpeg
    console.log('Merging video with audio layers...')
    
    await new Promise<void>((resolve, reject) => {
      const command = ffmpeg()

      // Add video input
      command.input(videoPath)

      // Add all audio inputs
      audioFiles.forEach(audioFile => {
        command.input(audioFile)
      })

      // Build complex filter for audio mixing
      let filterComplex = ''
      
      // Process each audio layer: adjust volume and delay
      audioLayers.forEach((layer: AudioLayer, index: number) => {
        const inputIndex = index + 1 // 0 is video
        const delayMs = Math.round(layer.startTime * 1000)
        filterComplex += `[${inputIndex}:a]volume=${layer.volume},adelay=${delayMs}|${delayMs}[a${index}];`
      })

      // Mix all audio streams
      const audioStreams = audioLayers.map((_: any, i: number) => `[a${i}]`).join('')
      filterComplex += `${audioStreams}amix=inputs=${audioLayers.length}:duration=longest:normalize=0[aout]`

      console.log('FFmpeg filter:', filterComplex)

      command
        .complexFilter(filterComplex)
        .outputOptions([
          '-map', '0:v',      // Use video from first input
          '-map', '[aout]',   // Use mixed audio
          '-c:v', 'copy',     // Copy video codec (no re-encoding)
          '-c:a', 'aac',      // Encode audio as AAC
          '-b:a', '192k',     // Audio bitrate
          '-shortest'         // Match shortest stream duration
        ])
        .output(outputPath)
        .on('start', (commandLine) => {
          console.log('FFmpeg command:', commandLine)
        })
        .on('progress', (progress) => {
          if (progress.percent) {
            console.log(`Processing: ${progress.percent.toFixed(1)}% done`)
          }
        })
        .on('end', () => {
          console.log('Merging complete!')
          resolve()
        })
        .on('error', (err) => {
          console.error('FFmpeg error:', err)
          reject(new Error(`FFmpeg failed: ${err.message}`))
        })
        .run()
    })

    // Upload merged video to Cloudflare R2
    console.log('Uploading merged video to R2...')
    
    const fileBuffer = await readFile(outputPath)
    const fileName = `merged_${videoId}.${outputFormat}`
    const filePath = `videos/${fileName}`
    
    const uploadResult = await uploadToR2(fileBuffer, filePath, `video/${outputFormat}`)

    if (!uploadResult.success) {
      console.error('R2 upload failed:', uploadResult.error)
      throw new Error(uploadResult.error || 'Failed to upload merged video to R2')
    }

    console.log('Upload complete:', uploadResult.url)
    
    // Get file stats for response
    const stats = await require('fs').promises.stat(outputPath)
    const fileSizeInBytes = stats.size

    // Clean up temp files
    console.log('Cleaning up temporary files...')
    for (const file of tempFiles) {
      try {
        if (existsSync(file)) {
          await unlink(file)
        }
      } catch (err) {
        console.error('Failed to delete temp file:', file, err)
      }
    }

    return NextResponse.json({
      success: true,
      videoUrl: uploadResult.url,
      format: outputFormat,
      size: fileSizeInBytes,
      audioLayersUsed: audioLayers.length,
      message: 'Video merged with audio successfully! (FREE merge with R2 storage)'
    })

  } catch (error: any) {
    console.error('Video merge error:', error)
    
    // Clean up temp files on error
    for (const file of tempFiles) {
      try {
        if (existsSync(file)) {
          await unlink(file)
        }
      } catch (err) {
        console.error('Failed to delete temp file on error:', file)
      }
    }

    return NextResponse.json({
      error: error.message || 'Failed to merge audio with video',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 })
  }
}
