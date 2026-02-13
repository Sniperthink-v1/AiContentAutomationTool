import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/middleware'
import { v4 as uuidv4 } from 'uuid'
import { uploadToR2 } from '@/lib/storage'

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY

// ElevenLabs Voice IDs - Popular voices for TTS
const ELEVENLABS_VOICES: Record<string, string> = {
  'Rachel': '21m00Tcm4TlvDq8ikWAM', // American female, calm
  'Domi': 'AZnzlk1XvdvUeBnXmlld',   // American female, strong
  'Bella': 'EXAVITQu4vr4xnSDxMaL',  // American female, soft
  'Antoni': 'ErXwobaYiN019PkySvjV', // American male, well-rounded
  'Elli': 'MF3mGyEYCl7XYWbV9V6O',   // American female, emotional
  'Josh': 'TxGEqnHWrfWFTfGW9XjX',   // American male, deep
  'Arnold': 'VR6AewLTigWG4xSOukaG', // American male, strong
  'Adam': 'pNInz6obpgDQGcFmaJgB',   // American male, deep
  'Sam': 'yoZ06aMxZJJ28mfd3POQ',    // American male, raspy
  'Charlie': 'IKne3meq5aSn9XLyUdCD', // Australian male, casual
  'Emily': 'LcfcDJNUP1GQjkzn1xUU',  // American female, calm
  'Jessica': 'cgSgspJ2msm6clMCkdW9', // American female, expressive
  'Lily': 'pFZP5JQG7iQjIQuC4Bku',   // British female, warm
  'George': 'JBFqnCBsd6RMkjVDRZzb', // British male, warm
  'Freya': 'jsCqWAovK2LkecY7zXl4',  // American female, expressive
}

// Available voice models
const ELEVENLABS_MODELS = {
  'multilingual_v2': 'eleven_multilingual_v2',      // Best quality, supports 29 languages
  'turbo_v2_5': 'eleven_turbo_v2_5',                // Fast, low latency
  'turbo_v2': 'eleven_turbo_v2',                    // Fast, English only
  'english_v1': 'eleven_monolingual_v1',            // Legacy English
}

