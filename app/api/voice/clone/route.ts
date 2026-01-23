import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/middleware'
import { exec } from 'child_process'
import { promisify } from 'util'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import { v4 as uuidv4 } from 'uuid'
import { uploadToR2 } from '@/lib/storage'

const execAsync = promisify(exec)

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
}

// Convert audio to MP3 format using FFmpeg
async function convertAudioToMp3(audioUrl: string): Promise<Buffer> {
  const tempDir = os.tmpdir()
  const inputId = uuidv4()
  const inputPath = path.join(tempDir, `input_${inputId}`)
  const outputPath = path.join(tempDir, `output_${inputId}.mp3`)
  
  try {
    console.log('Downloading audio for conversion:', audioUrl)
    
    const response = await fetch(audioUrl)
    if (!response.ok) {
      throw new Error(`Failed to download audio: ${response.status}`)
    }
    
    const contentType = response.headers.get('content-type') || ''
    let ext = '.webm'
    if (contentType.includes('mp3') || contentType.includes('mpeg')) ext = '.mp3'
    else if (contentType.includes('wav')) ext = '.wav'
    else if (contentType.includes('ogg')) ext = '.ogg'
    else if (contentType.includes('m4a') || contentType.includes('mp4')) ext = '.m4a'
    
    const inputPathWithExt = inputPath + ext
    const buffer = await response.arrayBuffer()
    fs.writeFileSync(inputPathWithExt, Buffer.from(buffer))
    
    console.log('Converting audio to MP3...')
    
    const ffmpegCmd = `ffmpeg -i "${inputPathWithExt}" -vn -ar 44100 -ac 1 -b:a 192k -f mp3 "${outputPath}" -y`
    await execAsync(ffmpegCmd)
    
    const mp3Buffer = fs.readFileSync(outputPath)
    
    // Cleanup
    try {
      fs.unlinkSync(inputPathWithExt)
      fs.unlinkSync(outputPath)
    } catch (e) {}
    
    return mp3Buffer
  } catch (error) {
    throw error
  }
}

// Enhance audio quality using FFmpeg - KEEPS your original voice!
async function enhanceAudioQuality(audioUrl: string, userId: string): Promise<string> {
  const tempDir = os.tmpdir()
  const inputId = uuidv4()
  const inputPath = path.join(tempDir, `enhance_input_${inputId}`)
  const outputPath = path.join(tempDir, `enhance_output_${inputId}.mp3`)
  
  try {
    console.log('Downloading audio for enhancement:', audioUrl)
    
    const response = await fetch(audioUrl)
    if (!response.ok) {
      throw new Error(`Failed to download audio: ${response.status}`)
    }
    
    const contentType = response.headers.get('content-type') || ''
    let ext = '.webm'
    if (contentType.includes('mp3') || contentType.includes('mpeg')) ext = '.mp3'
    else if (contentType.includes('wav')) ext = '.wav'
    else if (contentType.includes('ogg')) ext = '.ogg'
    else if (contentType.includes('m4a') || contentType.includes('mp4')) ext = '.m4a'
    
    const inputPathWithExt = inputPath + ext
    const buffer = await response.arrayBuffer()
    fs.writeFileSync(inputPathWithExt, Buffer.from(buffer))
    
    console.log('Enhancing audio quality with FFmpeg...')
    
    // FFmpeg audio enhancement: noise reduction, EQ, compression, normalization
    const ffmpegCmd = `ffmpeg -i "${inputPathWithExt}" -af "highpass=f=80,lowpass=f=12000,afftdn=nf=-25,acompressor=threshold=-20dB:ratio=4:attack=5:release=50,equalizer=f=3000:t=q:w=1:g=3,loudnorm=I=-16:TP=-1.5:LRA=11" -ar 44100 -ac 1 -b:a 192k -f mp3 "${outputPath}" -y`
    
    await execAsync(ffmpegCmd)
    
    const enhancedBuffer = fs.readFileSync(outputPath)
    const fileName = `voice_enhanced_${userId}_${uuidv4()}.mp3`
    const filePath = `audio/${fileName}`
    
    const uploadResult = await uploadToR2(enhancedBuffer, filePath, 'audio/mpeg')
    
    if (!uploadResult.success) {
      throw new Error('Failed to upload enhanced audio')
    }
    
    // Cleanup
    try {
      fs.unlinkSync(inputPathWithExt)
      fs.unlinkSync(outputPath)
    } catch (e) {}
    
    return uploadResult.url!
  } catch (error) {
    console.error('Audio enhancement error:', error)
    throw error
  }
}

