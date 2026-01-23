# Complete Audio-Video Sync Workflow Documentation

## Overview
This document explains how video and custom voice audio are synchronized to create videos with YOUR voice.

## The Complete Workflow

### Step 1: User Provides Voice Sample
```
User uploads 10-30 seconds of clear audio
↓
Voice sample is sent to ElevenLabs API
↓
ElevenLabs creates a voice profile/clone
```

### Step 2: Generate Custom Voice Audio
```
Two options:

A) TEXT-TO-SPEECH:
   User types script → ElevenLabs generates audio in user's voice

B) SPEECH-TO-SPEECH:
   User uploads any audio → ElevenLabs converts it to user's voice
```

### Step 3: Generate Video (WITHOUT Audio)
```
When custom voice is enabled:
↓
Gemini Veo generates video WITHOUT audio
↓
This allows clean audio replacement
↓
Video includes speaking/mouth movements based on script
```

### Step 4: Audio-Video Synchronization
```
Using FFmpeg:
↓
1. Download generated video
2. Extract custom audio from ElevenLabs
3. Adjust audio duration to match video
4. Replace video's audio track with custom voice
5. Output final synced video
```

### Step 5: Final Output
```
Video with YOUR voice speaking!
↓
Saved to drafts
↓
Available for download/publishing
```

## Technical Implementation

### File Structure
```
/app
  /api
    /voice
      /clone
        route.ts           # Voice cloning with ElevenLabs
    /video
      /sync-audio
        route.ts           # Audio-video synchronization
      /combine
        route.ts           # Combine multiple clips
  /dashboard
    /ai-video
      page.tsx            # Main UI with voice cloning controls
```

### API Endpoints

#### 1. POST `/api/voice/clone`
**Purpose**: Clone voice and generate audio

**Request**:
```typescript
FormData {
  voiceSample: File,           // Voice sample audio file
  voiceName: string,            // Name for the voice
  mode: 'text-to-speech' | 'speech-to-speech',
  text?: string,                // For text-to-speech
  sourceAudio?: File            // For speech-to-speech
}
```

**Response**:
```typescript
{
  success: true,
  audioUrl: "data:audio/mpeg;base64,...",  // Base64 audio
  voiceId: "voice_abc123",                  // ElevenLabs voice ID
  message: "Voice cloned successfully"
}
```

#### 2. POST `/api/video/sync-audio`
**Purpose**: Sync custom audio with generated video

**Request**:
```typescript
{
  videoUrl: string,              // URL of generated video
  customAudioUrl: string,        // Base64 or URL of custom audio
  enableLipSync: boolean         // Whether to apply lip-sync (optional)
}
```

**Response**:
```typescript
{
  success: true,
  videoUrl: "data:video/mp4;base64,...",  // Final synced video
  videoDuration: 8.5,                      // Video duration in seconds
  audioDuration: 8.3,                      // Audio duration in seconds
  message: "Video and audio synced successfully"
}
```

#### 3. POST `/api/gemini/generate-video`
**Purpose**: Generate video with Gemini Veo

**Request (with custom voice)**:
```typescript
{
  prompt: string,
  withAudio: false,              // Generate WITHOUT audio (for custom voice)
  videoStyle: string,
  aspectRatio: string,
  duration: number
}
```

## How It Works: Step-by-Step

### Scenario: User wants video with their voice

#### 1. User Setup (Frontend)
```typescript
// User enables custom voice
enableVoiceCloning = true

// User uploads voice sample
voiceSample = File("my_voice.mp3")

// User types script
voiceCloneText = "Welcome to my channel! Today we're going to..."

// User generates cloned voice
handleVoiceCloning() → calls /api/voice/clone
```

#### 2. Voice Cloning (API)
```typescript
// In /api/voice/clone/route.ts

// Step 1: Create voice from sample
ElevenLabs.createVoice(voiceSample) 
→ returns voiceId

// Step 2: Generate speech with cloned voice
ElevenLabs.textToSpeech(voiceId, voiceCloneText)
→ returns audio in base64

// Return cloned audio to frontend
→ clonedAudioUrl = "data:audio/mpeg;base64,..."
```

#### 3. Video Generation (Frontend)
```typescript
// User clicks "Generate Video"
handleVeo31Generation()

// Detect custom voice is enabled
if (enableVoiceCloning && clonedAudioUrl) {
  withAudio = false  // Generate video WITHOUT audio
}

// Send to Gemini Veo
fetch('/api/gemini/generate-video', {
  prompt: enhancedScript,
  withAudio: false,        // No audio in video
  videoStyle: 'cinematic'
})
```

#### 4. Video Generation (API)
```typescript
// In /api/gemini/generate-video/route.ts

const generateConfig = {
  aspectRatio: '9:16',
  numberOfVideos: 1,
  durationSeconds: 8,
  includeAudio: false      // Disable audio generation
}

// Generate video WITHOUT audio
const operation = await client.models.generateVideos({
  model: 'veo-3.1-fast-generate-preview',
  config: generateConfig,
  prompt: prompt
})

// Return video URL (without audio)
→ videoUrl = "https://storage.googleapis.com/..."
```

#### 5. Audio-Video Sync (Frontend)
```typescript
// After video is complete
const videoUrl = statusData.videoUrl

// Sync custom audio with video
const syncResponse = await fetch('/api/video/sync-audio', {
  method: 'POST',
  body: JSON.stringify({
    videoUrl: videoUrl,
    customAudioUrl: clonedAudioUrl
  })
})

// Get synced video
const finalVideoUrl = syncData.videoUrl
```

