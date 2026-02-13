import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/middleware'
import { exec } from 'child_process'
import { promisify } from 'util'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import { v4 as uuidv4 } from 'uuid'

const execAsync = promisify(exec)

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY

// Supported languages for STT
const SUPPORTED_LANGUAGES = [
  'en', 'de', 'pl', 'es', 'it', 'fr', 'pt', 'hi', 'ar', 'cs', 'ru', 'nl',
  'tr', 'zh', 'ja', 'hu', 'ko', 'sv', 'bg', 'ro', 'fi', 'hr', 'sk', 'da',
  'ta', 'uk', 'el', 'no', 'ms', 'id', 'vi', 'fil', 'th'
]

// Convert audio from URL to buffer
async function downloadAudio(audioUrl: string): Promise<Buffer> {
  console.log('Downloading audio from:', audioUrl)
  
  const response = await fetch(audioUrl)
  if (!response.ok) {
    throw new Error(`Failed to download audio: ${response.status}`)
  }
  
  const buffer = await response.arrayBuffer()
  return Buffer.from(buffer)
}

// Convert audio to supported format using FFmpeg
async function convertAudioFormat(audioBuffer: Buffer, inputType: string = 'webm'): Promise<Buffer> {
  const tempDir = os.tmpdir()
  const inputId = uuidv4()
  const inputPath = path.join(tempDir, `stt_input_${inputId}.${inputType}`)
  const outputPath = path.join(tempDir, `stt_output_${inputId}.mp3`)
  
  try {
    fs.writeFileSync(inputPath, audioBuffer)
    
    // Convert to MP3 format optimized for speech recognition
    const ffmpegCmd = `ffmpeg -i "${inputPath}" -vn -ar 16000 -ac 1 -b:a 64k -f mp3 "${outputPath}" -y`
    await execAsync(ffmpegCmd)
    
    const mp3Buffer = fs.readFileSync(outputPath)
    
    // Cleanup
    try {
      fs.unlinkSync(inputPath)
      fs.unlinkSync(outputPath)
    } catch (e) {}
    
    return mp3Buffer
  } catch (error) {
    // Cleanup on error
    try {
      fs.unlinkSync(inputPath)
      fs.unlinkSync(outputPath)
    } catch (e) {}
    throw error
  }
}

// ElevenLabs Speech-to-Text
async function elevenLabsSTT(
  audioBuffer: Buffer,
  options: {
    languageCode?: string
    diarize?: boolean
    numSpeakers?: number
    timestampsGranularity?: 'word' | 'character' | 'none'
  } = {}
): Promise<{
  text: string
  words?: Array<{ text: string; start: number; end: number; speaker?: string }>
  speakers?: Array<{ speaker: string; start: number; end: number }>
  languageCode?: string
  languageProbability?: number
}> {
  const {
    languageCode,
    diarize = false,
    numSpeakers,
    timestampsGranularity = 'word'
  } = options

  console.log('ElevenLabs STT: Transcribing audio...')
  console.log(`  Language: ${languageCode || 'auto-detect'}`)
  console.log(`  Diarize: ${diarize}`)
  console.log(`  Audio size: ${audioBuffer.length} bytes`)

  // Create form data - convert Buffer to Uint8Array for Blob compatibility
  const uint8Array = new Uint8Array(audioBuffer)
  const formData = new FormData()
  formData.append('audio', new Blob([uint8Array], { type: 'audio/mpeg' }), 'audio.mp3')
  formData.append('model_id', 'scribe_v1')
  
  if (languageCode) {
    formData.append('language_code', languageCode)
  }
  
  if (diarize) {
    formData.append('diarize', 'true')
    if (numSpeakers) {
      formData.append('num_speakers', numSpeakers.toString())
    }
  }
  
  if (timestampsGranularity !== 'none') {
    formData.append('timestamps_granularity', timestampsGranularity)
  }

  const response = await fetch('https://api.elevenlabs.io/v1/speech-to-text', {
    method: 'POST',
    headers: {
      'xi-api-key': ELEVENLABS_API_KEY!
    },
    body: formData
  })

  if (!response.ok) {
    const error = await response.text()
    console.error('ElevenLabs STT error:', error)
    throw new Error(`ElevenLabs STT failed: ${response.status} - ${error}`)
  }

  const result = await response.json()
  console.log('ElevenLabs STT: Transcription complete')
  
  return {
    text: result.text,
    words: result.words,
    speakers: result.speakers,
    languageCode: result.language_code,
    languageProbability: result.language_probability
  }
}

