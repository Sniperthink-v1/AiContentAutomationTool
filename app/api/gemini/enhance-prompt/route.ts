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
    
    // Try multiple models with retry logic (available models as of 2026)
    const models = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-2.5-pro']
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
You are a professional video script writer. Your mission is to create a COHESIVE, FLOWING STORYLINE by breaking the user's video concept into ${clipCount} connected clips based on their CUSTOM ENHANCEMENT INSTRUCTIONS.

User's video idea: "${prompt}"

User's custom enhancement instructions: "${customInstructions}"

Video settings:
- Total Duration: ${settings?.duration || 8} seconds
- Number of Clips: ${clipCount} (${clipCount > 1 ? `~${Math.ceil((settings?.duration || 8) / clipCount)} seconds each` : 'single clip'})
- Video Style: ${videoStyle === 'dialogue' ? 'With dialogue and sound effects' : videoStyle === 'animation' ? 'Creative animation style' : 'Cinematic realism'}
${noCaptionsInstruction}

🎬 CRITICAL STORY CONTINUITY RULES 🎬

1. **ONE UNIFIED STORY**: Create ${clipCount} clips that flow together as ONE CONTINUOUS, COHERENT NARRATIVE
   - Each clip naturally transitions into the next
   - Maintain consistent story progression with clear beginning → middle → end
   - The entire sequence should feel like one seamless story, NOT separate disconnected videos

2. **PRESERVE ALL USER CONTENT**:
   - PRESERVE ALL DIALOGUE: Include every word EXACTLY as written, in quotation marks
   - PRESERVE ALL ACTIONS: Keep every movement, gesture, and activity described
   - PRESERVE ALL DESCRIPTIONS: Maintain all visual details, colors, clothing, settings, atmosphere
   - PRESERVE CHARACTERS: Keep names, personalities, and traits exactly as specified
   - PRESERVE LOCATIONS: Keep all environments and settings as described
   - PRESERVE STORY SEQUENCE: Maintain exact order and flow of events

3. **VISUAL & SETTING CONTINUITY**:
   - Keep SAME LOCATION across all clips (unless user explicitly changes it)
   - Maintain IDENTICAL character appearance, clothing, styling throughout
   - Keep consistent time of day and lighting (unless story requires change)
   - Props, furniture, background stay consistent
   - Use "**Continues from previous clip. Same character, clothing, and setting.**" for clips 2-${clipCount}

