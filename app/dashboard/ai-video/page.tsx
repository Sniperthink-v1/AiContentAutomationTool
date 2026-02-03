'use client'

import { useState, useEffect } from 'react'
import { 
  Sparkles, 
  Video, 
  Download, 
  Wand2,
  Clock,
  Image as ImageIcon,
  Music,
  Type,
  Settings,
  Zap,
  Copy,
  Check,
  Edit3,
  Loader2,
  Coins,
  Upload,
  ArrowUp,
  Play,
  RefreshCw,
  Merge,
  X,
  ChevronRight,
  Film,
  ZoomIn,
  Maximize2,
  Info,
  Mic
} from 'lucide-react'
import { useToast } from '@/lib/components/Toast'

// Video Viewer Modal Component
function VideoViewerModal({ isOpen, onClose, videoUrl, prompt }: { isOpen: boolean, onClose: () => void, videoUrl: string, prompt: string }) {
  // Handle ESC key press
  useEffect(() => {
    if (!isOpen) return
    
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleEsc)
    return () => window.removeEventListener('keydown', handleEsc)
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/95 animate-fade-in backdrop-blur-sm"
      onClick={onClose}
    >
      <div className="relative max-w-7xl max-h-[95vh] w-full animate-scale-in" onClick={(e) => e.stopPropagation()}>
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute -top-12 right-0 w-10 h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white transition-all backdrop-blur-sm z-10"
        >
          <X className="w-6 h-6" />
        </button>

        {/* Video Container */}
        <div className="relative bg-black rounded-xl overflow-hidden shadow-2xl border border-white/10">
          <video
            src={videoUrl}
            controls
            autoPlay
            className="w-full h-auto max-h-[85vh] object-contain"
          />
          
          {/* Video Info Overlay */}
          {prompt && (
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent p-6 pointer-events-none">
              <div className="flex items-start gap-3">
                <Sparkles className="w-5 h-5 text-primary mt-1 flex-shrink-0" />
                <p className="text-white text-sm leading-relaxed line-clamp-2">
                  {prompt}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Helper Text */}
        <div className="text-center mt-4">
          <p className="text-white/60 text-sm">Click outside or press ESC to close</p>
        </div>
      </div>
    </div>
  )
}

export default function AIVideoPage() {
  // Toast notifications
  const { showToast, showAndSaveToast, ToastContainer } = useToast()
  
  // Credits state
  const [credits, setCredits] = useState({ total_credits: 0, used_credits: 0, remaining_credits: 0 })
  const [isLoadingCredits, setIsLoadingCredits] = useState(true)
  
  const [prompt, setPrompt] = useState('')
  const [enhancedScript, setEnhancedScript] = useState('')
  const [isEnhancing, setIsEnhancing] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [selectedStyle, setSelectedStyle] = useState('cinematic')
  
  // Store last generated prompts for saving (in case prompts are cleared)
  const [lastGeneratedPrompt, setLastGeneratedPrompt] = useState('')
  const [lastGeneratedEnhancedScript, setLastGeneratedEnhancedScript] = useState('')
  
  // Model and mode selection
  const [audioCategory, setAudioCategory] = useState<'without-audio' | 'with-audio'>('without-audio')
  const [videoInputType, setVideoInputType] = useState<'image-to-video' | 'text-to-video'>('text-to-video')
  const [imageUsageMode, setImageUsageMode] = useState<'reference' | 'animate'>('reference') // 'reference' = style/character reference, 'animate' = put image in video
  const [selectedQualityTier, setSelectedQualityTier] = useState<'720p' | '1080p'>('720p')
  const [selectedDuration, setSelectedDuration] = useState('8') // Default to 8 for veo3.1_fast (default mode)
  const [referenceImage, setReferenceImage] = useState<File | null>(null)
  const [referenceImageUrl, setReferenceImageUrl] = useState('')
  const [sourceVideo, setSourceVideo] = useState<File | null>(null)
  const [sourceVideoUrl, setSourceVideoUrl] = useState('')
  
  const [showEnhancedScript, setShowEnhancedScript] = useState(false)
  const [isCopied, setIsCopied] = useState(false)
  const [isEditingScript, setIsEditingScript] = useState(false)
  const [showEnhanceOptions, setShowEnhanceOptions] = useState(false)
  const [customEnhanceInstructions, setCustomEnhanceInstructions] = useState('')
  
  // Edit clip modal state
  const [editClipModal, setEditClipModal] = useState<{ isOpen: boolean; clipIndex: number; clipText: string }>({
    isOpen: false,
    clipIndex: -1,
    clipText: ''
  })
  
  // New advanced options states
  const [aspectRatio, setAspectRatio] = useState('9:16') // Instagram default
  const [videoQuality, setVideoQuality] = useState('high')
  const [transition, setTransition] = useState('smooth')
  const [cameraMovement, setCameraMovement] = useState('dynamic')
  
  // Video generation options
  const [noCaptions, setNoCaptions] = useState(true) // Generate video without text/captions
  
  // Audio options
  const [audioMode, setAudioMode] = useState<'none' | 'music' | 'voiceover' | 'sound-effects' | 'custom'>('music')
  const [backgroundMusic, setBackgroundMusic] = useState('upbeat')
  const [savedSongs, setSavedSongs] = useState<any[]>([])
  const [selectedSongUrl, setSelectedSongUrl] = useState('')
  const [voiceoverFile, setVoiceoverFile] = useState<File | null>(null)
  
  // Voice cloning states
  const [enableVoiceCloning, setEnableVoiceCloning] = useState(false)
  const [voiceCloneMode, setVoiceCloneMode] = useState<'text-to-speech' | 'speech-to-speech'>('text-to-speech')
  const [selectedVoicePreset, setSelectedVoicePreset] = useState('Maya')
  const [voiceCloneText, setVoiceCloneText] = useState('')
  const [sourceAudioForCloning, setSourceAudioForCloning] = useState<File | null>(null)
  const [sourceAudioForCloningUrl, setSourceAudioForCloningUrl] = useState('')
  const [clonedAudioUrl, setClonedAudioUrl] = useState('')
  const [isGeneratingVoice, setIsGeneratingVoice] = useState(false)
  const [useOwnVoice, setUseOwnVoice] = useState(false) // Use user's own voice instead of preset
  
  // Available voice presets from ElevenLabs API
  const VOICE_PRESETS = [
    { name: 'Rachel', description: 'American female, calm & clear' },
    { name: 'Domi', description: 'American female, strong' },
    { name: 'Bella', description: 'American female, soft' },
    { name: 'Antoni', description: 'American male, well-rounded' },
    { name: 'Elli', description: 'American female, emotional' },
    { name: 'Josh', description: 'American male, deep' },
    { name: 'Arnold', description: 'American male, strong' },
    { name: 'Adam', description: 'American male, deep' },
    { name: 'Sam', description: 'American male, raspy' },
  ]
  const [voiceoverUrl, setVoiceoverUrl] = useState('')
  const [soundEffectPrompt, setSoundEffectPrompt] = useState('')
  const [customAudioFile, setCustomAudioFile] = useState<File | null>(null)
  const [customAudioUrl, setCustomAudioUrl] = useState('')
  const [audioVolume, setAudioVolume] = useState(0.8)
  
  // Live recording states
  const [isRecording, setIsRecording] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null)
  const [recordedChunks, setRecordedChunks] = useState<Blob[]>([])
  const [recordingMode, setRecordingMode] = useState<'upload' | 'record'>('upload')
  
  // Voice cloning recording states
  const [isRecordingVoice, setIsRecordingVoice] = useState(false)
  const [isRecordingSource, setIsRecordingSource] = useState(false)
  const [voiceRecorder, setVoiceRecorder] = useState<MediaRecorder | null>(null)
  const [recordingType, setRecordingType] = useState<'voice' | 'source' | null>(null)
  
  // Voice clone testing flow states
  const [voiceCloneStep, setVoiceCloneStep] = useState<'record' | 'test' | 'ready'>('record')
  const [testVoiceText, setTestVoiceText] = useState('')
  const [testVoiceAudioUrl, setTestVoiceAudioUrl] = useState('')
  const [isTestingVoice, setIsTestingVoice] = useState(false)
  const [voiceCloneConfirmed, setVoiceCloneConfirmed] = useState(false)
  
  // Generation progress states
  const [generationProgress, setGenerationProgress] = useState(0)
  const [generationStatus, setGenerationStatus] = useState('') // 'queued', 'processing', 'rendering', 'complete'
  const [generatedVideoUrl, setGeneratedVideoUrl] = useState('')
  const [jobId, setJobId] = useState('')
  
  // Video viewer modal state
  const [videoViewer, setVideoViewer] = useState<{
    isOpen: boolean
    videoUrl: string
    prompt: string
  }>({
    isOpen: false,
    videoUrl: '',
    prompt: ''
  })
  
  // Multi-clip workflow states
  const [generatedClips, setGeneratedClips] = useState<{
    index: number;
    videoUrl: string;
    prompt: string;
    status: 'generating' | 'complete' | 'failed' | 'editing';
    operationName?: string;
  }[]>([])
  const [showClipEditor, setShowClipEditor] = useState(false)
  const [editingClipIndex, setEditingClipIndex] = useState<number | null>(null)
  const [editingClipPrompt, setEditingClipPrompt] = useState('')
  const [isEnhancingClipPrompt, setIsEnhancingClipPrompt] = useState(false)
  const [isCombiningClips, setIsCombiningClips] = useState(false)
  const [clipGenerationPhase, setClipGenerationPhase] = useState<'idle' | 'generating' | 'preview' | 'combining' | 'complete'>('idle')

  // Load credits and songs on mount
  useEffect(() => {
    fetchCredits()
    fetchSavedSongs()
  }, [])

  // Auto-adjust duration when switching between models
  // All modes now use Gemini Veo 3.1 Fast with 8/16/24/32 second clips
  useEffect(() => {
    const veoDurations = ['8', '16', '24', '32']
    
    if (!veoDurations.includes(selectedDuration)) {
      // Ensure duration is valid for Veo
      setSelectedDuration('8')
      // Reset enhanced scripts when mode changes
      setShowEnhancedScript(false)
      setEnhancedScript('')
      setScriptSections([])
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [audioCategory, videoInputType])

  const fetchCredits = async () => {
    try {
      const response = await fetch('/api/credits/balance')
      const data = await response.json()
      if (data.success) {
        setCredits(data.credits)
      }
    } catch (error) {
      console.error('Failed to load credits:', error)
    } finally {
      setIsLoadingCredits(false)
    }
  }

  const fetchSavedSongs = async () => {
    try {
      const response = await fetch('/api/songs/list')
      const data = await response.json()
      if (data.success) {
        setSavedSongs(data.songs || [])
      }
    } catch (error) {
      console.error('Failed to load saved songs:', error)
    }
  }

  const deductCredits = async (creditsUsed: number, modelUsed: string, duration: number) => {
    try {
      const response = await fetch('/api/credits/deduct', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          actionType: 'video_generation',
          creditsUsed,
          modelUsed,
          duration,
          description: `${videoMode} - ${modelUsed} - ${duration}s`
        })
      })
      const data = await response.json()
      if (data.success) {
        setCredits(data.credits)
      }
      return data.success
    } catch (error) {
      console.error('Failed to deduct credits:', error)
      return false
    }
  }

  // Video models with their pricing - organized by category
  // All modes now use Gemini Veo 3.1 Fast
  const getPricingInfo = () => {
    const is1080p = selectedQualityTier === '1080p'
    
    // All modes use Gemini Veo 3.1 Fast - 15 credits/sec (16 for 1080p)
    return { creditsPerSecond: is1080p ? 16 : 15, api: 'gemini', model: 'veo3.1_fast' }
  }
  
  const currentPricing = getPricingInfo()
  
  // Legacy compatibility - derive selectedModel from new state
  const selectedModel = currentPricing.model
  const videoMode = videoInputType
  
  // Video styles for Veo 3.1 (Text-to-Video)
  const [veoVideoStyle, setVeoVideoStyle] = useState('cinematic') // 'dialogue', 'cinematic', 'animation'
  
  const veoVideoStyles = [
    {
      id: 'dialogue',
      name: 'Dialogue & Sound',
      description: 'With speech and sound effects',
      emoji: '🎤',
      example: 'People talking with natural audio'
    },
    {
      id: 'cinematic',
      name: 'Cinematic Realism',
      description: 'Photorealistic movie quality',
      emoji: '🎬',
      example: 'Drone shots, action scenes'
    },
    {
      id: 'animation',
      name: 'Creative Animation',
      description: 'Artistic animated content',
      emoji: '🎨',
      example: 'Stop-motion, cartoon styles'
    }
  ]
  
  // Check if we're using Veo 3.1 (all modes now use Veo)
  const isUsingVeo = selectedModel === 'veo3.1_fast'

  // Live voice recording functions
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100
        }
      })
      
      // Try different mime types based on browser support
      let mimeType = 'audio/webm;codecs=opus'
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'audio/webm'
      }
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'audio/ogg;codecs=opus'
      }
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = '' // Let browser choose
      }
      
      console.log('Using MIME type:', mimeType || 'browser default')
      
      const options = mimeType ? { mimeType } : {}
      const recorder = new MediaRecorder(stream, options)
      const chunks: Blob[] = []

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunks.push(e.data)
          console.log('Audio chunk received:', e.data.size, 'bytes')
        }
      }

      recorder.onstop = () => {
        console.log('Recording stopped, total chunks:', chunks.length)
        if (chunks.length === 0) {
          console.error('No audio data was recorded!')
          showToast('Recording failed - no audio data captured. Please try again.', 'error')
          return
        }
        
        const blob = new Blob(chunks, { type: recorder.mimeType })
        console.log('Final blob size:', blob.size, 'bytes', 'Type:', recorder.mimeType)
        
        if (blob.size === 0) {
          console.error('Recorded blob is empty!')
          showToast('Recording failed - empty audio file. Please try again.', 'error')
          return
        }
        
        const url = URL.createObjectURL(blob)
        setVoiceoverUrl(url)
        
        // Convert blob to file
        const extension = recorder.mimeType.includes('webm') ? 'webm' : 
                         recorder.mimeType.includes('ogg') ? 'ogg' : 'audio'
        const file = new File([blob], `recorded-audio.${extension}`, { type: recorder.mimeType })
        setVoiceoverFile(file)
        
        console.log('Audio file created:', file.name, file.size, 'bytes')
        
        // Stop all tracks
        stream.getTracks().forEach(track => track.stop())
      }

      // Start recording with timeslice to ensure data is captured
      recorder.start(100) // Collect data every 100ms
      setMediaRecorder(recorder)
      setIsRecording(true)
      setRecordingTime(0)
      setRecordedChunks([])

      // Start timer (max 60 seconds)
      const interval = setInterval(() => {
        setRecordingTime(prev => {
          const newTime = prev + 1
          if (newTime >= 60) {
            stopRecording()
            clearInterval(interval)
          }
          return newTime
        })
      }, 1000)

    } catch (error) {
      console.error('Failed to start recording:', error)
      showToast('Could not access microphone. Please check permissions.', 'error')
    }
  }

  const stopRecording = () => {
    if (mediaRecorder && isRecording) {
      mediaRecorder.stop()
      setIsRecording(false)
      setMediaRecorder(null)
    }
  }

  const formatRecordingTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  // Calculate credit cost based on new pricing structure
  const calculateCreditCost = () => {
    const duration = parseInt(selectedDuration)
    return currentPricing.creditsPerSecond * duration
  }

  // Get number of clips needed for the duration
  // When enhancing prompts, splits longer videos into 8-second clips
  // When generating from a single prompt (not enhanced), creates one clip with full duration
  const getClipCount = () => {
    if (isUsingVeo) {
      // If script sections exist (enhanced/multi-scene), use their count
      // Otherwise, use 1 clip with full duration for simple prompts
      if (scriptSections.length > 0) {
        return scriptSections.length
      }
      return 1 // Single clip with full selected duration (8/16/24/32s)
    }
    return 1
  }

  // Calculate clip count for enhancement (always splits into 8-second clips)
  // Cap at 3 clips maximum for better cohesion
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

  // Get effective duration for display
  const getEffectiveDuration = () => {
    return parseInt(selectedDuration)
  }

  const styles = [
    { id: 'cinematic', name: 'Cinematic', emoji: '🎬', description: 'Movie-like quality' },
    { id: 'animated', name: 'Animated', emoji: '🎨', description: 'Cartoon style' },
    { id: 'minimal', name: 'Minimal', emoji: '⚪', description: 'Clean & simple' },
    { id: 'vibrant', name: 'Vibrant', emoji: '🌈', description: 'Bold & colorful' },
    { id: 'retro', name: 'Retro', emoji: '📼', description: 'Vintage vibes' },
    { id: 'modern', name: 'Modern', emoji: '✨', description: 'Sleek & trendy' },
  ]

  const aspectRatios = [
    { id: '9:16', label: '9:16', description: 'Instagram Reels/Stories' },
    { id: '1:1', label: '1:1', description: 'Square Posts' },
    { id: '16:9', label: '16:9', description: 'YouTube/Landscape' },
    { id: '4:5', label: '4:5', description: 'Feed Posts' },
  ]

  const qualities = [
    { id: 'standard', label: 'Standard', description: '720p' },
    { id: 'high', label: 'High', description: '1080p' },
    { id: 'ultra', label: 'Ultra', description: '4K' },
  ]

  const transitions = [
    { id: 'smooth', label: 'Smooth', emoji: '🌊' },
    { id: 'quick', label: 'Quick Cuts', emoji: '⚡' },
    { id: 'fade', label: 'Fade', emoji: '🌅' },
    { id: 'zoom', label: 'Zoom', emoji: '🔍' },
  ]

  const cameraMovements = [
    { id: 'static', label: 'Static', emoji: '📸' },
    { id: 'dynamic', label: 'Dynamic', emoji: '🎥' },
    { id: 'cinematic', label: 'Cinematic', emoji: '🎬' },
    { id: 'handheld', label: 'Handheld', emoji: '🤳' },
  ]

  const promptTemplates = [
    { 
      title: 'Product Showcase',
      prompt: 'Modern product reveal with dynamic camera movements, showcasing features with smooth transitions and professional lighting',
      emoji: '📦'
    },
    { 
      title: 'Travel Vlog',
      prompt: 'Cinematic travel montage with stunning landscapes, local culture, and vibrant colors with upbeat background music',
      emoji: '✈️'
    },
    { 
      title: 'Food Recipe',
      prompt: 'Step-by-step cooking process with close-up shots, ingredients being added, and final plated dish with appetizing presentation',
      emoji: '🍳'
    },
    { 
      title: 'Tech Review',
      prompt: 'Professional tech product unboxing and review with detailed features, specifications, and hands-on demonstration',
      emoji: '💻'
    },
  ]

  const durations = [
    { id: '8', label: '8 seconds', scripts: 1 },
    { id: '16', label: '16 seconds', scripts: 2 },
    { id: '24', label: '24 seconds', scripts: 3 },
    { id: '32', label: '32 seconds', scripts: 4 },
  ]

  // Script sections for multi-part videos
  const [scriptSections, setScriptSections] = useState<string[]>([])

  const recentGenerations = [
    { 
      id: 1, 
      thumbnail: '🌅', 
      prompt: 'A serene sunset over the ocean', 
      status: 'completed',
      duration: '15s',
      createdAt: '2 hours ago'
    },
    { 
      id: 2, 
      thumbnail: '⏳', 
      prompt: 'Modern tech startup office tour', 
      status: 'generating',
      duration: '30s',
      createdAt: 'Just now'
    },
    { 
      id: 3, 
      thumbnail: '🎨', 
      prompt: 'Abstract art animation', 
      status: 'completed',
      duration: '15s',
      createdAt: '1 day ago'
    },
  ]

  // Handle file uploads
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setReferenceImage(file)
      setReferenceImageUrl(URL.createObjectURL(file))
    }
  }

  const handleVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setSourceVideo(file)
      setSourceVideoUrl(URL.createObjectURL(file))
    }
  }

  // Enhance prompt with Gemini AI - generates clips for Veo 3.1
  const handleEnhancePrompt = async () => {
    if (!prompt.trim()) return

    const clipCount = getClipCountForEnhancement() // Use enhancement clip count (splits into 8s clips)
    
    setIsEnhancing(true)
    setScriptSections([]) // Reset previous clips
    try {
      const response = await fetch('/api/gemini/enhance-prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: prompt.trim(),
          customInstructions: customEnhanceInstructions.trim() || undefined,
          settings: {
            style: selectedStyle,
            duration: parseInt(selectedDuration),
            clipCount: clipCount,
            isVeo: selectedModel === 'veo3.1_fast',
            videoStyle: veoVideoStyle,
            noCaptions: noCaptions // Don't add text/captions to video
          }
        })
      })

      const data = await response.json()
      
      if (data.success) {
        setEnhancedScript(data.enhancedScript)
        const maxClips = clipCount // Use the clip count we requested
        console.log('📝 Enhancement response:', { 
          hasClips: !!data.clips, 
          clipCount: data.clips?.length || 0,
          maxClips: maxClips,
          scriptLength: data.enhancedScript?.length || 0
        })
        
        // Parse clips from the enhanced script if available
        if (data.clips && Array.isArray(data.clips) && data.clips.length > 0) {
          // Limit to requested clip count
          const limitedClips = data.clips.slice(0, maxClips)
          console.log(`✅ Using clips from API: ${data.clips.length} (limited to ${limitedClips.length})`)
          limitedClips.forEach((clip: string, i: number) => {
            console.log(`  Clip ${i + 1}: ${clip.length} chars - ${clip.substring(0, 50)}...`)
          })
          setScriptSections(limitedClips)
        } else {
          // Parse clips from enhancedScript format "Clip 1: ...\nClip 2: ..."
          console.log('🔍 Parsing clips from enhanced script text...')
          const clips = parseClipsFromScript(data.enhancedScript)
          console.log(`✅ Parsed ${clips.length} clips from script`)
          clips.forEach((clip: string, i: number) => {
            console.log(`  Clip ${i + 1}: ${clip.length} chars - ${clip.substring(0, 50)}...`)
          })
          setScriptSections(clips)
        }
        setShowEnhancedScript(true)
        showToast('Prompt enhanced successfully!', 'success')
      } else {
        showToast('Failed to enhance prompt: ' + data.error, 'error')
      }
    } catch (error) {
      console.error('Enhancement error:', error)
      showToast('Failed to enhance prompt. Please try again.', 'error')
    } finally {
      setIsEnhancing(false)
    }
  }

  // Parse clips from enhanced script text
  const parseClipsFromScript = (script: string): string[] => {
    if (!script || script.trim().length === 0) {
      return []
    }
    
    // Get max clips allowed (capped at 3 for better cohesion)
    const maxClips = getClipCountForEnhancement()
    
    // Try primary regex pattern
    const clipRegex = /Clip\s*\d+\s*[:\-]\s*([\s\S]*?)(?=(?:Clip\s*\d+|$))/gi
    const matches = [...script.matchAll(clipRegex)]
    
    if (matches.length > 0) {
      const clips = matches.map(m => m[1].trim()).filter(clip => clip.length > 0)
      console.log(`Parsed ${clips.length} clips from script, limiting to ${maxClips}`)
      
      // Validate clips aren't empty and limit to maxClips
      const validClips = clips.filter(clip => clip.length > 20).slice(0, maxClips)
      if (validClips.length > 0) {
        return validClips
      }
    }
    
    // Fallback: Split by double newlines or numbered sections
    const paragraphs = script.split(/\n{2,}/).filter(p => p.trim().length > 20)
    if (paragraphs.length > 1) {
      console.log(`Fallback: Split script into ${paragraphs.length} paragraphs, limiting to ${maxClips}`)
      return paragraphs.slice(0, maxClips)
    }
    
    // If no clip format found, return the whole script as single clip
    return [script.trim()]
  }

  // Copy enhanced script
  const handleCopyScript = () => {
    navigator.clipboard.writeText(enhancedScript)
    setIsCopied(true)
    setTimeout(() => setIsCopied(false), 2000)
  }

  // Generate video
  const handleGenerateVideo = async () => {
    // Validation based on input type
    if (videoInputType === 'image-to-video') {
      if (!referenceImage) {
        showToast('Image to Video requires a reference image. Please upload an image.', 'warning')
        return
      }
    } else if (videoInputType === 'text-to-video') {
      if (!prompt.trim()) {
        showToast('Text to Video requires a text prompt. Please enter a description.', 'warning')
        return
      }
    }

    // Check credits
    const creditCost = calculateCreditCost()
    if (credits.remaining_credits < creditCost) {
      showToast(`Insufficient credits! You need ${creditCost} credits but only have ${credits.remaining_credits}.`, 'error')
      return
    }

    setIsGenerating(true)
    setGenerationProgress(0)
    setGenerationStatus('Generating video...')

    try {
      // All modes now use Gemini Veo 3.1 Fast
      await handleVeo31Generation()

    } catch (error) {
      console.error('Generation error:', error)
      showToast('Failed to generate video: ' + (error instanceof Error ? error.message : 'Unknown error'), 'error')
      setGenerationStatus('Failed')
      setIsGenerating(false)
    }
  }

  // Handle Veo 3.1 generation with Gemini API - Multi-clip workflow
  const handleVeo31Generation = async () => {
    setGenerationProgress(10)
    setGenerationStatus('Starting Veo 3.1 generation...')

    const numSegments = scriptSections.length || 1
    const totalDuration = parseInt(selectedDuration)

    // Initialize clips array for multi-clip workflow
    const initialClips = (scriptSections.length > 0 ? scriptSections : [enhancedScript || prompt]).map((clipPrompt, index) => ({
      index,
      videoUrl: '',
      prompt: clipPrompt,
      status: 'generating' as const,
      operationName: ''
    }))
    setGeneratedClips(initialClips)
    setClipGenerationPhase('generating')

    // Convert reference image to base64 if available (for Image-to-Video mode)
    let sourceImageBase64 = ''
    if (videoInputType === 'image-to-video' && referenceImage) {
      sourceImageBase64 = await fileToBase64(referenceImage)
      console.log(`Image-to-video: Converted image to base64, length: ${sourceImageBase64.length}`)
      setGenerationProgress(15)
      setGenerationStatus('Uploading image...')
    } else if (videoInputType === 'image-to-video' && !referenceImage) {
      console.warn('Image-to-video mode selected but no image uploaded!')
    }

    console.log(`Starting generation with ${scriptSections.length || 1} clips, inputType: ${videoInputType}, imageUsageMode: ${imageUsageMode}, hasImage: ${!!sourceImageBase64}, audioCategory: ${audioCategory}, customVoice: ${enableVoiceCloning}`)

    // Determine audio settings
    let audioUrlToSync = undefined
    
    // If custom voice is enabled and audio is generated (for without-audio mode)
    // We'll sync the audio after video generation
    if (enableVoiceCloning && clonedAudioUrl && audioCategory === 'without-audio') {
      audioUrlToSync = clonedAudioUrl
      console.log('🎤 Custom voice audio ready - will sync after video generation')
    }
    
    // Start video generation
    // For without-audio: generate silent video, then sync custom audio if provided
    // For with-audio: Gemini generates video with native audio
    const response = await fetch('/api/gemini/generate-video', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: enhancedScript || prompt,
        scriptSections: scriptSections.length > 0 ? scriptSections : undefined,
        videoStyle: veoVideoStyle,
        aspectRatio: aspectRatio,
        duration: totalDuration,
        sourceImage: sourceImageBase64 || undefined,
        inputType: videoInputType,
        imageUsageMode: imageUsageMode, // 'reference' = style guide, 'animate' = put image in video
        withAudio: audioCategory === 'with-audio', // Whether to include native audio
        customAudioUrl: undefined // Don't pass here - we'll sync after generation for without-audio mode
      })
    })

    const data = await response.json()

    if (!data.success) {
      setClipGenerationPhase('idle')
      throw new Error(data.error || 'Failed to start video generation')
    }

    setGenerationProgress(20)
    setGenerationStatus(numSegments > 1 
      ? `Generating ${numSegments} video clips...`
      : 'Processing with Veo 3.1...')

    // Update credits immediately
    if (data.remainingCredits !== undefined) {
      setCredits(prev => ({
        ...prev,
        remaining_credits: data.remainingCredits,
        used_credits: prev.total_credits - data.remainingCredits
      }))
    }

    // Check if videos are already complete (sequential generation with frame extraction)
    if (data.allComplete && data.videoUrls && data.videoUrls.length > 0) {
      console.log('Videos already complete from sequential generation!')
      
      // Update all clips with their video URLs
      setGeneratedClips(prev => prev.map((clip, idx) => ({
        ...clip,
        status: data.videoUrls[idx] ? 'complete' as const : 'failed' as const,
        videoUrl: data.videoUrls[idx] || ''
      })))
      
      setGenerationProgress(100)
      setGenerationStatus('Clips ready for review')
      setClipGenerationPhase('preview') // Show preview phase with edit options
      setIsGenerating(false)
      
      showAndSaveToast('Clips Generated', `${data.videoUrls.length} clips generated with smooth transitions! Review and edit before combining.`, 'success', '/dashboard/ai-video')
      return
    }

    // Poll for completion - handle multiple operations
    const operationNames = data.operationNames || [data.operationName]
    
    // Update clips with operation names
    setGeneratedClips(prev => prev.map((clip, idx) => ({
      ...clip,
      operationName: operationNames[idx] || ''
    })))

    let attempts = 0
    const maxAttempts = 90 // 7.5 minutes max for multi-segment videos

    const pollVeoStatus = async () => {
      while (attempts < maxAttempts) {
        attempts++
        await new Promise(resolve => setTimeout(resolve, 5000)) // Wait 5 seconds

        // Build query params for multiple operations
        const queryParam = operationNames.length > 1
          ? `operationNames=${encodeURIComponent(JSON.stringify(operationNames))}`
          : `operationName=${encodeURIComponent(operationNames[0])}`

        const statusResponse = await fetch(`/api/gemini/check-video-status?${queryParam}`)
        const statusData = await statusResponse.json()

        if (statusData.status === 'complete') {
          // Multi-clip workflow: Show clips for editing BEFORE combining
          if (statusData.needsCombining && statusData.videoUrls && statusData.videoUrls.length > 1) {
            // Update all clips with their video URLs
            setGeneratedClips(prev => prev.map((clip, idx) => ({
              ...clip,
              status: statusData.videoUrls[idx] ? 'complete' as const : 'failed' as const,
              videoUrl: statusData.videoUrls[idx] || ''
            })))
            
            setGenerationProgress(100)
            setGenerationStatus('Clips ready for review')
            setClipGenerationPhase('preview') // Show preview phase with edit options
            setIsGenerating(false)
            
            showAndSaveToast('Clips Generated', `${statusData.videoUrls.length} clips generated! Review and edit before combining.`, 'success', '/dashboard/ai-video')
            return
          } else {
            // Single clip - go directly to complete
            let finalVideoUrl = statusData.videoUrl || statusData.videoUrls?.[0]
            
            if (finalVideoUrl) {
              // If custom voice is enabled for without-audio mode, sync the audio now
              if (enableVoiceCloning && clonedAudioUrl && audioCategory === 'without-audio') {
                console.log('🎤 Syncing custom voice audio with generated video...')
                setGenerationStatus('Syncing your voice with video...')
                
                try {
                  const syncResponse = await fetch('/api/video/sync-audio', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      videoUrl: finalVideoUrl,
                      customAudioUrl: clonedAudioUrl,
                      enableLipSync: false
                    })
                  })
                  
                  const syncData = await syncResponse.json()
                  
                  if (syncData.success && syncData.videoUrl) {
                    finalVideoUrl = syncData.videoUrl
                    console.log('✅ Custom voice synced successfully!')
                    showToast('Your voice has been added to the video!', 'success')
                  } else {
                    console.warn('⚠️ Audio sync failed:', syncData.error)
                    showToast('Video generated but voice sync failed. Using silent video.', 'warning')
                  }
                } catch (syncError) {
                  console.error('Audio sync error:', syncError)
                  showToast('Video generated but voice sync failed. Using silent video.', 'warning')
                }
              }
              
              setGeneratedClips([{
                index: 0,
                videoUrl: finalVideoUrl,
                prompt: enhancedScript || prompt,
                status: 'complete'
              }])
              setGeneratedVideoUrl(finalVideoUrl)
              setClipGenerationPhase('complete')
              
              // Save to drafts only (user can manually save to My Media)
              await saveToDraftsWithData(finalVideoUrl, prompt, enhancedScript)
              
              // Clear prompts
              setPrompt('')
              setEnhancedScript('')
              setScriptSections([])
              setShowEnhancedScript(false)
            }
          }
          
          setGenerationProgress(100)
          setGenerationStatus('complete')
          setIsGenerating(false)
          
          showAndSaveToast('Video Generated', `Video generated successfully! ${totalDuration} seconds of content.`, 'success', '/dashboard/my-media')
          return
        } else if (statusData.status === 'failed') {
          setClipGenerationPhase('idle')
          throw new Error(statusData.error || 'Video generation failed')
        } else {
          // Still processing - update individual clip statuses
          const baseProgress = 20
          const progressRange = 70 // Progress from 20 to 90
          const completedSegments = statusData.completedSegments || 0
          const totalSegments = statusData.totalSegments || numSegments
          
          // Update clips that are complete
          if (completedSegments > 0) {
            setGeneratedClips(prev => prev.map((clip, idx) => ({
              ...clip,
              status: idx < completedSegments ? 'complete' as const : 'generating' as const
            })))
          }
          
          const segmentProgress = completedSegments 
            ? (completedSegments / totalSegments) * progressRange
            : (attempts / maxAttempts) * progressRange
          const progress = Math.min(baseProgress + segmentProgress, 90)
          
          setGenerationProgress(Math.round(progress))
          setGenerationStatus(statusData.message || `Generating clips... ${completedSegments}/${totalSegments}`)
        }
      }

      setClipGenerationPhase('idle')
      throw new Error('Video generation timed out')
    }

    await pollVeoStatus()
  }

  // Helper function to convert file to base64
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.readAsDataURL(file)
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = error => reject(error)
    })
  }
  
  // Handle voice cloning (text-to-speech or speech-to-speech)
  const handleVoiceCloning = async () => {
    // For AI Voice TTS mode
    if (!useOwnVoice && voiceCloneMode === 'text-to-speech' && !voiceCloneText.trim()) {
      showToast('Please enter the text you want to say', 'warning')
      return
    }
    
    // Own Voice requires voice clone to be confirmed first
    if (useOwnVoice && !voiceCloneConfirmed) {
      showToast('Please test and confirm your voice clone first', 'warning')
      return
    }

    // Own Voice also requires text for voice cloning TTS
    if (useOwnVoice && !voiceCloneText.trim()) {
      showToast('Please enter the text you want to say in your cloned voice', 'warning')
      return
    }
    
    if (!useOwnVoice && voiceCloneMode === 'speech-to-speech' && !sourceAudioForCloningUrl) {
      showToast('Please upload audio first', 'warning')
      return
    }
    
    setIsGeneratingVoice(true)
    
    try {
      const formData = new FormData()
      
      // For Own Voice: voice-clone-tts mode (voice sample + text)
      if (useOwnVoice) {
        formData.append('mode', 'voice-clone-tts')
        formData.append('useOwnVoice', 'true')
        formData.append('sourceAudioUrl', sourceAudioForCloningUrl)
        formData.append('text', voiceCloneText)
      } else {
        // AI Voice modes
        formData.append('mode', voiceCloneMode)
        formData.append('voicePreset', selectedVoicePreset)
        formData.append('useOwnVoice', 'false')
        
        if (voiceCloneMode === 'text-to-speech') {
          formData.append('text', voiceCloneText)
        } else {
          formData.append('sourceAudioUrl', sourceAudioForCloningUrl)
        }
      }
      
      const response = await fetch('/api/voice/clone', {
        method: 'POST',
        body: formData
      })
      
      const data = await response.json()
      
      if (data.success) {
        setClonedAudioUrl(data.audioUrl)
        const voiceMessage = useOwnVoice 
          ? '🎉 Voiceover generated in YOUR cloned voice!' 
          : `Voice generated successfully with ${selectedVoicePreset} voice!`
        showToast(voiceMessage, 'success')
      } else {
        throw new Error(data.error || 'Failed to generate voice')
      }
    } catch (error) {
      console.error('Voice cloning error:', error)
      showToast('Failed to generate voice: ' + (error instanceof Error ? error.message : 'Unknown error'), 'error')
    } finally {
      setIsGeneratingVoice(false)
    }
  }
  
  // Handle source audio upload for speech-to-speech
  const handleSourceAudioUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    console.log('📁 File selected:', file?.name, file?.type, file?.size)
    
    if (file) {
      // Check file type - allow audio files and mp4 (can contain audio)
      const isAudioFile = file.type.startsWith('audio/') || 
                          file.type === 'video/mp4' || 
                          file.name.match(/\.(mp3|wav|webm|ogg|m4a|aac|mp4)$/i)
      if (!isAudioFile) {
        showToast('Please upload an audio file (MP3, WAV, WebM, MP4, etc.)', 'error')
        return
      }
      
      // Check file size (50MB max)
      if (file.size > 50 * 1024 * 1024) {
        showToast('Audio file too large. Max size: 50MB', 'error')
        return
      }
      
      setSourceAudioForCloning(file)
      // Create a temporary URL for preview
      const tempUrl = URL.createObjectURL(file)
      setSourceAudioForCloningUrl(tempUrl)
      showToast('Uploading audio...', 'success')
      
      // Upload to get a public URL for the API
      try {
        const formData = new FormData()
        formData.append('file', file)
        formData.append('folder', 'audio')
        
        console.log('📤 Uploading to /api/upload...')
        const response = await fetch('/api/upload', {
          method: 'POST',
          body: formData
        })
        
        console.log('📥 Upload response status:', response.status)
        const data = await response.json()
        console.log('📥 Upload response data:', data)
        
        if (!response.ok || !data.success) {
          throw new Error(data.error || data.details || 'Upload failed')
        }
        
        if (data.url) {
          setSourceAudioForCloningUrl(data.url)
          showToast('✅ Audio uploaded successfully!', 'success')
          // Move to test step if using Own Voice
          if (useOwnVoice) {
            setTimeout(() => setVoiceCloneStep('test'), 300)
          }
        }
      } catch (error) {
        console.error('❌ Failed to upload audio:', error)
        showToast('Failed to upload audio: ' + (error instanceof Error ? error.message : 'Unknown error'), 'error')
        // Keep the temp URL for preview but warn user
        setSourceAudioForCloningUrl(tempUrl)
      }
    }
  }

  // Voice recording handlers
  const startVoiceRecording = async (type: 'voice' | 'source') => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream)
      const chunks: BlobPart[] = []

      recorder.ondataavailable = (e) => chunks.push(e.data)
      recorder.onstop = async () => {
        const blob = new Blob(chunks, { type: 'audio/webm' })
        const file = new File([blob], `recording-${Date.now()}.webm`, { type: 'audio/webm' })
        const tempUrl = URL.createObjectURL(blob)

        if (type === 'source') {
          setSourceAudioForCloning(file)
          setSourceAudioForCloningUrl(tempUrl)
          setIsRecordingSource(false)
          showToast('Recording saved! Uploading...', 'success')
          
          // Upload to get a public URL for the API
          try {
            const formData = new FormData()
            formData.append('file', file)
            formData.append('folder', 'audio')
            
            const response = await fetch('/api/upload', {
              method: 'POST',
              body: formData
            })
            
            const data = await response.json()
            
            if (!response.ok || !data.success) {
              throw new Error(data.error || 'Upload failed')
            }
            
            if (data.url) {
              setSourceAudioForCloningUrl(data.url)
              showToast('✅ Voice recording uploaded!', 'success')
              // Move to test step if using Own Voice
              if (useOwnVoice) {
                setTimeout(() => setVoiceCloneStep('test'), 300)
              }
            }
          } catch (error) {
            console.error('Failed to upload audio:', error)
            showToast('Failed to upload recording: ' + (error instanceof Error ? error.message : 'Unknown error'), 'error')
          }
        }

        // Stop all tracks
        stream.getTracks().forEach(track => track.stop())
        setVoiceRecorder(null)
        setRecordingType(null)
      }

      recorder.start()
      setVoiceRecorder(recorder)
      setRecordingType(type)
      
      if (type === 'voice') {
        setIsRecordingVoice(true)
      } else {
        setIsRecordingSource(true)
      }
      
      showToast(`Recording ${type === 'voice' ? 'voice sample' : 'source audio'}...`, 'success')
    } catch (error) {
      console.error('Failed to start recording:', error)
      showToast('Failed to access microphone. Please grant permission.', 'error')
    }
  }

  const stopVoiceRecording = () => {
    if (voiceRecorder && voiceRecorder.state !== 'inactive') {
      voiceRecorder.stop()
      showToast('Recording stopped', 'success')
    }
  }

  // Poll generation status
  const pollGenerationStatus = async (jobId: string) => {
    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(`/api/veo/check-status?jobId=${jobId}`)
        const data = await response.json()

        if (data.success) {
          setGenerationStatus(data.status)
          setGenerationProgress(data.progress)

          if (data.status === 'complete') {
            clearInterval(pollInterval)
            setGeneratedVideoUrl(data.videoUrl)
            setIsGenerating(false)
            
            // Store prompts before clearing for later save
            setLastGeneratedPrompt(prompt)
            setLastGeneratedEnhancedScript(enhancedScript)
            
            // Clear prompts after successful generation
            setPrompt('')
            setEnhancedScript('')
            setShowEnhancedScript(false)
            
            // Auto-save to drafts only (user can manually save to My Media)
            await saveToDrafts(data.videoUrl)
          } else if (data.status === 'failed') {
            clearInterval(pollInterval)
            setIsGenerating(false)
            showToast('Video generation failed. Please try again.', 'error')
          }
        }
      } catch (error) {
        console.error('Status check error:', error)
      }
    }, 2000) // Check every 2 seconds
  }

  // ============== MULTI-CLIP WORKFLOW FUNCTIONS ==============

  // Open clip editor modal
  const openClipEditor = (clipIndex: number) => {
    const clip = generatedClips[clipIndex]
    if (clip) {
      setEditingClipIndex(clipIndex)
      setEditingClipPrompt(clip.prompt)
      setShowClipEditor(true)
    }
  }

  // Close clip editor modal
  const closeClipEditor = () => {
    setShowClipEditor(false)
    setEditingClipIndex(null)
    setEditingClipPrompt('')
    setIsEnhancingClipPrompt(false)
  }

  // Enhance clip prompt with AI
  const handleEnhanceClipPrompt = async () => {
    if (!editingClipPrompt.trim()) return

    setIsEnhancingClipPrompt(true)
    try {
      const response = await fetch('/api/gemini/enhance-prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: editingClipPrompt.trim(),
          settings: {
            style: selectedStyle,
            duration: 8, // Single clip is 8 seconds
            clipCount: 1,
            isVeo: true,
            videoStyle: veoVideoStyle,
            noCaptions: noCaptions // Don't add text/captions to video
          }
        })
      })

      const data = await response.json()
      
      if (data.success) {
        // Get the single enhanced clip
        const enhancedText = data.clips?.[0] || data.enhancedScript || editingClipPrompt
        setEditingClipPrompt(enhancedText)
        showToast('Clip prompt enhanced!', 'success')
      } else {
        showToast('Failed to enhance prompt: ' + data.error, 'error')
      }
    } catch (error) {
      console.error('Enhancement error:', error)
      showToast('Failed to enhance prompt. Please try again.', 'error')
    } finally {
      setIsEnhancingClipPrompt(false)
    }
  }

  // Regenerate a single clip with new prompt
  const handleRegenerateClip = async () => {
    if (editingClipIndex === null || !editingClipPrompt.trim()) return

    // Check credits (120 credits for 8-second clip)
    const clipCreditCost = 15 * 8
    if (credits.remaining_credits < clipCreditCost) {
      showToast(`Insufficient credits! Need ${clipCreditCost} credits.`, 'error')
      return
    }

    // Update clip status to editing
    setGeneratedClips(prev => prev.map((clip, idx) => 
      idx === editingClipIndex ? { ...clip, status: 'generating' as const, prompt: editingClipPrompt } : clip
    ))

    closeClipEditor()

    try {
      const response = await fetch('/api/gemini/regenerate-clip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: editingClipPrompt,
          clipIndex: editingClipIndex,
          videoStyle: veoVideoStyle,
          aspectRatio: aspectRatio,
          inputType: videoInputType
        })
      })

      const data = await response.json()

      if (!data.success) {
        throw new Error(data.error || 'Failed to start clip regeneration')
      }

      // Update credits
      if (data.remainingCredits !== undefined) {
        setCredits(prev => ({
          ...prev,
          remaining_credits: data.remainingCredits,
          used_credits: prev.total_credits - data.remainingCredits
        }))
      }

      // Poll for this specific clip's completion
      await pollSingleClipStatus(data.operationName, editingClipIndex!)

    } catch (error) {
      console.error('Clip regeneration error:', error)
      setGeneratedClips(prev => prev.map((clip, idx) => 
        idx === editingClipIndex ? { ...clip, status: 'failed' as const } : clip
      ))
      showToast('Failed to regenerate clip: ' + (error instanceof Error ? error.message : 'Unknown error'), 'error')
    }
  }

  // Poll for single clip regeneration status
  const pollSingleClipStatus = async (operationName: string, clipIndex: number) => {
    let attempts = 0
    const maxAttempts = 60 // 5 minutes max

    while (attempts < maxAttempts) {
      attempts++
      await new Promise(resolve => setTimeout(resolve, 5000))

      try {
        const statusResponse = await fetch(
          `/api/gemini/check-clip-status?operationName=${encodeURIComponent(operationName)}&clipIndex=${clipIndex}`
        )
        const statusData = await statusResponse.json()

        if (statusData.status === 'complete' && statusData.videoUrl) {
          // Update the clip with new video
          setGeneratedClips(prev => prev.map((clip, idx) => 
            idx === clipIndex ? { 
              ...clip, 
              status: 'complete' as const, 
              videoUrl: statusData.videoUrl 
            } : clip
          ))
          showToast(`Clip ${clipIndex + 1} regenerated successfully!`, 'success')
          return
        } else if (statusData.status === 'failed') {
          throw new Error(statusData.error || 'Clip generation failed')
        }
        // Continue polling...
      } catch (error) {
        console.error('Clip status check error:', error)
      }
    }

    // Timeout
    setGeneratedClips(prev => prev.map((clip, idx) => 
      idx === clipIndex ? { ...clip, status: 'failed' as const } : clip
    ))
    showToast('Clip regeneration timed out', 'error')
  }

  // Combine all clips into final video
  const handleCombineClips = async () => {
    const completeClips = generatedClips.filter(c => c.status === 'complete' && c.videoUrl)
    
    if (completeClips.length === 0) {
      showToast('No clips available to combine', 'error')
      return
    }

    if (completeClips.length < generatedClips.length) {
      const incomplete = generatedClips.length - completeClips.length
      showToast(`${incomplete} clip(s) are still processing or failed. Continuing with available clips.`, 'warning')
    }

    setIsCombiningClips(true)
    setClipGenerationPhase('combining')

    try {
      // Sort clips by index to maintain order
      const sortedClips = [...completeClips].sort((a, b) => a.index - b.index)
      const videoUrls = sortedClips.map(c => c.videoUrl)
      
      // Store values before any clearing
      const currentPrompt = prompt
      const currentEnhancedScript = enhancedScript
      const totalDuration = sortedClips.length * 8

      const response = await fetch('/api/video/combine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videoUrls,
          prompt: currentPrompt,
          enhancedPrompt: currentEnhancedScript,
          model: 'veo-3.1-fast',
          saveToMedia: true
        })
      })

      const data = await response.json()

      if (data.success && data.videoUrl) {
        console.log('=== COMBINE SUCCESS ===')
        console.log('Combined video URL:', data.videoUrl)
        console.log('Total duration:', data.totalDuration || totalDuration)
        
        // Store the URL in a variable to ensure it's not lost
        let finalCombinedVideoUrl = data.videoUrl
        
        // If custom voice is enabled for without-audio mode, sync the audio now
        if (enableVoiceCloning && clonedAudioUrl && audioCategory === 'without-audio') {
          console.log('🎤 Syncing custom voice audio with combined video...')
          setGenerationStatus('Syncing your voice with combined video...')
          
          try {
            const syncResponse = await fetch('/api/video/sync-audio', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                videoUrl: finalCombinedVideoUrl,
                customAudioUrl: clonedAudioUrl,
                enableLipSync: false
              })
            })
            
            const syncData = await syncResponse.json()
            
            if (syncData.success && syncData.videoUrl) {
              finalCombinedVideoUrl = syncData.videoUrl
              console.log('✅ Custom voice synced with combined video!')
              showToast('Your voice has been added to the combined video!', 'success')
            } else {
              console.warn('⚠️ Audio sync failed:', syncData.error)
              showToast('Video combined but voice sync failed. Using silent video.', 'warning')
            }
          } catch (syncError) {
            console.error('Audio sync error:', syncError)
            showToast('Video combined but voice sync failed. Using silent video.', 'warning')
          }
        }
        
        // Set the video URL FIRST
        setGeneratedVideoUrl(finalCombinedVideoUrl)
        console.log('Set generatedVideoUrl to:', finalCombinedVideoUrl)
        
        // Then change phase to complete
        setClipGenerationPhase('complete')
        console.log('Set clipGenerationPhase to: complete')
        
        // Clear clips array but keep the video
        setGeneratedClips([])
        
        // Show success toast immediately
        showToast(`Video combined successfully! ${data.totalDuration || totalDuration} seconds. Check below!`, 'success')
        
        // Save to drafts only (user can manually save to My Media)
        saveToDraftsWithData(finalCombinedVideoUrl, currentPrompt, currentEnhancedScript)
          .then(() => console.log('Saved to drafts'))
          .catch(err => console.error('Save error:', err))
        
      } else {
        throw new Error(data.error || 'Failed to combine videos - no URL returned')
      }
    } catch (error) {
      console.error('Combine error:', error)
      // Go back to preview phase on error so user can try again
      setClipGenerationPhase('preview')
      showToast('Failed to combine clips: ' + (error instanceof Error ? error.message : 'Unknown error'), 'error')
    } finally {
      setIsCombiningClips(false)
    }
  }

  // Reset clip workflow to start fresh
  const resetClipWorkflow = () => {
    setGeneratedClips([])
    setClipGenerationPhase('idle')
    setGeneratedVideoUrl('')
    setShowClipEditor(false)
    setEditingClipIndex(null)
    setEditingClipPrompt('')
  }

  // ============== END MULTI-CLIP WORKFLOW FUNCTIONS ==============

  // Save video to drafts with explicit prompt data (used by Veo flow)
  const saveToDraftsWithData = async (videoUrl: string, originalPrompt: string, script: string) => {
    try {
      if (!originalPrompt && !script) {
        console.log('No prompt data to save')
        return
      }
      
      const response = await fetch('/api/drafts/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          originalPrompt: originalPrompt || 'AI Generated Video',
          enhancedScript: script || originalPrompt || 'AI Generated Video',
          videoUrl,
          settings: {
            style: selectedStyle,
            duration: parseInt(selectedDuration),
            aspectRatio,
            quality: videoQuality,
            transition,
            backgroundMusic,
            cameraMovement
          }
        })
      })

      const data = await response.json()
      if (data.success) {
        console.log('Video saved to drafts:', data.draftId)
      } else {
        console.error('Failed to save draft:', data.error || data.message)
      }
    } catch (error) {
      console.error('Failed to save to drafts:', error)
    }
  }

  // Save video to drafts (uses current state)
  const saveToDrafts = async (videoUrl: string) => {
    try {
      const currentPrompt = prompt || 'AI Generated Video'
      const currentScript = enhancedScript || prompt || 'AI Generated Video'
      
      const response = await fetch('/api/drafts/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          originalPrompt: currentPrompt,
          enhancedScript: currentScript,
          videoUrl,
          settings: {
            style: selectedStyle,
            duration: parseInt(selectedDuration),
            aspectRatio,
            quality: videoQuality,
            transition,
            backgroundMusic,
            cameraMovement
          }
        })
      })

      const data = await response.json()
      if (data.success) {
        console.log('Video saved to drafts:', data.draftId)
        showToast('Video saved to drafts!', 'success')
      } else {
        throw new Error(data.message || 'Failed to save')
      }
    } catch (error) {
      console.error('Failed to save to drafts:', error)
      showToast('Failed to save to drafts. Please try again.', 'error')
    }
  }

  // Helper function to save video to My Media (ai_videos table)
  const saveVideoToMyMedia = async (videoUrl: string, originalPrompt: string, script: string) => {
    try {
      const response = await fetch('/api/user/media/save-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videoUrl: videoUrl,
          prompt: originalPrompt || 'AI Generated Video',
          enhancedPrompt: script || originalPrompt || '',
          model: 'veo-3.1-fast',
          mode: videoInputType,
          duration: parseInt(selectedDuration),
          sourceMediaUrl: referenceImageUrl || sourceVideoUrl || null,
          settings: {
            style: selectedStyle,
            aspectRatio,
            videoStyle: veoVideoStyle,
            audioCategory,
            quality: selectedQualityTier
          }
        })
      })
      
      const data = await response.json()
      if (data.success) {
        console.log('Video saved to My Media:', data.id)
      } else {
        console.error('Failed to save to My Media:', data.error)
      }
    } catch (error) {
      console.error('Failed to save video to My Media:', error)
    }
  }

  // Save video to My Media (manual button)
  const saveToMyMedia = async () => {
    if (!generatedVideoUrl) return
    
    try {
      // Use stored prompts if current ones are cleared, otherwise use current ones
      const promptToSave = prompt || lastGeneratedPrompt || 'AI Generated Video'
      const enhancedPromptToSave = enhancedScript || lastGeneratedEnhancedScript || ''
      
      const response = await fetch('/api/user/media/save-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videoUrl: generatedVideoUrl,
          prompt: promptToSave,
          enhancedPrompt: enhancedPromptToSave,
          model: 'veo-3.1-fast', // All modes now use Gemini Veo 3.1 Fast
          mode: videoInputType,
          duration: parseInt(selectedDuration),
          settings: {
            style: selectedStyle,
            aspectRatio,
            quality: videoQuality,
            audioCategory,
            backgroundMusic
          }
        })
      })
      
      const data = await response.json()
      if (data.success) {
        showToast('Video saved to My Media!', 'success')
      } else {
        showToast(data.error || 'Failed to save', 'error')
      }
    } catch (error) {
      console.error('Error saving to My Media:', error)
      showToast('Failed to save to My Media', 'error')
    }
  }

  // Download video using proxy to avoid CORS issues
  const handleDownload = async () => {
    if (!generatedVideoUrl) return
    
    try {
      const filename = `ai-video-${Date.now()}.mp4`
      // Use proxy API to avoid CORS issues with R2
      const proxyUrl = `/api/download?url=${encodeURIComponent(generatedVideoUrl)}&filename=${encodeURIComponent(filename)}`
      
      const response = await fetch(proxyUrl)
      if (!response.ok) {
        throw new Error('Download failed')
      }
      
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      showToast('Video downloaded successfully!', 'success')
    } catch (error) {
      console.error('Download failed:', error)
      showToast('Failed to download video. Please try again.', 'error')
    }
  }

  // Use template
  const useTemplate = (template: { title: string; prompt: string; emoji: string }) => {
    setPrompt(template.prompt)
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Toast Notifications */}
      <ToastContainer />
      
      {/* Video Viewer Modal */}
      <VideoViewerModal
        isOpen={videoViewer.isOpen}
        onClose={() => setVideoViewer({ ...videoViewer, isOpen: false })}
        videoUrl={videoViewer.videoUrl}
        prompt={videoViewer.prompt}
      />
      
      {/* Header */}
      <div className="flex items-center justify-between animate-slide-down">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <Sparkles className="w-8 h-8 text-primary animate-pulse-soft" />
            AI Video Generator
          </h1>
          <p className="text-foreground-secondary mt-1">Create stunning videos with AI in seconds</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Generation Form */}
        <div className="lg:col-span-2 space-y-6 animate-slide-up">
          <div className="card p-6">
            <h2 className="text-xl font-bold text-foreground mb-4">Create New Video</h2>
            
            {/* Audio Category Selection */}
            <div className="space-y-2 mb-6">
              <label className="text-sm font-medium text-foreground">Audio Type</label>
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => setAudioCategory('without-audio')}
                  className={`p-4 rounded-lg border-2 transition-all duration-300 hover:scale-105 ${
                    audioCategory === 'without-audio'
                      ? 'border-primary bg-primary/10'
                      : 'border-border hover:border-primary/50 bg-background-tertiary'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="text-3xl">🔇</div>
                    <div className="text-left">
                      <div className="text-sm font-bold text-foreground">Without Audio</div>
                      <div className="text-xs text-foreground-secondary">Silent video generation</div>
                    </div>
                  </div>
                </button>
                <button
                  onClick={() => setAudioCategory('with-audio')}
                  className={`p-4 rounded-lg border-2 transition-all duration-300 hover:scale-105 ${
                    audioCategory === 'with-audio'
                      ? 'border-primary bg-primary/10'
                      : 'border-border hover:border-primary/50 bg-background-tertiary'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="text-3xl">🔊</div>
                    <div className="text-left">
                      <div className="text-sm font-bold text-foreground">With Audio</div>
                      <div className="text-xs text-foreground-secondary">Native audio generation</div>
                    </div>
                  </div>
                </button>
              </div>
            </div>

            {/* Voice Cloning Section - Only show when "Without Audio" is selected */}
            {audioCategory === 'without-audio' && (
              <div className="mb-6 p-4 border-2 border-primary/20 rounded-lg bg-primary/5 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary/20 rounded-lg flex items-center justify-center">
                      <Mic className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-foreground">Add Custom Voice</div>
                      <div className="text-xs text-foreground-secondary">Add your cloned voice to the silent video</div>
                    </div>
                  </div>
                  <button
                    onClick={() => setEnableVoiceCloning(!enableVoiceCloning)}
                    className={`relative w-12 h-6 rounded-full transition-all duration-300 ${
                      enableVoiceCloning ? 'bg-primary' : 'bg-background border border-border'
                    }`}
                  >
                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all duration-300 shadow-md ${
                      enableVoiceCloning ? 'left-7' : 'left-1'
                    }`} />
                  </button>
                </div>

                {enableVoiceCloning && (
                  <div className="space-y-4 animate-fade-in">
                    {/* How It Works */}
                    <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                      <div className="text-xs font-medium text-blue-400 mb-1">🎯 How Voice Generation Works</div>
                      <div className="text-xs text-foreground-secondary">
                        1. Choose a voice preset from 50+ AI voices<br/>
                        2. Type text OR upload audio to convert<br/>
                        3. AI generates audio in the selected voice!
                      </div>
                    </div>

                    {/* Voice Clone Mode Selection - Hidden when using Own Voice */}
                    {!useOwnVoice && (
                      <div className="space-y-2">
                        <label className="text-xs font-medium text-foreground">Clone Mode</label>
                        <div className="grid grid-cols-2 gap-3">
                          <button
                            onClick={() => setVoiceCloneMode('text-to-speech')}
                            className={`p-3 rounded-lg border-2 transition-all duration-300 hover:scale-105 ${
                              voiceCloneMode === 'text-to-speech'
                                ? 'border-primary bg-primary/10'
                                : 'border-border hover:border-primary/50 bg-background-tertiary'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <span className="text-xl">📝</span>
                              <div className="text-left">
                                <div className="text-xs font-bold text-foreground">Text-to-Speech</div>
                                <div className="text-xs text-foreground-secondary">Type what to say</div>
                              </div>
                            </div>
                          </button>
                          <button
                            onClick={() => setVoiceCloneMode('speech-to-speech')}
                            className={`p-3 rounded-lg border-2 transition-all duration-300 hover:scale-105 ${
                              voiceCloneMode === 'speech-to-speech'
                                ? 'border-primary bg-primary/10'
                                : 'border-border hover:border-primary/50 bg-background-tertiary'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <span className="text-xl">🎤</span>
                              <div className="text-left">
                                <div className="text-xs font-bold text-foreground">Speech-to-Speech</div>
                                <div className="text-xs text-foreground-secondary">Convert audio</div>
                              </div>
                            </div>
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Select Voice Preset */}
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-foreground flex items-center gap-2">
                        <Music className="w-3 h-3" />
                        Step 1: Choose Voice <span className="text-red-500">*</span>
                      </label>
                      <p className="text-xs text-foreground-secondary">
                        Select an AI voice or use your own voice
                      </p>
                      
                      {/* Own Voice Toggle */}
                      <div className="flex items-center gap-3 p-3 rounded-lg border-2 border-border bg-background-tertiary">
                        <button
                          onClick={() => {
                            setUseOwnVoice(false)
                            // Reset voice clone states when switching to AI voice
                            setVoiceCloneStep('record')
                            setVoiceCloneConfirmed(false)
                          }}
                          className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                            !useOwnVoice 
                              ? 'bg-primary text-white' 
                              : 'bg-background hover:bg-primary/10 text-foreground-secondary'
                          }`}
                        >
                          🎭 AI Voice
                        </button>
                        <button
                          onClick={() => {
                            setUseOwnVoice(true)
                            // Reset to first step when switching to own voice
                            if (!sourceAudioForCloningUrl) {
                              setVoiceCloneStep('record')
                            } else if (!voiceCloneConfirmed) {
                              setVoiceCloneStep('test')
                            }
                          }}
                          className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                            useOwnVoice 
                              ? 'bg-primary text-white' 
                              : 'bg-background hover:bg-primary/10 text-foreground-secondary'
                          }`}
                        >
                          🎤 My Own Voice
                        </button>
                      </div>
                      
                      {useOwnVoice ? (
                        <div className="space-y-3">
                          {/* Step Progress Indicator */}
                          <div className="flex items-center justify-between p-3 rounded-lg bg-gradient-to-r from-primary/10 to-purple-500/10 border border-primary/30">
                            <div className="flex items-center gap-4">
                              <div className={`flex items-center gap-1 ${voiceCloneStep === 'record' ? 'text-primary' : sourceAudioForCloningUrl ? 'text-green-500' : 'text-foreground-secondary'}`}>
                                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${voiceCloneStep === 'record' ? 'bg-primary text-white' : sourceAudioForCloningUrl ? 'bg-green-500 text-white' : 'bg-background-tertiary'}`}>
                                  {sourceAudioForCloningUrl ? '✓' : '1'}
                                </div>
                                <span className="text-xs font-medium">Record</span>
                              </div>
                              <div className="w-8 h-0.5 bg-border"></div>
                              <div className={`flex items-center gap-1 ${voiceCloneStep === 'test' ? 'text-primary' : testVoiceAudioUrl ? 'text-green-500' : 'text-foreground-secondary'}`}>
                                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${voiceCloneStep === 'test' ? 'bg-primary text-white' : testVoiceAudioUrl ? 'bg-green-500 text-white' : 'bg-background-tertiary'}`}>
                                  {testVoiceAudioUrl ? '✓' : '2'}
                                </div>
                                <span className="text-xs font-medium">Test</span>
                              </div>
                              <div className="w-8 h-0.5 bg-border"></div>
                              <div className={`flex items-center gap-1 ${voiceCloneConfirmed ? 'text-green-500' : 'text-foreground-secondary'}`}>
                                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${voiceCloneConfirmed ? 'bg-green-500 text-white' : 'bg-background-tertiary'}`}>
                                  {voiceCloneConfirmed ? '✓' : '3'}
                                </div>
                                <span className="text-xs font-medium">Use</span>
                              </div>
                            </div>
                          </div>
                          
                          {/* STEP 1: Record Voice Sample */}
                          {voiceCloneStep === 'record' && (
                            <div className="space-y-3 p-4 rounded-lg border-2 border-primary/30 bg-background-secondary">
                              <div className="flex items-center gap-2 text-primary">
                                <Mic className="w-4 h-4" />
                                <span className="font-medium text-sm">Step 1: Record Your Voice Sample</span>
                              </div>
                              <p className="text-xs text-foreground-secondary">
                                Record 10-30 seconds of your voice. Speak clearly for best cloning quality.
                              </p>
                              
                              <div className="grid grid-cols-2 gap-2">
                                <input
                                  type="file"
                                  accept="audio/*,video/mp4,.mp3,.wav,.webm,.ogg,.m4a,.aac,.mp4"
                                  onChange={handleSourceAudioUpload}
                                  className="hidden"
                                  id="voice-clone-upload"
                                />
                                <label
                                  htmlFor="voice-clone-upload"
                                  className="flex items-center justify-center gap-2 p-4 border-2 border-dashed border-primary/50 rounded-lg cursor-pointer hover:border-primary hover:bg-primary/10 transition-all duration-300 bg-background-tertiary"
                                >
                                  <Upload className="w-5 h-5 text-primary" />
                                  <span className="text-sm text-primary">Upload Audio</span>
                                </label>
                                
                                <button
                                  type="button"
                                  onClick={() => isRecordingSource ? stopVoiceRecording() : startVoiceRecording('source')}
                                  className={`flex items-center justify-center gap-2 p-4 border-2 rounded-lg transition-all duration-300 ${
                                    isRecordingSource 
                                      ? 'border-red-500 bg-red-500/20 text-red-400 animate-pulse' 
                                      : 'border-primary/50 hover:border-primary hover:bg-primary/10 bg-background-tertiary'
                                  }`}
                                >
                                  <Mic className={`w-5 h-5 ${isRecordingSource ? 'text-red-400' : 'text-primary'}`} />
                                  <span className={`text-sm ${isRecordingSource ? 'text-red-400' : 'text-primary'}`}>
                                    {isRecordingSource ? '⏹ Stop Recording' : '🎙 Record Voice'}
                                  </span>
                                </button>
                              </div>
                              
                              {isRecordingSource && (
                                <div className="flex items-center justify-center gap-2 p-2 rounded-lg bg-red-500/10 border border-red-500/30">
                                  <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                                  <span className="text-xs text-red-400 font-medium">Recording... Speak now!</span>
                                </div>
                              )}
                              
                              {sourceAudioForCloningUrl && (
                                <div className="space-y-2 p-3 rounded-lg bg-green-500/10 border border-green-500/30">
                                  <div className="flex items-center gap-2 text-green-500 text-xs">
                                    <Check className="w-3 h-3" />
                                    <span className="font-medium">Voice sample recorded!</span>
                                  </div>
                                  <audio src={sourceAudioForCloningUrl} controls className="w-full h-10" />
                                  <button
                                    onClick={() => setVoiceCloneStep('test')}
                                    className="w-full mt-2 px-4 py-2 bg-primary hover:bg-primary-hover text-white rounded-lg text-sm font-medium transition-all"
                                  >
                                    Next: Test My Voice →
                                  </button>
                                </div>
                              )}
                            </div>
                          )}
                          
                          {/* STEP 2: Test Voice Clone */}
                          {voiceCloneStep === 'test' && (
                            <div className="space-y-3 p-4 rounded-lg border-2 border-purple-500/30 bg-background-secondary">
                              <div className="flex items-center gap-2 text-purple-500">
                                <Type className="w-4 h-4" />
                                <span className="font-medium text-sm">Step 2: Test Your Cloned Voice</span>
                              </div>
                              <p className="text-xs text-foreground-secondary">
                                Type any text to hear how your cloned voice sounds. Test it before using!
                              </p>
                              
                              {/* Voice Sample Preview */}
                              <div className="p-2 rounded-lg bg-background-tertiary border border-border">
                                <p className="text-xs text-foreground-secondary mb-1">Your voice sample:</p>
                                <audio src={sourceAudioForCloningUrl} controls className="w-full h-8" />
                              </div>
                              
                              <textarea
                                value={testVoiceText}
                                onChange={(e) => setTestVoiceText(e.target.value)}
                                placeholder="Type something to test your cloned voice... e.g. 'Hello! This is my cloned voice speaking.'"
                                className="w-full px-3 py-2 text-sm rounded-lg border-2 border-border bg-background-tertiary text-foreground placeholder-foreground-secondary focus:border-purple-500 focus:outline-none resize-none"
                                rows={3}
                              />
                              
                              <button
                                onClick={async () => {
                                  if (!testVoiceText.trim()) {
                                    showToast('Please enter some text to test', 'warning')
                                    return
                                  }
                                  setIsTestingVoice(true)
                                  try {
                                    const formData = new FormData()
                                    formData.append('mode', 'voice-clone-tts')
                                    formData.append('useOwnVoice', 'true')
                                    formData.append('sourceAudioUrl', sourceAudioForCloningUrl)
                                    formData.append('text', testVoiceText)
                                    
                                    const response = await fetch('/api/voice/clone', {
                                      method: 'POST',
                                      body: formData
                                    })
                                    const data = await response.json()
                                    
                                    if (data.success) {
                                      setTestVoiceAudioUrl(data.audioUrl)
                                      showToast('🎉 Voice cloned! Listen to the preview below', 'success')
                                    } else {
                                      throw new Error(data.error)
                                    }
                                  } catch (error) {
                                    showToast('Failed to test voice: ' + (error instanceof Error ? error.message : 'Unknown error'), 'error')
                                  } finally {
                                    setIsTestingVoice(false)
                                  }
                                }}
                                disabled={isTestingVoice || !testVoiceText.trim()}
                                className="w-full px-4 py-2.5 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-lg font-medium transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                              >
                                {isTestingVoice ? (
                                  <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    <span>Cloning Voice...</span>
                                  </>
                                ) : (
                                  <>
                                    <Wand2 className="w-4 h-4" />
                                    <span>🧪 Test My Cloned Voice</span>
                                  </>
                                )}
                              </button>
                              
                              {/* Test Result Preview */}
                              {testVoiceAudioUrl && (
                                <div className="space-y-3 p-3 rounded-lg bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/30">
                                  <div className="flex items-center gap-2 text-green-500">
                                    <Check className="w-4 h-4" />
                                    <span className="font-medium text-sm">🎉 Your Cloned Voice Preview!</span>
                                  </div>
                                  <audio src={testVoiceAudioUrl} controls className="w-full h-10" autoPlay />
                                  <p className="text-xs text-foreground-secondary">
                                    Happy with how it sounds? Click &quot;Use This Voice&quot; to proceed!
                                  </p>
                                  
                                  <div className="flex gap-2">
                                    <button
                                      onClick={() => {
                                        setTestVoiceAudioUrl('')
                                        setTestVoiceText('')
                                      }}
                                      className="flex-1 px-4 py-2 border-2 border-border hover:border-primary/50 rounded-lg text-sm font-medium text-foreground-secondary hover:text-foreground transition-all"
                                    >
                                      🔄 Try Different Text
                                    </button>
                                    <button
                                      onClick={() => {
                                        setVoiceCloneConfirmed(true)
                                        setVoiceCloneStep('ready')
                                        showToast('✅ Voice clone ready! Now enter the text for your video.', 'success')
                                      }}
                                      className="flex-1 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg text-sm font-medium transition-all"
                                    >
                                      ✅ Use This Voice
                                    </button>
                                  </div>
                                </div>
                              )}
                              
                              {/* Back Button */}
                              <button
                                onClick={() => setVoiceCloneStep('record')}
                                className="text-xs text-foreground-secondary hover:text-foreground transition-all"
                              >
                                ← Back to record new sample
                              </button>
                            </div>
                          )}
                          
                          {/* STEP 3: Ready to Use - Enter Final Text */}
                          {voiceCloneStep === 'ready' && voiceCloneConfirmed && (
                            <div className="space-y-3 p-4 rounded-lg border-2 border-green-500/30 bg-background-secondary">
                              <div className="flex items-center gap-2 text-green-500">
                                <Check className="w-4 h-4" />
                                <span className="font-medium text-sm">Step 3: Voice Clone Ready!</span>
                              </div>
                              
                              <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/30">
                                <div className="flex items-center gap-2 mb-2">
                                  <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center">
                                    <Mic className="w-4 h-4 text-white" />
                                  </div>
                                  <div>
                                    <p className="text-sm font-medium text-green-500">Your Voice Clone is Active</p>
                                    <p className="text-xs text-foreground-secondary">Audio will be generated in your cloned voice</p>
                                  </div>
                                </div>
                                <audio src={testVoiceAudioUrl || sourceAudioForCloningUrl} controls className="w-full h-8" />
                              </div>
                              
                              <div className="space-y-2">
                                <label className="text-xs font-medium text-foreground flex items-center gap-2">
                                  <Type className="w-3 h-3" />
                                  Enter Text for Video Voiceover <span className="text-red-500">*</span>
                                </label>
                                <textarea
                                  value={voiceCloneText}
                                  onChange={(e) => setVoiceCloneText(e.target.value)}
                                  placeholder="Enter what you want to say in your video..."
                                  className="w-full px-3 py-2 text-sm rounded-lg border-2 border-border bg-background-tertiary text-foreground placeholder-foreground-secondary focus:border-green-500 focus:outline-none resize-none"
                                  rows={4}
                                />
                                <div className="flex items-center justify-between text-xs">
                                  <span className="text-foreground-secondary">{voiceCloneText.length} characters</span>
                                  {voiceCloneText && (
                                    <span className="text-green-500 flex items-center gap-1">
                                      <Check className="w-3 h-3" />
                                      Ready to generate!
                                    </span>
                                  )}
                                </div>
                              </div>
                              
                              {/* Reset Voice Clone */}
                              <button
                                onClick={() => {
                                  setVoiceCloneStep('record')
                                  setVoiceCloneConfirmed(false)
                                  setTestVoiceAudioUrl('')
                                  setTestVoiceText('')
                                  setSourceAudioForCloningUrl('')
                                  setSourceAudioForCloning(null)
                                }}
                                className="text-xs text-foreground-secondary hover:text-red-400 transition-all flex items-center gap-1"
                              >
                                <RefreshCw className="w-3 h-3" />
                                Start over with a new voice sample
                              </button>
                            </div>
                          )}
                        </div>
                      ) : (
                        <>
                          <select
                            value={selectedVoicePreset}
                            onChange={(e) => setSelectedVoicePreset(e.target.value)}
                            className="w-full px-3 py-2 text-sm rounded-lg border-2 border-border bg-background-tertiary text-foreground focus:border-primary focus:outline-none"
                          >
                            {VOICE_PRESETS.map((preset) => (
                              <option key={preset.name} value={preset.name}>
                                {preset.name} - {preset.description}
                              </option>
                            ))}
                          </select>
                          
                          <div className="flex items-center gap-2 text-primary text-xs">
                            <Check className="w-3 h-3" />
                            <span>Voice: {selectedVoicePreset} (ElevenLabs)</span>
                          </div>
                        </>
                      )}
                    </div>

                    {/* Step 2: Text-to-Speech (type text) - Only when NOT using Own Voice */}
                    {voiceCloneMode === 'text-to-speech' && !useOwnVoice && (
                      <div className="space-y-2">
                        <label className="text-xs font-medium text-foreground flex items-center gap-2">
                          <Type className="w-3 h-3" />
                          Step 2: What to Say <span className="text-red-500">*</span>
                        </label>
                        <p className="text-xs text-foreground-secondary">
                          Type the text you want the AI to speak
                        </p>
                        <textarea
                          value={voiceCloneText}
                          onChange={(e) => setVoiceCloneText(e.target.value)}
                          placeholder="Enter the text you want to hear..."
                          className="w-full px-3 py-2 text-sm rounded-lg border-2 border-border bg-background-tertiary text-foreground placeholder-foreground-secondary focus:border-primary focus:outline-none resize-none"
                          rows={4}
                        />
                        <div className="text-xs text-foreground-secondary text-right">
                          {voiceCloneText.length} characters
                        </div>
                      </div>
                    )}

                    {/* Step 2: Speech-to-Speech (upload/record audio) - Only when NOT using Own Voice */}
                    {voiceCloneMode === 'speech-to-speech' && !useOwnVoice && (
                      <div className="space-y-2">
                        <label className="text-xs font-medium text-foreground flex items-center gap-2">
                          <Mic className="w-3 h-3" />
                          Step 2: Source Audio <span className="text-red-500">*</span>
                        </label>
                        <p className="text-xs text-foreground-secondary">
                          Upload audio to convert to the selected voice
                        </p>
                        
                        <div className="grid grid-cols-2 gap-2">
                          {/* Upload Button */}
                          <input
                            type="file"
                            accept="audio/*"
                            onChange={handleSourceAudioUpload}
                            className="hidden"
                            id="source-audio-upload"
                          />
                          <label
                            htmlFor="source-audio-upload"
                            className="flex items-center justify-center gap-2 p-3 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-primary/50 transition-all duration-300 bg-background-tertiary"
                          >
                            <Upload className="w-4 h-4" />
                            <span className="text-xs">Upload</span>
                          </label>
                          
                          {/* Record Button */}
                          <button
                            type="button"
                            onClick={() => isRecordingSource ? stopVoiceRecording() : startVoiceRecording('source')}
                            className={`flex items-center justify-center gap-2 p-3 border-2 rounded-lg transition-all duration-300 ${
                              isRecordingSource 
                                ? 'border-red-500 bg-red-500/10 text-red-500' 
                                : 'border-border hover:border-primary/50 bg-background-tertiary'
                            }`}
                          >
                            <Mic className="w-4 h-4" />
                            <span className="text-xs">{isRecordingSource ? 'Stop' : 'Record'}</span>
                          </button>
                        </div>
                        
                        {sourceAudioForCloningUrl && (
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 text-primary text-xs">
                              <Music className="w-3 h-3" />
                              <span>Source audio ready ✓</span>
                            </div>
                            <audio src={sourceAudioForCloningUrl} controls className="w-full h-8" />
                          </div>
                        )}
                      </div>
                    )}

                    {/* Generate Voice Button - Only show for AI Voice or when Own Voice is confirmed */}
                    {(!useOwnVoice || (useOwnVoice && voiceCloneConfirmed)) && (
                      <button
                        onClick={handleVoiceCloning}
                        disabled={isGeneratingVoice || (useOwnVoice ? (!voiceCloneConfirmed || !voiceCloneText.trim()) : (voiceCloneMode === 'text-to-speech' ? !voiceCloneText.trim() : !sourceAudioForCloningUrl))}
                        className="w-full px-4 py-2.5 bg-gradient-to-r from-primary to-purple-500 hover:from-primary-hover hover:to-purple-600 text-white rounded-lg font-medium transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-2"
                      >
                        {isGeneratingVoice ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span className="text-sm">{useOwnVoice ? '🎤 Generating with Your Voice...' : 'Generating Voice...'}</span>
                          </>
                        ) : (
                          <>
                            <Wand2 className="w-4 h-4" />
                            <span className="text-sm">
                              {useOwnVoice 
                                ? '🎤 Generate Voiceover with My Voice'
                                : (voiceCloneMode === 'text-to-speech' ? 'Generate from Text' : 'Convert Voice')
                              }
                            </span>
                          </>
                        )}
                      </button>
                    )}

                    {/* Cloned Audio Preview */}
                    {clonedAudioUrl && (
                      <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg space-y-2">
                        <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                          <Check className="w-4 h-4" />
                          <span className="text-xs font-medium">Voice generated successfully!</span>
                        </div>
                        <audio src={clonedAudioUrl} controls className="w-full h-8" />
                        <p className="text-xs text-foreground-secondary">
                          This audio will be included in your video generation
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Input Type Selection */}
            <div className="space-y-2 mb-6">
              <label className="text-sm font-medium text-foreground">Input Type</label>
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => setVideoInputType('image-to-video')}
                  className={`p-4 rounded-lg border-2 transition-all duration-300 hover:scale-105 ${
                    videoInputType === 'image-to-video'
                      ? 'border-primary bg-primary/10'
                      : 'border-border hover:border-primary/50 bg-background-tertiary'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="text-3xl">🖼️</div>
                    <div className="text-left">
                      <div className="text-sm font-bold text-foreground">With Reference Image</div>
                      <div className="text-xs text-foreground-secondary">Use image as reference</div>
                      <div className="text-xs text-primary font-medium mt-1">
                        {selectedQualityTier === '1080p' ? '16' : '15'} credits/sec
                      </div>
                    </div>
                  </div>
                </button>
                <button
                  onClick={() => setVideoInputType('text-to-video')}
                  className={`p-4 rounded-lg border-2 transition-all duration-300 hover:scale-105 ${
                    videoInputType === 'text-to-video'
                      ? 'border-primary bg-primary/10'
                      : 'border-border hover:border-primary/50 bg-background-tertiary'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="text-3xl">📝</div>
                    <div className="text-left">
                      <div className="text-sm font-bold text-foreground">Text to Video</div>
                      <div className="text-xs text-foreground-secondary">Generate from text</div>
                      <div className="text-xs text-primary font-medium mt-1">
                        {selectedQualityTier === '1080p' ? '16' : '15'} credits/sec
                      </div>
                    </div>
                  </div>
                </button>
              </div>
            </div>

            {/* Image Usage Mode - Only show when image-to-video is selected */}
            {videoInputType === 'image-to-video' && (
              <div className="space-y-2 mb-6">
                <label className="text-sm font-medium text-foreground">How to use the image?</label>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={() => setImageUsageMode('reference')}
                    className={`p-3 rounded-lg border-2 transition-all duration-300 hover:scale-105 ${
                      imageUsageMode === 'reference'
                        ? 'border-primary bg-primary/10'
                        : 'border-border hover:border-primary/50 bg-background-tertiary'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xl">🎨</span>
                      <div className="text-left">
                        <div className="text-sm font-bold text-foreground">As Reference</div>
                        <div className="text-xs text-foreground-secondary">Style/character guide</div>
                      </div>
                    </div>
                  </button>
                  <button
                    onClick={() => setImageUsageMode('animate')}
                    className={`p-3 rounded-lg border-2 transition-all duration-300 hover:scale-105 ${
                      imageUsageMode === 'animate'
                        ? 'border-primary bg-primary/10'
                        : 'border-border hover:border-primary/50 bg-background-tertiary'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xl">🎬</span>
                      <div className="text-left">
                        <div className="text-sm font-bold text-foreground">Animate Image</div>
                        <div className="text-xs text-foreground-secondary">Put image in video</div>
                      </div>
                    </div>
                  </button>
                </div>
                <p className="text-xs text-foreground-secondary mt-1">
                  {imageUsageMode === 'reference' 
                    ? '💡 AI will use the image to understand character/style but generate NEW scenes based on your prompt'
                    : '💡 The image will appear directly in the video and be animated'}
                </p>
              </div>
            )}

            {/* Quality Selection */}
            <div className="space-y-2 mb-6">
              <label className="text-sm font-medium text-foreground">Quality</label>
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => setSelectedQualityTier('720p')}
                  className={`p-3 rounded-lg border-2 transition-all duration-300 hover:scale-105 ${
                    selectedQualityTier === '720p'
                      ? 'border-primary bg-primary/10'
                      : 'border-border hover:border-primary/50 bg-background-tertiary'
                  }`}
                >
                  <div className="text-sm font-bold text-foreground">720p HD</div>
                  <div className="text-xs text-foreground-secondary">Standard quality</div>
                </button>
                <button
                  onClick={() => setSelectedQualityTier('1080p')}
                  className={`p-3 rounded-lg border-2 transition-all duration-300 hover:scale-105 ${
                    selectedQualityTier === '1080p'
                      ? 'border-primary bg-primary/10'
                      : 'border-border hover:border-primary/50 bg-background-tertiary'
                  }`}
                >
                  <div className="text-sm font-bold text-foreground">1080p Full HD</div>
                  <div className="text-xs text-foreground-secondary">+1 credit/sec</div>
                </button>
              </div>
            </div>

            {/* Cost Summary */}
            <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg mb-6">
              <div className="flex items-center justify-between">
                <div className="text-sm text-foreground">
                  <span className="font-medium">Selected:</span>{' '}
                  {audioCategory === 'with-audio' ? '🔊 With Audio' : '🔇 Without Audio'} •{' '}
                  {videoInputType === 'image-to-video' ? '🖼️ Image to Video' : '📝 Text to Video'} •{' '}
                  {selectedQualityTier}
                </div>
                <div className="text-sm font-bold text-primary">
                  {currentPricing.creditsPerSecond} credits/sec
                </div>
              </div>
            </div>

            {/* Upload Section for Image-to-Video */}
            {videoInputType === 'image-to-video' && (
              <div className="space-y-2 mb-6">
                <label className="text-sm font-medium text-foreground flex items-center gap-2">
                  <Upload className="w-4 h-4" />
                  Upload Reference Image <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                    id="image-upload"
                  />
                  <label
                    htmlFor="image-upload"
                    className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-primary/50 transition-all duration-300 bg-background-tertiary"
                  >
                    {referenceImageUrl ? (
                      <div className="relative w-full h-full">
                        <img src={referenceImageUrl} alt="Reference" className="w-full h-full object-cover rounded-lg" />
                        <div className="absolute inset-0 bg-black/50 opacity-0 hover:opacity-100 transition-opacity duration-300 rounded-lg flex items-center justify-center">
                          <span className="text-white text-sm font-medium">Change Image</span>
                        </div>
                      </div>
                    ) : (
                      <>
                        <Upload className="w-8 h-8 text-foreground-secondary mb-2" />
                        <span className="text-sm text-foreground-secondary">Click to upload image</span>
                        <span className="text-xs text-foreground-muted mt-1">PNG, JPG up to 10MB</span>
                      </>
                    )}
                  </label>
                </div>
              </div>
            )}

            {/* Duration Selection - FIRST for Veo 3.1 (MANDATORY before enhancing) */}
            {selectedModel === 'veo3.1_fast' && (
              <div className="space-y-2 mb-6">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-foreground flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    Duration <span className="text-red-500">*</span>
                    <span className="text-xs text-foreground-secondary">(Select before enhancing prompt)</span>
                  </label>
                  <div className="text-xs text-primary font-medium">
                    {scriptSections.length > 0 
                      ? `${getClipCount()} clips × ${Math.ceil(parseInt(selectedDuration) / getClipCount())}s each`
                      : `${selectedDuration}s single clip`
                    }
                  </div>
                </div>
                <div className="grid grid-cols-4 gap-3">
                  {durations.map((duration, index) => (
                    <button
                      key={duration.id}
                      onClick={() => {
                        setSelectedDuration(duration.id)
                        // Reset enhanced script when duration changes
                        setShowEnhancedScript(false)
                        setEnhancedScript('')
                        setScriptSections([])
                      }}
                      style={{ animationDelay: `${index * 50}ms` }}
                      className={`p-4 rounded-lg border-2 transition-all duration-300 animate-scale-in hover:scale-105 ${
                        selectedDuration === duration.id
                          ? 'border-primary bg-primary/10 scale-105'
                          : 'border-border hover:border-primary/50 bg-background-tertiary'
                      }`}
                    >
                      <div className="text-lg font-bold text-foreground">{duration.label}</div>
                      <div className="text-xs text-foreground-secondary mt-1">{duration.scripts} clip{duration.scripts > 1 ? 's' : ''}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* No Captions Toggle */}
            <div className="flex items-center justify-between p-3 bg-background-tertiary rounded-lg mb-6 border border-border">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                  <Type className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <div className="text-sm font-medium text-foreground">Pure Video Mode</div>
                  <div className="text-xs text-foreground-secondary">No text, captions, or titles in video</div>
                </div>
              </div>
              <button
                onClick={() => setNoCaptions(!noCaptions)}
                className={`relative w-12 h-6 rounded-full transition-all duration-300 ${
                  noCaptions ? 'bg-primary' : 'bg-background border border-border'
                }`}
              >
                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all duration-300 shadow-md ${
                  noCaptions ? 'left-7' : 'left-1'
                }`} />
              </button>
            </div>

            {/* Prompt Input */}
            <div className="space-y-2 mb-6">
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-foreground">
                  Video Description
                  {selectedModel === 'veo3.1_fast' && referenceImage && (
                    <span className="text-xs text-foreground-secondary ml-2">(Optional with image)</span>
                  )}
                  {selectedModel === 'gen4_turbo' && (
                    <span className="text-xs text-foreground-secondary ml-2">(Optional)</span>
                  )}
                  {selectedModel === 'upscale_v1' && (
                    <span className="text-xs text-foreground-secondary ml-2">(Optional)</span>
                  )}
                </label>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 px-3 py-1 bg-orange-500/10 border border-orange-500/20 rounded-lg">
                    <Sparkles className="w-3.5 h-3.5 text-orange-500" />
                    <span className="text-xs font-medium text-orange-500">
                      5 AI Credits
                    </span>
                  </div>
                  <button
                    onClick={() => setShowEnhanceOptions(!showEnhanceOptions)}
                    className="text-xs text-primary hover:text-primary/80 font-medium transition-colors flex items-center gap-1"
                  >
                    <Settings className="w-3.5 h-3.5" />
                    {showEnhanceOptions ? 'Hide Options' : 'Customize Enhancement'}
                  </button>
                </div>
              </div>
              
              {/* Example prompt helper - collapsible */}
              {selectedModel === 'veo3.1_fast' && veoVideoStyle === 'dialogue' && (
                <details className="mb-3 p-3 bg-blue-500/5 border border-blue-500/20 rounded-lg">
                  <summary className="text-xs font-medium text-blue-400 cursor-pointer flex items-center gap-2">
                    <Info className="w-3.5 h-3.5" />
                    See example with dialogue and descriptions
                  </summary>
                  <div className="mt-3 text-xs text-foreground-secondary space-y-2">
                    <div className="p-2 bg-background-tertiary rounded border border-border">
                      <div className="font-medium text-foreground mb-1">✅ Good Example:</div>
                      <div className="italic">
                        &quot;A young woman named Sarah enters a busy coffee shop wearing a red jacket. She looks around nervously. 
                        Sarah approaches the barista at the counter. Sarah: &apos;Hi, can I get a large latte please?&apos; 
                        The barista smiles warmly. Barista: &apos;Of course! That&apos;ll be ready in just a moment.&apos; 
                        Sarah pulls out her phone and checks the time while waiting.&quot;
                      </div>
                    </div>
                    <div className="text-[10px] text-foreground-secondary">
                      💡 Include: character names, actions, settings, dialogue in quotes, emotions, and visual details
                    </div>
                  </div>
                </details>
              )}
              
              {/* Custom Enhancement Options */}
              {showEnhanceOptions && (
                <div className="space-y-3 p-4 bg-background-tertiary rounded-lg border border-border animate-slide-down">
                  <div className="mb-3 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                    <div className="flex items-start gap-2">
                      <Info className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                      <div className="text-xs text-blue-300 space-y-1">
                        <p className="font-medium">💡 Enhanced prompts create cohesive storylines</p>
                        <p className="text-blue-300/80">
                          When you enhance your prompt, AI will break it into {getClipCountForEnhancement()} connected clips that flow together as ONE continuous story. Each clip will naturally transition to the next, maintaining consistent characters, settings, and visual style throughout.
                        </p>
                      </div>
                    </div>
                  </div>
                  <label className="block text-sm font-medium text-foreground">
                    Custom Enhancement Instructions (Optional)
                  </label>
                  <textarea
                    value={customEnhanceInstructions}
                    onChange={(e) => setCustomEnhanceInstructions(e.target.value)}
                    placeholder="e.g., 'Add dramatic slow-motion effects' or 'Make it energetic with fast cuts' or 'Include sunset golden hour lighting'"
                    className="w-full px-4 py-3 bg-background border border-border rounded-lg text-foreground placeholder-foreground-secondary resize-none focus:outline-none focus:ring-2 focus:ring-primary"
                    rows={3}
                  />
                  <p className="text-xs text-foreground-secondary">
                    Describe how you want to enhance your video prompt. Leave empty for standard AI enhancement.
                  </p>
                  <button
                    onClick={handleEnhancePrompt}
                    disabled={!prompt.trim() || isEnhancing}
                    className="w-full px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                  >
                    {isEnhancing ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Creating {getClipCountForEnhancement()} cohesive clip{getClipCountForEnhancement() > 1 ? 's' : ''}...
                      </>
                    ) : (
                      <>
                        <Zap className="w-4 h-4" />
                        Enhance Prompt (Creates Unified Story)
                      </>
                    )}
                  </button>
                </div>
              )}
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder={selectedModel === 'veo3.1_fast' 
                  ? veoVideoStyle === 'dialogue' 
                    ? `Describe your ${selectedDuration}s video with dialogue... e.g., "John walks into the office. John: 'Good morning everyone!' Sarah: 'Hey John, ready for the meeting?'"`
                    : `Describe your ${selectedDuration}s video in detail... Include actions, descriptions, settings, and any dialogue`
                  : "Describe the video you want to create... e.g., 'A modern product showcase with smooth transitions'"}
                className="input-field h-32 resize-none"
              />
              <p className="text-xs text-foreground-secondary">
                {selectedModel === 'veo3.1_fast' 
                  ? veoVideoStyle === 'dialogue'
                    ? '💡 Include character names and dialogue in quotes. Add descriptions of actions, settings, and emotions. AI will preserve all your details.'
                    : `💡 Be descriptive! Include actions, settings, characters, colors, and atmosphere. All your details will be preserved and enhanced.`
                  : '💡 Be as detailed as possible for best results'}
              </p>
            </div>

            {/* Enhanced Script Display - Shows Clips for Veo 3.1 */}
            {showEnhancedScript && enhancedScript && (
              <div className="space-y-3 mb-6 animate-slide-up">
                {/* Header like the image */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-primary" />
                    <h3 className="text-sm font-medium text-foreground">
                      {selectedModel === 'veo3.1_fast' && scriptSections.length > 1 
                        ? `Generated Clips (${scriptSections.length})`
                        : 'Enhanced Script'}
                    </h3>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setIsEditingScript(!isEditingScript)}
                      className="p-1.5 hover:bg-primary/10 rounded-lg transition-all text-foreground-secondary hover:text-primary"
                      title="Edit all"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={handleCopyScript}
                      className="p-1.5 hover:bg-primary/10 rounded-lg transition-all text-foreground-secondary hover:text-primary"
                      title="Copy"
                    >
                      {isCopied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
                
                {isEditingScript ? (
                  <textarea
                    value={enhancedScript}
                    onChange={(e) => {
                      setEnhancedScript(e.target.value)
                      const clips = parseClipsFromScript(e.target.value)
                      setScriptSections(clips)
                    }}
                    className="w-full px-3 py-2 bg-background-tertiary border border-border rounded-lg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none font-mono"
                    rows={8}
                  />
                ) : selectedModel === 'veo3.1_fast' && scriptSections.length > 0 ? (
                  // Compact clip cards with edit option
                  <div className="space-y-2 max-h-64 overflow-y-auto custom-scrollbar">
                    {scriptSections.map((clip, index) => (
                      <div key={index} className="p-2.5 bg-background-tertiary rounded-lg border border-border hover:border-primary/30 transition-all group">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="px-1.5 py-0.5 bg-primary/20 text-primary text-[10px] font-bold rounded">
                                Clip {index + 1}
                              </span>
                              <span className="text-[10px] text-foreground-secondary">8 sec</span>
                              {(!clip || clip.trim().length === 0) && (
                                <span className="text-[10px] text-red-500 font-medium">⚠️ Empty</span>
                              )}
                            </div>
                            {clip && clip.trim().length > 0 ? (
                              <p className="text-xs text-foreground-secondary line-clamp-2">{clip}</p>
                            ) : (
                              <p className="text-xs text-red-500 italic">This clip is empty. Click edit to add content.</p>
                            )}
                          </div>
                          <button
                            onClick={() => {
                              setEditClipModal({ isOpen: true, clipIndex: index, clipText: clip })
                            }}
                            className="p-1.5 opacity-0 group-hover:opacity-100 hover:bg-primary/10 rounded transition-all text-foreground-secondary hover:text-primary shrink-0"
                            title="Edit this clip"
                          >
                            <Edit3 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-foreground-secondary whitespace-pre-wrap max-h-48 overflow-y-auto p-2.5 bg-background-tertiary rounded-lg border border-border custom-scrollbar">
                    {enhancedScript}
                  </div>
                )}
                
                <p className="text-[11px] text-foreground-secondary flex items-center gap-1.5">
                  <Sparkles className="w-3 h-3" />
                  {selectedModel === 'veo3.1_fast' && scriptSections.length > 1
                    ? `${scriptSections.length} cohesive clips → ${selectedDuration}s unified story. Each clip flows naturally into the next.`
                    : 'This enhanced script will be used for video generation'}
                </p>
              </div>
            )}

            {/* Duration - Only show for non-Veo models */}
            {selectedModel !== 'veo3.1_fast' && (
              <div className="space-y-2 mb-6">
                <label className="text-sm font-medium text-foreground">Duration</label>
                <div className="flex gap-3">
                  {[
                    { id: '5', label: '5 seconds' },
                    { id: '10', label: '10 seconds' },
                    { id: '15', label: '15 seconds' },
                  ].map((duration, index) => (
                    <button
                      key={duration.id}
                      onClick={() => setSelectedDuration(duration.id)}
                      style={{ animationDelay: `${index * 50}ms` }}
                      className={`flex-1 px-4 py-3 rounded-lg border-2 transition-all duration-300 animate-scale-in hover:scale-105 ${
                        selectedDuration === duration.id
                          ? 'border-primary bg-primary/10 scale-105'
                          : 'border-border hover:border-primary/50 bg-background-tertiary'
                      }`}
                    >
                      {duration.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Advanced Options */}
            <details className="mb-6" open>
              <summary className="cursor-pointer text-sm font-medium text-foreground flex items-center gap-2 mb-4 hover:text-primary transition-colors">
                <Settings className="w-4 h-4" />
                Advanced Options
              </summary>
              <div className="space-y-6 pl-6 pt-2">
                
                {/* Aspect Ratio */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground flex items-center gap-2">
                    <ImageIcon className="w-4 h-4" />
                    Aspect Ratio
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {aspectRatios.map((ratio) => (
                      <button
                        key={ratio.id}
                        onClick={() => setAspectRatio(ratio.id)}
                        className={`px-3 py-2 rounded-lg border-2 transition-all duration-300 hover:scale-105 ${
                          aspectRatio === ratio.id
                            ? 'border-primary bg-primary/10'
                            : 'border-border hover:border-primary/50 bg-background-tertiary'
                        }`}
                      >
                        <div className="text-xs font-bold text-foreground">{ratio.label}</div>
                        <div className="text-xs text-foreground-secondary mt-0.5">{ratio.description}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Video Quality */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground flex items-center gap-2">
                    <Video className="w-4 h-4" />
                    Video Quality
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {qualities.map((quality) => (
                      <button
                        key={quality.id}
                        onClick={() => setVideoQuality(quality.id)}
                        className={`px-4 py-2 rounded-lg border-2 transition-all duration-300 hover:scale-105 ${
                          videoQuality === quality.id
                            ? 'border-primary bg-primary/10'
                            : 'border-border hover:border-primary/50 bg-background-tertiary'
                        }`}
                      >
                        <div className="text-sm font-medium text-foreground">{quality.label}</div>
                        <div className="text-xs text-foreground-secondary">{quality.description}</div>
                      </button>
                    ))}
                  </div>
                </div>
                
                {/* Audio Options Section - Hidden for Veo 3.1 Fast (has native audio) */}
                {selectedModel !== 'veo3.1_fast' && (
                <div className="space-y-3">
                  <label className="text-sm font-medium text-foreground flex items-center gap-2">
                    <Music className="w-4 h-4" />
                    Audio Options
                  </label>
                  
                  {/* Audio Mode Selection */}
                  <div className="grid grid-cols-5 gap-2 mb-4">
                    <button
                      type="button"
                      onClick={() => setAudioMode('none')}
                      className={`px-3 py-2 rounded-lg border-2 transition-all ${
                        audioMode === 'none'
                          ? 'border-primary bg-primary/10'
                          : 'border-border bg-background-tertiary hover:border-primary/50'
                      }`}
                    >
                      <div className="text-xl mb-1">🔇</div>
                      <div className="text-xs font-medium">No Audio</div>
                    </button>
                    
                    <button
                      type="button"
                      onClick={() => setAudioMode('music')}
                      className={`px-3 py-2 rounded-lg border-2 transition-all ${
                        audioMode === 'music'
                          ? 'border-primary bg-primary/10'
                          : 'border-border bg-background-tertiary hover:border-primary/50'
                      }`}
                    >
                      <div className="text-xl mb-1">🎵</div>
                      <div className="text-xs font-medium">Music</div>
                    </button>
                    
                    <button
                      type="button"
                      onClick={() => setAudioMode('voiceover')}
                      className={`px-3 py-2 rounded-lg border-2 transition-all ${
                        audioMode === 'voiceover'
                          ? 'border-primary bg-primary/10'
                          : 'border-border bg-background-tertiary hover:border-primary/50'
                      }`}
                    >
                      <div className="text-xl mb-1">🎤</div>
                      <div className="text-xs font-medium">Voiceover</div>
                    </button>
                    
                    <button
                      type="button"
                      onClick={() => setAudioMode('sound-effects')}
                      className={`px-3 py-2 rounded-lg border-2 transition-all ${
                        audioMode === 'sound-effects'
                          ? 'border-primary bg-primary/10'
                          : 'border-border bg-background-tertiary hover:border-primary/50'
                      }`}
                    >
                      <div className="text-xl mb-1">🔊</div>
                      <div className="text-xs font-medium">Sound FX</div>
                    </button>
                    
                    <button
                      type="button"
                      onClick={() => setAudioMode('custom')}
                      className={`px-3 py-2 rounded-lg border-2 transition-all ${
                        audioMode === 'custom'
                          ? 'border-primary bg-primary/10'
                          : 'border-border bg-background-tertiary hover:border-primary/50'
                      }`}
                    >
                      <div className="text-xl mb-1">📁</div>
                      <div className="text-xs font-medium">Upload</div>
                    </button>
                  </div>

                  {/* Music Library Selection */}
                  {audioMode === 'music' && (
                    <div className="space-y-2 p-3 bg-background-tertiary rounded-lg">
                      <label className="text-xs font-medium text-foreground-secondary">Background Music Track</label>
                      {savedSongs.length > 0 ? (
                        <select 
                          value={selectedSongUrl}
                          onChange={(e) => setSelectedSongUrl(e.target.value)}
                          className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground text-sm"
                        >
                          <option value="">Select from your songs</option>
                          {savedSongs.map((song) => (
                            <option key={song.id} value={song.audioUrl}>
                              {song.title || 'Untitled'}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <div className="w-full px-3 py-2 bg-background-tertiary border border-border rounded-lg text-foreground-secondary text-sm text-center">
                          No saved songs. Go to AI Music to generate songs first.
                        </div>
                      )}
                      <p className="text-xs text-green-500">✓ FREE - No additional credits</p>
                    </div>
                  )}

                  {/* Voice Dubbing Option */}
                  {audioMode === 'voiceover' && (
                    <div className="space-y-3 p-3 bg-background-tertiary rounded-lg">
                      <label className="text-xs font-medium text-foreground-secondary">Voice Audio Source</label>
                      
                      {/* Upload or Record Toggle */}
                      <div className="flex gap-2 mb-3">
                        <button
                          type="button"
                          onClick={() => setRecordingMode('upload')}
                          className={`flex-1 px-3 py-2 rounded-lg border-2 text-sm font-medium transition-all ${
                            recordingMode === 'upload'
                              ? 'border-primary bg-primary/10 text-foreground'
                              : 'border-border bg-background text-foreground-secondary'
                          }`}
                        >
                          📁 Upload File
                        </button>
                        <button
                          type="button"
                          onClick={() => setRecordingMode('record')}
                          className={`flex-1 px-3 py-2 rounded-lg border-2 text-sm font-medium transition-all ${
                            recordingMode === 'record'
                              ? 'border-primary bg-primary/10 text-foreground'
                              : 'border-border bg-background text-foreground-secondary'
                          }`}
                        >
                          🎙️ Record Live
                        </button>
                      </div>

                      {/* Upload Mode */}
                      {recordingMode === 'upload' && (
                        <>
                          <input
                            type="file"
                            accept="audio/*"
                            onChange={(e) => {
                              const file = e.target.files?.[0]
                              if (file) {
                                setVoiceoverFile(file)
                                setVoiceoverUrl(URL.createObjectURL(file))
                              }
                            }}
                            className="w-full text-sm text-foreground file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-white hover:file:bg-primary-hover cursor-pointer"
                          />
                          {voiceoverUrl && (
                            <audio controls className="w-full" src={voiceoverUrl} />
                          )}
                        </>
                      )}

                      {/* Recording Mode */}
                      {recordingMode === 'record' && (
                        <div className="space-y-3">
                          {/* Recording Controls */}
                          <div className="flex items-center justify-between p-4 bg-background rounded-lg border-2 border-border">
                            <div className="flex items-center gap-3">
                              {isRecording ? (
                                <>
                                  <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                                  <span className="text-sm font-mono font-bold text-red-500">
                                    {formatRecordingTime(recordingTime)} / 1:00
                                  </span>
                                </>
                              ) : (
                                <>
                                  <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
                                  <span className="text-sm font-medium text-foreground-secondary">
                                    Ready to record
                                  </span>
                                </>
                              )}
                            </div>
                            
                            {isRecording ? (
                              <button
                                type="button"
                                onClick={stopRecording}
                                className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium text-sm transition-all"
                              >
                                ⏹️ Stop
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={startRecording}
                                disabled={isRecording}
                                className="px-4 py-2 bg-primary hover:bg-primary-hover text-white rounded-lg font-medium text-sm transition-all disabled:opacity-50"
                              >
                                🎤 Start Recording
                              </button>
                            )}
                          </div>

                          {/* Recording Tips */}
                          {!voiceoverUrl && (
                            <div className="text-xs text-foreground-secondary bg-background p-3 rounded-lg border border-border">
                              <p className="font-medium mb-1">💡 Recording Tips:</p>
                              <ul className="space-y-1 ml-4">
                                <li>• Use a quiet environment</li>
                                <li>• Speak clearly 6-12 inches from mic</li>
                                <li>• Maximum recording time: 60 seconds</li>
                                <li>• Click &quot;Stop&quot; when finished</li>
                              </ul>
                            </div>
                          )}

                          {/* Recorded Audio Playback */}
                          {voiceoverUrl && !isRecording && (
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-medium text-green-500">✓ Recording saved</span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setVoiceoverUrl('')
                                    setVoiceoverFile(null)
                                    setRecordingTime(0)
                                  }}
                                  className="text-xs text-red-500 hover:text-red-600 font-medium"
                                >
                                  🗑️ Delete & Re-record
                                </button>
                              </div>
                              <audio controls className="w-full" src={voiceoverUrl} />
                            </div>
                          )}
                        </div>
                      )}

                      {/* Voice Cloning Option */}
                      <div className="flex items-center gap-2 pt-2 border-t border-border">
                        <input
                          type="checkbox"
                          id="voiceCloning"
                          checked={enableVoiceCloning}
                          onChange={(e) => setEnableVoiceCloning(e.target.checked)}
                          className="w-4 h-4"
                        />
                        <label htmlFor="voiceCloning" className="text-xs text-foreground">
                          Enable voice cloning (AI will match your voice tone)
                        </label>
                      </div>
                      <p className="text-xs text-orange-500">⚡ Cost: 1 credit / 2 seconds of audio</p>
                    </div>
                  )}

                  {/* AI Sound Effects */}
                  {audioMode === 'sound-effects' && (
                    <div className="space-y-3 p-3 bg-background-tertiary rounded-lg">
                      <label className="text-xs font-medium text-foreground-secondary">Describe Sound Effect</label>
                      <input
                        type="text"
                        value={soundEffectPrompt}
                        onChange={(e) => setSoundEffectPrompt(e.target.value)}
                        placeholder="e.g., 'birds chirping', 'rain falling', 'car engine'"
                        className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground text-sm"
                      />
                      <div className="text-xs text-foreground-secondary space-y-1">
                        <p>Examples:</p>
                        <div className="flex flex-wrap gap-1">
                          {['Ocean waves', 'City traffic', 'Birds singing', 'Thunder', 'Wind blowing'].map(fx => (
                            <button
                              key={fx}
                              type="button"
                              onClick={() => setSoundEffectPrompt(fx.toLowerCase())}
                              className="px-2 py-1 bg-primary/10 hover:bg-primary/20 rounded text-xs"
                            >
                              {fx}
                            </button>
                          ))}
                        </div>
                      </div>
                      <p className="text-xs text-orange-500">⚡ Cost: 1 credit / 6 seconds of audio</p>
                    </div>
                  )}

                  {/* Custom Audio Upload */}
                  {audioMode === 'custom' && (
                    <div className="space-y-3 p-3 bg-background-tertiary rounded-lg">
                      <label className="text-xs font-medium text-foreground-secondary">Upload Audio File</label>
                      <input
                        type="file"
                        accept="audio/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0]
                          if (file) {
                            setCustomAudioFile(file)
                            setCustomAudioUrl(URL.createObjectURL(file))
                          }
                        }}
                        className="w-full text-sm text-foreground file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-white hover:file:bg-primary-hover cursor-pointer"
                      />
                      {customAudioUrl && (
                        <audio controls className="w-full" src={customAudioUrl} />
                      )}
                      <p className="text-xs text-foreground-secondary">Supported: MP3, WAV, M4A, OGG (max 50MB)</p>
                      <p className="text-xs text-green-500">✓ FREE - Just upload</p>
                    </div>
                  )}

                  {/* Volume Control */}
                  {audioMode !== 'none' && (
                    <div className="space-y-2 p-3 bg-background-tertiary rounded-lg">
                      <label className="text-xs font-medium text-foreground-secondary">
                        Audio Volume: {Math.round(audioVolume * 100)}%
                      </label>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.1"
                        value={audioVolume}
                        onChange={(e) => setAudioVolume(parseFloat(e.target.value))}
                        className="w-full"
                      />
                    </div>
                  )}
                </div>
                )}
              </div>
            </details>

            {/* Generate Button */}
            <div className="space-y-3">
              {/* Credit Cost Display */}
              <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Coins className="w-5 h-5 text-primary" />
                  <span className="text-sm font-medium text-foreground">
                    Cost: <span className="font-bold text-primary">{calculateCreditCost()}</span> credits
                  </span>
                </div>
                <div className="text-xs text-foreground-secondary">
                  {currentPricing.creditsPerSecond} cr/sec × {selectedDuration}s
                </div>
              </div>
              
              {/* Generate Button */}
              <button 
                onClick={handleGenerateVideo}
                disabled={isGenerating || credits.remaining_credits < calculateCreditCost()}
                className="w-full px-6 py-4 bg-primary hover:bg-primary-hover text-white rounded-lg font-bold transition-all duration-300 flex items-center justify-center gap-2 shadow-lg shadow-primary/20 hover:shadow-primary/40 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
              >
                {isGenerating ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Generating... {generationProgress}%
                  </>
                ) : credits.remaining_credits < calculateCreditCost() ? (
                  <>
                    <Coins className="w-5 h-5" />
                    Insufficient Credits
                  </>
                ) : (
                  <>
                    <Wand2 className="w-5 h-5" />
                    Generate Video ({calculateCreditCost()} credits)
                  </>
                )}
              </button>
            </div>

            {/* Generation Progress */}
            {isGenerating && (
              <div className="mt-4 p-4 bg-primary/5 border border-primary/20 rounded-lg animate-slide-up">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-foreground">
                    {generationStatus === 'queued' && '⏳ Queued...'}
                    {generationStatus === 'processing' && '⚙️ Processing...'}
                    {generationStatus === 'rendering' && '🎨 Rendering...'}
                    {generationStatus === 'complete' && '✅ Complete!'}
                    {!['queued', 'processing', 'rendering', 'complete'].includes(generationStatus) && `⚙️ ${generationStatus}`}
                  </span>
                  <span className="text-sm font-bold text-primary">{generationProgress}%</span>
                </div>
                <div className="w-full bg-background-tertiary rounded-full h-2 overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-primary to-primary/80 transition-all duration-500 ease-out"
                    style={{ width: `${generationProgress}%` }}
                  />
                </div>
                
                {/* Show individual clip progress during generation */}
                {generatedClips.length > 1 && (
                  <div className="mt-3 grid grid-cols-4 gap-2">
                    {generatedClips.map((clip, idx) => (
                      <div 
                        key={idx} 
                        className={`p-2 rounded-lg border ${
                          clip.status === 'complete' ? 'border-green-500 bg-green-500/10' :
                          clip.status === 'generating' ? 'border-primary bg-primary/10' :
                          'border-border bg-background-tertiary'
                        }`}
                      >
                        <div className="flex items-center gap-1.5">
                          {clip.status === 'complete' && <Check className="w-3 h-3 text-green-500" />}
                          {clip.status === 'generating' && <Loader2 className="w-3 h-3 text-primary animate-spin" />}
                          <span className="text-xs font-medium">Clip {idx + 1}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                
                <p className="text-xs text-foreground-secondary mt-2">
                  Generating {selectedDuration}s video • {aspectRatio} aspect ratio • This usually takes 30-90 seconds...
                </p>
              </div>
            )}

            {/* ============== MULTI-CLIP PREVIEW SECTION ============== */}
            {clipGenerationPhase === 'preview' && generatedClips.length > 1 && (
              <div className="mt-4 space-y-3 animate-slide-up">
                {/* Compact Header */}
                <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Film className="w-4 h-4 text-blue-500" />
                      <h3 className="text-sm font-bold text-foreground">
                        Review Clips ({generatedClips.filter(c => c.status === 'complete').length}/{generatedClips.length})
                      </h3>
                    </div>
                    <button
                      onClick={resetClipWorkflow}
                      className="text-[10px] text-foreground-secondary hover:text-foreground flex items-center gap-1"
                    >
                      <X className="w-3 h-3" />
                      Reset
                    </button>
                  </div>
                  <p className="text-xs text-foreground-secondary mt-1">
                    Click any clip to preview. Edit clips you want to change, then combine.
                  </p>
                </div>

                {/* Clips Grid - Compact Layout */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  {generatedClips.map((clip, idx) => (
                    <div 
                      key={idx}
                      className={`p-2 rounded-lg border transition-all group ${
                        clip.status === 'complete' ? 'border-green-500/40 bg-green-500/5' :
                        clip.status === 'generating' ? 'border-primary/40 bg-primary/5' :
                        clip.status === 'failed' ? 'border-red-500/40 bg-red-500/5' :
                        'border-border bg-background-tertiary'
                      }`}
                    >
                      {/* Clip Header */}
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-1.5">
                          <span className="px-1.5 py-0.5 bg-primary/20 text-primary text-[10px] font-bold rounded">
                            {idx + 1}
                          </span>
                          <span className="text-[10px] text-foreground-secondary">8s</span>
                        </div>
                        {clip.status === 'complete' && <Check className="w-3 h-3 text-green-500" />}
                        {clip.status === 'generating' && <Loader2 className="w-3 h-3 text-primary animate-spin" />}
                        {clip.status === 'failed' && <X className="w-3 h-3 text-red-500" />}
                      </div>

                      {/* Small Video Preview */}
                      <div className="aspect-video bg-background rounded overflow-hidden mb-1.5">
                        {clip.status === 'complete' && clip.videoUrl ? (
                          <video 
                            src={clip.videoUrl} 
                            className="w-full h-full object-cover cursor-pointer"
                            onClick={(e) => {
                              const video = e.currentTarget
                              if (video.paused) video.play()
                              else video.pause()
                            }}
                            muted
                            loop
                            playsInline
                          />
                        ) : clip.status === 'generating' ? (
                          <div className="w-full h-full flex items-center justify-center">
                            <Loader2 className="w-5 h-5 text-primary animate-spin" />
                          </div>
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Video className="w-4 h-4 text-foreground-secondary" />
                          </div>
                        )}
                      </div>

                      {/* Prompt snippet */}
                      <p className="text-[10px] text-foreground-secondary line-clamp-1 mb-1.5">
                        {clip.prompt.substring(0, 50)}...
                      </p>

                      {/* Edit Button - Compact */}
                      <button
                        onClick={() => openClipEditor(idx)}
                        disabled={clip.status === 'generating'}
                        className="w-full px-2 py-1 bg-background hover:bg-primary/10 border border-border rounded text-[10px] font-medium text-foreground transition-all flex items-center justify-center gap-1 disabled:opacity-50"
                      >
                        <Edit3 className="w-2.5 h-2.5" />
                        {clip.status === 'failed' ? 'Retry' : 'Edit'}
                      </button>
                    </div>
                  ))}
                </div>

                {/* Combine Section - Compact */}
                <div className="flex items-center gap-3">
                  <div className="flex-1 p-2 bg-primary/5 border border-primary/20 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Merge className="w-3.5 h-3.5 text-primary" />
                        <span className="text-xs text-foreground">
                          {generatedClips.filter(c => c.status === 'complete').length} clips ready
                        </span>
                      </div>
                      <span className="text-xs font-medium text-primary">
                        {generatedClips.filter(c => c.status === 'complete').length * 8}s total
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={handleCombineClips}
                    disabled={isCombiningClips || generatedClips.filter(c => c.status === 'complete').length === 0}
                    className="px-4 py-2 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white rounded-lg font-medium text-sm transition-all flex items-center gap-2 shadow-lg hover:shadow-green-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isCombiningClips ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Combining...
                      </>
                    ) : (
                      <>
                        <Merge className="w-4 h-4" />
                        Combine
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
            {/* ============== END MULTI-CLIP PREVIEW SECTION ============== */}

            {/* Combining Progress */}
            {clipGenerationPhase === 'combining' && (
              <div className="mt-4 p-4 bg-primary/5 border border-primary/20 rounded-lg animate-slide-up">
                <div className="flex items-center gap-3 mb-3">
                  <Loader2 className="w-5 h-5 text-primary animate-spin" />
                  <span className="text-sm font-bold text-foreground">Combining clips into final video...</span>
                </div>
                <div className="w-full bg-background-tertiary rounded-full h-2 overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-primary to-green-500 animate-pulse" style={{ width: '60%' }} />
                </div>
                <p className="text-xs text-foreground-secondary mt-2">
                  This may take a minute. Please wait...
                </p>
              </div>
            )}

            {/* Generated Video Preview - Show when complete */}
            {generatedVideoUrl && (clipGenerationPhase === 'complete' || clipGenerationPhase === 'idle') && (
              <div className="mt-4 p-4 bg-green-500/5 border border-green-500/20 rounded-lg animate-slide-up">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Check className="w-5 h-5 text-green-500" />
                    <span className="text-sm font-bold text-foreground">Video Ready!</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-foreground-secondary">
                      Saved to My Media ✓
                    </span>
                  </div>
                </div>
                <div className="aspect-video bg-background-tertiary rounded-lg overflow-hidden mb-3 relative group">
                  <video 
                    src={generatedVideoUrl} 
                    controls 
                    autoPlay
                    className="w-full h-full object-contain"
                  />
                  {/* Fullscreen Icon Overlay */}
                  <button
                    onClick={() => setVideoViewer({
                      isOpen: true,
                      videoUrl: generatedVideoUrl,
                      prompt: prompt || lastGeneratedPrompt || enhancedScript || lastGeneratedEnhancedScript || 'AI Generated Video'
                    })}
                    className="absolute top-3 right-3 w-10 h-10 rounded-full bg-black/50 backdrop-blur-sm hover:bg-black/70 flex items-center justify-center transition-all opacity-0 group-hover:opacity-100 z-10"
                    title="View fullscreen"
                  >
                    <Maximize2 className="w-5 h-5 text-white" />
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2 mb-3">
                  <button 
                    onClick={handleDownload}
                    className="px-4 py-2 bg-primary hover:bg-primary-hover text-white rounded-lg font-medium transition-all duration-300 flex items-center justify-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    Download
                  </button>
                  <button 
                    onClick={() => saveToMyMedia()}
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-all duration-300 flex items-center justify-center gap-2"
                  >
                    <Check className="w-4 h-4" />
                    Save to My Media
                  </button>
                </div>
                {/* Create New Video Button */}
                <button 
                  onClick={() => {
                    setGeneratedVideoUrl('')
                    setClipGenerationPhase('idle')
                    setGeneratedClips([])
                    setPrompt('')
                    setEnhancedScript('')
                    setScriptSections([])
                    setShowEnhancedScript(false)
                  }}
                  className="w-full px-4 py-3 bg-background-tertiary hover:bg-background border border-border rounded-lg font-medium transition-all duration-300 flex items-center justify-center gap-2 text-foreground"
                >
                  <Sparkles className="w-4 h-4" />
                  Create New Video
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right Sidebar */}
        <div className="space-y-6 animate-slide-left">
          
          {/* Audio Features Card */}
          <div className="card p-6 bg-orange-500/5 border-orange-500/20">
            <Music className="w-8 h-8 text-blue-500 mb-3" />
            <h3 className="text-lg font-bold text-foreground mb-3">Audio Features</h3>
            
            <div className="space-y-4 text-sm">
              {/* No Audio */}
              <div className="space-y-1">
                <div className="flex items-center gap-2 font-medium text-foreground">
                  <span>No Audio</span>
                </div>
                <p className="text-xs text-foreground-secondary">
                  Generate silent video with no sound
                </p>
              </div>

              {/* Background Music */}
              <div className="space-y-1">
                <div className="flex items-center gap-2 font-medium text-foreground">
                  <span>Background Music</span>
                </div>
                <p className="text-xs text-foreground-secondary">
                  Choose from 7 music styles: Upbeat, Epic, Calm, Corporate, Electronic, Acoustic, Lo-fi
                </p>
              </div>

              {/* Voiceover */}
              <div className="space-y-1">
                <div className="flex items-center gap-2 font-medium text-foreground">
                  <span>Voiceover</span>
                </div>
                <p className="text-xs text-foreground-secondary">
                  Upload audio file or record live (max 60 sec). AI clones your voice and syncs to video
                </p>
                <div className="space-y-1">
                  <p className="text-xs text-foreground-secondary">
                    • Upload: MP3, WAV, M4A, OGG
                  </p>
                  <p className="text-xs text-foreground-secondary">
                    • Live Recording: Record in browser
                  </p>
                  <p className="text-xs text-foreground-secondary">
                    • Voice Cloning: AI matches tone
                  </p>
                </div>
              </div>

              {/* Sound Effects */}
              <div className="space-y-1">
                <div className="flex items-center gap-2 font-medium text-foreground">
                  <span>Sound Effects</span>
                </div>
                <p className="text-xs text-foreground-secondary">
                  AI generates sound effects from text. Describe any sound: ocean waves, birds chirping, car engine
                </p>
                <div className="mt-1">
                  <p className="text-xs text-foreground-secondary">
                    Examples: Thunder, Rain, City traffic, Wind, Fire crackling
                  </p>
                </div>
              </div>

              {/* Custom Upload */}
              <div className="space-y-1">
                <div className="flex items-center gap-2 font-medium text-foreground">
                  <span>Custom Upload</span>
                </div>
                <p className="text-xs text-foreground-secondary">
                  Upload your own audio file. Perfect for pre-recorded narration or custom soundtracks
                </p>
                <p className="text-xs text-foreground-secondary">
                  Supported: MP3, WAV, M4A, OGG (max 50MB)
                </p>
              </div>

              {/* Volume Control */}
              <div className="pt-3 border-t border-orange-500/20">
                <div className="flex items-center gap-2 font-medium text-foreground mb-1">
                  <span>Volume Control</span>
                </div>
                <p className="text-xs text-foreground-secondary">
                  Adjust audio volume from 0-100% for perfect mixing
                </p>
              </div>
            </div>
          </div>

          {/* Info Card */}
          <div className="card p-6 bg-primary/5 border-primary/20 animate-fade-in">
            <Sparkles className="w-8 h-8 text-primary mb-3 animate-pulse-soft" />
            <h3 className="text-lg font-bold text-foreground mb-2">AI Video Tips</h3>
            <ul className="space-y-2 text-sm text-foreground-secondary">
              <li className="flex gap-2 items-start">
                <span className="text-primary mt-1">•</span>
                <span><strong>Be detailed:</strong> Include actions, settings, characters, colors, mood</span>
              </li>
              {veoVideoStyle === 'dialogue' && (
                <li className="flex gap-2 items-start">
                  <span className="text-primary mt-1">•</span>
                  <span><strong>Add dialogue:</strong> Name: &quot;what they say&quot; - AI preserves every word</span>
                </li>
              )}
              <li className="flex gap-2 items-start">
                <span className="text-primary mt-1">•</span>
                <span><strong>Describe actions:</strong> What characters do, how they move, gestures</span>
              </li>
              <li className="flex gap-2 items-start">
                <span className="text-primary mt-1">•</span>
                <span><strong>Set the scene:</strong> Location, time of day, atmosphere, lighting</span>
              </li>
              <li className="flex gap-2 items-start">
                <span className="text-primary mt-1">•</span>
                <span>Videos take 2-5 minutes to generate</span>
              </li>
            </ul>
          </div>

          {/* Multi-Clip Workflow Info Card */}
          {selectedModel === 'veo3.1_fast' && scriptSections.length > 1 && (
            <div className="card p-6 bg-blue-500/5 border-blue-500/20 animate-fade-in">
              <Film className="w-8 h-8 text-blue-500 mb-3" />
              <h3 className="text-lg font-bold text-foreground mb-2">Multi-Clip Workflow</h3>
              <ul className="space-y-2 text-sm text-foreground-secondary">
                <li className="flex gap-2 items-start">
                  <span className="text-blue-500 mt-1">1.</span>
                  <span>Generate {scriptSections.length} clips (~{Math.ceil(parseInt(selectedDuration) / scriptSections.length)}s each)</span>
                </li>
                <li className="flex gap-2 items-start">
                  <span className="text-blue-500 mt-1">2.</span>
                  <span>Preview each clip individually</span>
                </li>
                <li className="flex gap-2 items-start">
                  <span className="text-blue-500 mt-1">3.</span>
                  <span>Edit any clip you&apos;re not happy with</span>
                </li>
                <li className="flex gap-2 items-start">
                  <span className="text-blue-500 mt-1">4.</span>
                  <span>Combine into final video</span>
                </li>
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* ============== CLIP EDITOR MODAL ============== */}
      {showClipEditor && editingClipIndex !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-lg bg-background border border-border rounded-xl shadow-2xl overflow-hidden animate-scale-in">
            {/* Modal Header - Compact */}
            <div className="flex items-center justify-between p-3 border-b border-border bg-background-secondary">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-primary/10 rounded">
                  <Edit3 className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-foreground">Edit Clip {editingClipIndex + 1}</h3>
                </div>
              </div>
              <button
                onClick={closeClipEditor}
                className="p-1.5 hover:bg-background-tertiary rounded transition-colors"
              >
                <X className="w-4 h-4 text-foreground-secondary" />
              </button>
            </div>

            {/* Modal Body - Compact */}
            <div className="p-4 space-y-3">
              {/* Current Clip Preview - Smaller */}
              {generatedClips[editingClipIndex]?.videoUrl && (
                <div className="aspect-video bg-background-tertiary rounded-lg overflow-hidden max-h-40">
                  <video 
                    src={generatedClips[editingClipIndex].videoUrl} 
                    controls 
                    className="w-full h-full object-contain"
                  />
                </div>
              )}

              {/* Prompt Editor with inline enhance */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-foreground">New Prompt</label>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-orange-500 flex items-center gap-0.5">
                      <Zap className="w-2.5 h-2.5" />
                      5 credits
                    </span>
                    <button
                      onClick={handleEnhanceClipPrompt}
                      disabled={!editingClipPrompt.trim() || isEnhancingClipPrompt}
                      className="px-2 py-0.5 bg-primary/10 hover:bg-primary/20 text-primary rounded text-[10px] font-medium transition-all flex items-center gap-1 disabled:opacity-50"
                    >
                      {isEnhancingClipPrompt ? (
                        <Loader2 className="w-2.5 h-2.5 animate-spin" />
                      ) : (
                        <>
                          <Zap className="w-2.5 h-2.5" />
                          Enhance
                        </>
                      )}
                    </button>
                  </div>
                </div>
                <textarea
                  value={editingClipPrompt}
                  onChange={(e) => setEditingClipPrompt(e.target.value)}
                  placeholder="Describe what you want in this clip..."
                  className="w-full h-20 px-3 py-2 bg-background-tertiary border border-border rounded-lg text-sm text-foreground placeholder:text-foreground-muted focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                />
              </div>

              {/* Credit Cost - Inline */}
              <div className="flex items-center justify-between p-2 bg-orange-500/10 border border-orange-500/20 rounded-lg">
                <div className="flex items-center gap-1.5">
                  <Coins className="w-3.5 h-3.5 text-orange-500" />
                  <span className="text-xs text-foreground">Regeneration</span>
                </div>
                <span className="text-xs font-bold text-orange-500">120 credits</span>
              </div>
            </div>

            {/* Modal Footer - Compact */}
            <div className="flex items-center justify-end gap-2 p-3 border-t border-border bg-background-secondary">
              <button
                onClick={closeClipEditor}
                className="px-3 py-1.5 bg-background-tertiary hover:bg-background text-foreground rounded-lg text-sm font-medium transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleRegenerateClip}
                disabled={!editingClipPrompt.trim() || credits.remaining_credits < 120}
                className="px-3 py-1.5 bg-primary hover:bg-primary-hover text-white rounded-lg text-sm font-medium transition-all flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Regenerate
              </button>
            </div>
          </div>
        </div>
      )}
      {/* ============== END CLIP EDITOR MODAL ============== */}

      {/* ============== EDIT CLIP PROMPT MODAL ============== */}
      {editClipModal.isOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-background-secondary border border-border rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="px-5 py-4 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-primary/20 rounded-lg flex items-center justify-center">
                  <Edit3 className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">Edit Clip {editClipModal.clipIndex + 1}</h3>
                  <p className="text-xs text-foreground-secondary">Modify the prompt for this video clip</p>
                </div>
              </div>
              <button
                onClick={() => setEditClipModal({ isOpen: false, clipIndex: -1, clipText: '' })}
                className="p-2 hover:bg-background-tertiary rounded-lg transition-colors text-foreground-secondary hover:text-foreground"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5">
              <label className="block text-sm font-medium text-foreground mb-2">Clip Prompt</label>
              <textarea
                value={editClipModal.clipText}
                onChange={(e) => setEditClipModal(prev => ({ ...prev, clipText: e.target.value }))}
                className="w-full h-32 px-4 py-3 bg-background-tertiary border border-border rounded-xl text-foreground placeholder-foreground-secondary resize-none focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                placeholder="Describe what happens in this clip..."
                autoFocus
              />
              <p className="text-xs text-foreground-secondary mt-2">
                💡 Describe the scene, action, and any dialogue for this clip
              </p>
            </div>

            {/* Modal Footer */}
            <div className="px-5 py-4 border-t border-border flex items-center justify-end gap-3 bg-background-tertiary/50">
              <button
                onClick={() => setEditClipModal({ isOpen: false, clipIndex: -1, clipText: '' })}
                className="px-4 py-2 text-foreground-secondary hover:text-foreground hover:bg-background-tertiary rounded-lg transition-all text-sm font-medium"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (editClipModal.clipText.trim()) {
                    const newSections = [...scriptSections]
                    newSections[editClipModal.clipIndex] = editClipModal.clipText.trim()
                    setScriptSections(newSections)
                    setEnhancedScript(newSections.map((c, i) => `Clip ${i + 1}: ${c}`).join('\n\n'))
                  }
                  setEditClipModal({ isOpen: false, clipIndex: -1, clipText: '' })
                }}
                disabled={!editClipModal.clipText.trim()}
                className="px-4 py-2 bg-primary hover:bg-primary-hover text-white rounded-lg text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <Check className="w-4 h-4" />
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
      {/* ============== END EDIT CLIP PROMPT MODAL ============== */}
    </div>
  )
}