// ElevenLabs Text-to-Speech
async function elevenLabsTTS(
  text: string, 
  voiceId: string,
  options: {
    modelId?: string
    stability?: number
    similarityBoost?: number
    style?: number
    useSpeakerBoost?: boolean
    outputFormat?: string
  } = {}
): Promise<Buffer> {
  const {
    modelId = 'eleven_multilingual_v2',
    stability = 0.5,
    similarityBoost = 0.75,
    style = 0.0,
    useSpeakerBoost = true,
    outputFormat = 'mp3_44100_128'
  } = options

  console.log('ElevenLabs TTS: Generating speech...')
  console.log(`  Voice ID: ${voiceId}`)
  console.log(`  Model: ${modelId}`)
  console.log(`  Text length: ${text.length} chars`)

  const response = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=${outputFormat}`,
    {
      method: 'POST',
      headers: {
        'Accept': 'audio/mpeg',
        'Content-Type': 'application/json',
        'xi-api-key': ELEVENLABS_API_KEY!
      },
      body: JSON.stringify({
        text: text,
        model_id: modelId,
        voice_settings: {
          stability: stability,
          similarity_boost: similarityBoost,
          style: style,
          use_speaker_boost: useSpeakerBoost
        }
      })
    }
  )

  if (!response.ok) {
    const error = await response.text()
    console.error('ElevenLabs TTS error:', error)
    throw new Error(`ElevenLabs TTS failed: ${response.status} - ${error}`)
  }

  const audioBuffer = await response.arrayBuffer()
  console.log('ElevenLabs TTS: Speech generated successfully')
  return Buffer.from(audioBuffer)
}

// POST - Generate speech from text
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request)
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    if (!ELEVENLABS_API_KEY) {
      return NextResponse.json(
        { success: false, error: 'ElevenLabs API key not configured. Add ELEVENLABS_API_KEY to .env' },
        { status: 500 }
      )
    }

    const body = await request.json()
    const { 
      text, 
      voice = 'Rachel',
      voiceId,           // Optional: Use custom voice ID directly
      model = 'multilingual_v2',
      stability = 0.5,
      similarityBoost = 0.75,
      style = 0.0,
      useSpeakerBoost = true,
      outputFormat = 'mp3_44100_128'
    } = body

    if (!text || typeof text !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Text is required' },
        { status: 400 }
      )
    }

    if (text.length > 5000) {
      return NextResponse.json(
        { success: false, error: 'Text exceeds maximum length of 5000 characters' },
        { status: 400 }
      )
    }

    console.log('=== ElevenLabs Text-to-Speech ===')
    console.log(`User: ${user.id}`)
    console.log(`Voice: ${voice}`)
    console.log(`Model: ${model}`)
    console.log(`Text: ${text.substring(0, 100)}...`)

    // Determine voice ID
    const finalVoiceId = voiceId || ELEVENLABS_VOICES[voice] || ELEVENLABS_VOICES['Rachel']
    const modelId = ELEVENLABS_MODELS[model as keyof typeof ELEVENLABS_MODELS] || ELEVENLABS_MODELS['multilingual_v2']

    // Generate speech
    const audioBuffer = await elevenLabsTTS(text, finalVoiceId, {
      modelId,
      stability,
      similarityBoost,
      style,
      useSpeakerBoost,
      outputFormat
    })

    // Upload to R2
    const fileName = `tts_${user.id}_${uuidv4()}.mp3`
    const filePath = `audio/${fileName}`
    const uploadResult = await uploadToR2(audioBuffer, filePath, 'audio/mpeg')

    if (!uploadResult.success) {
      throw new Error('Failed to upload audio')
    }

    return NextResponse.json({
      success: true,
      audioUrl: uploadResult.url,
      voice: voice,
      voiceId: finalVoiceId,
      model: model,
      textLength: text.length,
      message: `Speech generated successfully with ${voice} voice!`
    })

  } catch (error: any) {
    console.error('TTS error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Text-to-speech failed' },
      { status: 500 }
    )
  }
}

// GET - List available voices and models
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request)
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Optionally fetch user's custom voices from ElevenLabs
    let customVoices: any[] = []
    
    if (ELEVENLABS_API_KEY) {
      try {
        const response = await fetch('https://api.elevenlabs.io/v1/voices', {
          headers: {
            'xi-api-key': ELEVENLABS_API_KEY
          }
        })
        
        if (response.ok) {
          const data = await response.json()
          customVoices = data.voices?.map((v: any) => ({
            voiceId: v.voice_id,
            name: v.name,
            category: v.category,
            description: v.description,
            previewUrl: v.preview_url,
            labels: v.labels
          })) || []
        }
      } catch (e) {
        console.warn('Failed to fetch custom voices:', e)
      }
    }

    return NextResponse.json({
      success: true,
      presetVoices: Object.entries(ELEVENLABS_VOICES).map(([name, id]) => ({
        name,
        voiceId: id
      })),
      customVoices,
      models: Object.entries(ELEVENLABS_MODELS).map(([name, id]) => ({
        name,
        modelId: id,
        description: name === 'multilingual_v2' ? 'Best quality, 29 languages' :
                     name === 'turbo_v2_5' ? 'Fast, low latency' :
                     name === 'turbo_v2' ? 'Fast, English only' :
                     'Legacy English'
      })),
      settings: {
        stability: { min: 0, max: 1, default: 0.5, description: 'Voice stability (higher = more consistent)' },
        similarityBoost: { min: 0, max: 1, default: 0.75, description: 'Clarity and similarity to original voice' },
        style: { min: 0, max: 1, default: 0, description: 'Speaking style exaggeration' },
        useSpeakerBoost: { default: true, description: 'Boost similarity to original speaker' }
      }
    })

  } catch (error: any) {
    console.error('Get voices error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to get voices' },
      { status: 500 }
    )
  }
}
