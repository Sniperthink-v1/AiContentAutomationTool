# Voice Cloning Feature

## Overview
Add your personal voice to AI-generated videos using voice cloning technology powered by ElevenLabs.

## Setup

### 1. Get ElevenLabs API Key
1. Sign up at [ElevenLabs](https://elevenlabs.io/)
2. Go to your profile settings
3. Copy your API key
4. Add to your `.env` file:
```env
ELEVENLABS_API_KEY=your_api_key_here
```

## Features

### Text-to-Speech with Your Voice
1. Select **"With Audio"** mode
2. Enable **"Custom Voice"** toggle
3. Choose **"Text-to-Speech"** mode
4. Upload a 10-30 second voice sample (clear audio of you speaking)
5. Type the text you want spoken in your voice
6. Click **"Generate Cloned Voice"**
7. Preview the cloned audio
8. Generate your video - it will include your cloned voice!

### Speech-to-Speech (Voice Conversion)
1. Select **"With Audio"** mode
2. Enable **"Custom Voice"** toggle
3. Choose **"Speech-to-Speech"** mode
4. Upload a voice sample (10-30 seconds of your voice)
5. Upload source audio (any voice speaking - will be converted to your voice)
6. Click **"Generate Cloned Voice"**
7. Preview the converted audio
8. Generate your video with the converted voice!

## Use Cases

### Personal Narration
- Create video tutorials with your voice
- Add personalized voiceovers to videos
- Make branded content with consistent voice

### Voice Conversion
- Convert any audio to your voice
- Translate content while keeping your voice
- Create consistent voiceovers across languages

### Content Creation
- Travel vlogs with your narration
- Product reviews with your voice
- Educational content with personal touch

## Best Practices

### Voice Sample Quality
- **Duration**: 10-30 seconds (longer is better)
- **Quality**: Clear, noise-free recording
- **Content**: Natural speech, not shouting or whispering
- **Environment**: Quiet room, no background noise
- **Format**: MP3, WAV, or M4A

### Text-to-Speech Tips
- Use natural language and punctuation
- Add commas for pauses
- Keep sentences conversational
- Match your video content style

### Speech-to-Speech Tips
- Source audio should be clear
- Works best with similar speaking pace
- Original emotion/intonation is preserved
- Can convert different languages

## Limitations

- Voice cloning requires ElevenLabs API quota
- First generation may take 20-60 seconds
- Voice quality depends on sample quality
- Some accents may vary slightly
- Maximum text length: ~5000 characters

## Pricing

Voice cloning uses ElevenLabs credits:
- **Text-to-Speech**: ~1,000 characters per request
- **Speech-to-Speech**: Based on audio duration
- Check your ElevenLabs quota at https://elevenlabs.io/

## Troubleshooting

### "Voice cloning failed"
- Check your ElevenLabs API key is valid
- Ensure you have quota remaining
- Try a shorter voice sample
- Upload high-quality audio

### "Audio quality is poor"
- Use better quality voice sample
- Record in quiet environment
- Increase sample duration to 20-30 seconds
- Try different microphone

### "Voice doesn't sound like me"
- Upload longer voice sample (20-30 sec)
- Record more natural speech
- Speak at normal pace and volume
- Include variety in intonation

## API Endpoints

### POST `/api/voice/clone`
Clone voice and generate audio

**Request (FormData):**
- `voiceSample`: Audio file (your voice sample)
- `voiceName`: String (name for the voice)
- `mode`: 'text-to-speech' | 'speech-to-speech'
- `text`: String (for text-to-speech mode)
- `sourceAudio`: Audio file (for speech-to-speech mode)

**Response:**
```json
{
  "success": true,
  "audioUrl": "data:audio/mpeg;base64,...",
  "voiceId": "voice_id_from_elevenlabs",
  "message": "Voice cloned and audio generated successfully"
}
```

## Security Notes

- Voice samples are sent to ElevenLabs
- Cloned voices can be deleted after use
- Keep your API key secure
- Don't share your cloned voice files publicly

## Future Enhancements

- [ ] Save cloned voices for reuse
- [ ] Multiple voice profiles
- [ ] Real-time voice preview
- [ ] Voice emotion controls
- [ ] Multilingual voice cloning
- [ ] Voice mixing/layering