// POST - Transcribe audio to text
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

    const contentType = request.headers.get('content-type') || ''
    
    let audioBuffer: Buffer
    let languageCode: string | undefined
    let diarize: boolean = false
    let numSpeakers: number | undefined
    let timestampsGranularity: 'word' | 'character' | 'none' = 'word'
    
    // Handle both FormData and JSON requests
    if (contentType.includes('multipart/form-data')) {
      // Handle file upload
      const formData = await request.formData()
      const audioFile = formData.get('audio') as File | null
      const audioUrl = formData.get('audioUrl') as string | null
      languageCode = formData.get('language') as string | undefined
      diarize = formData.get('diarize') === 'true'
      numSpeakers = formData.get('numSpeakers') ? parseInt(formData.get('numSpeakers') as string) : undefined
      timestampsGranularity = (formData.get('timestampsGranularity') as any) || 'word'
      
      if (audioFile) {
        // Direct file upload
        audioBuffer = Buffer.from(await audioFile.arrayBuffer())
        
        // Convert if needed
        const fileName = audioFile.name.toLowerCase()
        if (!fileName.endsWith('.mp3')) {
          const ext = fileName.split('.').pop() || 'webm'
          audioBuffer = await convertAudioFormat(audioBuffer, ext)
        }
      } else if (audioUrl) {
        // Download from URL
        audioBuffer = await downloadAudio(audioUrl)
        
        // Determine format from URL and convert if needed
        const urlLower = audioUrl.toLowerCase()
        if (!urlLower.includes('.mp3')) {
          let ext = 'webm'
          if (urlLower.includes('.wav')) ext = 'wav'
          else if (urlLower.includes('.ogg')) ext = 'ogg'
          else if (urlLower.includes('.m4a')) ext = 'm4a'
          audioBuffer = await convertAudioFormat(audioBuffer, ext)
        }
      } else {
        return NextResponse.json(
          { success: false, error: 'Audio file or URL is required' },
          { status: 400 }
        )
      }
    } else {
      // Handle JSON request
      const body = await request.json()
      const { audioUrl, audio: audioBase64, language, diarize: diarizeParam, numSpeakers: numSpeakersParam, timestampsGranularity: tsGranularity } = body
      
      languageCode = language
      diarize = diarizeParam || false
      numSpeakers = numSpeakersParam
      timestampsGranularity = tsGranularity || 'word'
      
      if (audioBase64) {
        // Base64 encoded audio
        audioBuffer = Buffer.from(audioBase64, 'base64')
      } else if (audioUrl) {
        // Download from URL
        audioBuffer = await downloadAudio(audioUrl)
        
        // Determine format from URL and convert if needed
        const urlLower = audioUrl.toLowerCase()
        if (!urlLower.includes('.mp3')) {
          let ext = 'webm'
          if (urlLower.includes('.wav')) ext = 'wav'
          else if (urlLower.includes('.ogg')) ext = 'ogg'
          else if (urlLower.includes('.m4a')) ext = 'm4a'
          audioBuffer = await convertAudioFormat(audioBuffer, ext)
        }
      } else {
        return NextResponse.json(
          { success: false, error: 'Audio URL or base64 audio is required' },
          { status: 400 }
        )
      }
    }

    // Validate language code
    if (languageCode && !SUPPORTED_LANGUAGES.includes(languageCode)) {
      return NextResponse.json(
        { success: false, error: `Unsupported language code: ${languageCode}. Supported: ${SUPPORTED_LANGUAGES.join(', ')}` },
        { status: 400 }
      )
    }

    console.log('=== ElevenLabs Speech-to-Text ===')
    console.log(`User: ${user.id}`)
    console.log(`Audio size: ${audioBuffer.length} bytes`)
    console.log(`Language: ${languageCode || 'auto-detect'}`)
    console.log(`Diarize: ${diarize}`)

    // Transcribe audio
    const result = await elevenLabsSTT(audioBuffer, {
      languageCode,
      diarize,
      numSpeakers,
      timestampsGranularity
    })

    return NextResponse.json({
      success: true,
      text: result.text,
      words: result.words,
      speakers: result.speakers,
      detectedLanguage: result.languageCode,
      languageProbability: result.languageProbability,
      message: 'Audio transcribed successfully!'
    })

  } catch (error: any) {
    console.error('STT error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Speech-to-text failed' },
      { status: 500 }
    )
  }
}

// GET - Get supported languages and settings
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request)
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const languageNames: Record<string, string> = {
      'en': 'English',
      'de': 'German',
      'pl': 'Polish',
      'es': 'Spanish',
      'it': 'Italian',
      'fr': 'French',
      'pt': 'Portuguese',
      'hi': 'Hindi',
      'ar': 'Arabic',
      'cs': 'Czech',
      'ru': 'Russian',
      'nl': 'Dutch',
      'tr': 'Turkish',
      'zh': 'Chinese',
      'ja': 'Japanese',
      'hu': 'Hungarian',
      'ko': 'Korean',
      'sv': 'Swedish',
      'bg': 'Bulgarian',
      'ro': 'Romanian',
      'fi': 'Finnish',
      'hr': 'Croatian',
      'sk': 'Slovak',
      'da': 'Danish',
      'ta': 'Tamil',
      'uk': 'Ukrainian',
      'el': 'Greek',
      'no': 'Norwegian',
      'ms': 'Malay',
      'id': 'Indonesian',
      'vi': 'Vietnamese',
      'fil': 'Filipino',
      'th': 'Thai'
    }

    return NextResponse.json({
      success: true,
      supportedLanguages: SUPPORTED_LANGUAGES.map(code => ({
        code,
        name: languageNames[code] || code
      })),
      features: {
        autoDetect: true,
        diarization: {
          description: 'Speaker diarization - identify different speakers in the audio',
          enabled: true
        },
        timestamps: {
          description: 'Word-level timestamps for each transcribed word',
          granularities: ['word', 'character', 'none']
        }
      },
      model: 'scribe_v1',
      limits: {
        maxFileSize: '25MB',
        supportedFormats: ['mp3', 'wav', 'ogg', 'webm', 'm4a', 'flac']
      }
    })

  } catch (error: any) {
    console.error('Get STT info error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to get STT info' },
      { status: 500 }
    )
  }
}