4. **STORY PROGRESSION (NOT REPETITION)**:
   - Clip 1: Establish scene with FULL description (location, character, setup, initial action/dialogue)
   - Clips 2-${clipCount}: Focus on NEW actions, NEW dialogue, NEW camera angles (don't repeat descriptions)
   - Each clip advances the story - show clear cause and effect
   - Build narrative momentum toward a conclusion

5. **APPLY CUSTOM INSTRUCTIONS**:
   - Follow the user's custom enhancement instructions for each clip
   - Apply their requested tone, style, or specific modifications
   - Ensure their instructions enhance the UNIFIED story, not fragment it

6. **TECHNICAL ENHANCEMENTS**:
   - Add camera movements (pan, zoom, tracking) that support story flow
   - Include lighting details (golden hour, dramatic shadows, soft light)
   - Specify shot composition (close-up, wide, over-shoulder) for variety
   - Audio/sound design elements${videoStyle === 'dialogue' ? ' and dialogue delivery' : ''}

${videoStyle === 'dialogue' ? '7. **DIALOGUE FORMAT**: Character Name: "exact dialogue". Example: Sarah: "This changes everything!"' : ''}
${noCaptions ? '7. **NO TEXT ON SCREEN**: NO text, titles, captions, or on-screen text of any kind' : ''}

CHARACTER CONSISTENCY FOR IMAGE-TO-VIDEO: When user uploads an image for Clip 1, AI extracts character details automatically. For Clips 2-${clipCount}, focus on ACTIONS and DIALOGUE while noting "Same character" - visual consistency is enforced by the system.

CONTINUOUS SCENE RULE: For continuous conversations/monologues (podcast, speech, interview), describe the full scene ONLY in Clip 1. For subsequent clips, write "**Continues from previous clip**" and focus on NEW dialogue, actions, and camera work.

📝 FORMAT EXACTLY LIKE THIS:

**Clip 1**: 
**Scene:** [FULL scene description - location, environment, lighting, character appearance, clothing, all setting details]
**Action:** [Opening action/movement]
**Dialogue:** [First portion of dialogue, word-for-word in quotes]
**Camera:** [Opening shot type, angle, movement]
**Lighting:** [Light setup details]
**Story Purpose:** [What this establishes for the narrative]

**Clip 2**: 
**Continues from previous clip. Same character, clothing, and setting.**
**Action:** [NEW action that follows logically from Clip 1]
**Dialogue:** [Next dialogue portion that continues the conversation/story]
**Camera:** [NEW camera angle motivated by story progression]
**Story Purpose:** [How this advances from Clip 1]

${clipCount > 2 ? `**Clip 3**: 
**Continues from previous clip. Same character, clothing, and setting.**
**Action:** [Further action continuing story progression]
**Dialogue:** [Next dialogue section following naturally from Clip 2]
**Camera:** [Another camera perspective showing development]
**Story Purpose:** [How this builds toward conclusion]` : ''}

${clipCount > 3 ? `**Clip 4**: 
**Continues from previous clip. Same character, clothing, and setting.**
**Action:** [Final action concluding the narrative arc]
**Dialogue:** [Closing dialogue that wraps up the story/message]
**Camera:** [Closing shot providing sense of resolution]
**Story Purpose:** [How this concludes the entire sequence]` : ''}

Now enhance the user's prompt following these guidelines to create ONE cohesive, flowing narrative:
`
      } else {
        enhancementInstruction = `
You are a professional video script writer and cinematographer. Create a DETAILED, CINEMATIC video script based on the user's idea and their custom enhancement instructions.

User's video idea: "${prompt}"

User's custom enhancement instructions: "${customInstructions}"

Video settings:
- Style: ${settings?.style || 'cinematic'}
- Duration: ${settings?.duration || 8} seconds (this is a single clip)
${noCaptionsInstruction}

🎯 YOUR TASK: Create ONE detailed, professional video script that:

1. **PRESERVES** all user content (dialogue, actions, characters, settings)
2. **APPLIES** the user's custom enhancement instructions
3. **ADDS** rich cinematic details (camera work, lighting, atmosphere, sound)

📋 OUTPUT FORMAT - USE THIS EXACT FORMAT:

**Clip 1**:

**Scene:** [Detailed location description - specific place, environment, time of day, weather, atmosphere. Be vivid and specific, not generic.]

**Characters:** [Full character descriptions - appearance, clothing details, positioning, body language, facial expressions]

**Action:** [Step-by-step action sequence with specific movements, gestures, physical activities. Time each beat for ${settings?.duration || 8} seconds total.]

**Dialogue:** [If any speech, include it word-for-word in quotes with character name: Character: "Exact words"]

**Camera Work:** 
- Shot Type: [Wide/Medium/Close-up/Extreme close-up]
- Angle: [Eye-level/Low angle/High angle/Dutch tilt]
- Movement: [Static/Pan/Tilt/Dolly/Tracking/Zoom]
- Specific instructions: [Describe exactly how camera captures the action]

**Lighting:** [Light source, quality, direction, color temperature, shadows, mood it creates]

**Sound Design:** [Ambient sounds, music style/tempo, sound effects, dialogue delivery tone]

**Mood/Atmosphere:** [Emotional tone, visual style, color grading suggestions]

🎬 QUALITY REQUIREMENTS:

✅ Script must be DETAILED enough to visualize every second
✅ Include specific, vivid descriptions (not vague or generic)
✅ Camera directions should be professional and achievable
✅ Every element should serve the story/user's vision
✅ Should feel like a real film production script

${videoStyle === 'dialogue' ? '📝 DIALOGUE: All spoken words must be preserved exactly: Character: "word-for-word dialogue"' : ''}
${noCaptions ? '⚠️ NO TEXT: Do not include any text overlays, titles, captions, or on-screen text' : ''}

Now write the complete, detailed video script:
`
      }
    } else if (isVeo && clipCount > 1) {
      // Generate multiple clips for Veo 3.1
      enhancementInstruction = `
You are a professional video script writer for AI video generation. Your mission is to create a COHESIVE, FLOWING STORYLINE by breaking the user's video concept into ${clipCount} connected clips that tell ONE CONTINUOUS STORY.

User's video idea: "${prompt}"

Video settings:
- Total Duration: ${settings?.duration || 8} seconds
- Number of Clips: ${clipCount} (${clipCount > 1 ? `~${Math.ceil((settings?.duration || 8) / clipCount)} seconds each` : 'single clip'})
- Video Style: ${videoStyle === 'dialogue' ? 'With dialogue and sound effects' : videoStyle === 'animation' ? 'Creative animation style' : 'Cinematic realism'}
- Visual Style: ${settings?.style || 'cinematic'}
${noCaptionsInstruction}

🎬 CRITICAL STORY CONTINUITY RULES 🎬

1. **ONE UNIFIED STORY**: Create ${clipCount} clips that flow together as a SINGLE, COHERENT NARRATIVE
   - Each clip should naturally lead into the next with seamless transitions
   - Maintain consistent story progression from beginning to end
   - The entire sequence should feel like one continuous story, not separate videos
   - Each moment should build on the previous, creating narrative momentum

2. **PRESERVE ALL USER CONTENT** (ABSOLUTE PRIORITY):
   - PRESERVE ALL DIALOGUE word-for-word in quotation marks with character names
   - PRESERVE ALL ACTIONS, movements, gestures, and physical activities exactly
   - PRESERVE ALL DESCRIPTIONS: colors, clothing, props, settings, atmosphere
   - PRESERVE CHARACTERS: names, ages, personalities, traits, relationships
   - PRESERVE STORY SEQUENCE: maintain exact order, timing, and flow of events
   - PRESERVE EMOTIONS: keep all emotional states and reactions user described

3. **VISUAL & SETTING CONTINUITY** (ULTRA-STRICT):
   - **SAME EXACT LOCATION**: Keep ALL characters in the EXACT SAME setting throughout
   - **SAME CHARACTER APPEARANCE**: Identical clothing, hairstyle, accessories across ALL clips
   - **SAME TIME OF DAY**: Maintain consistent lighting/time (don't shift from day to night)
   - **SAME ENVIRONMENT**: All props, furniture, background elements stay constant
   - **SAME WEATHER**: If outdoor, keep weather conditions identical
   - Use "**Continues from previous clip. Same character, clothing, and setting.**" for clips 2-${clipCount}
   - NEVER introduce new characters, locations, or settings unless explicitly in user's prompt

4. **STORY PROGRESSION** (Build Forward, Never Repeat):
   - **Clip 1**: FULL description (who, what, where, when, initial action/dialogue)
   - **Clips 2-${clipCount}**: Focus ONLY on NEW actions, NEW dialogue, NEW camera work
   - Each clip MUST advance the story - NO repeated moments or duplicated actions
   - Show clear CAUSE → EFFECT: Action in Clip 1 causes reaction in Clip 2, etc.
   - Build narrative tension or develop ideas progressively
   - Each clip should answer "what happens NEXT?" not "what happened AGAIN?"

5. **NARRATIVE ARC** (Professional Story Structure):
   - **Setup (Clip 1)**: Establish character, situation, setting, initial conflict/topic
   - **Development (Middle Clips)**: Build tension, explore ideas, show progression
   - **Resolution (Final Clip)**: Conclude with payoff, answer, or meaningful ending
   - Create emotional journey: start → build → climax/conclusion
   - Every clip serves the overall story - no filler or random content

6. **DIALOGUE DISTRIBUTION** (Natural Speech Flow):
   - Split dialogue by complete thoughts or natural conversation breaks
   - Each clip should contain coherent sentence groups (not mid-word cuts)
   - Maintain conversational rhythm with natural pauses between clips
   - If monologue: distribute by topic sections or emotional beats
   - If conversation: split at natural turn-taking or response points
   - NEVER cut mid-sentence unless for dramatic cliffhanger effect

7. **CAMERA & TECHNICAL COHERENCE** (Professional Cinematography):
   - **Varied Angles**: Each clip uses different shot to show progression
   - **Motivated Movements**: Camera moves support story (zoom for emphasis, pull back for reveal)
   - **Shot Variety**: Mix of wide/medium/close-up based on story needs
   - **Purposeful Transitions**: Shot changes feel natural and story-motivated
   - **Consistent Quality**: Same visual style and color grading throughout
   - **Lighting Continuity**: Maintain same lighting unless story demands change

8. **EMOTIONAL CONTINUITY**:
   - Track emotional states across clips - emotions should evolve naturally
   - Facial expressions and body language should match dialogue and situation
   - Build emotional intensity or release it progressively
   - Don't reset emotions between clips - maintain emotional throughline

9. **PACING & RHYTHM**:
   - Balance action/dialogue appropriately in each clip
   - Vary intensity across clips (not all clips at same energy level)
   - Create breathing room - don't overcrowd clips with too much happening
   - Time actions realistically (don't rush or drag)

${videoStyle === 'dialogue' ? '10. **DIALOGUE FORMAT**: Character Name: "exact dialogue word-for-word". Sarah: "This changes everything!" John: "I know, I was shocked too."' : ''}
${noCaptions ? '10. **NO TEXT ON SCREEN**: NO text, titles, captions, subtitles, or on-screen text of any kind' : ''}

🎯 SCRIPT QUALITY STANDARDS:

✅ GOOD EXAMPLE (Cohesive Story):
Clip 1: Woman enters cafe, looks nervous, approaches counter → Sets up situation
Clip 2: Same woman orders coffee, checks phone anxiously → Develops tension  
Clip 3: Same woman receives call, face shows relief → Resolves situation
Result: ONE complete story with beginning → middle → end

❌ BAD EXAMPLE (Disconnected Clips):
Clip 1: Woman in cafe
Clip 2: Different woman in park (WRONG - new character/location)
Clip 3: Man in office (WRONG - completely different story)
Result: Three random unrelated clips

📝 FORMAT EXACTLY LIKE THIS:

**Clip 1**: 
**Scene:** [COMPLETE description - exact location name, full environment details, time of day, lighting setup, weather if outdoor, all character appearances, clothing specifics, props present]
**Action:** [Opening action with specific details - body language, facial expression, what they're doing]
**Dialogue:** [First portion of dialogue word-for-word in quotes with character names]
**Camera:** [Specific shot type (wide/medium/close-up), angle (eye-level/high/low), movement (static/pan/dolly/zoom)]
**Lighting:** [Detailed lighting - source, quality, color temperature, shadows]
**Mood:** [Emotional tone of this clip]
**Story Purpose:** [What this establishes - setup, context, initial situation]

**Clip 2**: 
**Continues from previous clip. Same character, exact same clothing, same location, same time of day.**
**Action:** [NEW physical action that logically follows Clip 1 - be specific about what changes]
**Dialogue:** [Next dialogue portion continuing naturally from Clip 1's last words]
**Camera:** [DIFFERENT shot/angle from Clip 1 that shows progression - specify change]
**Mood:** [How emotional tone evolves from Clip 1]
**Story Purpose:** [How this develops the story - progression, complication, key moment]

${clipCount > 2 ? `**Clip 3**: 
**Continues from previous clip. Same character, exact same clothing, same location, same time of day.**
**Action:** [NEW action building on Clip 2 - show story development through action]
**Dialogue:** [Next dialogue following naturally from Clip 2's conversation]
**Camera:** [Another DIFFERENT angle showing final stage of story]
**Mood:** [Final emotional state - resolution or climax]
**Story Purpose:** [How this concludes - payoff, resolution, final message]` : ''}

${clipCount > 3 ? `**Clip 4**: 
**Continues from previous clip. Same character, exact same clothing, same location, same time of day.**
**Action:** [Final action that provides closure or conclusion]
**Dialogue:** [Closing dialogue that wraps story or delivers final message]
**Camera:** [Closing shot that gives sense of completion]
**Mood:** [Final emotional resolution]
**Story Purpose:** [How this ends the narrative - conclusion, lesson learned, emotional payoff]` : ''}

REMEMBER: You're creating ONE story told in ${clipCount} connected parts, NOT ${clipCount} separate stories!

${clipCount > 3 ? `**Clip 4**: 
**Continues from previous clip. Same character, clothing, and setting.**
**Action:** [Final action that concludes the narrative arc]
**Dialogue:** [Closing dialogue that wraps up the story or delivers final message]
**Camera:** [Closing shot that provides sense of completion or resolution]
**Story Purpose:** [How this clip resolves or concludes the entire sequence]` : ''}

🎯 EXAMPLE OF GOOD STORY FLOW (Podcast/Speech scenario):

**Clip 1**: **Scene:** Modern recording studio, warm lighting, podcaster sits at desk with microphone, wearing casual blazer... **Action:** Leans forward, makes welcoming gesture with hands. **Dialogue:** "Welcome back everyone! Today we're discussing something that changed my entire perspective..." **Camera:** Medium shot, eye level...

**Clip 2**: **Continues from previous clip. Same podcaster and setting.** **Action:** Gestures emphatically, slight head tilt, engaged expression. **Dialogue:** "...and the moment I realized this, everything clicked. It's about understanding that success isn't..." **Camera:** Slow push-in to medium close-up...

**Clip 3**: **Continues from previous clip. Same podcaster and setting.** **Action:** Pauses for emphasis, looks directly at camera, genuine smile. **Dialogue:** "...it's about the journey, not the destination. That simple truth transformed my approach to everything." **Camera:** Close-up on face, capturing emotional sincerity...

✅ THIS CREATES: One cohesive story with beginning → middle → end
❌ AVOID: Three random disconnected clips with repeated descriptions

Now enhance the user's prompt following these guidelines to create a unified, flowing narrative:
`
    } else {
      // Standard single enhancement
      enhancementInstruction = `
You are a professional video script writer and cinematographer. Enhance the following video idea by adding rich technical and cinematic details while ABSOLUTELY PRESERVING EVERY DETAIL from the user's original concept.

User's video idea: "${prompt}"

Video settings:
- Style: ${settings?.style || 'cinematic'}
- Duration: ${settings?.duration || 30} seconds
- Camera: ${settings?.cameraStyle || 'dynamic'}
${noCaptionsInstruction}

🎯 CRITICAL PRESERVATION RULES (ABSOLUTE PRIORITY):

1. **PRESERVE ALL DIALOGUE**: Include ANY spoken words, quotes, or dialogue EXACTLY as written, word-for-word in quotation marks with character names
2. **PRESERVE ALL ACTIONS**: Maintain EVERY action, movement, gesture, physical activity, and behavior described
3. **PRESERVE ALL DESCRIPTIONS**: Keep ALL visual details (colors, clothing, props, accessories, settings, atmosphere, weather)
4. **PRESERVE CHARACTERS**: Keep ALL character names, ages, appearances, personalities, relationships, and traits
5. **PRESERVE LOCATIONS**: Keep ALL environments, settings, places, and spatial details exactly as user described
6. **PRESERVE STORY SEQUENCE**: Maintain the EXACT order, timing, and flow of events - don't rearrange anything
7. **PRESERVE EMOTIONS**: Keep all emotional states, reactions, and feelings user mentioned
8. **DO NOT REMOVE OR CHANGE ANYTHING** the user wrote - your job is to ADD, not replace

🎬 ENHANCEMENT GUIDELINES (What to ADD):

ADD Professional Cinematography:
- **Camera Movements**: Smooth dolly in, gentle pan right, slow zoom, tracking shot, crane up, handheld following
- **Shot Types**: Wide establishing shot, medium shot, close-up, extreme close-up, over-the-shoulder, POV shot
- **Camera Angles**: Eye-level, low angle (power), high angle (vulnerability), Dutch tilt (tension), bird's eye
- **Focus Techniques**: Rack focus, shallow depth of field, deep focus, selective focus on subject

ADD Lighting Details:
- **Natural Light**: Golden hour warmth, soft morning light, harsh midday sun, blue hour coolness, overcast diffusion
- **Artificial Light**: Soft key light, dramatic rim lighting, three-point lighting, practical lights (lamps/candles)
- **Light Quality**: Soft/hard shadows, high contrast/low contrast, light direction, color temperature
- **Special Effects**: Lens flares, god rays, backlighting, silhouettes, dramatic shadows

ADD Sound Design:
- **Dialogue Delivery**: Tone (confident/nervous), pace (fast/slow), volume (whisper/shout), emotion
- **Ambient Sounds**: Background noise, environmental sounds, room tone, outdoor atmosphere
- **Music Style**: Upbeat/melancholic, orchestral/electronic, intensity level, tempo
- **Sound Effects**: Footsteps, door creaks, nature sounds, urban noise, impact sounds

ADD Cinematic Atmosphere:
- **Visual Mood**: Vibrant, moody, ethereal, gritty, dreamlike, energetic, serene, tense
- **Color Grading**: Warm tones, cool tones, desaturated, high contrast, vintage look, modern crisp
- **Environmental Details**: Mist, fog, rain, dust particles in light, steam, smoke
- **Composition**: Rule of thirds, leading lines, symmetry, negative space, framing within frame

ADD Specific Details:
- Facial expressions and micro-expressions
- Body language and posture
- Clothing textures and movement (fabric flow, wind effect)
- Background activity or details
- Time of day indicators
- Weather conditions if outdoor
- Prop details and interactions

${noCaptions ? '⚠️ CRITICAL: NO text overlays, titles, captions, subtitles, or on-screen text of any kind' : ''}
${videoStyle === 'dialogue' ? '\n📝 DIALOGUE FORMAT: Character Name: "exact dialogue word-for-word"\nExample: Sarah: "I can\'t believe this!" John: "I know, it\'s incredible."' : ''}

✅ QUALITY STANDARDS:

Your enhanced script MUST include:
✓ 100% of user's dialogue (word-for-word, nothing changed or cut)
✓ 100% of user's actions (all movements and activities preserved)
✓ 100% of user's descriptions (all visual details kept intact)
✓ PLUS rich technical cinematography details you ADD
✓ Natural flow that reads like a professional script
✓ Specific, vivid language (not vague or generic)

📋 OUTPUT FORMAT:

**Opening**: [If user described how scene starts, keep that EXACTLY. Add camera shot type and movement]

**Scene Description**: [Expand location details - specific place name if given, environmental details, lighting, time of day, weather. KEEP all user's details, ADD technical descriptions]

**Character(s)**: [Keep user's character descriptions EXACTLY. ADD details about positioning, body language, facial expressions]

**Action Sequence**: [PRESERVE every action user described in exact order. ADD camera movements that follow the action, shot types for different moments]

**Dialogue**: [Include ALL dialogue EXACTLY as user wrote it, word-for-word in quotes with character names. ADD details about delivery, tone, pauses]

**Lighting & Mood**: [ADD professional lighting setup and atmospheric details that support user's vision]

**Sound Design**: [ADD ambient sounds, music style, sound effects that enhance the story]

**Closing**: [If user described ending, KEEP it exact. ADD final camera movement or shot]

🎯 EXAMPLES:

❌ WRONG (Changed user content):
User: "Sarah walks into cafe wearing red coat"
Bad: "A woman enters a coffee shop in blue jacket" (WRONG - changed name, item, color)

✅ CORRECT (Preserved + Enhanced):
User: "Sarah walks into cafe wearing red coat"
Good: "Medium shot: Sarah, wearing a vibrant red wool coat, pushes open the glass door of the bustling cafe. Warm golden lighting spills from inside. Camera follows with smooth tracking shot as she walks past occupied tables. Soft ambient chatter and espresso machine sounds. Her coat catches the light as she moves."

❌ WRONG (Removed dialogue):
User: "John says 'I'm done with this job'"
Bad: "John looks frustrated at his desk" (WRONG - removed dialogue)

✅ CORRECT (Preserved + Enhanced):
User: "John says 'I'm done with this job'"
Good: "Close-up on John's face, jaw clenched, eyes tired. He takes a deep breath. John: 'I'm done with this job.' His voice is firm but weary. Camera slowly pulls back to reveal his cluttered desk, harsh fluorescent lighting overhead. Sound of office keyboards clicking in background."

Now enhance the user's video idea following these guidelines. Output ONE complete, professional script that preserves ALL user content and adds rich cinematic details:
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
    if (isVeo) {
      console.log(`🔍 Parsing clips from enhanced script (total: ${enhancedScript.length} chars, expecting ${clipCount} clips)`)
      
      // Try multiple parsing strategies to handle different AI formatting
      
      // Strategy 1: Match **Clip N**: or **Clip N** or Clip N: patterns
      let clipMatches: string[] = []
      
      // Pattern 1: **Clip N**: (most common format)
      const pattern1 = /\*\*Clip\s*(\d+)\*\*\s*:?\s*([\s\S]*?)(?=\*\*Clip\s*\d+\*\*|$)/gi
      const matches1 = [...enhancedScript.matchAll(pattern1)]
      if (matches1.length > 0) {
        clipMatches = matches1.map(m => m[2].trim()).filter(clip => clip.length > 20)
        console.log(`📋 Pattern 1 (**Clip N**:) found ${clipMatches.length} clips`)
      }
      
      // Pattern 2: Clip N: (without asterisks)
      if (clipMatches.length < 2) {
        const pattern2 = /(?:^|\n)\s*Clip\s*(\d+)\s*[:\-]\s*([\s\S]*?)(?=(?:^|\n)\s*Clip\s*\d+|$)/gim
        const matches2 = [...enhancedScript.matchAll(pattern2)]
        if (matches2.length > clipMatches.length) {
          clipMatches = matches2.map(m => m[2].trim()).filter(clip => clip.length > 20)
          console.log(`📋 Pattern 2 (Clip N:) found ${clipMatches.length} clips`)
        }
      }
      
      // Pattern 3: Numbered sections (1. / 2. / etc.)
      if (clipMatches.length < 2) {
        const pattern3 = /(?:^|\n)\s*(\d+)\.\s*([\s\S]*?)(?=(?:^|\n)\s*\d+\.|$)/gim
        const matches3 = [...enhancedScript.matchAll(pattern3)]
        if (matches3.length > clipMatches.length) {
          clipMatches = matches3.map(m => m[2].trim()).filter(clip => clip.length > 20)
          console.log(`📋 Pattern 3 (N.) found ${clipMatches.length} clips`)
        }
      }
      
      // Pattern 4: Split by "Scene" sections
      if (clipMatches.length < 2 && enhancedScript.includes('**Scene')) {
        const pattern4 = /\*\*Scene\s*\d*\*\*:?\s*([\s\S]*?)(?=\*\*Scene\s*\d*\*\*|$)/gi
        const matches4 = [...enhancedScript.matchAll(pattern4)]
        if (matches4.length > clipMatches.length) {
          clipMatches = matches4.map(m => m[1].trim()).filter(clip => clip.length > 20)
          console.log(`📋 Pattern 4 (**Scene**) found ${clipMatches.length} clips`)
        }
      }
      
      // If we found clips, use them
      if (clipMatches.length >= 2) {
        clips = clipMatches
        // IMPORTANT: Limit clips to the requested clipCount (max 3 for better cohesion)
        if (clips.length > clipCount) {
          console.log(`⚠️ AI generated ${clips.length} clips but requested ${clipCount}, trimming...`)
          clips = clips.slice(0, clipCount)
        }
        console.log(`✅ Parsed ${clips.length} clips from enhanced script:`)
        clips.forEach((clip, i) => {
          console.log(`  Clip ${i + 1}: ${clip.length} chars - "${clip.substring(0, 80)}..."`)
        })
      } else if (clipCount > 1) {
        // Last resort: Split the script evenly into requested number of clips
        console.log(`⚠️ No clip patterns found, splitting script into ${clipCount} equal parts`)
        const cleanScript = enhancedScript.replace(/^\*\*Clip\s*\d+\*\*:?\s*/gi, '').trim()
        const chunkSize = Math.ceil(cleanScript.length / clipCount)
        clips = []
        for (let i = 0; i < clipCount; i++) {
          const start = i * chunkSize
          const end = Math.min(start + chunkSize, cleanScript.length)
          const chunk = cleanScript.substring(start, end).trim()
          if (chunk.length > 0) {
            clips.push(chunk)
          }
        }
        console.log(`📋 Split into ${clips.length} equal parts`)
      }
      
      // If parsing still failed or got empty clips, use enhanced script as single clip
      if (clips.length === 0 || clips.every(c => c.length < 20)) {
        console.log('⚠️ All parsing failed, using enhanced script as single clip')
        // Clean up the script - remove "Clip 1:" prefix if present
        let cleanScript = enhancedScript.replace(/^\*\*Clip\s*\d+\*\*:?\s*/i, '').trim()
        clips = [cleanScript]
        console.log(`📋 Using full script as single clip (${cleanScript.length} chars)`)
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