// ElevenLabs Instant Voice Cloning - Creates a cloned voice from sample
async function elevenLabsCloneVoice(audioBuffer: Buffer, voiceName: string): Promise<string> {
  console.log('ElevenLabs: Cloning voice from sample...')
  
  const uint8Array = new Uint8Array(audioBuffer)
  
  const formData = new FormData()
  formData.append('name', voiceName)
  formData.append('files', new Blob([uint8Array], { type: 'audio/mpeg' }), 'voice_sample.mp3')
  formData.append('description', 'Cloned voice for TTS')
  // Labels help identify the voice
  formData.append('labels', JSON.stringify({ source: 'instagram_clone' }))
  
  const response = await fetch('https://api.elevenlabs.io/v1/voices/add', {
    method: 'POST',
    headers: {
      'xi-api-key': ELEVENLABS_API_KEY!
    },
    body: formData
  })
  
  if (!response.ok) {
    const error = await response.text()
    console.error('ElevenLabs Clone error:', error)
    throw new Error(`ElevenLabs voice cloning failed: ${response.status} - ${error}`)
  }
  
  const result = await response.json()
  console.log('ElevenLabs: Voice cloned successfully, ID:', result.voice_id)
  return result.voice_id
}

// ElevenLabs Delete Voice - Cleanup cloned voice
async function elevenLabsDeleteVoice(voiceId: string): Promise<void> {
  console.log('ElevenLabs: Deleting cloned voice:', voiceId)
  
  try {
    const response = await fetch(`https://api.elevenlabs.io/v1/voices/${voiceId}`, {
      method: 'DELETE',
      headers: {
        'xi-api-key': ELEVENLABS_API_KEY!
      }
    })
    
    if (!response.ok) {
      console.warn('Failed to delete voice, may need manual cleanup:', voiceId)
    } else {
      console.log('ElevenLabs: Cloned voice deleted successfully')
    }
  } catch (error) {
    console.warn('Error deleting cloned voice:', error)
  }
}

// ElevenLabs Text-to-Speech
async function elevenLabsTTS(text: string, voiceId: string): Promise<Buffer> {
  console.log('ElevenLabs TTS: Generating speech with voice:', voiceId)
  
  const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
    method: 'POST',
    headers: {
      'Accept': 'audio/mpeg',
      'Content-Type': 'application/json',
      'xi-api-key': ELEVENLABS_API_KEY!
    },
    body: JSON.stringify({
      text: text,
      model_id: 'eleven_multilingual_v2',
      voice_settings: {
        stability: 0.5,
        similarity_boost: 0.75,
        style: 0.0,
        use_speaker_boost: true
      }
    })
  })
  
  if (!response.ok) {
    const error = await response.text()
    console.error('ElevenLabs TTS error:', error)
    throw new Error(`ElevenLabs TTS failed: ${response.status} - ${error}`)
  }
  
  const audioBuffer = await response.arrayBuffer()
  console.log('ElevenLabs TTS: Speech generated successfully')
  return Buffer.from(audioBuffer)
}

