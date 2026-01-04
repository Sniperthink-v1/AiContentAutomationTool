import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/middleware'
import pool from '@/lib/db'
import { GoogleGenAI } from '@google/genai'

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
    } = body

    // Determine clips to generate
    const clips = scriptSections && scriptSections.length > 0 
      ? scriptSections 
      : [prompt]
    
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
    // For single clip: use full duration, for multiple clips: each is 8 seconds
    const durationPerClip = clipCount === 1 ? duration : 8
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

    // If image-to-video mode, analyze the image FIRST to get character description
    let characterDescription = ''
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
      
      // Analyze image to get detailed character description (happens automatically)
      console.log('Analyzing image for character description...')
      characterDescription = await analyzeImageForCharacter(imageData, imageMimeType)
      console.log('Character description obtained:', characterDescription ? 'Yes' : 'No')
    }

    // Generate videos for each clip
    const operationNames: string[] = []
    
    for (let i = 0; i < clips.length; i++) {
      const clipPrompt = clips[i]
      
      // Use the prompt exactly as provided by the user - no style modifications
      const enhancedPrompt = clipPrompt

      console.log(`Starting Veo 3.1 Fast generation for clip ${i + 1}/${clipCount}:`, enhancedPrompt.substring(0, 100))
      console.log(`Input type: ${inputType}, Has source image: ${!!sourceImage}, Duration: ${durationPerClip}s`)

      // Build generation config
      const generateConfig: any = {
        aspectRatio: aspectRatio,
        numberOfVideos: 1,
        durationSeconds: durationPerClip, // Use configurable duration (8, 16, 24, or 32 seconds for single clip)
      }

      // Build request options based on input type
      const requestOptions: any = {
        model: 'veo-3.1-fast-generate-preview',
        config: generateConfig,
      }

      // Handle image-to-video mode with character description
      if (inputType === 'image-to-video' && sourceImage && imageData) {
        // SMART STRATEGY BASED ON VIDEO LENGTH:
        // Single clip (8s): Just animate the image naturally, no extra specs
        // Multiple clips (16s+): Use strict character consistency
        
        if (clipCount === 1) {
          // SINGLE CLIP: Simple animation, no modifications (uses selected duration: 8-32s)
          requestOptions.image = {
            imageBytes: imageData,
            mimeType: imageMimeType
          }
          // Use user's prompt as-is, or simple default
          requestOptions.prompt = enhancedPrompt || 'Animate this image naturally with smooth, realistic movements'
          console.log(`Single clip (${durationPerClip}s): Simple animation without character specifications`)
        } else if (i === 0) {
          // FIRST CLIP of MULTI-CLIP VIDEO: Animate image with character description for consistency
          requestOptions.image = {
            imageBytes: imageData,
            mimeType: imageMimeType
          }
          
          // Include character description for multi-clip consistency
          if (characterDescription) {
            requestOptions.prompt = `MAINTAIN THIS EXACT CHARACTER THROUGHOUT: ${characterDescription}

${enhancedPrompt}

CRITICAL: Keep the character's face, features, clothing, and appearance EXACTLY as shown in the reference image. No variations or changes to the character's appearance.`
          } else if (enhancedPrompt) {
            requestOptions.prompt = `${enhancedPrompt}\n\nIMPORTANT: Animate this image naturally while keeping the character's appearance exactly the same throughout.`
          }
          console.log(`Clip ${i + 1}/${clipCount}: First clip with character description for consistency`)
        } else {
          // SUBSEQUENT CLIPS: Use STRICT character description for perfect consistency
          if (characterDescription) {
            const characterPrompt = `EXACT CHARACTER CONTINUATION - VISUAL CONSISTENCY LOCKED:

CHARACTER SPECIFICATIONS (MUST MATCH EXACTLY):
${characterDescription}

CONTINUATION RULES:
✓ Face: IDENTICAL facial features, skin tone, expressions
✓ Body: SAME body type, posture, proportions
✓ Clothing: EXACT same outfit, colors, style, accessories
✓ Background: SAME environment, lighting, setting (unless script specifies otherwise)
✓ Camera angle: Similar perspective for natural flow
✗ NO changes to character appearance
✗ NO different clothing or hairstyle
✗ NO different person or face

SCENE DESCRIPTION FOR THIS CLIP:
${enhancedPrompt}

NOTE: This is a continuation. Only the character's ACTION and DIALOGUE change. Their appearance, clothing, and environment stay IDENTICAL to previous clips.`
            requestOptions.prompt = characterPrompt
            console.log(`Clip ${i + 1}/${clipCount}: Using ENHANCED character consistency prompt`)
          } else {
            // Fallback if character analysis failed
            requestOptions.prompt = `CRITICAL CONTINUATION: This is Clip ${i + 1} of a ${clipCount}-clip sequence. The character, clothing, background, and lighting must be VISUALLY IDENTICAL to the previous clip(s). Same face, same outfit, same location. Only the character's action/dialogue changes.

Scene: ${enhancedPrompt}

REMINDER: Character appearance is locked from previous clips.`
            console.log(`Clip ${i + 1}/${clipCount}: Using enhanced fallback continuation prompt`)
          }
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
      
      // Small delay between API calls to avoid rate limiting
      if (i < clips.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 2000))
      }
    }

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
