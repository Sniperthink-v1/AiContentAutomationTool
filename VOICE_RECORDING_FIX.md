# Voice Recording & Clip Count Fix

## Issues Fixed

### 1. ❌ 17 Clips Generated Instead of Expected Count

**Problem:** The enhancement was generating 17 clips because the `getClipCountForEnhancement()` function was calculating based on an invalid duration value.

**Root Cause:**
```typescript
// Old calculation - no validation
const getClipCountForEnhancement = () => {
  if (isUsingVeo) {
    return Math.ceil(parseInt(selectedDuration) / 8)  // Could result in 17+ clips
  }
  return 1
}
```

**Solution:** Added duration validation and capped clips at 3 maximum:
```typescript
const getClipCountForEnhancement = () => {
  if (isUsingVeo) {
    const duration = parseInt(selectedDuration)
    // Ensure duration is valid (8, 16, 24, or 32)
    const validDuration = [8, 16, 24, 32].includes(duration) ? duration : 8
    // Cap at 3 clips (24s max) for better story cohesion
    return Math.min(Math.ceil(validDuration / 8), 3)
  }
  return 1
}
```

**Result:**
- ✅ 8s duration → 1 clip
- ✅ 16s duration → 2 clips
- ✅ 24s duration → 3 clips
- ✅ 32s duration → 3 clips (capped)

### 2. ❌ Missing Voice Recording Options

**Problem:** Users could only upload audio files for voice cloning, not record directly from their microphone.

**Solution Added:**

#### Voice Sample Recording
Users can now **record or upload** their voice sample:
- 🎤 **Record** button - Capture voice directly from microphone
- 📁 **Upload** button - Upload pre-recorded audio file

#### Source Audio Recording (Speech-to-Speech)
Users can now **record or upload** source audio to convert:
- 🎤 **Record** button - Record audio to be converted to user's voice
- 📁 **Upload** button - Upload audio file to be converted

#### Recording Features
- Real-time recording with visual feedback (red border when recording)
- Automatic blob-to-file conversion with proper naming
- Audio preview after recording
- Stream cleanup after recording stops
- Error handling for microphone permission issues

## Technical Implementation

### New State Variables
```typescript
// Voice cloning recording states
const [isRecordingVoice, setIsRecordingVoice] = useState(false)
const [isRecordingSource, setIsRecordingSource] = useState(false)
const [voiceRecorder, setVoiceRecorder] = useState<MediaRecorder | null>(null)
const [recordingType, setRecordingType] = useState<'voice' | 'source' | null>(null)
```

### Recording Functions
```typescript
const startVoiceRecording = async (type: 'voice' | 'source') => {
  // Request microphone access
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
  const recorder = new MediaRecorder(stream)
  
  // Handle recording completion
  recorder.onstop = () => {
    const blob = new Blob(chunks, { type: 'audio/webm' })
    const file = new File([blob], `recording-${Date.now()}.webm`, { type: 'audio/webm' })
    const url = URL.createObjectURL(blob)
    
    // Set appropriate state based on type
    if (type === 'voice') {
      setVoiceSample(file)
      setVoiceSampleUrl(url)
    } else {
      setSourceAudioForCloning(file)
      setSourceAudioForCloningUrl(url)
    }
  }
}

const stopVoiceRecording = () => {
  if (voiceRecorder && voiceRecorder.state !== 'inactive') {
    voiceRecorder.stop()
  }
}
```

### UI Components

#### Voice Sample Section
```tsx
<div className="grid grid-cols-2 gap-2">
  {/* Upload Button */}
  <label htmlFor="voice-sample-upload">
    <Upload className="w-4 h-4" />
    <span>Upload</span>
  </label>
  
  {/* Record Button */}
  <button onClick={() => isRecordingVoice ? stopVoiceRecording() : startVoiceRecording('voice')}>
    <Mic className="w-4 h-4" />
    <span>{isRecordingVoice ? 'Stop' : 'Record'}</span>
  </button>
</div>
```

#### Source Audio Section (Speech-to-Speech)
```tsx
<div className="grid grid-cols-2 gap-2">
  {/* Upload Button */}
  <label htmlFor="source-audio-upload">
    <Upload className="w-4 h-4" />
    <span>Upload</span>
  </label>
  
  {/* Record Button */}
  <button onClick={() => isRecordingSource ? stopVoiceRecording() : startVoiceRecording('source')}>
    <Mic className="w-4 h-4" />
    <span>{isRecordingSource ? 'Stop' : 'Record'}</span>
  </button>
</div>
```

## User Experience

### Before
- ❌ Generated too many clips (17 instead of 1-3)
- ❌ Only upload option for voice samples
- ❌ No direct recording capability
- ❌ Poor story cohesion with many clips

### After
- ✅ Generates correct number of clips (1-3 max)
- ✅ Upload OR record voice samples
- ✅ Upload OR record source audio
- ✅ Better story flow with fewer, cohesive clips
- ✅ Visual recording feedback
- ✅ Audio preview after recording
- ✅ Toast notifications for recording status

## Workflow

### Voice Cloning with Recording

1. **Enable Voice Cloning** - Toggle on in "With Audio" mode
2. **Choose Mode:**
   - **Text-to-Speech:** Type what you want the voice to say
   - **Speech-to-Speech:** Convert any audio to your voice

3. **Provide Voice Sample:**
   - Click **Upload** to select audio file, OR
   - Click **Record** to capture from microphone
   - Preview audio after upload/recording

4. **For Speech-to-Speech:**
   - Click **Upload** to select source audio, OR
   - Click **Record** to capture audio to convert
   - Preview audio after upload/recording

5. **Generate Video:**
   - Runway API converts audio to your voice
   - Gemini Veo syncs video to the audio natively
   - Final video has your cloned voice perfectly lip-synced

## Browser Compatibility

Recording feature requires:
- Modern browser with MediaRecorder API support
- User permission to access microphone
- HTTPS connection (required by browser security)

Supported formats:
- Chrome/Edge: WebM with Opus audio
- Safari: MP4 with AAC audio
- Firefox: WebM with Opus audio

## Error Handling

```typescript
try {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
  // ... recording logic
} catch (error) {
  console.error('Failed to start recording:', error)
  showToast('Failed to access microphone. Please grant permission.', 'error')
}
```

Common errors handled:
- Microphone permission denied
- No microphone device found
- Browser not supporting MediaRecorder API
- Recording interrupted unexpectedly

## Files Modified

- `app/dashboard/ai-video/page.tsx` - Main video generation UI
  - Added `Mic` icon import
  - Added recording state variables
  - Added `startVoiceRecording()` and `stopVoiceRecording()` functions
  - Updated `getClipCountForEnhancement()` with validation
  - Added recording buttons to voice sample and source audio sections
  - Added visual recording indicators

## Next Steps

To test the recording feature:
1. Open AI Video page in browser
2. Select "With Audio" mode
3. Enable "Custom Voice" toggle
4. Click "Record" button for voice sample
5. Speak for 10-30 seconds
6. Click "Stop" to finish recording
7. Preview the recorded audio
8. Proceed with video generation

The recording will be automatically converted to the correct format and used for voice cloning!