// ElevenLabs Speech-to-Speech (Voice Conversion)
async function elevenLabsSTS(audioBuffer: Buffer, voiceId: string): Promise<Buffer> {
  console.log('ElevenLabs STS: Converting voice to:', voiceId)
  
  // Convert Buffer to Uint8Array for Blob compatibility
  const uint8Array = new Uint8Array(audioBuffer)
  
  const formData = new FormData()
  formData.append('audio', new Blob([uint8Array], { type: 'audio/mpeg' }), 'audio.mp3')
  formData.append('model_id', 'eleven_english_sts_v2')
  formData.append('voice_settings', JSON.stringify({
    stability: 0.5,
    similarity_boost: 0.75,
    style: 0.0,
    use_speaker_boost: true
  }))
  
  const response = await fetch(`https://api.elevenlabs.io/v1/speech-to-speech/${voiceId}`, {
    method: 'POST',
    headers: {
      'Accept': 'audio/mpeg',
      'xi-api-key': ELEVENLABS_API_KEY!
    },
    body: formData
  })
  
  if (!response.ok) {
    const error = await response.text()
    console.error('ElevenLabs STS error:', error)
    throw new Error(`ElevenLabs STS failed: ${response.status} - ${error}`)
  }
  
  const audioResult = await response.arrayBuffer()
  console.log('ElevenLabs STS: Voice converted successfully')
  return Buffer.from(audioResult)
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request)
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const formData = await request.formData()
    const mode = formData.get('mode') as string
    const text = formData.get('text') as string
    const voicePreset = (formData.get('voicePreset') as string) || 'Rachel'
    const sourceAudioUrl = formData.get('sourceAudioUrl') as string
    const useOwnVoice = formData.get('useOwnVoice') === 'true'

    if (!ELEVENLABS_API_KEY) {
      return NextResponse.json(
        { success: false, error: 'ElevenLabs API key not configured. Add ELEVENLABS_API_KEY to .env' },
        { status: 500 }
      )
    }

    console.log('=== ElevenLabs Voice Generation ===')
    console.log(`Mode: ${mode}`)
    console.log(`Voice: ${useOwnVoice ? 'OWN_VOICE' : voicePreset}`)
    console.log(`Has text: ${!!text}`)
    console.log(`Has audio: ${!!sourceAudioUrl}`)

    let audioBuffer: Buffer

    // ============================================
    // MODE 1: Clone Voice + TTS (My Own Voice + Text)
    // User provides voice sample + text → Clone voice → Generate speech
    // ============================================
    if (useOwnVoice && sourceAudioUrl && text) {
      console.log('🎤 Voice Clone + TTS Mode: Cloning your voice and generating speech...')
      
      let clonedVoiceId: string | null = null
      
      try {
        // Step 1: Convert audio sample to MP3
        console.log('Step 1: Converting audio sample to MP3...')
        const audioSampleBuffer = await convertAudioToMp3(sourceAudioUrl)
        
        // Step 2: Clone the voice using ElevenLabs
        console.log('Step 2: Cloning your voice with ElevenLabs...')
        const voiceName = `user_${user.id}_${Date.now()}`
        clonedVoiceId = await elevenLabsCloneVoice(audioSampleBuffer, voiceName)
        
        // Step 3: Generate TTS with the cloned voice
        console.log('Step 3: Generating speech with your cloned voice...')
        audioBuffer = await elevenLabsTTS(text, clonedVoiceId)
        
        // Step 4: Upload to R2
        const fileName = `voice_clone_tts_${user.id}_${uuidv4()}.mp3`
        const filePath = `audio/${fileName}`
        const uploadResult = await uploadToR2(audioBuffer, filePath, 'audio/mpeg')
        
        if (!uploadResult.success) {
          throw new Error('Failed to upload audio')
        }
        
        // Step 5: Cleanup - Delete the cloned voice from ElevenLabs
        console.log('Step 5: Cleaning up cloned voice...')
        await elevenLabsDeleteVoice(clonedVoiceId)
        
        return NextResponse.json({
          success: true,
          audioUrl: uploadResult.url,
          mode: 'voice-clone-tts',
          voicePreset: 'cloned_voice',
          useOwnVoice: true,
          message: '🎉 Speech generated in YOUR cloned voice!'
        })
      } catch (error: any) {
        // Cleanup cloned voice on error
        if (clonedVoiceId) {
          await elevenLabsDeleteVoice(clonedVoiceId)
        }
        console.error('Voice Clone + TTS failed:', error)
        return NextResponse.json(
          { success: false, error: error.message || 'Voice cloning failed' },
          { status: 500 }
        )
      }
    }

    // ============================================
    // MODE 2: Own Voice Enhancement (No Text - Just Enhance Recording)
    // ============================================
    if (useOwnVoice && sourceAudioUrl && !text) {
      console.log('Own Voice Mode: Enhancing your recording...')
      
      try {
        const finalAudioUrl = await enhanceAudioQuality(sourceAudioUrl, user.id)
        
        return NextResponse.json({
          success: true,
          audioUrl: finalAudioUrl,
          mode: 'own-voice-enhanced',
          voicePreset: 'own_voice',
          useOwnVoice: true,
          message: 'Your voice has been enhanced with improved clarity!'
        })
      } catch (error) {
        console.error('Enhancement failed:', error)
        return NextResponse.json(
          { success: false, error: 'Failed to enhance audio' },
          { status: 500 }
        )
      }
    }

    // ============================================
    // MODE 3: Text-to-Speech with ElevenLabs preset voice
    // ============================================
    if (mode === 'text-to-speech' && text) {
      console.log('Text-to-Speech Mode with ElevenLabs')
      
      const voiceId = ELEVENLABS_VOICES[voicePreset] || ELEVENLABS_VOICES['Rachel']
      
      try {
        audioBuffer = await elevenLabsTTS(text, voiceId)
        
        // Upload to R2
        const fileName = `voice_tts_${user.id}_${uuidv4()}.mp3`
        const filePath = `audio/${fileName}`
        const uploadResult = await uploadToR2(audioBuffer, filePath, 'audio/mpeg')
        
        if (!uploadResult.success) {
          throw new Error('Failed to upload audio')
        }
        
        return NextResponse.json({
          success: true,
          audioUrl: uploadResult.url,
          mode: 'text-to-speech',
          voicePreset: voicePreset,
          useOwnVoice: false,
          message: `Speech generated with ${voicePreset} voice!`
        })
      } catch (error: any) {
        console.error('TTS failed:', error)
        return NextResponse.json(
          { success: false, error: error.message || 'Text-to-speech failed' },
          { status: 500 }
        )
      }
    }

    // ============================================
    // MODE 4: Speech-to-Speech (Voice Conversion)
    // ============================================
    if (mode === 'speech-to-speech' && sourceAudioUrl) {
      console.log('Speech-to-Speech Mode with ElevenLabs')
      
      const voiceId = ELEVENLABS_VOICES[voicePreset] || ELEVENLABS_VOICES['Rachel']
      
      try {
        // Convert source audio to MP3
        const sourceBuffer = await convertAudioToMp3(sourceAudioUrl)
        
        // Convert to target voice
        audioBuffer = await elevenLabsSTS(sourceBuffer, voiceId)
        
        // Upload to R2
        const fileName = `voice_sts_${user.id}_${uuidv4()}.mp3`
        const filePath = `audio/${fileName}`
        const uploadResult = await uploadToR2(audioBuffer, filePath, 'audio/mpeg')
        
        if (!uploadResult.success) {
          throw new Error('Failed to upload audio')
        }
        
        return NextResponse.json({
          success: true,
          audioUrl: uploadResult.url,
          mode: 'speech-to-speech',
          voicePreset: voicePreset,
          useOwnVoice: false,
          message: `Voice converted to ${voicePreset}!`
        })
      } catch (error: any) {
        console.error('STS failed:', error)
        return NextResponse.json(
          { success: false, error: error.message || 'Speech-to-speech failed' },
          { status: 500 }
        )
      }
    }

    return NextResponse.json(
      { success: false, error: 'Invalid request: missing required parameters' },
      { status: 400 }
    )

  } catch (error: any) {
    console.error('Voice generation error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to generate voice' },
      { status: 500 }
    )
  }
}

// GET endpoint to list available voices
export async function GET() {
  return NextResponse.json({
    success: true,
    voices: Object.keys(ELEVENLABS_VOICES),
    message: 'Available ElevenLabs voices'
  })
}
