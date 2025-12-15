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
  Filter
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

export default function MyMediaPage() {
  // Toast notifications
  const { showToast, ToastContainer } = useToast()
  
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [filterType, setFilterType] = useState<'all' | 'photos' | 'videos'>('all')
  const [playingVideoId, setPlayingVideoId] = useState<string | null>(null)

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
                  <div className="relative aspect-video bg-background-tertiary">
                    {isVideo ? (
                      <video
                        src={item.url}
                        className="w-full h-full object-cover"
                        controls
                        preload="metadata"
                      />
                    ) : (
                      <img
                        src={item.url}
                        alt={item.prompt || 'AI Generated'}
                        className="w-full h-full object-cover"
                      />
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
                    <p className="text-sm text-foreground line-clamp-2 font-medium">
                      {item.prompt || item.enhancedPrompt || 'AI Generated ' + (isVideo ? 'Video' : 'Photo')}
                    </p>
                    
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
