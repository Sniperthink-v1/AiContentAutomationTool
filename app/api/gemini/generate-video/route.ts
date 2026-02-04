import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/middleware'
import pool from '@/lib/db'
import { GoogleGenAI } from '@google/genai'
import { exec } from 'child_process'
import { promisify } from 'util'
import { writeFile, unlink, mkdir, readFile } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'
import { v4 as uuidv4 } from 'uuid'

const execAsync = promisify(exec)

// Helper to download video from URL
async function downloadVideo(url: string, outputPath: string): Promise<void> {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Failed to download video: ${response.statusText}`)
  }
  const buffer = await response.arrayBuffer()
  await writeFile(outputPath, Buffer.from(buffer))
}

// Helper to extract last frame from video as base64
async function extractLastFrame(videoPath: string): Promise<{ base64: string, mimeType: string }> {
  const outputPath = `${videoPath}_lastframe.jpg`
  
  try {
    // Extract the last frame using FFmpeg
    const command = `ffmpeg -sseof -1 -i "${videoPath}" -update 1 -q:v 1 -frames:v 1 "${outputPath}" -y`
    await execAsync(command)
    
    // Read the image and convert to base64
    const imageBuffer = await readFile(outputPath)
    const base64Image = imageBuffer.toString('base64')
    
    // Cleanup the temporary image file
    try {
      await unlink(outputPath)
    } catch {}
    
    return {
      base64: base64Image,
      mimeType: 'image/jpeg'
    }
  } catch (error) {
    console.error('Error extracting last frame:', error)
    throw new Error('Failed to extract last frame from video')
  }
}

// Function to analyze image and get detailed character description using Gemini
async function analyzeImageForCharacter(imageData: string, mimeType: string): Promise<string> {
  const geminiApiKey = process.env.GEMINI_API_KEY || process.env.VEO_API_KEY
  if (!geminiApiKey) {
    throw new Error('Gemini API key not configured')
  }

  const geminiClient = new GoogleGenAI({ apiKey: geminiApiKey })
  
  const analysisPrompt = `You are an expert character artist. Analyze this image with MICROSCOPIC DETAIL to ensure PERFECT visual replication across multiple video clips. Every feature must be described so precisely that the character will look IDENTICAL in every frame.

🎯 CRITICAL MISSION: Create a description so detailed that NO variation is possible. Think of this as creating a DNA blueprint for visual consistency.

═══════════════════════════════════════════════════
📸 FACIAL FEATURES (EXTREME PRECISION REQUIRED)
═══════════════════════════════════════════════════

FACE STRUCTURE:
• Overall face shape (oval/round/square/heart/diamond/oblong - be extremely specific)
• Face width-to-height ratio
• Facial symmetry or asymmetry details
• Bone structure prominence (high/low cheekbones, defined/soft jawline)
• Face fullness (gaunt/normal/full/very full cheeks)

SKIN:
• Exact skin tone with specific color descriptors (pale ivory/warm beige/golden tan/deep brown/etc.)
• Skin texture (smooth/textured/pores visible/matte/dewy)
• Any freckles, moles, birthmarks (exact locations and sizes)
• Skin undertones (cool/warm/neutral)
• Any scars, wrinkles, or distinguishing marks

EYES (ULTRA-DETAILED):
• Eye shape (almond/round/hooded/deep-set/upturned/downturned)
• Exact eye color with specifics (not just "brown" but "dark chocolate brown with amber flecks")
• Eye size relative to face
• Distance between eyes (close-set/normal/wide-set)
• Upper and lower eyelid characteristics
• Eyelash length, thickness, and curl
• Eyebrow-to-eye distance
• Whites of eyes visibility
• Pupil size and iris patterns if visible

EYEBROWS:
• Exact shape (straight/arched/soft arch/angular/s-shaped)
• Thickness (thin/medium/thick/bushy)
• Color (include if different from hair)
• Arch height and position
• Starting point, peak position, and tail end
• Hair density and direction of growth
• Gap between eyebrows

NOSE:
• Overall nose shape (straight/button/Roman/hawk/snub/upturned/etc.)
• Bridge width (narrow/medium/wide)
• Bridge height (high/low/flat)
• Nostril shape and size
• Nose tip shape (pointed/round/bulbous/flat)
• Nose length relative to face
• Nose angle from profile
• Alar base width

MOUTH AND LIPS:
• Upper lip shape and fullness (thin/medium/full/very full)
• Lower lip shape and fullness
• Lip color (pale pink/rosy/mauve/deep red/brown-toned/etc.)
• Cupid's bow definition (sharp/soft/flat)
• Mouth width relative to nose
• Lip-to-nose distance
• Smile characteristics (if visible)
• Teeth visibility and characteristics
• Lip texture (smooth/lined/glossy/matte)

JAWLINE AND CHIN:
• Jaw shape (angular/soft/square/rounded/v-shaped)
• Jaw width
• Jawline definition (sharp/soft/undefined)
• Chin shape (pointed/square/round/cleft/receding/prominent)
• Chin size relative to face
• Jowl presence or absence

CHEEKBONES AND CHEEKS:
• Cheekbone prominence (high/low/flat)
• Cheekbone width
• Cheek fullness (hollow/normal/full/very full)
• Apple of cheeks visibility

EARS (if visible):
• Size relative to head
• Shape and position
• Lobe type (attached/detached)
• Any piercings or jewelry

AGE APPEARANCE:
• Estimated age range (be specific: early 20s, mid-30s, late 40s, etc.)
• Signs of aging if any (crow's feet, forehead lines, laugh lines, neck lines)

═══════════════════════════════════════════════════
💇 HAIR (COMPLETE SPECIFICATION)
═══════════════════════════════════════════════════

• Exact color with undertones (jet black/dark brown with red undertones/honey blonde with caramel highlights/salt and pepper/etc.)
• Hair length (specific: shoulder-length, chin-length, waist-length, buzz cut 3mm, etc.)
• Hair texture (straight/wavy/curly/kinky - specify curl pattern if curly: 2A, 3B, 4C, etc.)
• Hair thickness/volume (thin/medium/thick/very thick)
• Hair part location and width (center/left/right/no part)
• Hairline shape (straight/widow's peak/receding/rounded)
• Styling (loose/sleek/messy/tied back/specific style name)
• Hair shine level (matte/natural/glossy)
• Flyaways or baby hairs if present
• Facial hair if any (mustache/beard style, length, color, density)

═══════════════════════════════════════════════════
👔 CLOTHING & ACCESSORIES (EXACT REPLICATION)
═══════════════════════════════════════════════════

CLOTHING:
• Every garment type (shirt/sweater/jacket/dress/etc.)
• Exact colors with specific names (not "blue" but "navy blue" or "sky blue")
• Patterns or prints (solid/striped/plaid/floral - describe pattern details)
• Fabric texture appearance (cotton/silk/knit/denim/leather/etc.)
• Neckline style (crew/v-neck/collar/turtleneck/scoop/etc.)
• Sleeve length and style
• Fit (tight/fitted/loose/oversized)
• Any logos, text, or graphics on clothing
• Layering details
• Visible buttons, zippers, pockets

ACCESSORIES:
• Jewelry (earrings/necklace/rings/bracelet/watch - describe each piece)
• Glasses (frame shape, color, thickness if wearing)
• Hat or headwear (style, color, material)
• Scarf or tie (color, pattern, how worn)
• Any other accessories (bag visible, pins, badges, etc.)

═══════════════════════════════════════════════════
🎬 ENVIRONMENT & SETTING
═══════════════════════════════════════════════════

BACKGROUND:
• Primary background elements (wall/room/outdoor/studio/etc.)
• Background colors (exact shades)
• Background texture (smooth/textured/patterned)
• Props or furniture visible (describe each)
• Background blur level (sharp/slightly blurred/very blurred)

LIGHTING:
• Light direction (front/side/back/above)
• Light quality (soft/hard/diffused/dramatic)
• Light color temperature (warm/neutral/cool)
• Shadow characteristics
• Highlight placement on face

CAMERA/FRAMING:
• Shot type (close-up/medium/wide)
• Camera angle (eye-level/slightly above/slightly below)
• Character position in frame (centered/left/right)

═══════════════════════════════════════════════════
📋 OUTPUT FORMAT
═══════════════════════════════════════════════════

Start with: "EXACT CHARACTER SPECIFICATION FOR VIDEO CONSISTENCY:"

Then provide the complete analysis in a structured format. Be EXHAUSTIVELY detailed. Use precise measurements and comparisons. Every detail matters for perfect replication across clips.`

  try {
    const response = await geminiClient.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: [{
        role: 'user',
        parts: [
          { text: analysisPrompt },
          { 
            inlineData: {
              mimeType: mimeType,
              data: imageData
            }
          }
        ]
      }]
    })

    const description = response.text || ''
    console.log('Character analysis result:', description.substring(0, 200))
    return description
  } catch (error) {
    console.error('Error analyzing image:', error)
    return '' // Return empty string if analysis fails, video gen will still work
  }
}

// Veo 3.1 video generation using Google Gen AI SDK
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
    const { 
      prompt, 
      scriptSections, // Array of clip descriptions for multi-clip generation
      videoStyle = 'cinematic', // 'dialogue', 'cinematic', 'animation'
      aspectRatio = '16:9',
      duration = 8, // Total duration (8, 16, 24, or 32 seconds)
      sourceImage, // Base64 image for image-to-video mode
      inputType = 'text-to-video', // 'image-to-video' or 'text-to-video'
      withAudio = true, // Whether to generate with audio (true = with audio, false = without)
      customAudioUrl, // Pre-generated audio URL (from Runway) to sync video to
    } = body

    // Determine clips to generate
    // For Veo 3.1, max duration per clip is 8s, so split longer durations into multiple clips
    const maxClipDuration = 8
    const requestedClipCount = Math.ceil(duration / maxClipDuration)
    
    let clips: string[] = []
    if (scriptSections && scriptSections.length > 0) {
      // User provided multiple clip descriptions
      clips = scriptSections
    } else if (prompt && requestedClipCount > 1) {
      // Single prompt but long duration - duplicate the prompt for each clip
      // This ensures 16s = 2 clips, 24s = 3 clips, 32s = 4 clips
      console.log(`Auto-splitting into ${requestedClipCount} clips for ${duration}s duration`)
      clips = Array(requestedClipCount).fill(prompt)
    } else {
      clips = [prompt]
    }
    
    const clipCount = clips.length

    // For image-to-video, a prompt is optional (we'll use the character description)
    // For text-to-video, a prompt is required
    if (inputType === 'text-to-video' && (!clips[0] || !clips[0].trim())) {
      return NextResponse.json(
        { success: false, error: 'Prompt is required for text-to-video' },
        { status: 400 }
      )
    }

    // For image-to-video without a prompt, use a default
    if (inputType === 'image-to-video' && (!clips[0] || !clips[0].trim())) {
      clips[0] = 'Animate this image naturally with subtle movements and bring it to life'
    }

    // Calculate credit cost (15 credits per second for Veo 3.1)
    // Divide the selected duration evenly among all clips
    const durationPerClip = Math.ceil(duration / clipCount)
    const creditCost = 15 * clipCount * durationPerClip

    // Check user credits
    const creditsResult = await pool.query(
      'SELECT remaining_credits FROM credits WHERE user_id = $1',
      [user.id]
    )
    
    const userCredits = creditsResult.rows[0]?.remaining_credits || 0
    if (userCredits < creditCost) {
      return NextResponse.json(
        { success: false, error: `Insufficient credits. Need ${creditCost}, have ${userCredits}` },
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

    // Initialize Google Gen AI client with Veo API key
    const client = new GoogleGenAI({ apiKey })

    // If image-to-video mode, extract image data for all clips
    let imageData = ''
    let imageMimeType = 'image/png'
    
    if (inputType === 'image-to-video' && sourceImage) {
      // Extract base64 data from data URL if present
      imageData = sourceImage
      
      if (sourceImage.startsWith('data:')) {
        const matches = sourceImage.match(/^data:([^;]+);base64,(.+)$/)
        if (matches) {
          imageMimeType = matches[1]
          imageData = matches[2]
        }
      }
      
      console.log('Image data extracted for video generation')
    }

    // Generate videos for each clip SEQUENTIALLY (for image-to-video with frame extraction)
    const operationNames: string[] = []
    const videoUrls: string[] = []
    
    // Create temp directory for video processing
    // Use /tmp on Vercel (serverless), fallback to cwd/tmp locally
    const isVercel = process.env.VERCEL === '1' || process.env.VERCEL_ENV
    const tempDir = isVercel 
      ? '/tmp/video-frames' 
      : path.join(process.cwd(), 'tmp', 'video-frames')
    
    if (!existsSync(tempDir)) {
      await mkdir(tempDir, { recursive: true })
    }
    
    const sessionId = uuidv4()
    let currentImageData = imageData
    let currentImageMimeType = imageMimeType
    
    for (let i = 0; i < clips.length; i++) {
      const clipPrompt = clips[i]
      
      // Use the prompt exactly as provided by the user - no style modifications
      const enhancedPrompt = clipPrompt

      console.log(`\n=== Starting Veo 3.1 Fast generation for clip ${i + 1}/${clipCount} ===`)
      console.log(`Prompt: ${enhancedPrompt.substring(0, 100)}`)
      console.log(`Input type: ${inputType}, Has source image: ${!!currentImageData}, Duration: ${durationPerClip}s, With Audio: ${withAudio}, Custom Audio: ${!!customAudioUrl}`)

      // Build generation config
      const generateConfig: any = {
        aspectRatio: aspectRatio,
        numberOfVideos: 1,
        durationSeconds: durationPerClip,
      }
      
      // Add audio config based on withAudio parameter and custom audio
      if (!withAudio || customAudioUrl) {
        // Disable audio generation if:
        // 1. "without audio" mode, OR
        // 2. Custom audio is provided (we'll use that instead)
        generateConfig.includeAudio = false
      }

      // Build request options based on input type
      const requestOptions: any = {
        model: 'veo-3.1-fast-generate-preview',
        config: generateConfig,
      }
      
      // If custom audio is provided, add it to the request
      // Gemini will sync the video to this audio (lip-sync, timing, etc.)
      if (customAudioUrl && withAudio) {
        console.log('🎤 Using custom audio - Gemini will sync video to this audio')
        
        // Download audio from URL and convert to base64 if needed
        let audioData = customAudioUrl
        if (customAudioUrl.startsWith('http')) {
          const audioResponse = await fetch(customAudioUrl)
          const audioBuffer = await audioResponse.arrayBuffer()
          audioData = Buffer.from(audioBuffer).toString('base64')
        } else if (customAudioUrl.startsWith('data:')) {
          // Extract base64 from data URL
          audioData = customAudioUrl.split(',')[1]
        }
        
        requestOptions.audio = {
          audioBytes: audioData,
          mimeType: 'audio/mpeg'
        }
      }

      // For image-to-video mode, always use an image (user's image for clip 1, last frame for subsequent clips)
      if (inputType === 'image-to-video' && currentImageData) {
        requestOptions.image = {
          imageBytes: currentImageData,
          mimeType: currentImageMimeType
        }
        
        requestOptions.prompt = enhancedPrompt || 'Animate this image naturally with smooth, realistic movements'
        console.log(`Clip ${i + 1}/${clipCount}: Sending image with prompt`)
        if (i > 0) {
          console.log(`Using last frame from clip ${i} as starting image`)
        }
      } else {
        // Text-to-video mode (no image)
        requestOptions.prompt = enhancedPrompt
      }

      // Start video generation with Veo 3.1 Fast using SDK
      const operation = await client.models.generateVideos(requestOptions)

      if (!operation.name) {
        return NextResponse.json(
          { success: false, error: `No operation name returned for clip ${i + 1}` },
          { status: 500 }
        )
      }

      console.log(`Clip ${i + 1} operation started:`, operation.name)
      operationNames.push(operation.name)
      
      // WAIT for this clip to complete before starting the next one (so we can extract the last frame)
      if (inputType === 'image-to-video' && i < clips.length - 1) {
        console.log(`\nWaiting for clip ${i + 1} to complete before generating clip ${i + 2}...`)
        
        let clipComplete = false
        let clipVideoUrl = ''
        let attempts = 0
        const maxAttempts = 120 // 10 minutes max (5 sec intervals)
        
        while (!clipComplete && attempts < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, 5000)) // Check every 5 seconds
          attempts++
          
          try {
            // Check status using REST API
            const statusUrl = `https://generativelanguage.googleapis.com/v1beta/${operation.name}?key=${apiKey}`
            const statusResponse = await fetch(statusUrl)
            
            if (statusResponse.ok) {
              const statusData = await statusResponse.json()
              
              if (statusData.done) {
                if (statusData.error) {
                  console.error(`Clip ${i + 1} failed:`, JSON.stringify(statusData.error, null, 2))
                  
                  // Check if it's a temporary error (overloaded, rate limit) vs permanent failure
                  const errorCode = statusData.error.code
                  const errorMessage = statusData.error.message || ''
                  
                  // Temporary errors - continue polling (don't throw)
                  if (errorCode === 14 || // Overloaded
                      errorCode === 8 ||  // Resource exhausted
                      errorCode === 429 || // Rate limit
                      errorMessage.includes('overloaded') ||
                      errorMessage.includes('rate limit') ||
                      errorMessage.includes('try again')) {
                    console.log(`Temporary error for clip ${i + 1}, will retry...`)
                    // Don't set clipComplete = true, continue polling
                  } else {
                    // Permanent error - fail
                    throw new Error(statusData.error.message || 'Video generation failed')
                  }
                } else {
                  // Extract video URL from response
                  const response = statusData.response || statusData.result || statusData
                  const generatedSamples = response?.generateVideoResponse?.generatedSamples || []
                
                  if (generatedSamples.length > 0 && generatedSamples[0].video?.uri) {
                    clipVideoUrl = generatedSamples[0].video.uri
                    if (!clipVideoUrl.includes('key=')) {
                      clipVideoUrl = clipVideoUrl.includes('?') 
                        ? `${clipVideoUrl}&key=${apiKey}`
                        : `${clipVideoUrl}?key=${apiKey}`
                    }
                    clipComplete = true
                    console.log(`Clip ${i + 1} completed after ${attempts * 5} seconds`)
                  }
                }
              }
            }
          } catch (statusError) {
            console.error(`Error checking status for clip ${i + 1}:`, statusError)
            // Don't fail completely, just continue polling
          }
          
          if (!clipComplete && attempts % 12 === 0) { // Every minute
            console.log(`Still waiting for clip ${i + 1}... (${attempts * 5}s elapsed)`)
          }
        }
        
        if (!clipComplete) {
          return NextResponse.json(
            { success: false, error: `Clip ${i + 1} timed out after ${maxAttempts * 5} seconds` },
            { status: 408 }
          )
        }
        
        videoUrls.push(clipVideoUrl)
        
        // Download the video and extract last frame for the next clip
        console.log(`\nExtracting last frame from clip ${i + 1} for clip ${i + 2}...`)
        const videoPath = path.join(tempDir, `clip-${sessionId}-${i}.mp4`)
        
        try {
          await downloadVideo(clipVideoUrl, videoPath)
          const lastFrame = await extractLastFrame(videoPath)
          
          // Update current image data for next iteration
          currentImageData = lastFrame.base64
          currentImageMimeType = lastFrame.mimeType
          
          // Debug: Check image size
          const imageSizeKB = Math.round(lastFrame.base64.length / 1024)
          console.log(`Last frame extracted successfully for next clip`)
          console.log(`Extracted image size: ${imageSizeKB} KB, MIME: ${lastFrame.mimeType}`)
          
          // Cleanup downloaded video
          try {
            await unlink(videoPath)
          } catch {}
        } catch (extractError) {
          console.error(`Error extracting last frame from clip ${i + 1}:`, extractError)
          return NextResponse.json(
            { success: false, error: `Failed to extract last frame from clip ${i + 1}` },
            { status: 500 }
          )
        }
      }
      
      // Small delay between API calls to avoid rate limiting
      if (i < clips.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 2000))
      }
    }
    
    console.log(`\n=== All ${clipCount} clips initiated successfully ===`)

    // Deduct credits after starting all generations
    await pool.query(
      `UPDATE credits 
       SET remaining_credits = remaining_credits - $1,
           used_credits = used_credits + $1
       WHERE user_id = $2`,
      [creditCost, user.id]
    )

    // Record the transaction
    let actionDescription = ''
    if (inputType === 'image-to-video') {
      actionDescription = `Image to Video - ${videoStyle} style - ${duration}s (${clipCount} clips)`
    } else {
      actionDescription = `Text to Video - ${videoStyle} style - ${duration}s (${clipCount} clips)`
    }
    
    await pool.query(
      `INSERT INTO credit_transactions (user_id, action_type, credits_used, model_used, description)
       VALUES ($1, $2, $3, $4, $5)`,
      [user.id, 'video_generation', creditCost, 'veo-3.1-fast', actionDescription]
    )

    // Get updated credits
    const updatedCredits = await pool.query(
      'SELECT remaining_credits FROM credits WHERE user_id = $1',
      [user.id]
    )

    // If we did sequential generation with frame extraction, videos are already ready
    if (inputType === 'image-to-video' && videoUrls.length > 0 && videoUrls.length === clipCount) {
      console.log(`\n=== All ${clipCount} clips completed and ready for combining ===`)
      
      return NextResponse.json({
        success: true,
        operationNames: operationNames,
        operationName: operationNames[0],
        clipCount: clipCount,
        videoUrls: videoUrls, // Videos are already complete
        allComplete: true, // Flag to indicate no need to wait
        message: `All ${clipCount} clip${clipCount > 1 ? 's' : ''} generated successfully with smooth transitions`,
        videoStyle,
        duration,
        creditsUsed: creditCost,
        remainingCredits: updatedCredits.rows[0]?.remaining_credits || 0
      })
    }

    return NextResponse.json({
      success: true,
      operationNames: operationNames,
      operationName: operationNames[0], // For backwards compatibility
      clipCount: clipCount,
      message: `Video generation started for ${clipCount} clip${clipCount > 1 ? 's' : ''}`,
      videoStyle,
      duration,
      creditsUsed: creditCost,
      remainingCredits: updatedCredits.rows[0]?.remaining_credits || 0
    })

  } catch (error: any) {
    console.error('Gemini video generation error:', error)
    
    // Handle specific error types with user-friendly messages
    const errorMessage = error?.message || error?.toString() || 'Internal server error'
    let userMessage = errorMessage
    let statusCode = 500
    
    // Check for quota/rate limit errors
    if (errorMessage.includes('429') || 
        errorMessage.includes('quota') || 
        errorMessage.includes('RESOURCE_EXHAUSTED') ||
        errorMessage.includes('rate limit')) {
      userMessage = 'API quota exceeded. The daily limit for video generation has been reached. Please try again tomorrow or upgrade your plan at https://ai.google.dev/pricing'
      statusCode = 429
    } else if (errorMessage.includes('401') || errorMessage.includes('UNAUTHENTICATED')) {
      userMessage = 'API authentication failed. Please check your Veo API key configuration.'
      statusCode = 401
    } else if (errorMessage.includes('content') || errorMessage.includes('moderation') || errorMessage.includes('safety')) {
      userMessage = 'Your prompt was blocked by content moderation. Please try a different prompt.'
      statusCode = 400
    }
    
    return NextResponse.json(
      { success: false, error: userMessage },
      { status: statusCode }
    )
  }
}
