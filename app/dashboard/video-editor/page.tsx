'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import {
  Film,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Scissors,
  Trash2,
  Plus,
  Upload,
  Download,
  Settings,
  Type,
  Music,
  Volume2,
  VolumeX,
  Image as ImageIcon,
  Layers,
  Move,
  ZoomIn,
  ZoomOut,
  Maximize2,
  RotateCcw,
  Save,
  FolderOpen,
  Wand2,
  Sparkles,
  Copy,
  ChevronLeft,
  ChevronRight,
  GripVertical,
  Merge,
  Split,
  Clock,
  Palette,
  Sun,
  Contrast,
  Droplets,
  X,
  Check,
  Loader2,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  MoreVertical,
  ArrowUp,
  ArrowDown,
  Undo,
  Redo,
  Grid3X3,
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  Italic,
  Mic,
  Square,
  Circle,
  Triangle,
  Hexagon,
  Star,
  Heart,
  Zap,
  RefreshCw,
  SlidersHorizontal,
  Video,
  Monitor,
  Smartphone,
  Tablet,
  Share2,
  Link2,
  CloudUpload,
  HardDrive,
  FileVideo,
  AlertCircle
} from 'lucide-react'
import { useToast } from '@/lib/components/Toast'

// Types for the video editor
interface VideoClip {
  id: string
  name: string
  duration: number // in seconds
  startTime: number // position on timeline
  trimStart: number // trim from beginning
  trimEnd: number // trim from end
  url: string
  thumbnail: string
  track: number
  volume: number
  muted: boolean
  locked: boolean
  visible: boolean
  filters: VideoFilters
  transitions: {
    in: TransitionType
    out: TransitionType
  }
}

interface AudioClip {
  id: string
  name: string
  duration: number
  startTime: number
  trimStart: number
  trimEnd: number
  url: string
  waveform?: number[]
  track: number
  volume: number
  muted: boolean
  locked: boolean
  fadeIn: number
  fadeOut: number
}

interface TextOverlay {
  id: string
  text: string
  startTime: number
  duration: number
  x: number
  y: number
  fontSize: number
  fontFamily: string
  color: string
  backgroundColor: string
  opacity: number
  animation: TextAnimation
  track: number
}

interface VideoFilters {
  brightness: number
  contrast: number
  saturation: number
  hue: number
  blur: number
  grayscale: boolean
  sepia: boolean
  invert: boolean
}

type TransitionType = 'none' | 'fade' | 'dissolve' | 'slide-left' | 'slide-right' | 'slide-up' | 'slide-down' | 'zoom-in' | 'zoom-out' | 'wipe' | 'blur'
type TextAnimation = 'none' | 'fade-in' | 'slide-up' | 'slide-down' | 'typewriter' | 'bounce' | 'zoom'

interface ProjectSettings {
  name: string
  aspectRatio: '16:9' | '9:16' | '1:1' | '4:5'
  resolution: '720p' | '1080p' | '4K'
  frameRate: 24 | 30 | 60
  duration: number
}

// Default filter values
const defaultFilters: VideoFilters = {
  brightness: 100,
  contrast: 100,
  saturation: 100,
  hue: 0,
  blur: 0,
  grayscale: false,
  sepia: false,
  invert: false
}

// Transition options
const transitionOptions: { id: TransitionType; name: string; icon: any }[] = [
  { id: 'none', name: 'None', icon: X },
  { id: 'fade', name: 'Fade', icon: Droplets },
  { id: 'dissolve', name: 'Dissolve', icon: Sparkles },
  { id: 'slide-left', name: 'Slide Left', icon: ChevronLeft },
  { id: 'slide-right', name: 'Slide Right', icon: ChevronRight },
  { id: 'slide-up', name: 'Slide Up', icon: ArrowUp },
  { id: 'slide-down', name: 'Slide Down', icon: ArrowDown },
  { id: 'zoom-in', name: 'Zoom In', icon: ZoomIn },
  { id: 'zoom-out', name: 'Zoom Out', icon: ZoomOut },
  { id: 'wipe', name: 'Wipe', icon: Layers },
  { id: 'blur', name: 'Blur', icon: Droplets },
]

// Text animation options
const textAnimations: { id: TextAnimation; name: string }[] = [
  { id: 'none', name: 'None' },
  { id: 'fade-in', name: 'Fade In' },
  { id: 'slide-up', name: 'Slide Up' },
  { id: 'slide-down', name: 'Slide Down' },
  { id: 'typewriter', name: 'Typewriter' },
  { id: 'bounce', name: 'Bounce' },
  { id: 'zoom', name: 'Zoom' },
]

// Aspect ratio presets
const aspectRatios = [
  { id: '16:9', name: 'YouTube/TV', icon: Monitor, width: 1920, height: 1080 },
  { id: '9:16', name: 'Instagram/TikTok', icon: Smartphone, width: 1080, height: 1920 },
  { id: '1:1', name: 'Square', icon: Square, width: 1080, height: 1080 },
  { id: '4:5', name: 'Instagram Post', icon: Tablet, width: 1080, height: 1350 },
]