#### 6. Audio-Video Sync (API)
```typescript
// In /api/video/sync-audio/route.ts

// Step 1: Download video from Gemini
downloadFile(videoUrl, 'video.mp4')

// Step 2: Save custom audio
saveBase64Audio(customAudioUrl, 'audio.mp3')

// Step 3: Check durations
videoDuration = getVideoDuration('video.mp4')  // 8.0s
audioDuration = getAudioDuration('audio.mp3')  // 8.3s

// Step 4: Adjust audio to match video (if needed)
if (audioDuration > videoDuration) {
  // Trim audio
  ffmpeg -i audio.mp3 -t 8.0 audio_adjusted.mp3
}

// Step 5: Replace audio track in video
ffmpeg -i video.mp4 -i audio_adjusted.mp3 \
  -c:v copy -c:a aac -b:a 192k \
  -map 0:v:0 -map 1:a:0 \
  output.mp4

// Step 6: Return synced video
→ finalVideoUrl = "data:video/mp4;base64,..."
```

#### 7. Final Result (Frontend)
```typescript
// Display synced video to user
setGeneratedVideoUrl(finalVideoUrl)

// User can now:
// - Preview video with their voice
// - Download video
// - Save to My Media
// - Share on Instagram
```

## Multi-Clip Workflow with Custom Voice

### When generating multiple clips (16s, 24s, 32s videos):

```
1. Generate all clips WITHOUT audio
   ↓
2. User reviews and edits clips
   ↓
3. Combine clips into one video
   ↓
4. Sync combined video with custom audio
   ↓
5. Final video with custom voice
```

### Implementation:
```typescript
// In handleCombineClips()

// Step 1: Combine all clips
const combinedVideoUrl = await combineClips(videoUrls)

// Step 2: Sync custom audio with combined video
if (enableVoiceCloning && clonedAudioUrl) {
  const syncResponse = await fetch('/api/video/sync-audio', {
    videoUrl: combinedVideoUrl,
    customAudioUrl: clonedAudioUrl
  })
  
  finalVideoUrl = syncResponse.videoUrl
}
```

## Why This Approach Works

### 1. **Clean Audio Replacement**
- Video generated WITHOUT audio
- No interference from Gemini's audio
- Perfect audio track replacement

### 2. **Duration Matching**
- FFmpeg automatically adjusts audio duration
- Trims if audio is longer
- Pads with silence if audio is shorter

### 3. **Quality Preservation**
- Video codec copied (no re-encoding)
- Audio encoded at high quality (192k AAC)
- No quality loss in video

### 4. **ElevenLabs Voice Cloning**
- High-quality voice cloning
- Natural-sounding speech
- Emotion and intonation preserved

## Limitations & Solutions

### Limitation 1: Lip-Sync
**Problem**: Generated video's mouth movements may not perfectly match custom audio

**Solution** (Optional):
- Use Wav2Lip API for lip-sync correction
- Set `enableLipSync: true` in sync request
- Requires additional processing time

### Limitation 2: Audio Length
**Problem**: Custom audio might be different length than video

**Solution** (Implemented):
- FFmpeg automatically adjusts durations
- Trims excess audio
- Pads with silence if needed

### Limitation 3: Multiple Clips
**Problem**: Custom audio needs to span multiple clips

**Solution** (Implemented):
- Combine clips first
- Then sync custom audio with combined video
- Single audio track for entire video

## Environment Setup

### Required Environment Variables
```env
# ElevenLabs API for voice cloning
ELEVENLABS_API_KEY=your_elevenlabs_key

# Gemini Veo API for video generation
VEO_API_KEY=your_gemini_veo_key

# Google Gen AI for Gemini features
GEMINI_API_KEY=your_gemini_key
```

### Required Dependencies
```json
{
  "@google/genai": "^3.x",
  "uuid": "^9.x"
}
```

### System Requirements
- **FFmpeg**: Must be installed and in PATH
- **Node.js**: v18 or higher
- **Disk Space**: ~500MB temp storage for processing

## Testing the Workflow

### Test 1: Simple Text-to-Speech
```
1. Enable "With Audio"
2. Enable "Custom Voice"
3. Upload voice sample (15 seconds)
4. Enter text: "Hello, this is my custom voice!"
5. Generate cloned voice
6. Generate video
7. Verify: Video has your voice
```

### Test 2: Speech-to-Speech
```
1. Enable "With Audio"
2. Enable "Custom Voice"
3. Upload voice sample
4. Upload source audio (any voice)
5. Generate cloned voice
6. Generate video
7. Verify: Video has your voice (converted from source)
```

### Test 3: Multi-Clip
```
1. Enable "Custom Voice"
2. Generate cloned voice
3. Select 16s duration (2 clips)
4. Generate video
5. Review clips
6. Combine clips
7. Verify: Combined video has your voice throughout
```

## Troubleshooting

### Issue: "Voice cloning failed"
**Check**:
- ElevenLabs API key is valid
- Voice sample is clear and 10-30 seconds
- Have sufficient ElevenLabs quota

### Issue: "Audio sync failed"
**Check**:
- FFmpeg is installed (`ffmpeg -version`)
- Temp directory has write permissions
- Video URL is accessible

### Issue: "Audio doesn't match video duration"
**Solution**: This is handled automatically
- Audio is trimmed or padded to match
- Check console logs for duration info

### Issue: "Lip movements don't match"
**Solution**: Enable lip-sync (advanced)
- Set `enableLipSync: true`
- Requires Wav2Lip integration
- Adds 30-60 seconds processing time

## Future Enhancements

- [ ] Real-time lip-sync with Wav2Lip
- [ ] Multiple voice profiles per user
- [ ] Voice emotion controls
- [ ] Background music mixing
- [ ] Real-time preview
- [ ] Batch processing
- [ ] Voice A/B testing
- [ ] Save favorite voice settings
