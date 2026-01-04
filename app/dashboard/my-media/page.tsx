'use client'

import { useState, useEffect } from 'react'
import { 
  Image as ImageIcon, 
  Video, 
  Download, 
  Trash2,
  Play,
  Pause,
  Clock,
  Filter,
  Sparkles,
  Wand2,
  Copy,
  Check,
  X,
  ZoomIn
} from 'lucide-react'
import { useToast } from '@/lib/components/Toast'

interface MediaItem {
  id: string
  type: 'photo' | 'video'
  url: string
  prompt: string
  enhancedPrompt?: string
  model?: string
  created_at: string
}

interface PromptModalProps {
  isOpen: boolean
  onClose: () => void
  prompt: string
  enhancedPrompt?: string
  type: 'photo' | 'video'
}

function PromptModal({ isOpen, onClose, prompt, enhancedPrompt, type }: PromptModalProps) {
  const [copied, setCopied] = useState(false)
  
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 animate-fade-in" onClick={onClose}>
      <div className="bg-background-secondary rounded-xl max-w-3xl w-full max-h-[85vh] overflow-y-auto animate-scale-in shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="p-6 space-y-5">
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-border">
            <h2 className="text-2xl font-bold text-foreground flex items-center gap-3">
              {type === 'photo' ? (
                <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <ImageIcon className="w-6 h-6 text-blue-500" />
                </div>
              ) : (
                <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                  <Video className="w-6 h-6 text-purple-500" />
                </div>
              )}
              {type === 'photo' ? 'Photo' : 'Video'} Generation Details
            </h2>
            <button
              onClick={onClose}
              className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-background-tertiary transition-colors text-foreground-secondary hover:text-foreground"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Prompt Sections */}
          <div className="space-y-4">
            {/* Original Prompt */}
            <div className="bg-background-tertiary rounded-lg border border-border overflow-hidden">
              <div className="flex items-center justify-between p-3 bg-background border-b border-border">
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-primary" />
                  Original Prompt
                </h3>
                <button
                  onClick={() => copyToClipboard(prompt || '')}
                  className="px-3 py-1 text-xs bg-primary/10 hover:bg-primary/20 text-primary rounded-md transition-all flex items-center gap-1"
                >
                  {copied ? (
                    <>
                      <Check className="w-3 h-3" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      Copy
                    </>
                  )}
                </button>
              </div>
              <div className="p-4">
                <p className="text-foreground leading-relaxed whitespace-pre-wrap text-sm">
                  {prompt || 'No prompt available'}
                </p>
              </div>
            </div>

            {/* Enhanced Prompt */}
            {enhancedPrompt && enhancedPrompt.trim() && (
              <div className="bg-gradient-to-br from-primary/5 to-primary/10 rounded-lg border border-primary/20 overflow-hidden">
                <div className="flex items-center justify-between p-3 bg-background/50 border-b border-primary/20">
                  <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <Wand2 className="w-4 h-4 text-primary" />
                    AI Enhanced Prompt
                  </h3>
                  <button
                    onClick={() => copyToClipboard(enhancedPrompt)}
                    className="px-3 py-1 text-xs bg-primary/10 hover:bg-primary/20 text-primary rounded-md transition-all flex items-center gap-1"
                  >
                    {copied ? (
                      <>
                        <Check className="w-3 h-3" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        Copy
                      </>
                    )}
                  </button>
                </div>
                <div className="p-4">
                  <p className="text-foreground leading-relaxed whitespace-pre-wrap text-sm">
                    {enhancedPrompt}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Info Note */}
          <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
            <p className="text-xs text-foreground-secondary flex items-start gap-2">
              <Sparkles className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
              <span>
                These prompts were used to generate this {type === 'photo' ? 'image' : 'video'}. 
                You can copy and reuse them to create similar content.
              </span>
            </p>
          </div>

          {/* Close Button */}
          <button
            onClick={onClose}
            className="w-full py-3 bg-primary hover:bg-primary/90 text-white rounded-lg font-medium transition-all shadow-lg hover:shadow-xl"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

// Image Viewer Modal Component
function ImageViewerModal({ isOpen, onClose, imageUrl, prompt }: { isOpen: boolean, onClose: () => void, imageUrl: string, prompt: string }) {
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
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 animate-fade-in backdrop-blur-sm"
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

        {/* Image Container */}
        <div className="relative bg-black/50 rounded-xl overflow-hidden shadow-2xl backdrop-blur-sm border border-white/10">
          <img
            src={imageUrl}
            alt={prompt || 'AI Generated Image'}
            className="w-full h-auto max-h-[85vh] object-contain"
          />
          
          {/* Image Info Overlay */}
          {prompt && (
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/50 to-transparent p-6">
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

export default function MyMediaPage() {
  // Toast notifications
  const { showToast, ToastContainer } = useToast()
  
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [filterType, setFilterType] = useState<'all' | 'photos' | 'videos'>('all')
  const [playingVideoId, setPlayingVideoId] = useState<string | null>(null)
  const [promptModal, setPromptModal] = useState<{
    isOpen: boolean
    prompt: string
    enhancedPrompt?: string
    type: 'photo' | 'video'
  }>({
    isOpen: false,
    prompt: '',
    enhancedPrompt: '',
    type: 'photo'
  })

  // Image viewer modal state
  const [imageViewer, setImageViewer] = useState<{
    isOpen: boolean
    imageUrl: string
    prompt: string
  }>({
    isOpen: false,
    imageUrl: '',
    prompt: ''
  })

  useEffect(() => {
    fetchMedia()
  }, [])

  const fetchMedia = async () => {
    setIsLoading(true)
    try {
      // Fetch from media API (combines ai_images and ai_videos)
      const response = await fetch('/api/user/media')
      const data = await response.json()
      
      if (data.success) {
        setMediaItems(data.media || [])
      }
    } catch (error) {
      console.error('Failed to load media:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async (id: string, type: 'photo' | 'video') => {
    if (!confirm('Are you sure you want to delete this item?')) return

    try {
      const response = await fetch('/api/user/media', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, type })
      })

      const data = await response.json()
      if (data.success) {
        setMediaItems(items => items.filter(item => item.id !== id))
        showToast('Deleted successfully!', 'success')
      }
    } catch (error) {
      console.error('Failed to delete:', error)
      showToast('Failed to delete. Please try again.', 'error')
    }
  }

  const handleDownload = async (url: string, filename: string) => {
    try {
      // Use proxy API to avoid CORS issues with R2
      const proxyUrl = `/api/download?url=${encodeURIComponent(url)}&filename=${encodeURIComponent(filename)}`
      
      const response = await fetch(proxyUrl)
      if (!response.ok) {
        throw new Error('Download failed')
      }
      
      const blob = await response.blob()
      const downloadUrl = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = downloadUrl
      a.download = filename
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(downloadUrl)
      document.body.removeChild(a)
      showToast('Downloaded successfully!', 'success')
    } catch (error) {
      console.error('Download failed:', error)
      showToast('Failed to download. Please try again.', 'error')
    }
  }

  const filteredMedia = mediaItems.filter(item => {
    if (filterType === 'all') return true
    if (filterType === 'photos') return item.type === 'photo'
    if (filterType === 'videos') return item.type === 'video'
    return true
  })

  const formatDate = (dateString: string) => {
    if (!dateString) return 'Unknown date'
    const date = new Date(dateString)
    if (isNaN(date.getTime())) return 'Unknown date'
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Toast Notifications */}
      <ToastContainer />
      
      {/* Prompt Modal */}
      <PromptModal
        isOpen={promptModal.isOpen}
        onClose={() => setPromptModal({ ...promptModal, isOpen: false })}
        prompt={promptModal.prompt}
        enhancedPrompt={promptModal.enhancedPrompt}
        type={promptModal.type}
      />
      
      {/* Image Viewer Modal */}
      <ImageViewerModal
        isOpen={imageViewer.isOpen}
        onClose={() => setImageViewer({ ...imageViewer, isOpen: false })}
        imageUrl={imageViewer.imageUrl}
        prompt={imageViewer.prompt}
      />
      
      {/* Header */}
      <div className="flex items-center justify-between animate-slide-down">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <ImageIcon className="w-8 h-8 text-primary animate-pulse-soft" />
            My Media
          </h1>
          <p className="text-foreground-secondary mt-2">
            All your photos and videos in one place
          </p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 animate-slide-down" style={{ animationDelay: '100ms' }}>
        <button
          onClick={() => setFilterType('all')}
          className={`px-4 py-2 rounded-lg font-medium transition-all ${
            filterType === 'all'
              ? 'bg-primary text-white'
              : 'bg-background-tertiary text-foreground-secondary hover:bg-background-secondary'
          }`}
        >
          <Filter className="w-4 h-4 inline-block mr-2" />
          All ({mediaItems.length})
        </button>
        <button
          onClick={() => setFilterType('photos')}
          className={`px-4 py-2 rounded-lg font-medium transition-all ${
            filterType === 'photos'
              ? 'bg-primary text-white'
              : 'bg-background-tertiary text-foreground-secondary hover:bg-background-secondary'
          }`}
        >
          <ImageIcon className="w-4 h-4 inline-block mr-2" />
          Photos
        </button>
        <button
          onClick={() => setFilterType('videos')}
          className={`px-4 py-2 rounded-lg font-medium transition-all ${
            filterType === 'videos'
              ? 'bg-primary text-white'
              : 'bg-background-tertiary text-foreground-secondary hover:bg-background-secondary'
          }`}
        >
          <Video className="w-4 h-4 inline-block mr-2" />
          Videos
        </button>
      </div>

      {/* Media Grid */}
      <div className="card p-6 animate-slide-up" style={{ animationDelay: '200ms' }}>
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin"></div>
          </div>
        ) : filteredMedia.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-20 h-20 bg-background-tertiary rounded-full flex items-center justify-center mx-auto mb-4">
              {filterType === 'photos' ? (
                <ImageIcon className="w-10 h-10 text-foreground-secondary" />
              ) : filterType === 'videos' ? (
                <Video className="w-10 h-10 text-foreground-secondary" />
              ) : (
                <ImageIcon className="w-10 h-10 text-foreground-secondary" />
              )}
            </div>
            <h3 className="text-xl font-bold text-foreground mb-2">
              No {filterType === 'all' ? 'media' : filterType} found
            </h3>
            <p className="text-foreground-secondary">
              {filterType === 'photos' 
                ? 'Generate AI photos to see them here'
                : filterType === 'videos'
                ? 'Generate AI videos to see them here'
                : 'Create content to see it here'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredMedia.map((item, index) => {
              const isVideo = item.type === 'video'
              
              return (
                <div 
                  key={item.id} 
                  className="card overflow-hidden hover:scale-105 transition-all duration-300 animate-scale-in"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  {/* Media Preview */}
                  <div className="relative aspect-video bg-background-tertiary group">
                    {isVideo ? (
                      <video
                        src={item.url}
                        className="w-full h-full object-contain"
                        controls
                        preload="none"
                        poster="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath fill='%236b7280' d='M8 5v14l11-7z'/%3E%3C/svg%3E"
                      />
                    ) : (
                      <>
                        <img
                          src={item.url}
                          alt={item.prompt || 'AI Generated'}
                          className="w-full h-full object-cover cursor-pointer hover:opacity-90 transition-opacity"
                          loading="lazy"
                          onClick={() => setImageViewer({
                            isOpen: true,
                            imageUrl: item.url,
                            prompt: item.prompt || item.enhancedPrompt || ''
                          })}
                        />
                        {/* Zoom Icon Overlay */}
                        <div 
                          className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/30 transition-all duration-300 cursor-pointer opacity-0 group-hover:opacity-100"
                          onClick={() => setImageViewer({
                            isOpen: true,
                            imageUrl: item.url,
                            prompt: item.prompt || item.enhancedPrompt || ''
                          })}
                        >
                          <div className="w-14 h-14 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center transform scale-75 group-hover:scale-100 transition-transform duration-300 shadow-xl">
                            <ZoomIn className="w-7 h-7 text-gray-900" />
                          </div>
                        </div>
                      </>
                    )}
                    
                    {/* Type Badge */}
                    <div className="absolute top-2 left-2">
                      <div className={`px-2 py-1 rounded text-xs font-medium ${
                        isVideo ? 'bg-red-500 text-white' : 'bg-blue-500 text-white'
                      }`}>
                        {isVideo ? (
                          <><Video className="w-3 h-3 inline-block mr-1" />Video</>
                        ) : (
                          <><ImageIcon className="w-3 h-3 inline-block mr-1" />Photo</>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Info */}
                  <div className="p-4 space-y-3">
                    {/* Prompt Preview with better visibility */}
                    <div 
                      className="cursor-pointer hover:bg-background-tertiary p-3 rounded-lg transition-all border border-border hover:border-primary/50 group"
                      onClick={() => setPromptModal({
                        isOpen: true,
                        prompt: item.prompt,
                        enhancedPrompt: item.enhancedPrompt,
                        type: item.type
                      })}
                    >
                      <div className="flex items-start gap-2 mb-2">
                        <Sparkles className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                        <p className="text-sm text-foreground line-clamp-2 font-medium flex-1">
                          {item.prompt || item.enhancedPrompt || 'AI Generated ' + (isVideo ? 'Video' : 'Photo')}
                        </p>
                      </div>
                      <p className="text-xs text-primary font-medium group-hover:underline flex items-center gap-1">
                        <Wand2 className="w-3 h-3" />
                        Click to see full prompt details →
                      </p>
                    </div>
                    
                    {item.model && (
                      <p className="text-xs text-foreground-secondary">
                        Model: {item.model}
                      </p>
                    )}
                    
                    <div className="flex items-center gap-2 text-xs text-foreground-secondary">
                      <Clock className="w-3 h-3" />
                      {formatDate(item.created_at)}
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleDownload(
                          item.url, 
                          `${isVideo ? 'video' : 'photo'}-${Date.now()}.${isVideo ? 'mp4' : 'jpg'}`
                        )}
                        className="flex-1 px-3 py-2 bg-primary/10 hover:bg-primary/20 text-primary rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-1"
                      >
                        <Download className="w-4 h-4" />
                        Download
                      </button>
                      <button
                        onClick={() => handleDelete(item.id, item.type)}
                        className="px-3 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-lg text-sm font-medium transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