export default function VideoEditorPage() {
  const { showToast, ToastContainer } = useToast()
  
  // Project settings
  const [projectSettings, setProjectSettings] = useState<ProjectSettings>({
    name: 'Untitled Project',
    aspectRatio: '9:16',
    resolution: '1080p',
    frameRate: 30,
    duration: 60
  })

  // Timeline state
  const [videoClips, setVideoClips] = useState<VideoClip[]>([])
  const [audioClips, setAudioClips] = useState<AudioClip[]>([])
  const [textOverlays, setTextOverlays] = useState<TextOverlay[]>([])
  
  // Playback state
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(60)
  const [zoom, setZoom] = useState(100) // Timeline zoom percentage
  
  // Selection state
  const [selectedClipId, setSelectedClipId] = useState<string | null>(null)
  const [selectedClipType, setSelectedClipType] = useState<'video' | 'audio' | 'text' | null>(null)
  
  // Multi-track editing state
  const [videoTracks, setVideoTracks] = useState<number>(2) // Number of video tracks
  const [audioTracks, setAudioTracks] = useState<number>(2) // Number of audio tracks
  const [snapToClips, setSnapToClips] = useState(true) // Snap clips together
  const [snapToPlayhead, setSnapToPlayhead] = useState(true)
  const [showWaveforms, setShowWaveforms] = useState(true)
  const [isDraggingClip, setIsDraggingClip] = useState(false)
  const [dragOffset, setDragOffset] = useState({ x: 0, time: 0 })
  
  // Playback volume
  const [masterVolume, setMasterVolume] = useState(100)
  const [isMuted, setIsMuted] = useState(false)
  
  // UI state
  const [activePanel, setActivePanel] = useState<'media' | 'effects' | 'text' | 'audio' | 'transitions' | 'settings'>('media')
  const [showExportModal, setShowExportModal] = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [exportProgress, setExportProgress] = useState(0)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [timelineScale, setTimelineScale] = useState(50) // pixels per second
  
  // History for undo/redo
  const [history, setHistory] = useState<any[]>([])
  const [historyIndex, setHistoryIndex] = useState(-1)
  
  // Refs
  const timelineRef = useRef<HTMLDivElement>(null)
  const previewRef = useRef<HTMLVideoElement>(null)
  const playheadRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Media library
  const [mediaLibrary, setMediaLibrary] = useState<any[]>([])
  const [isLoadingMedia, setIsLoadingMedia] = useState(false)

  // Load user's media on mount
  useEffect(() => {
    fetchMediaLibrary()
  }, [])

  const fetchMediaLibrary = async () => {
    setIsLoadingMedia(true)
    try {
      const response = await fetch('/api/video/list')
      const data = await response.json()
      if (data.success) {
        setMediaLibrary(data.videos || [])
      }
    } catch (error) {
      console.error('Failed to load media:', error)
    } finally {
      setIsLoadingMedia(false)
    }
  }

  // Format time as MM:SS:FF (minutes:seconds:frames)
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    const frames = Math.floor((seconds % 1) * projectSettings.frameRate)
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}:${frames.toString().padStart(2, '0')}`
  }

  // Calculate total duration from clips
  useEffect(() => {
    const maxEndTime = Math.max(
      ...videoClips.map(c => c.startTime + (c.duration - c.trimStart - c.trimEnd)),
      ...audioClips.map(c => c.startTime + (c.duration - c.trimStart - c.trimEnd)),
      ...textOverlays.map(t => t.startTime + t.duration),
      60 // Minimum 60 seconds
    )
    setDuration(maxEndTime)
  }, [videoClips, audioClips, textOverlays])

  // Sync video preview with current time
  useEffect(() => {
    if (previewRef.current && videoClips.length > 0) {
      // Find the clip that should be playing at currentTime
      const activeClip = videoClips.find(clip => {
        const clipStart = clip.startTime
        const clipEnd = clip.startTime + (clip.duration - clip.trimStart - clip.trimEnd)
        return currentTime >= clipStart && currentTime < clipEnd
      })

      if (activeClip && previewRef.current.src !== activeClip.url) {
        previewRef.current.src = activeClip.url
      }

      if (activeClip) {
        const clipLocalTime = currentTime - activeClip.startTime + activeClip.trimStart
        if (Math.abs(previewRef.current.currentTime - clipLocalTime) > 0.5) {
          previewRef.current.currentTime = clipLocalTime
        }
      }
    }
  }, [currentTime, videoClips])

  // Playback control with video sync
  useEffect(() => {
    let animationId: number
    let lastTime = performance.now()

    const updatePlayback = (time: number) => {
      if (!isPlaying) return
      
      const delta = (time - lastTime) / 1000
      lastTime = time

      setCurrentTime(prev => {
        const newTime = prev + delta
        if (newTime >= duration) {
          setIsPlaying(false)
          if (previewRef.current) previewRef.current.pause()
          return 0
        }
        return newTime
      })

      animationId = requestAnimationFrame(updatePlayback)
    }

    if (isPlaying) {
      if (previewRef.current && videoClips.length > 0) {
        previewRef.current.play().catch(() => {})
      }
      lastTime = performance.now()
      animationId = requestAnimationFrame(updatePlayback)
    } else {
      if (previewRef.current) {
        previewRef.current.pause()
      }
    }

    return () => {
      if (animationId) cancelAnimationFrame(animationId)
    }
  }, [isPlaying, duration, videoClips.length])

  // Get video duration from file
  const getVideoDuration = (file: File): Promise<number> => {
    return new Promise((resolve) => {
      const video = document.createElement('video')
      video.preload = 'metadata'
      video.onloadedmetadata = () => {
        window.URL.revokeObjectURL(video.src)
        resolve(video.duration || 10)
      }
      video.onerror = () => resolve(10)
      video.src = URL.createObjectURL(file)
    })
  }

  // Get audio duration from file
  const getAudioDuration = (file: File): Promise<number> => {
    return new Promise((resolve) => {
      const audio = document.createElement('audio')
      audio.preload = 'metadata'
      audio.onloadedmetadata = () => {
        window.URL.revokeObjectURL(audio.src)
        resolve(audio.duration || 10)
      }
      audio.onerror = () => resolve(10)
      audio.src = URL.createObjectURL(file)
    })
  }

  // Generate video thumbnail
  const generateThumbnail = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const video = document.createElement('video')
      video.preload = 'metadata'
      video.muted = true
      
      video.onloadeddata = () => {
        video.currentTime = 1 // Seek to 1 second
      }
      
      video.onseeked = () => {
        const canvas = document.createElement('canvas')
        canvas.width = 160
        canvas.height = 90
        const ctx = canvas.getContext('2d')
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
          resolve(canvas.toDataURL('image/jpeg', 0.7))
        } else {
          resolve('')
        }
        window.URL.revokeObjectURL(video.src)
      }
      
      video.onerror = () => resolve('')
      video.src = URL.createObjectURL(file)
    })
  }

  // Add video clip to timeline
  const addVideoClip = (mediaItem: any) => {
    const newClip: VideoClip = {
      id: `video-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: mediaItem.name || 'Video Clip',
      duration: mediaItem.duration || 10,
      startTime: getNextAvailableTime(),
      trimStart: 0,
      trimEnd: 0,
      url: mediaItem.url,
      thumbnail: mediaItem.thumbnail || '',
      track: 0,
      volume: 100,
      muted: false,
      locked: false,
      visible: true,
      filters: { ...defaultFilters },
      transitions: { in: 'none', out: 'none' }
    }
    setVideoClips(prev => [...prev, newClip])
    setSelectedClipId(newClip.id)
    setSelectedClipType('video')
    showToast('Video clip added to timeline', 'success')
  }

  // Get next available time on timeline
  const getNextAvailableTime = () => {
    if (videoClips.length === 0) return 0
    const lastClip = videoClips.reduce((latest, clip) => {
      const clipEnd = clip.startTime + (clip.duration - clip.trimStart - clip.trimEnd)
      return clipEnd > latest ? clipEnd : latest
    }, 0)
    return lastClip
  }

  // Add audio clip to timeline
  const addAudioClip = (mediaItem: any) => {
    const newClip: AudioClip = {
      id: `audio-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: mediaItem.name || 'Audio Clip',
      duration: mediaItem.duration || 10,
      startTime: currentTime,
      trimStart: 0,
      trimEnd: 0,
      url: mediaItem.url,
      track: 0,
      volume: 100,
      muted: false,
      locked: false,
      fadeIn: 0,
      fadeOut: 0
    }
    setAudioClips(prev => [...prev, newClip])
    setSelectedClipId(newClip.id)
    setSelectedClipType('audio')
    showToast('Audio added to timeline', 'success')
  }

  // Add text overlay
  const addTextOverlay = () => {
    const newText: TextOverlay = {
      id: `text-${Date.now()}`,
      text: 'Enter text here',
      startTime: currentTime,
      duration: 5,
      x: 50,
      y: 50,
      fontSize: 48,
      fontFamily: 'Inter',
      color: '#ffffff',
      backgroundColor: 'transparent',
      opacity: 100,
      animation: 'fade-in',
      track: 0
    }
    setTextOverlays([...textOverlays, newText])
    setSelectedClipId(newText.id)
    setSelectedClipType('text')
    setActivePanel('text')
    showToast('Text overlay added', 'success')
  }

  // Delete selected clip
  const deleteSelectedClip = () => {
    if (!selectedClipId) return
    
    if (selectedClipType === 'video') {
      setVideoClips(videoClips.filter(c => c.id !== selectedClipId))
    } else if (selectedClipType === 'audio') {
      setAudioClips(audioClips.filter(c => c.id !== selectedClipId))
    } else if (selectedClipType === 'text') {
      setTextOverlays(textOverlays.filter(t => t.id !== selectedClipId))
    }
    
    setSelectedClipId(null)
    setSelectedClipType(null)
    showToast('Clip deleted', 'success')
  }

  // Split clip at current time
  const splitClipAtPlayhead = () => {
    if (!selectedClipId || selectedClipType !== 'video') return
    
    const clip = videoClips.find(c => c.id === selectedClipId)
    if (!clip) return
    
    const clipEnd = clip.startTime + (clip.duration - clip.trimStart - clip.trimEnd)
    
    // Check if playhead is within the clip
    if (currentTime <= clip.startTime || currentTime >= clipEnd) {
      showToast('Position playhead within the clip to split', 'error')
      return
    }
    
    const splitPoint = currentTime - clip.startTime + clip.trimStart
    
    // Create two new clips
    const clip1: VideoClip = {
      ...clip,
      id: `video-${Date.now()}-1`,
      trimEnd: clip.duration - splitPoint
    }
    
    const clip2: VideoClip = {
      ...clip,
      id: `video-${Date.now()}-2`,
      startTime: currentTime,
      trimStart: splitPoint
    }
    
    setVideoClips([
      ...videoClips.filter(c => c.id !== selectedClipId),
      clip1,
      clip2
    ])
    
    showToast('Clip split successfully', 'success')
  }

  // Duplicate clip
  const duplicateClip = () => {
    if (!selectedClipId) return
    
    if (selectedClipType === 'video') {
      const clip = videoClips.find(c => c.id === selectedClipId)
      if (clip) {
        const newClip = {
          ...clip,
          id: `video-${Date.now()}`,
          startTime: clip.startTime + (clip.duration - clip.trimStart - clip.trimEnd) + 0.5
        }
        setVideoClips([...videoClips, newClip])
      }
    } else if (selectedClipType === 'audio') {
      const clip = audioClips.find(c => c.id === selectedClipId)
      if (clip) {
        const newClip = {
          ...clip,
          id: `audio-${Date.now()}`,
          startTime: clip.startTime + (clip.duration - clip.trimStart - clip.trimEnd) + 0.5
        }
        setAudioClips([...audioClips, newClip])
      }
    }
    
    showToast('Clip duplicated', 'success')
  }

  // Move clip to a new position
  const moveClip = (clipId: string, newStartTime: number) => {
    if (selectedClipType === 'video') {
      setVideoClips(videoClips.map(c => 
        c.id === clipId ? { ...c, startTime: Math.max(0, newStartTime) } : c
      ))
    } else if (selectedClipType === 'audio') {
      setAudioClips(audioClips.map(c => 
        c.id === clipId ? { ...c, startTime: Math.max(0, newStartTime) } : c
      ))
    } else if (selectedClipType === 'text') {
      setTextOverlays(textOverlays.map(t => 
        t.id === clipId ? { ...t, startTime: Math.max(0, newStartTime) } : t
      ))
    }
  }

  // Change clip track
  const changeClipTrack = (clipId: string, newTrack: number) => {
    if (selectedClipType === 'video') {
      setVideoClips(videoClips.map(c => 
        c.id === clipId ? { ...c, track: newTrack } : c
      ))
    } else if (selectedClipType === 'audio') {
      setAudioClips(audioClips.map(c => 
        c.id === clipId ? { ...c, track: newTrack } : c
      ))
    }
  }

  // Trim clip from start
  const trimClipStart = (clipId: string, trimAmount: number) => {
    if (selectedClipType === 'video') {
      setVideoClips(videoClips.map(c => {
        if (c.id === clipId) {
          const maxTrim = c.duration - c.trimEnd - 0.5
          const newTrimStart = Math.max(0, Math.min(trimAmount, maxTrim))
          return { ...c, trimStart: newTrimStart, startTime: c.startTime + (newTrimStart - c.trimStart) }
        }
        return c
      }))
    }
  }

  // Trim clip from end
  const trimClipEnd = (clipId: string, trimAmount: number) => {
    if (selectedClipType === 'video') {
      setVideoClips(videoClips.map(c => {
        if (c.id === clipId) {
          const maxTrim = c.duration - c.trimStart - 0.5
          return { ...c, trimEnd: Math.max(0, Math.min(trimAmount, maxTrim)) }
        }
        return c
      }))
    }
  }

  // Set clip volume
  const setClipVolume = (clipId: string, volume: number) => {
    if (selectedClipType === 'video') {
      setVideoClips(videoClips.map(c => 
        c.id === clipId ? { ...c, volume: Math.max(0, Math.min(200, volume)) } : c
      ))
    } else if (selectedClipType === 'audio') {
      setAudioClips(audioClips.map(c => 
        c.id === clipId ? { ...c, volume: Math.max(0, Math.min(200, volume)) } : c
      ))
    }
  }

  // Toggle clip mute
  const toggleClipMute = (clipId: string) => {
    if (selectedClipType === 'video') {
      setVideoClips(videoClips.map(c => 
        c.id === clipId ? { ...c, muted: !c.muted } : c
      ))
    } else if (selectedClipType === 'audio') {
      setAudioClips(audioClips.map(c => 
        c.id === clipId ? { ...c, muted: !c.muted } : c
      ))
    }
  }

  // Lock/unlock clip
  const toggleClipLock = (clipId: string) => {
    if (selectedClipType === 'video') {
      setVideoClips(videoClips.map(c => 
        c.id === clipId ? { ...c, locked: !c.locked } : c
      ))
    } else if (selectedClipType === 'audio') {
      setAudioClips(audioClips.map(c => 
        c.id === clipId ? { ...c, locked: !c.locked } : c
      ))
    }
  }

  // Ripple delete (shift all following clips)
  const rippleDelete = () => {
    if (!selectedClipId) return
    
    if (selectedClipType === 'video') {
      const clip = videoClips.find(c => c.id === selectedClipId)
      if (!clip) return
      
      const clipEnd = clip.startTime + (clip.duration - clip.trimStart - clip.trimEnd)
      const clipDuration = clip.duration - clip.trimStart - clip.trimEnd
      
      // Remove clip and shift all later clips
      setVideoClips(videoClips
        .filter(c => c.id !== selectedClipId)
        .map(c => c.startTime > clip.startTime ? { ...c, startTime: c.startTime - clipDuration } : c)
      )
    }
    
    setSelectedClipId(null)
    showToast('Clip deleted and timeline shifted', 'success')
  }

  // Update video clip filters
  const updateClipFilters = (clipId: string, filters: Partial<VideoFilters>) => {
    setVideoClips(videoClips.map(c => 
      c.id === clipId ? { ...c, filters: { ...c.filters, ...filters } } : c
    ))
  }

  // Update video clip transition
  const updateClipTransition = (clipId: string, type: 'in' | 'out', transition: TransitionType) => {
    setVideoClips(videoClips.map(c => 
      c.id === clipId ? { ...c, transitions: { ...c.transitions, [type]: transition } } : c
    ))
  }

  // Export video
  const exportVideo = async () => {
    if (videoClips.length === 0) {
      showToast('Add at least one video clip to export', 'error')
      return
    }
    
    setIsExporting(true)
    setExportProgress(0)
    
    try {
      // Simulate export progress
      for (let i = 0; i <= 100; i += 5) {
        await new Promise(resolve => setTimeout(resolve, 200))
        setExportProgress(i)
      }
      
      // In a real implementation, this would call a video processing API
      const exportData = {
        settings: projectSettings,
        videoClips,
        audioClips,
        textOverlays
      }
      
      const response = await fetch('/api/video/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(exportData)
      })
      
      const data = await response.json()
      
      if (data.success) {
        showToast('Video exported successfully!', 'success')
      } else {
        throw new Error(data.error || 'Export failed')
      }
    } catch (error: any) {
      console.error('Export failed:', error)
      showToast(error.message || 'Failed to export video', 'error')
    } finally {
      setIsExporting(false)
      setShowExportModal(false)
    }
  }

  // Get selected clip data
  const getSelectedClip = () => {
    if (!selectedClipId) return null
    
    if (selectedClipType === 'video') {
      return videoClips.find(c => c.id === selectedClipId)
    } else if (selectedClipType === 'audio') {
      return audioClips.find(c => c.id === selectedClipId)
    } else if (selectedClipType === 'text') {
      return textOverlays.find(t => t.id === selectedClipId)
    }
    return null
  }

  const selectedClip = getSelectedClip()

  // Handle file upload - direct local file handling
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (!files || files.length === 0) return

    setIsUploading(true)
    setUploadProgress(0)

    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      const isVideo = file.type.startsWith('video/')
      const isAudio = file.type.startsWith('audio/')
      
      if (!isVideo && !isAudio) {
        showToast(`${file.name} is not a valid video or audio file`, 'error')
        continue
      }

      try {
        setUploadProgress(Math.round(((i + 0.5) / files.length) * 100))

        // Create local URL for the file (works immediately without upload)
        const localUrl = URL.createObjectURL(file)
        
        if (isVideo) {
          // Get video metadata
          const videoDuration = await getVideoDuration(file)
          const thumbnail = await generateThumbnail(file)
          
          const mediaItem = {
            name: file.name,
            url: localUrl,
            duration: videoDuration,
            thumbnail: thumbnail
          }
          
          addVideoClip(mediaItem)
        } else if (isAudio) {
          // Get audio metadata
          const audioDuration = await getAudioDuration(file)
          
          const mediaItem = {
            name: file.name,
            url: localUrl,
            duration: audioDuration
          }
          
          addAudioClip(mediaItem)
        }

        setUploadProgress(Math.round(((i + 1) / files.length) * 100))
      } catch (error: any) {
        console.error('Failed to process file:', error)
        showToast(`Failed to add ${file.name}`, 'error')
      }
    }
    
    setIsUploading(false)
    setUploadProgress(0)
    
    // Reset input
    if (event.target) {
      event.target.value = ''
    }
  }

  // Handle drag and drop
  const handleDrop = async (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    event.stopPropagation()
    
    const files = event.dataTransfer.files
    if (files.length === 0) return

    // Create a fake event to reuse handleFileUpload logic
    const fakeEvent = {
      target: { files, value: '' }
    } as unknown as React.ChangeEvent<HTMLInputElement>
    
    await handleFileUpload(fakeEvent)
  }

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    event.stopPropagation()
  }

  // Seek to specific time
  const seekTo = (time: number) => {
    const newTime = Math.max(0, Math.min(duration, time))
    setCurrentTime(newTime)
    
    if (previewRef.current && videoClips.length > 0) {
      const activeClip = videoClips.find(clip => {
        const clipStart = clip.startTime
        const clipEnd = clip.startTime + (clip.duration - clip.trimStart - clip.trimEnd)
        return newTime >= clipStart && newTime < clipEnd
      })
      
      if (activeClip) {
        previewRef.current.currentTime = newTime - activeClip.startTime + activeClip.trimStart
      }
    }
  }

  // Toggle play/pause
  const togglePlayPause = () => {
    if (videoClips.length === 0) {
      showToast('Add a video clip first', 'info')
      return
    }
    setIsPlaying(!isPlaying)
  }

  return (
    <div className="h-[calc(100vh-80px)] flex flex-col bg-background animate-fade-in overflow-hidden">
      <ToastContainer />
      
      {/* Header Bar */}
      <div className="flex items-center justify-between px-4 py-3 bg-background-secondary border-b border-border">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Film className="w-6 h-6 text-primary" />
            <input
              type="text"
              value={projectSettings.name}
              onChange={(e) => setProjectSettings({ ...projectSettings, name: e.target.value })}
              className="bg-transparent border-none text-lg font-semibold text-foreground focus:outline-none focus:ring-0"
            />
          </div>
          
          {/* Undo/Redo */}
          <div className="flex items-center gap-1 border-l border-border pl-4">
            <button className="icon-button" disabled={historyIndex <= 0}>
              <Undo className="w-4 h-4" />
            </button>
            <button className="icon-button" disabled={historyIndex >= history.length - 1}>
              <Redo className="w-4 h-4" />
            </button>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Aspect Ratio Selector */}
          <div className="flex items-center gap-2 bg-background-tertiary rounded-lg p-1">
            {aspectRatios.map((ratio) => (
              <button
                key={ratio.id}
                onClick={() => setProjectSettings({ ...projectSettings, aspectRatio: ratio.id as any })}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-all ${
                  projectSettings.aspectRatio === ratio.id
                    ? 'bg-primary text-primary-foreground'
                    : 'text-foreground-secondary hover:text-foreground hover:bg-background-secondary'
                }`}
              >
                <ratio.icon className="w-4 h-4" />
                <span className="hidden lg:inline">{ratio.id}</span>
              </button>
            ))}
          </div>
          
          {/* Save & Export */}
          <button className="btn-secondary flex items-center gap-2 py-2">
            <Save className="w-4 h-4" />
            <span>Save</span>
          </button>
          <button 
            onClick={() => setShowExportModal(true)}
            className="btn-primary flex items-center gap-2 py-2"
          >
            <Download className="w-4 h-4" />
            <span>Export</span>
          </button>
        </div>
      </div>

      {/* Main Editor Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - Tools & Media */}
        <div className="w-80 bg-background-secondary border-r border-border flex flex-col">
          {/* Panel Tabs */}
          <div className="flex border-b border-border">
            {[
              { id: 'media', icon: FolderOpen, label: 'Media' },
              { id: 'effects', icon: Wand2, label: 'Effects' },
              { id: 'text', icon: Type, label: 'Text' },
              { id: 'audio', icon: Music, label: 'Audio' },
              { id: 'transitions', icon: Layers, label: 'Trans.' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActivePanel(tab.id as any)}
                className={`flex-1 flex flex-col items-center gap-1 py-3 text-xs transition-all ${
                  activePanel === tab.id
                    ? 'text-primary border-b-2 border-primary bg-background-tertiary/50'
                    : 'text-foreground-secondary hover:text-foreground hover:bg-background-tertiary/30'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            ))}
          </div>

          {/* Panel Content */}
          <div className="flex-1 overflow-y-auto p-4">
            {/* Media Panel */}
            {activePanel === 'media' && (
              <div className="space-y-4">
                {/* Hidden file input with ref */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="video/*,audio/*"
                  multiple
                  onChange={handleFileUpload}
                  className="hidden"
                />
                
                {/* Upload Button */}
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className={`flex flex-col items-center justify-center gap-2 w-full py-4 border-2 border-dashed rounded-lg cursor-pointer transition-all ${
                    isUploading 
                      ? 'border-primary bg-primary/10' 
                      : 'border-border hover:border-primary/50 hover:bg-primary/5'
                  }`}
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="w-6 h-6 text-primary animate-spin" />
                      <span className="text-sm text-primary">Uploading... {uploadProgress}%</span>
                      <div className="w-full h-1 bg-background-tertiary rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-primary transition-all duration-300"
                          style={{ width: `${uploadProgress}%` }}
                        />
                      </div>
                    </>
                  ) : (
                    <>
                      <Upload className="w-6 h-6 text-primary" />
                      <span className="text-sm text-foreground-secondary">Click to Upload Video</span>
                      <span className="text-xs text-foreground-muted">or drag & drop files</span>
                    </>
                  )}
                </div>

                {/* Import from My Media */}
                <button
                  onClick={() => setShowImportModal(true)}
                  className="w-full flex items-center justify-center gap-2 py-3 bg-background-tertiary rounded-lg hover:bg-border/50 transition-all"
                >
                  <FolderOpen className="w-5 h-5 text-foreground-secondary" />
                  <span className="text-sm text-foreground-secondary">Import from My Media</span>
                </button>

                {/* Clips on Timeline */}
                {videoClips.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="text-sm font-medium text-foreground flex items-center gap-2">
                      <Film className="w-4 h-4 text-primary" />
                      Timeline Clips ({videoClips.length})
                    </h3>
                    <div className="space-y-2">
                      {videoClips.map((clip, idx) => (
                        <div
                          key={clip.id}
                          onClick={() => {
                            setSelectedClipId(clip.id)
                            setSelectedClipType('video')
                          }}
                          className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-all ${
                            selectedClipId === clip.id
                              ? 'bg-primary/20 ring-1 ring-primary'
                              : 'bg-background-tertiary hover:bg-border/50'
                          }`}
                        >
                          <div className="w-16 h-9 bg-black rounded overflow-hidden flex-shrink-0">
                            {clip.thumbnail ? (
                              <img src={clip.thumbnail} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <Video className="w-4 h-4 text-foreground-muted" />
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-foreground truncate">{clip.name}</p>
                            <p className="text-xs text-foreground-muted">
                              {formatTime(clip.duration - clip.trimStart - clip.trimEnd)}
                            </p>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              setVideoClips(prev => prev.filter(c => c.id !== clip.id))
                              if (selectedClipId === clip.id) {
                                setSelectedClipId(null)
                                setSelectedClipType(null)
                              }
                              showToast('Clip removed', 'success')
                            }}
                            className="p-1 hover:bg-red-500/20 rounded text-foreground-muted hover:text-red-400 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Media Library */}
                <div className="space-y-2">
                  <h3 className="text-sm font-medium text-foreground">Media Library</h3>
                  {isLoadingMedia ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-6 h-6 text-primary animate-spin" />
                    </div>
                  ) : mediaLibrary.length > 0 ? (
                    <div className="grid grid-cols-2 gap-2">
                      {mediaLibrary.map((item, idx) => (
                        <div
                          key={idx}
                          onClick={() => addVideoClip(item)}
                          className="relative aspect-video bg-background-tertiary rounded-lg overflow-hidden cursor-pointer hover:ring-2 hover:ring-primary/50 transition-all group"
                        >
                          {item.thumbnail ? (
                            <img src={item.thumbnail} alt={item.name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Video className="w-8 h-8 text-foreground-muted" />
                            </div>
                          )}
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <Plus className="w-8 h-8 text-white" />
                          </div>
                          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2">
                            <p className="text-xs text-white truncate">{item.name}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-6 text-foreground-muted text-sm">
                      <Video className="w-10 h-10 mx-auto mb-2 opacity-40" />
                      <p>No saved media yet</p>
                      <p className="text-xs mt-1">Upload videos above to get started</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Effects Panel */}
            {activePanel === 'effects' && selectedClipType === 'video' && selectedClip && (
              <div className="space-y-4">
                <h3 className="text-sm font-medium text-foreground">Filters & Effects</h3>
                
                {/* Brightness */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm text-foreground-secondary flex items-center gap-2">
                      <Sun className="w-4 h-4" />
                      Brightness
                    </label>
                    <span className="text-xs text-foreground-muted">{(selectedClip as VideoClip).filters.brightness}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="200"
                    value={(selectedClip as VideoClip).filters.brightness}
                    onChange={(e) => updateClipFilters(selectedClipId!, { brightness: parseInt(e.target.value) })}
                    className="w-full accent-primary"
                  />
                </div>

                {/* Contrast */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm text-foreground-secondary flex items-center gap-2">
                      <Contrast className="w-4 h-4" />
                      Contrast
                    </label>
                    <span className="text-xs text-foreground-muted">{(selectedClip as VideoClip).filters.contrast}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="200"
                    value={(selectedClip as VideoClip).filters.contrast}
                    onChange={(e) => updateClipFilters(selectedClipId!, { contrast: parseInt(e.target.value) })}
                    className="w-full accent-primary"
                  />
                </div>

                {/* Saturation */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm text-foreground-secondary flex items-center gap-2">
                      <Palette className="w-4 h-4" />
                      Saturation
                    </label>
                    <span className="text-xs text-foreground-muted">{(selectedClip as VideoClip).filters.saturation}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="200"
                    value={(selectedClip as VideoClip).filters.saturation}
                    onChange={(e) => updateClipFilters(selectedClipId!, { saturation: parseInt(e.target.value) })}
                    className="w-full accent-primary"
                  />
                </div>

                {/* Blur */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm text-foreground-secondary flex items-center gap-2">
                      <Droplets className="w-4 h-4" />
                      Blur
                    </label>
                    <span className="text-xs text-foreground-muted">{(selectedClip as VideoClip).filters.blur}px</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="20"
                    value={(selectedClip as VideoClip).filters.blur}
                    onChange={(e) => updateClipFilters(selectedClipId!, { blur: parseInt(e.target.value) })}
                    className="w-full accent-primary"
                  />
                </div>

                {/* Filter Toggles */}
                <div className="flex flex-wrap gap-2 pt-2">
                  <button
                    onClick={() => updateClipFilters(selectedClipId!, { grayscale: !(selectedClip as VideoClip).filters.grayscale })}
                    className={`px-3 py-2 rounded-lg text-sm transition-all ${
                      (selectedClip as VideoClip).filters.grayscale
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-background-tertiary text-foreground-secondary hover:bg-border/50'
                    }`}
                  >
                    Grayscale
                  </button>
                  <button
                    onClick={() => updateClipFilters(selectedClipId!, { sepia: !(selectedClip as VideoClip).filters.sepia })}
                    className={`px-3 py-2 rounded-lg text-sm transition-all ${
                      (selectedClip as VideoClip).filters.sepia
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-background-tertiary text-foreground-secondary hover:bg-border/50'
                    }`}
                  >
                    Sepia
                  </button>
                  <button
                    onClick={() => updateClipFilters(selectedClipId!, { invert: !(selectedClip as VideoClip).filters.invert })}
                    className={`px-3 py-2 rounded-lg text-sm transition-all ${
                      (selectedClip as VideoClip).filters.invert
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-background-tertiary text-foreground-secondary hover:bg-border/50'
                    }`}
                  >
                    Invert
                  </button>
                </div>

                {/* Reset Filters */}
                <button
                  onClick={() => updateClipFilters(selectedClipId!, defaultFilters)}
                  className="w-full flex items-center justify-center gap-2 py-2 text-sm text-foreground-secondary hover:text-foreground transition-all"
                >
                  <RotateCcw className="w-4 h-4" />
                  Reset All Filters
                </button>
              </div>
            )}

            {activePanel === 'effects' && (!selectedClip || selectedClipType !== 'video') && (
              <div className="text-center py-8 text-foreground-muted text-sm">
                Select a video clip to edit effects
              </div>
            )}

            {/* Text Panel */}
            {activePanel === 'text' && (
              <div className="space-y-4">
                <button
                  onClick={addTextOverlay}
                  className="w-full flex items-center justify-center gap-2 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary-hover transition-all"
                >
                  <Type className="w-5 h-5" />
                  Add Text Overlay
                </button>

                {selectedClipType === 'text' && selectedClip && (
                  <div className="space-y-4 pt-4 border-t border-border">
                    <h3 className="text-sm font-medium text-foreground">Edit Text</h3>
                    
                    {/* Text Content */}
                    <div className="space-y-2">
                      <label className="text-sm text-foreground-secondary">Text Content</label>
                      <textarea
                        value={(selectedClip as TextOverlay).text}
                        onChange={(e) => setTextOverlays(textOverlays.map(t => 
                          t.id === selectedClipId ? { ...t, text: e.target.value } : t
                        ))}
                        className="input-field h-20 resize-none"
                        placeholder="Enter your text..."
                      />
                    </div>

                    {/* Font Size */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-sm text-foreground-secondary">Font Size</label>
                        <span className="text-xs text-foreground-muted">{(selectedClip as TextOverlay).fontSize}px</span>
                      </div>
                      <input
                        type="range"
                        min="12"
                        max="120"
                        value={(selectedClip as TextOverlay).fontSize}
                        onChange={(e) => setTextOverlays(textOverlays.map(t => 
                          t.id === selectedClipId ? { ...t, fontSize: parseInt(e.target.value) } : t
                        ))}
                        className="w-full accent-primary"
                      />
                    </div>

                    {/* Text Color */}
                    <div className="flex items-center gap-3">
                      <label className="text-sm text-foreground-secondary">Color</label>
                      <input
                        type="color"
                        value={(selectedClip as TextOverlay).color}
                        onChange={(e) => setTextOverlays(textOverlays.map(t => 
                          t.id === selectedClipId ? { ...t, color: e.target.value } : t
                        ))}
                        className="w-10 h-10 rounded-lg cursor-pointer"
                      />
                    </div>

                    {/* Animation */}
                    <div className="space-y-2">
                      <label className="text-sm text-foreground-secondary">Animation</label>
                      <select
                        value={(selectedClip as TextOverlay).animation}
                        onChange={(e) => setTextOverlays(textOverlays.map(t => 
                          t.id === selectedClipId ? { ...t, animation: e.target.value as TextAnimation } : t
                        ))}
                        className="input-field"
                      >
                        {textAnimations.map(anim => (
                          <option key={anim.id} value={anim.id}>{anim.name}</option>
                        ))}
                      </select>
                    </div>

                    {/* Duration */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-sm text-foreground-secondary">Duration</label>
                        <span className="text-xs text-foreground-muted">{(selectedClip as TextOverlay).duration}s</span>
                      </div>
                      <input
                        type="range"
                        min="1"
                        max="30"
                        value={(selectedClip as TextOverlay).duration}
                        onChange={(e) => setTextOverlays(textOverlays.map(t => 
                          t.id === selectedClipId ? { ...t, duration: parseInt(e.target.value) } : t
                        ))}
                        className="w-full accent-primary"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Audio Panel */}
            {activePanel === 'audio' && (
              <div className="space-y-4">
                <label className="flex items-center justify-center gap-2 w-full py-3 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-all">
                  <input
                    type="file"
                    accept="audio/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <Music className="w-5 h-5 text-primary" />
                  <span className="text-sm text-foreground-secondary">Add Audio</span>
                </label>

                {/* Audio clip settings */}
                {selectedClipType === 'audio' && selectedClip && (
                  <div className="space-y-4 pt-4 border-t border-border">
                    <h3 className="text-sm font-medium text-foreground">Audio Settings</h3>
                    
                    {/* Volume */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-sm text-foreground-secondary flex items-center gap-2">
                          <Volume2 className="w-4 h-4" />
                          Volume
                        </label>
                        <span className="text-xs text-foreground-muted">{(selectedClip as AudioClip).volume}%</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="200"
                        value={(selectedClip as AudioClip).volume}
                        onChange={(e) => setAudioClips(audioClips.map(c => 
                          c.id === selectedClipId ? { ...c, volume: parseInt(e.target.value) } : c
                        ))}
                        className="w-full accent-primary"
                      />
                    </div>

                    {/* Fade In */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-sm text-foreground-secondary">Fade In</label>
                        <span className="text-xs text-foreground-muted">{(selectedClip as AudioClip).fadeIn}s</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="5"
                        step="0.1"
                        value={(selectedClip as AudioClip).fadeIn}
                        onChange={(e) => setAudioClips(audioClips.map(c => 
                          c.id === selectedClipId ? { ...c, fadeIn: parseFloat(e.target.value) } : c
                        ))}
                        className="w-full accent-primary"
                      />
                    </div>

                    {/* Fade Out */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-sm text-foreground-secondary">Fade Out</label>
                        <span className="text-xs text-foreground-muted">{(selectedClip as AudioClip).fadeOut}s</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="5"
                        step="0.1"
                        value={(selectedClip as AudioClip).fadeOut}
                        onChange={(e) => setAudioClips(audioClips.map(c => 
                          c.id === selectedClipId ? { ...c, fadeOut: parseFloat(e.target.value) } : c
                        ))}
                        className="w-full accent-primary"
                      />
                    </div>

                    {/* Mute Toggle */}
                    <button
                      onClick={() => setAudioClips(audioClips.map(c => 
                        c.id === selectedClipId ? { ...c, muted: !c.muted } : c
                      ))}
                      className={`w-full flex items-center justify-center gap-2 py-2 rounded-lg transition-all ${
                        (selectedClip as AudioClip).muted
                          ? 'bg-red-500/20 text-red-400'
                          : 'bg-background-tertiary text-foreground-secondary hover:bg-border/50'
                      }`}
                    >
                      {(selectedClip as AudioClip).muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                      {(selectedClip as AudioClip).muted ? 'Unmute' : 'Mute'}
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Transitions Panel */}
            {activePanel === 'transitions' && (
              <div className="space-y-4">
                {selectedClipType === 'video' && selectedClip ? (
                  <>
                    <h3 className="text-sm font-medium text-foreground">Transition In</h3>
                    <div className="grid grid-cols-3 gap-2">
                      {transitionOptions.map((trans) => (
                        <button
                          key={trans.id}
                          onClick={() => updateClipTransition(selectedClipId!, 'in', trans.id)}
                          className={`flex flex-col items-center gap-1 p-3 rounded-lg transition-all ${
                            (selectedClip as VideoClip).transitions.in === trans.id
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-background-tertiary text-foreground-secondary hover:bg-border/50'
                          }`}
                        >
                          <trans.icon className="w-5 h-5" />
                          <span className="text-xs">{trans.name}</span>
                        </button>
                      ))}
                    </div>

                    <h3 className="text-sm font-medium text-foreground pt-4">Transition Out</h3>
                    <div className="grid grid-cols-3 gap-2">
                      {transitionOptions.map((trans) => (
                        <button
                          key={trans.id}
                          onClick={() => updateClipTransition(selectedClipId!, 'out', trans.id)}
                          className={`flex flex-col items-center gap-1 p-3 rounded-lg transition-all ${
                            (selectedClip as VideoClip).transitions.out === trans.id
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-background-tertiary text-foreground-secondary hover:bg-border/50'
                          }`}
                        >
                          <trans.icon className="w-5 h-5" />
                          <span className="text-xs">{trans.name}</span>
                        </button>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="text-center py-8 text-foreground-muted text-sm">
                    Select a video clip to add transitions
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Center - Preview & Timeline */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Preview Area */}
          <div 
            className="flex-1 flex items-center justify-center p-6 bg-background"
            onDrop={handleDrop}
            onDragOver={handleDragOver}
          >
            <div 
              className={`relative bg-black rounded-lg overflow-hidden shadow-2xl ${
                projectSettings.aspectRatio === '16:9' ? 'aspect-video max-w-3xl w-full' :
                projectSettings.aspectRatio === '9:16' ? 'aspect-[9/16] max-h-[60vh]' :
                projectSettings.aspectRatio === '1:1' ? 'aspect-square max-h-[60vh]' :
                'aspect-[4/5] max-h-[60vh]'
              }`}
            >
              {/* Video Preview */}
              {videoClips.length > 0 ? (
                <>
                  <video
                    ref={previewRef}
                    className="w-full h-full object-contain"
                    src={videoClips[0]?.url}
                    playsInline
                    muted={videoClips.find(c => {
                      const clipStart = c.startTime
                      const clipEnd = c.startTime + (c.duration - c.trimStart - c.trimEnd)
                      return currentTime >= clipStart && currentTime < clipEnd
                    })?.muted || false}
                    style={{
                      filter: (() => {
                        const activeClip = videoClips.find(c => {
                          const clipStart = c.startTime
                          const clipEnd = c.startTime + (c.duration - c.trimStart - c.trimEnd)
                          return currentTime >= clipStart && currentTime < clipEnd
                        })
                        if (!activeClip) return 'none'
                        const f = activeClip.filters
                        return `brightness(${f.brightness}%) contrast(${f.contrast}%) saturate(${f.saturation}%) blur(${f.blur}px) ${f.grayscale ? 'grayscale(100%)' : ''} ${f.sepia ? 'sepia(100%)' : ''} ${f.invert ? 'invert(100%)' : ''}`
                      })()
                    }}
                  />
                  {/* Play button overlay when paused */}
                  {!isPlaying && (
                    <div 
                      className="absolute inset-0 flex items-center justify-center bg-black/30 cursor-pointer transition-opacity hover:bg-black/40"
                      onClick={togglePlayPause}
                    >
                      <div className="w-20 h-20 rounded-full bg-primary/90 flex items-center justify-center shadow-xl">
                        <Play className="w-10 h-10 text-white ml-1" />
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div 
                  className="w-full h-full flex flex-col items-center justify-center text-foreground-muted cursor-pointer hover:bg-white/5 transition-colors"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <FileVideo className="w-16 h-16 mb-4 opacity-50" />
                  <p className="text-lg font-medium">Add clips to start editing</p>
                  <p className="text-sm mt-2 text-foreground-muted">Click here or drag & drop video files</p>
                  <button className="mt-4 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors flex items-center gap-2">
                    <Upload className="w-4 h-4" />
                    Upload Video
                  </button>
                </div>
              )}

              {/* Text Overlays Preview */}
              {textOverlays.map(overlay => {
                const isVisible = currentTime >= overlay.startTime && 
                                  currentTime <= overlay.startTime + overlay.duration
                if (!isVisible) return null
                
                return (
                  <div
                    key={overlay.id}
                    className={`absolute transition-all ${
                      selectedClipId === overlay.id ? 'ring-2 ring-primary' : ''
                    }`}
                    style={{
                      left: `${overlay.x}%`,
                      top: `${overlay.y}%`,
                      transform: 'translate(-50%, -50%)',
                      fontSize: `${overlay.fontSize}px`,
                      fontFamily: overlay.fontFamily,
                      color: overlay.color,
                      backgroundColor: overlay.backgroundColor,
                      opacity: overlay.opacity / 100
                    }}
                    onClick={() => {
                      setSelectedClipId(overlay.id)
                      setSelectedClipType('text')
                      setActivePanel('text')
                    }}
                  >
                    {overlay.text}
                  </div>
                )
              })}

              {/* Time Display */}
              <div className="absolute bottom-4 right-4 bg-black/70 backdrop-blur-sm px-3 py-1 rounded-md">
                <span className="text-white text-sm font-mono">
                  {formatTime(currentTime)} / {formatTime(duration)}
                </span>
              </div>
            </div>
          </div>

          {/* Playback Controls */}
          <div className="flex items-center justify-center gap-4 py-4 bg-background-secondary border-t border-b border-border">
            <button
              onClick={() => seekTo(0)}
              className="icon-button"
              title="Go to start"
            >
              <SkipBack className="w-5 h-5" />
            </button>
            <button
              onClick={() => seekTo(currentTime - 5)}
              className="icon-button"
              title="Back 5 seconds"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={togglePlayPause}
              className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary-hover transition-all hover:scale-105 shadow-lg shadow-primary/30"
              title={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-1" />}
            </button>
            <button
              onClick={() => seekTo(currentTime + 5)}
              className="icon-button"
              title="Forward 5 seconds"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
            <button
              onClick={() => seekTo(duration)}
              className="icon-button"
              title="Go to end"
            >
              <SkipForward className="w-5 h-5" />
            </button>
            
            {/* Separator */}
            <div className="w-px h-8 bg-border mx-2" />
            
            {/* Edit Tools */}
            <button
              onClick={splitClipAtPlayhead}
              disabled={!selectedClipId || selectedClipType !== 'video'}
              className="icon-button disabled:opacity-30 disabled:cursor-not-allowed"
              title="Split at playhead (select a video clip first)"
            >
              <Scissors className="w-5 h-5" />
            </button>
            <button
              onClick={duplicateClip}
              disabled={!selectedClipId}
              className="icon-button disabled:opacity-30 disabled:cursor-not-allowed"
              title="Duplicate clip"
            >
              <Copy className="w-5 h-5" />
            </button>
            <button
              onClick={deleteSelectedClip}
              disabled={!selectedClipId}
              className="icon-button disabled:opacity-30 hover:text-red-400"
              title="Delete clip"
            >
              <Trash2 className="w-5 h-5" />
            </button>
            
            {/* Separator */}
            <div className="w-px h-8 bg-border mx-2" />
            
            {/* Volume Control */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsMuted(!isMuted)}
                className="icon-button"
                title={isMuted ? 'Unmute' : 'Mute'}
              >
                {isMuted ? <VolumeX className="w-5 h-5 text-red-400" /> : <Volume2 className="w-5 h-5" />}
              </button>
              <input
                type="range"
                min="0"
                max="100"
                value={isMuted ? 0 : masterVolume}
                onChange={(e) => {
                  setMasterVolume(parseInt(e.target.value))
                  setIsMuted(false)
                }}
                className="w-20 h-1 accent-primary"
              />
            </div>
            
            {/* Time Display */}
            <div className="flex items-center gap-2 text-sm font-mono text-foreground-secondary ml-4">
              <span>{formatTime(currentTime)}</span>
              <span className="text-foreground-muted">/</span>
              <span className="text-foreground-muted">{formatTime(duration)}</span>
            </div>
          </div>
          
          {/* Timeline Scrubber */}
          <div className="px-4 py-2 bg-background-secondary border-t border-border">
            <div 
              className="relative h-2 bg-background-tertiary rounded-full cursor-pointer group"
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect()
                const x = e.clientX - rect.left
                const newTime = (x / rect.width) * duration
                seekTo(newTime)
              }}
            >
              {/* Progress */}
              <div 
                className="absolute inset-y-0 left-0 bg-primary/50 rounded-full"
                style={{ width: `${(currentTime / duration) * 100}%` }}
              />
              {/* Playhead */}
              <div 
                className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-primary rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ left: `calc(${(currentTime / duration) * 100}% - 6px)` }}
              />
            </div>
          </div>

          {/* Timeline */}
          <div className="h-72 bg-background-tertiary overflow-hidden flex flex-col border-t-2 border-border">
            {/* Timeline Header with Controls */}
            <div className="flex items-center justify-between px-3 py-2 bg-background-secondary border-b border-border">
              <div className="flex items-center gap-3">
                <span className="text-xs font-medium text-foreground">Timeline</span>
                
                {/* Snap Controls */}
                <div className="flex items-center gap-2 border-l border-border pl-3">
                  <button
                    onClick={() => setSnapToClips(!snapToClips)}
                    className={`text-[10px] px-2 py-1 rounded transition-colors ${snapToClips ? 'bg-primary/20 text-primary' : 'text-foreground-muted hover:text-foreground'}`}
                    title="Snap to clips"
                  >
                    <Grid3X3 className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => setSnapToPlayhead(!snapToPlayhead)}
                    className={`text-[10px] px-2 py-1 rounded transition-colors ${snapToPlayhead ? 'bg-primary/20 text-primary' : 'text-foreground-muted hover:text-foreground'}`}
                    title="Snap to playhead"
                  >
                    <AlignCenter className="w-3 h-3" />
                  </button>
                </div>
                
                {/* Zoom Controls */}
                <div className="flex items-center gap-1 border-l border-border pl-3">
                  <button
                    onClick={() => setTimelineScale(Math.max(20, timelineScale - 10))}
                    className="icon-button p-1"
                    title="Zoom out"
                  >
                    <ZoomOut className="w-3 h-3" />
                  </button>
                  <div className="w-20 h-1 bg-background-tertiary rounded-full relative mx-1">
                    <div 
                      className="absolute inset-y-0 left-0 bg-primary rounded-full"
                      style={{ width: `${((timelineScale - 20) / 180) * 100}%` }}
                    />
                  </div>
                  <button
                    onClick={() => setTimelineScale(Math.min(200, timelineScale + 10))}
                    className="icon-button p-1"
                    title="Zoom in"
                  >
                    <ZoomIn className="w-3 h-3" />
                  </button>
                  <span className="text-[10px] text-foreground-muted w-8">{timelineScale}px/s</span>
                </div>
              </div>
              
              {/* Timeline Actions */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => seekTo(0)}
                  className="text-[10px] px-2 py-1 rounded text-foreground-muted hover:text-foreground hover:bg-background-tertiary transition-colors"
                >
                  Fit to screen
                </button>
                <span className="text-[10px] text-foreground-muted">
                  {videoClips.length} clips • {formatTime(duration)}
                </span>
              </div>
            </div>

            {/* Time Ruler */}
            <div className="h-8 bg-background-secondary border-b border-border flex items-end overflow-hidden relative" style={{ paddingLeft: '80px' }}>
              <div className="absolute inset-0 flex" style={{ marginLeft: '80px', width: `${Math.max(100, (duration * timelineScale))}px` }}>
                {Array.from({ length: Math.ceil(duration) + 1 }, (_, i) => (
                  <div key={i} className="relative flex-shrink-0" style={{ width: `${timelineScale}px` }}>
                    <div className="absolute bottom-0 left-0 w-px h-4 bg-border" />
                    {i % 5 === 0 && (
                      <span className="absolute bottom-1 left-1 text-[10px] text-foreground-muted whitespace-nowrap">
                        {Math.floor(i / 60)}:{(i % 60).toString().padStart(2, '0')}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Tracks Container */}
            <div 
              ref={timelineRef}
              className="flex-1 overflow-x-auto overflow-y-auto relative"
              onClick={(e) => {
                const rect = timelineRef.current?.getBoundingClientRect()
                if (!rect) return
                const x = e.clientX - rect.left - 80 // subtract track label width
                if (x < 0) return
                const newTime = (x / timelineScale)
                setCurrentTime(Math.max(0, Math.min(duration, newTime)))
              }}
            >
              {/* Playhead - positioned within timeline tracks only */}
              <div
                ref={playheadRef}
                className="absolute top-0 bottom-0 w-0.5 bg-primary z-20 pointer-events-none"
                style={{ left: `${80 + (currentTime * timelineScale)}px` }}
              >
                <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-r-[6px] border-t-[8px] border-l-transparent border-r-transparent border-t-primary" />
              </div>

              {/* Video Track 1 */}
              <div className="h-16 border-b border-border flex items-center relative bg-background-tertiary/50">
                <div className="w-20 flex-shrink-0 px-2 flex items-center gap-1 bg-background-secondary border-r border-border h-full">
                  <Video className="w-3 h-3 text-primary" />
                  <span className="text-[10px] text-foreground-secondary">Video 1</span>
                </div>
                <div className="relative h-full py-1" style={{ width: `${Math.max(duration * timelineScale, 500)}px` }}>
                  {videoClips.filter(c => c.track === 0).map(clip => {
                    const clipDuration = clip.duration - clip.trimStart - clip.trimEnd
                    const clipLeft = clip.startTime * timelineScale
                    const clipWidth = clipDuration * timelineScale
                    
                    return (
                      <div
                        key={clip.id}
                        onClick={(e) => {
                          e.stopPropagation()
                          setSelectedClipId(clip.id)
                          setSelectedClipType('video')
                        }}
                        className={`absolute top-1 bottom-1 rounded cursor-pointer transition-all group ${
                          selectedClipId === clip.id
                            ? 'ring-2 ring-primary shadow-lg shadow-primary/30 z-10'
                            : 'hover:ring-1 hover:ring-primary/50'
                        }`}
                        style={{
                          left: `${clipLeft}px`,
                          width: `${Math.max(clipWidth, 30)}px`
                        }}
                      >
                        <div className="w-full h-full bg-gradient-to-b from-primary/40 to-primary/20 border border-primary/60 rounded flex items-center gap-1 px-1 overflow-hidden">
                          {clip.thumbnail && (
                            <img src={clip.thumbnail} alt="" className="h-full w-10 object-cover rounded flex-shrink-0" />
                          )}
                          <span className="text-[10px] text-foreground truncate font-medium">{clip.name}</span>
                          <span className="text-[9px] text-foreground-muted ml-auto flex-shrink-0">{formatTime(clipDuration)}</span>
                        </div>
                        {/* Resize handles */}
                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary/60 opacity-0 group-hover:opacity-100 cursor-ew-resize" />
                        <div className="absolute right-0 top-0 bottom-0 w-1 bg-primary/60 opacity-0 group-hover:opacity-100 cursor-ew-resize" />
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Video Track 2 */}
              <div className="h-14 border-b border-border flex items-center relative bg-background-tertiary/30">
                <div className="w-20 flex-shrink-0 px-2 flex items-center gap-1 bg-background-secondary border-r border-border h-full">
                  <Video className="w-3 h-3 text-primary/70" />
                  <span className="text-[10px] text-foreground-muted">Video 2</span>
                </div>
                <div className="relative h-full py-1" style={{ width: `${Math.max(duration * timelineScale, 500)}px` }}>
                  {videoClips.filter(c => c.track === 1).map(clip => {
                    const clipDuration = clip.duration - clip.trimStart - clip.trimEnd
                    const clipLeft = clip.startTime * timelineScale
                    const clipWidth = clipDuration * timelineScale
                    
                    return (
                      <div
                        key={clip.id}
                        onClick={(e) => {
                          e.stopPropagation()
                          setSelectedClipId(clip.id)
                          setSelectedClipType('video')
                        }}
                        className={`absolute top-1 bottom-1 rounded cursor-pointer transition-all group ${
                          selectedClipId === clip.id
                            ? 'ring-2 ring-primary shadow-lg shadow-primary/30 z-10'
                            : 'hover:ring-1 hover:ring-primary/50'
                        }`}
                        style={{
                          left: `${clipLeft}px`,
                          width: `${Math.max(clipWidth, 30)}px`
                        }}
                      >
                        <div className="w-full h-full bg-gradient-to-b from-teal/40 to-teal/20 border border-teal/60 rounded flex items-center gap-1 px-1 overflow-hidden">
                          {clip.thumbnail && (
                            <img src={clip.thumbnail} alt="" className="h-full w-8 object-cover rounded flex-shrink-0" />
                          )}
                          <span className="text-[10px] text-foreground truncate">{clip.name}</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Audio Track 1 */}
              <div className="h-12 border-b border-border flex items-center relative bg-green-950/20">
                <div className="w-20 flex-shrink-0 px-2 flex items-center gap-1 bg-background-secondary border-r border-border h-full">
                  <Music className="w-3 h-3 text-green-400" />
                  <span className="text-[10px] text-foreground-secondary">Audio 1</span>
                </div>
                <div className="relative h-full py-1" style={{ width: `${Math.max(duration * timelineScale, 500)}px` }}>
                  {audioClips.filter(c => c.track === 0).map(clip => {
                    const clipDuration = clip.duration - clip.trimStart - clip.trimEnd
                    const clipLeft = clip.startTime * timelineScale
                    const clipWidth = clipDuration * timelineScale
                    
                    return (
                      <div
                        key={clip.id}
                        onClick={(e) => {
                          e.stopPropagation()
                          setSelectedClipId(clip.id)
                          setSelectedClipType('audio')
                          setActivePanel('audio')
                        }}
                        className={`absolute top-1 bottom-1 rounded cursor-pointer transition-all group ${
                          selectedClipId === clip.id
                            ? 'ring-2 ring-green-400 shadow-lg shadow-green-400/30 z-10'
                            : 'hover:ring-1 hover:ring-green-400/50'
                        }`}
                        style={{
                          left: `${clipLeft}px`,
                          width: `${Math.max(clipWidth, 30)}px`
                        }}
                      >
                        <div className="w-full h-full bg-gradient-to-b from-green-500/40 to-green-500/20 border border-green-500/60 rounded flex items-center gap-1 px-1 overflow-hidden">
                          <Music className="w-3 h-3 text-green-400 flex-shrink-0" />
                          <span className="text-[10px] text-foreground truncate">{clip.name}</span>
                          {clip.muted && <VolumeX className="w-3 h-3 text-red-400 ml-auto flex-shrink-0" />}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Text/Caption Track */}
              <div className="h-10 border-b border-border flex items-center relative bg-yellow-950/10">
                <div className="w-20 flex-shrink-0 px-2 flex items-center gap-1 bg-background-secondary border-r border-border h-full">
                  <Type className="w-3 h-3 text-yellow-400" />
                  <span className="text-[10px] text-foreground-secondary">Captions</span>
                </div>
                <div className="relative h-full py-1" style={{ width: `${Math.max(duration * timelineScale, 500)}px` }}>
                  {textOverlays.map(overlay => {
                    const clipLeft = overlay.startTime * timelineScale
                    const clipWidth = overlay.duration * timelineScale
                    
                    return (
                      <div
                        key={overlay.id}
                        onClick={(e) => {
                          e.stopPropagation()
                          setSelectedClipId(overlay.id)
                          setSelectedClipType('text')
                          setActivePanel('text')
                        }}
                        className={`absolute top-1 bottom-1 rounded cursor-pointer transition-all group ${
                          selectedClipId === overlay.id
                            ? 'ring-2 ring-yellow-400 shadow-lg shadow-yellow-400/30 z-10'
                            : 'hover:ring-1 hover:ring-yellow-400/50'
                        }`}
                        style={{
                          left: `${clipLeft}px`,
                          width: `${Math.max(clipWidth, 30)}px`
                        }}
                      >
                        <div className="w-full h-full bg-gradient-to-b from-yellow-500/40 to-yellow-500/20 border border-yellow-500/60 rounded flex items-center gap-1 px-1 overflow-hidden">
                          <Type className="w-3 h-3 text-yellow-400 flex-shrink-0" />
                          <span className="text-[10px] text-foreground truncate">{overlay.text}</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Panel - Properties */}
        <div className="w-80 bg-background-secondary border-l border-border flex flex-col">
          <div className="p-3 border-b border-border flex items-center justify-between">
            <h3 className="text-sm font-medium text-foreground">
              {selectedClip ? `${selectedClipType?.charAt(0).toUpperCase()}${selectedClipType?.slice(1)} Properties` : 'Properties'}
            </h3>
            {selectedClip && (
              <div className="flex items-center gap-1">
                <button 
                  onClick={() => toggleClipLock(selectedClipId!)}
                  className="icon-button p-1"
                  title={(selectedClip as any).locked ? 'Unlock' : 'Lock'}
                >
                  {(selectedClip as any).locked ? <Lock className="w-3 h-3 text-yellow-400" /> : <Unlock className="w-3 h-3" />}
                </button>
                <button 
                  onClick={() => toggleClipMute(selectedClipId!)}
                  className="icon-button p-1"
                  title={(selectedClip as any).muted ? 'Unmute' : 'Mute'}
                >
                  {(selectedClip as any).muted ? <VolumeX className="w-3 h-3 text-red-400" /> : <Volume2 className="w-3 h-3" />}
                </button>
              </div>
            )}
          </div>
          
          <div className="flex-1 overflow-y-auto p-3">
            {selectedClip ? (
              <div className="space-y-4">
                {/* Basic Info */}
                <div className="bg-background-tertiary rounded-lg p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-foreground-muted">Name</span>
                    <span className="text-xs text-foreground font-medium truncate max-w-[60%]">{(selectedClip as any).name || (selectedClip as any).text}</span>
                  </div>
                  
                  {selectedClipType !== 'text' && (
                    <>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-foreground-muted">Duration</span>
                        <span className="text-xs text-foreground font-mono">
                          {formatTime((selectedClip as VideoClip | AudioClip).duration - 
                            (selectedClip as VideoClip | AudioClip).trimStart - 
                            (selectedClip as VideoClip | AudioClip).trimEnd)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-foreground-muted">Original</span>
                        <span className="text-xs text-foreground-muted font-mono">
                          {formatTime((selectedClip as VideoClip | AudioClip).duration)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-foreground-muted">Start Time</span>
                        <span className="text-xs text-foreground font-mono">{formatTime((selectedClip as any).startTime)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-foreground-muted">Track</span>
                        <select 
                          value={(selectedClip as any).track}
                          onChange={(e) => changeClipTrack(selectedClipId!, parseInt(e.target.value))}
                          className="text-xs bg-background-secondary border border-border rounded px-2 py-1 text-foreground"
                        >
                          <option value={0}>Track 1</option>
                          <option value={1}>Track 2</option>
                        </select>
                      </div>
                    </>
                  )}
                </div>

                {/* Trim Controls */}
                {selectedClipType === 'video' && (
                  <div className="bg-background-tertiary rounded-lg p-3 space-y-3">
                    <h4 className="text-xs font-medium text-foreground flex items-center gap-2">
                      <Scissors className="w-3 h-3" /> Trim
                    </h4>
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] text-foreground-muted">Trim Start</span>
                        <span className="text-[10px] text-foreground-muted font-mono">{formatTime((selectedClip as VideoClip).trimStart)}</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max={(selectedClip as VideoClip).duration - (selectedClip as VideoClip).trimEnd - 0.5}
                        step="0.1"
                        value={(selectedClip as VideoClip).trimStart}
                        onChange={(e) => trimClipStart(selectedClipId!, parseFloat(e.target.value))}
                        className="w-full h-1 accent-primary"
                      />
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] text-foreground-muted">Trim End</span>
                        <span className="text-[10px] text-foreground-muted font-mono">{formatTime((selectedClip as VideoClip).trimEnd)}</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max={(selectedClip as VideoClip).duration - (selectedClip as VideoClip).trimStart - 0.5}
                        step="0.1"
                        value={(selectedClip as VideoClip).trimEnd}
                        onChange={(e) => trimClipEnd(selectedClipId!, parseFloat(e.target.value))}
                        className="w-full h-1 accent-primary"
                      />
                    </div>
                  </div>
                )}

                {/* Volume Control */}
                {(selectedClipType === 'video' || selectedClipType === 'audio') && (
                  <div className="bg-background-tertiary rounded-lg p-3 space-y-3">
                    <h4 className="text-xs font-medium text-foreground flex items-center gap-2">
                      <Volume2 className="w-3 h-3" /> Volume
                    </h4>
                    <div className="flex items-center gap-3">
                      <button 
                        onClick={() => toggleClipMute(selectedClipId!)}
                        className={`p-1.5 rounded ${(selectedClip as any).muted ? 'bg-red-500/20 text-red-400' : 'bg-background-secondary text-foreground-muted'}`}
                      >
                        {(selectedClip as any).muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                      </button>
                      <input
                        type="range"
                        min="0"
                        max="200"
                        value={(selectedClip as any).volume}
                        onChange={(e) => setClipVolume(selectedClipId!, parseInt(e.target.value))}
                        className="flex-1 h-1 accent-primary"
                        disabled={(selectedClip as any).muted}
                      />
                      <span className="text-xs text-foreground w-10 text-right">{(selectedClip as any).volume}%</span>
                    </div>
                  </div>
                )}

                {/* Video Filters */}
                {selectedClipType === 'video' && (
                  <div className="bg-background-tertiary rounded-lg p-3 space-y-3">
                    <h4 className="text-xs font-medium text-foreground flex items-center gap-2">
                      <SlidersHorizontal className="w-3 h-3" /> Adjustments
                    </h4>
                    {[
                      { key: 'brightness', label: 'Brightness', icon: Sun, min: 0, max: 200 },
                      { key: 'contrast', label: 'Contrast', icon: Contrast, min: 0, max: 200 },
                      { key: 'saturation', label: 'Saturation', icon: Palette, min: 0, max: 200 },
                    ].map(({ key, label, icon: Icon, min, max }) => (
                      <div key={key}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] text-foreground-muted flex items-center gap-1">
                            <Icon className="w-3 h-3" /> {label}
                          </span>
                          <span className="text-[10px] text-foreground-muted">{(selectedClip as VideoClip).filters[key as keyof VideoFilters]}%</span>
                        </div>
                        <input
                          type="range"
                          min={min}
                          max={max}
                          value={(selectedClip as VideoClip).filters[key as keyof VideoFilters] as number}
                          onChange={(e) => updateClipFilters(selectedClipId!, { [key]: parseInt(e.target.value) })}
                          className="w-full h-1 accent-primary"
                        />
                      </div>
                    ))}
                    <div className="flex flex-wrap gap-2 pt-2">
                      {[
                        { key: 'grayscale', label: 'B&W' },
                        { key: 'sepia', label: 'Sepia' },
                        { key: 'invert', label: 'Invert' },
                      ].map(({ key, label }) => (
                        <button
                          key={key}
                          onClick={() => updateClipFilters(selectedClipId!, { [key]: !(selectedClip as VideoClip).filters[key as keyof VideoFilters] })}
                          className={`text-[10px] px-2 py-1 rounded transition-colors ${
                            (selectedClip as VideoClip).filters[key as keyof VideoFilters]
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-background-secondary text-foreground-muted hover:text-foreground'
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                      <button
                        onClick={() => updateClipFilters(selectedClipId!, defaultFilters)}
                        className="text-[10px] px-2 py-1 rounded bg-background-secondary text-foreground-muted hover:text-foreground transition-colors"
                      >
                        Reset
                      </button>
                    </div>
                  </div>
                )}

                {/* Clip Actions */}
                <div className="space-y-2 pt-2">
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={duplicateClip}
                      className="flex items-center justify-center gap-1.5 px-2 py-2 text-xs text-foreground-secondary hover:text-foreground bg-background-tertiary rounded-lg hover:bg-border/50 transition-all"
                    >
                      <Copy className="w-3 h-3" />
                      Duplicate
                    </button>
                    
                    {selectedClipType === 'video' && (
                      <button
                        onClick={splitClipAtPlayhead}
                        className="flex items-center justify-center gap-1.5 px-2 py-2 text-xs text-foreground-secondary hover:text-foreground bg-background-tertiary rounded-lg hover:bg-border/50 transition-all"
                      >
                        <Scissors className="w-3 h-3" />
                        Split
                      </button>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={rippleDelete}
                      className="flex items-center justify-center gap-1.5 px-2 py-2 text-xs text-orange-400 hover:text-orange-300 bg-orange-500/10 rounded-lg hover:bg-orange-500/20 transition-all"
                    >
                      <Trash2 className="w-3 h-3" />
                      Ripple Del
                    </button>
                    <button
                      onClick={deleteSelectedClip}
                      className="flex items-center justify-center gap-1.5 px-2 py-2 text-xs text-red-400 hover:text-red-300 bg-red-500/10 rounded-lg hover:bg-red-500/20 transition-all"
                    >
                      <Trash2 className="w-3 h-3" />
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <Settings className="w-10 h-10 mx-auto text-foreground-muted mb-3 opacity-50" />
                <p className="text-sm text-foreground-muted">Select a clip to view properties</p>
                <p className="text-xs text-foreground-muted mt-1">Click on any clip in the timeline</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Export Modal */}
      {showExportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-background-secondary rounded-xl border border-border w-full max-w-md animate-scale-in">
            <div className="p-6 border-b border-border">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-foreground">Export Video</h2>
                <button onClick={() => setShowExportModal(false)} className="icon-button">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            
            <div className="p-6 space-y-4">
              {/* Resolution */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Resolution</label>
                <div className="grid grid-cols-3 gap-2">
                  {['720p', '1080p', '4K'].map((res) => (
                    <button
                      key={res}
                      onClick={() => setProjectSettings({ ...projectSettings, resolution: res as any })}
                      className={`py-2 px-4 rounded-lg text-sm transition-all ${
                        projectSettings.resolution === res
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-background-tertiary text-foreground-secondary hover:bg-border/50'
                      }`}
                    >
                      {res}
                    </button>
                  ))}
                </div>
              </div>

              {/* Frame Rate */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Frame Rate</label>
                <div className="grid grid-cols-3 gap-2">
                  {[24, 30, 60].map((fps) => (
                    <button
                      key={fps}
                      onClick={() => setProjectSettings({ ...projectSettings, frameRate: fps as any })}
                      className={`py-2 px-4 rounded-lg text-sm transition-all ${
                        projectSettings.frameRate === fps
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-background-tertiary text-foreground-secondary hover:bg-border/50'
                      }`}
                    >
                      {fps} fps
                    </button>
                  ))}
                </div>
              </div>

              {/* Estimated Size */}
              <div className="p-4 bg-background-tertiary rounded-lg">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-foreground-muted">Estimated Size</span>
                  <span className="text-foreground font-medium">
                    ~{Math.round(duration * (projectSettings.resolution === '4K' ? 5 : projectSettings.resolution === '1080p' ? 2 : 1))} MB
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm mt-2">
                  <span className="text-foreground-muted">Duration</span>
                  <span className="text-foreground font-medium">{formatTime(duration)}</span>
                </div>
              </div>

              {/* Export Progress */}
              {isExporting && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-foreground-secondary">Exporting...</span>
                    <span className="text-primary">{exportProgress}%</span>
                  </div>
                  <div className="w-full h-2 bg-background-tertiary rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-primary transition-all duration-300"
                      style={{ width: `${exportProgress}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
            
            <div className="p-6 border-t border-border">
              <button
                onClick={exportVideo}
                disabled={isExporting || videoClips.length === 0}
                className="w-full btn-primary flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isExporting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Exporting...
                  </>
                ) : (
                  <>
                    <Download className="w-5 h-5" />
                    Export Video
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-background-secondary rounded-xl border border-border w-full max-w-2xl max-h-[80vh] flex flex-col animate-scale-in">
            <div className="p-6 border-b border-border">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-foreground">Import from My Media</h2>
                <button onClick={() => setShowImportModal(false)} className="icon-button">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6">
              {isLoadingMedia ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 text-primary animate-spin" />
                </div>
              ) : mediaLibrary.length > 0 ? (
                <div className="grid grid-cols-3 gap-4">
                  {mediaLibrary.map((item, idx) => (
                    <div
                      key={idx}
                      onClick={() => {
                        addVideoClip(item)
                        setShowImportModal(false)
                      }}
                      className="relative aspect-video bg-background-tertiary rounded-lg overflow-hidden cursor-pointer hover:ring-2 hover:ring-primary/50 transition-all group"
                    >
                      {item.thumbnail ? (
                        <img src={item.thumbnail} alt={item.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Video className="w-12 h-12 text-foreground-muted" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Plus className="w-10 h-10 text-white" />
                      </div>
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3">
                        <p className="text-sm text-white truncate">{item.name}</p>
                        <p className="text-xs text-white/60">{item.duration}s</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <FolderOpen className="w-16 h-16 mx-auto text-foreground-muted mb-4 opacity-50" />
                  <p className="text-foreground-muted">No media files found</p>
                  <p className="text-sm text-foreground-muted mt-2">Generate videos in AI Video or upload files</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
