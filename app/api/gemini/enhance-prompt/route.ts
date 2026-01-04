import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { getAuthUser } from '@/lib/middleware'
import pool from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    // Get authenticated user
    const user = await getAuthUser(request)
    
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { prompt, settings, customInstructions } = await request.json()

    if (!prompt) {
      return NextResponse.json(
        { error: 'Prompt is required' },
        { status: 400 }
      )
    }

    // Check AI credits before processing
    const creditsResult = await pool.query(
      'SELECT ai_credits FROM credits WHERE user_id = $1',
      [user.id]
    )

    if (creditsResult.rows.length === 0 || creditsResult.rows[0].ai_credits < 5) {
      return NextResponse.json(
        { error: 'Insufficient AI credits. You need 5 AI credits for this enhancement.' },
        { status: 400 }
      )
    }

    // Check if API key exists
    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { error: 'Gemini API key not configured' },
        { status: 500 }
      )
    }

    // Initialize Gemini AI
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
    
    // Try multiple models with retry logic (using December 2024+ model names)
    const models = ['gemini-1.5-flash-002', 'gemini-1.5-pro-002', 'gemini-2.0-flash-exp']
    let lastError: any = null
    let enhancedScript = ''
    let clips: string[] = []

    // Check if this is for Veo 3.1 (multi-clip generation)
    const isVeo = settings?.isVeo || false
    const clipCount = settings?.clipCount || 1
    const videoStyle = settings?.videoStyle || 'cinematic'
    const noCaptions = settings?.noCaptions !== false // Default to true (no captions)

    // No captions instruction
    const noCaptionsInstruction = noCaptions 
      ? `\n\nCRITICAL: Do NOT include any text overlays, captions, titles, subtitles, or on-screen text in the video. The video should be pure visual content without any written words appearing on screen. No floating text, no title cards, no text animations.`
      : ''

    // Create detailed instruction for video script enhancement
    let enhancementInstruction = ''
    
    if (customInstructions) {
      // Use custom instructions provided by user
      if (isVeo && clipCount > 1) {
        enhancementInstruction = `
You are a professional video script writer. Enhance the user's video concept by breaking it into ${clipCount} clips based on their CUSTOM ENHANCEMENT INSTRUCTIONS while PRESERVING EVERY DETAIL.

User's video idea: "${prompt}"

User's custom enhancement instructions: "${customInstructions}"

Video settings:
- Total Duration: ${settings?.duration || 8} seconds
- Number of Clips: ${clipCount} (${clipCount > 1 ? `~${Math.ceil((settings?.duration || 8) / clipCount)} seconds each` : 'single clip'})
- Video Style: ${videoStyle === 'dialogue' ? 'With dialogue and sound effects' : videoStyle === 'animation' ? 'Creative animation style' : 'Cinematic realism'}
${noCaptionsInstruction}

CRITICAL PRESERVATION RULES:
1. PRESERVE ALL DIALOGUE: If the user includes any dialogue, quotes, or speech, include it WORD-FOR-WORD in quotes
2. PRESERVE ALL ACTIONS: Keep every action, movement, and activity the user described
3. PRESERVE ALL DESCRIPTIONS: Maintain all visual details, colors, settings, and atmosphere they mentioned
4. PRESERVE CHARACTERS: Keep all character names, descriptions, and personalities exactly as specified
5. PRESERVE LOCATIONS: Keep all settings, environments, and locations they described
6. ONLY ENHANCE: Add technical details like camera angles, lighting, and cinematography
7. Apply the user's custom enhancement instructions to each clip
8. Break into ${clipCount} clips that tell THEIR complete story
${noCaptions ? '9. NO text, titles, captions, or on-screen text of any kind' : ''}

${videoStyle === 'dialogue' ? 'DIALOGUE FORMAT: Include all spoken words in quotation marks with character names. Example: Character: "spoken dialogue here"' : ''}

CONTINUOUS SCENE RULE: If this is a continuous conversation/monologue (podcast, speech, presentation), ONLY describe the scene setup in Clip 1. For Clips 2, 3, 4+, write "**Continues from previous clip**" and focus ONLY on the new dialogue, actions, and camera work. DO NOT repeat location descriptions.

CHARACTER CONSISTENCY FOR IMAGE-TO-VIDEO: When the user uploads an image for Clip 1, the AI will automatically extract character details. For Clips 2 & 3, you should focus on ACTIONS and DIALOGUE while keeping character/setting descriptions minimal. The system will enforce visual consistency automatically.

Format EXACTLY like this:
Clip 1: **Scene:** [Full scene description with location, lighting, character setup]. **Action:** [What happens]. **Dialogue:** [Exact words spoken]. **Camera:** [Shot type, movement]. **Lighting:** [Light setup].

Clip 2: **Continues from previous clip. Same character, clothing, and setting.** **Action:** [New action/gesture]. **Dialogue:** [Next dialogue section, word-for-word]. **Camera:** [New camera angle/movement].

${clipCount > 2 ? `Clip 3: **Continues from previous clip. Same character, clothing, and setting.** **Action:** [New action]. **Dialogue:** [Next dialogue section]. **Camera:** [Camera work].` : ''}
${clipCount > 3 ? `Clip 4: **Continues from previous clip. Same character, clothing, and setting.** **Action:** [Final action]. **Dialogue:** [Final dialogue]. **Camera:** [Closing shot].` : ''}
`
      } else {
        enhancementInstruction = `
You are a professional video script writer. Enhance the following video idea based on the user's CUSTOM ENHANCEMENT INSTRUCTIONS while PRESERVING EVERY DETAIL.

User's video idea: "${prompt}"

User's custom enhancement instructions: "${customInstructions}"

Video settings:
- Style: ${settings?.style || 'cinematic'}
- Duration: ${settings?.duration || 30} seconds
${noCaptionsInstruction}

CRITICAL PRESERVATION RULES:
1. PRESERVE ALL DIALOGUE: Include any dialogue, quotes, or speech WORD-FOR-WORD in quotation marks
2. PRESERVE ALL ACTIONS: Keep every action, movement, gesture, and activity described
3. PRESERVE ALL DESCRIPTIONS: Keep all visual details, colors, clothing, settings mentioned
4. PRESERVE CHARACTERS: Maintain all character names, personalities, and traits
5. PRESERVE LOCATIONS: Keep all environments, settings, and places exactly as described
6. ONLY ENHANCE: Add camera movements, lighting details, and cinematic refinements
7. Apply the user's custom enhancement instructions
8. Add technical details that support the user's vision
${noCaptions ? '9. NO text overlays, titles, captions, or on-screen text' : ''}

${videoStyle === 'dialogue' ? 'DIALOGUE FORMAT: Include all spoken words with character names. Example: John: "Hello there!" Mary: "Hi!"' : ''}

Output a COMPLETE, detailed script that preserves ALL user content (dialogue, actions, descriptions) and adds professional cinematic enhancements.
`
      }
    } else if (isVeo && clipCount > 1) {
      // Generate multiple clips for Veo 3.1
      enhancementInstruction = `
You are a professional video script writer for AI video generation. Enhance the user's video concept by breaking it into ${clipCount} clips while PRESERVING EVERY DETAIL.

User's video idea: "${prompt}"

Video settings:
- Total Duration: ${settings?.duration || 8} seconds
- Number of Clips: ${clipCount} (${clipCount > 1 ? `~${Math.ceil((settings?.duration || 8) / clipCount)} seconds each` : 'single clip'})
- Video Style: ${videoStyle === 'dialogue' ? 'With dialogue and sound effects' : videoStyle === 'animation' ? 'Creative animation style' : 'Cinematic realism'}
- Visual Style: ${settings?.style || 'cinematic'}
${noCaptionsInstruction}

CRITICAL PRESERVATION RULES:
1. PRESERVE ALL DIALOGUE: Include every word of dialogue EXACTLY as user wrote it, in quotation marks
2. PRESERVE ALL ACTIONS: Maintain every action, movement, and gesture the user described
3. PRESERVE ALL DESCRIPTIONS: Keep all visual details, colors, clothing, settings, and atmosphere
4. PRESERVE CHARACTERS: Keep character names, personalities, and all traits exactly as specified
5. PRESERVE STORY FLOW: Maintain the exact sequence and progression the user intended
6. ONLY ENHANCE with technical details:
   - Camera movements (pan, tilt, zoom, tracking)
   - Lighting (soft light, golden hour, dramatic shadows)
   - Shot composition (close-up, wide shot, over-shoulder)
   - Audio/sound design${videoStyle === 'dialogue' ? ' and dialogue delivery' : ''}
7. Break into ${clipCount} clips that tell their COMPLETE story with ALL details
${noCaptions ? '8. NO text, titles, captions, or on-screen text of any kind' : ''}

${videoStyle === 'dialogue' ? 'DIALOGUE FORMAT: Character Name: "exact dialogue". Example: Sarah: "I can\'t believe this is happening!"' : ''}

CONTINUOUS SCENE RULE: If this is a continuous conversation/monologue (like a podcast, interview, speech, or presentation), only describe the full scene setup in Clip 1. For subsequent clips, write "**Continues from previous clip**" and focus ONLY on dialogue progression, new actions, and camera changes. DO NOT repeat the same location/setup descriptions.

CHARACTER CONSISTENCY FOR IMAGE-TO-VIDEO: When the user uploads an image for Clip 1, the AI automatically extracts detailed character specifications (face, clothing, background). For Clips 2 & 3, focus on ACTIONS and DIALOGUE. The system enforces visual consistency automatically. You just need to write "Same character" or "Continues with same appearance."

Format EXACTLY like this:

Clip 1: **Scene:** [Complete location/environment/lighting setup]. **Action:** [Character actions/movements]. **Dialogue:** [First section of exact dialogue word-for-word]. **Camera:** [Shot type, angle, movement]. **Lighting:** [Lighting setup].

Clip 2: **Continues from previous clip. Same character and setting.** **Action:** [New physical actions/gestures]. **Dialogue:** [Next portion of dialogue, exactly as user wrote]. **Camera:** [New shot or camera movement].

${clipCount > 2 ? `Clip 3: **Continues from previous clip. Same character and setting.** **Action:** [Further actions]. **Dialogue:** [Next dialogue section, word-for-word]. **Camera:** [Camera technique].` : ''}
${clipCount > 3 ? `Clip 4: **Continues from previous clip. Same character and setting.** **Action:** [Closing actions]. **Dialogue:** [Final dialogue]. **Camera:** [Closing shot].` : ''}

Ensure each clip is detailed and preserves ALL user content while adding professional cinematography.
`
    } else {
      // Standard single enhancement
      enhancementInstruction = `
You are a professional video script writer. Enhance the following video idea by adding technical and cinematic refinement details while PRESERVING EVERY DETAIL.

User's video idea: "${prompt}"

Video settings:
- Style: ${settings?.style || 'cinematic'}
- Duration: ${settings?.duration || 30} seconds
- Camera: ${settings?.cameraStyle || 'dynamic'}
${noCaptionsInstruction}

CRITICAL PRESERVATION RULES:
1. PRESERVE ALL DIALOGUE: Include any spoken words, quotes, or dialogue EXACTLY as written, in quotation marks
2. PRESERVE ALL ACTIONS: Maintain every action, movement, gesture, and activity described
3. PRESERVE ALL DESCRIPTIONS: Keep all visual details (colors, clothing, props, settings, atmosphere)
4. PRESERVE CHARACTERS: Keep all character names, ages, appearances, and personalities
5. PRESERVE LOCATIONS: Keep all environments, settings, and places exactly as user described
6. PRESERVE STORY SEQUENCE: Maintain the exact order and flow of events
7. ONLY ENHANCE by ADDING technical details:
   - Camera movements (smooth pan left, slow zoom in, tracking shot following character)
   - Lighting (golden hour sunlight, soft rim lighting, dramatic shadows)
   - Shot types (medium close-up, wide establishing shot, over-the-shoulder)
   - Audio/sound design (ambient sounds, music style, sound effects)
   - Cinematic atmosphere (misty, vibrant, moody, ethereal)
8. Do NOT remove, replace, or change ANY user content
${noCaptions ? '9. NO text overlays, titles, captions, or on-screen text' : ''}

${videoStyle === 'dialogue' ? 'DIALOGUE FORMAT: Character: "exact dialogue". Keep all dialogue word-for-word from user input.' : ''}

Your enhanced script MUST include:
- ALL dialogue from the original (word-for-word)
- ALL actions from the original (exactly as described)
- ALL descriptions from the original (all visual details)
- PLUS your technical/cinematic enhancements

Output a COMPLETE, richly detailed script that preserves 100% of user content and adds professional cinematography.

Example:
User: "Sarah walks into the cafe and says 'I need coffee now'"
Enhanced: "Medium shot: Sarah (wearing a red coat) pushes open the glass door and walks into the warmly lit cafe. Soft morning light filters through the windows. Close-up on her tired face as she approaches the counter. Sarah: 'I need coffee now.' Camera follows her movement with a smooth tracking shot."
`
    }

    // Try each model with retry logic
    for (const modelName of models) {
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          const model = genAI.getGenerativeModel({ model: modelName })
          const result = await model.generateContent(enhancementInstruction)
          const response = await result.response
          enhancedScript = response.text()
          
          if (enhancedScript) {
            break // Success, exit retry loop
          }
        } catch (error: any) {
          lastError = error
          
          // If not overloaded error, try next model
          if (!error.message?.includes('overloaded') && error.status !== 503) {
            break // Try next model
          }
          
          // Wait before retry (exponential backoff)
          if (attempt < 2) {
            await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000))
          }
        }
      }
      
      if (enhancedScript) {
        break // Success, exit model loop
      }
    }
    
    // If all attempts failed, throw last error
    if (!enhancedScript) {
      throw lastError || new Error('Failed to generate enhanced script')
    }

    // Parse clips from the enhanced script for Veo 3.1
    if (isVeo && clipCount > 1) {
      // Try multiple parsing strategies to handle different AI formatting
      const clipRegex = /Clip\s*(\d+)\s*[:\-]\s*([\s\S]*?)(?=(?:Clip\s*\d+|$))/gi
      const matches = [...enhancedScript.matchAll(clipRegex)]
      
      if (matches.length > 0) {
        clips = matches.map(m => m[2].trim()).filter(clip => clip.length > 0)
        console.log(`📋 Parsed ${clips.length} clips from enhanced script:`)
        clips.forEach((clip, i) => {
          console.log(`Clip ${i + 1} length: ${clip.length} chars`)
          console.log(`Clip ${i + 1} preview: ${clip.substring(0, 100)}...`)
        })
      }
      
      // If parsing failed or got empty clips, split by double newlines as fallback
      if (clips.length === 0 || clips.some(c => c.length < 20)) {
        console.log('⚠️ Clip parsing failed, using fallback method')
        const lines = enhancedScript.split(/\n{2,}/).filter(line => line.trim().length > 20)
        if (lines.length >= clipCount) {
          clips = lines.slice(0, clipCount)
          console.log(`📋 Fallback: Split into ${clips.length} clips by paragraphs`)
        }
      }
    }

    // Deduct 5 AI credits after successful enhancement
    await pool.query(
      'UPDATE credits SET ai_credits = ai_credits - 5 WHERE user_id = $1',
      [user.id]
    )

    return NextResponse.json({
      success: true,
      originalPrompt: prompt,
      enhancedScript: enhancedScript,
      clips: clips.length > 0 ? clips : undefined,
      clipCount: clips.length > 0 ? clips.length : 1,
      timestamp: new Date().toISOString(),
      aiCreditsDeducted: 5
    })

  } catch (error: any) {
    console.error('Gemini API Error:', error)
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    })
    
    // Check if it's a quota exceeded error
    if (error.message?.includes('quota') || error.message?.includes('429') || error.status === 429) {
      return NextResponse.json(
        { 
          error: 'AI quota exceeded. The free tier limit has been reached. Please try again later or upgrade your API plan.',
          message: 'Quota exceeded'
        },
        { status: 429 }
      )
    }
    
    // Check if it's an API overload error
    if (error.message?.includes('overloaded') || error.status === 503) {
      return NextResponse.json(
        { 
          error: 'AI service is currently busy. Please try again in a few moments.',
          message: 'Service temporarily unavailable'
        },
        { status: 503 }
      )
    }
    
    // Check if model not found
    if (error.message?.includes('not found') || error.status === 404) {
      return NextResponse.json(
        { 
          error: 'AI model temporarily unavailable. Please try again later.',
          message: 'Model not available'
        },
        { status: 503 }
      )
    }
    
    return NextResponse.json(
      { 
        error: 'Failed to enhance prompt', 
        message: error.message || 'Unknown error occurred',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    )
  }
}
