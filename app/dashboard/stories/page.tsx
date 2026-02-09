'use client'

import { useState, useEffect } from 'react'
import { 
  Upload, 
  Calendar, 
  Clock, 
  Image as ImageIcon, 
  Video,
  X,
  Play,
  Pause,
  Trash2,
  Eye,
  Plus,
  Loader2,
  Camera,
  Type,
  Sparkles,
  Download,
  Edit
} from 'lucide-react'
import { useToast } from '@/lib/components/Toast'
import { AICaptionImprover } from '@/lib/components/AICaptionImprover'

interface Story {
  id: string
  type: 'image' | 'video'
  url: string
  thumbnail?: string
  scheduledTime: string
  status: 'scheduled' | 'posted' | 'draft'
  duration: number // seconds for display
  caption?: string
  stickers?: any[]
  createdAt: string
}

export default function StoriesPage() {
  const { showToast, ToastContainer } = useToast()
  const [stories, setStories] = useState<Story[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string>('')
  const [fileType, setFileType] = useState<'image' | 'video'>('image')
  const [showScheduleModal, setShowScheduleModal] = useState(false)
  const [caption, setCaption] = useState('')
  const [scheduledDate, setScheduledDate] = useState('')
  const [scheduledTime, setScheduledTime] = useState('')
  const [selectedStory, setSelectedStory] = useState<Story | null>(null)
  const [editingStory, setEditingStory] = useState<Story | null>(null)
  const [selectedMusic, setSelectedMusic] = useState<string>('')
  const [savedSongs, setSavedSongs] = useState<any[]>([])
  const [showMusicSelector, setShowMusicSelector] = useState(false)
  const [filter, setFilter] = useState<'all' | 'scheduled' | 'posted' | 'draft'>('all')

  useEffect(() => {
    loadStories()
    loadSavedSongs()
  }, [])

  const loadSavedSongs = async () => {
    try {
      const response = await fetch('/api/songs/list')
      const data = await response.json()
      if (data.success) {
        setSavedSongs(data.songs)
      }
    } catch (error) {
      console.error('Failed to load songs:', error)
    }
  }

  const loadStories = async () => {
    try {
      const response = await fetch('/api/stories')
      const data = await response.json()
      
      if (data.success && data.stories) {
        setStories(data.stories)
      }
    } catch (error) {
      console.error('Error loading stories:', error)
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Check file type
    const isImage = file.type.startsWith('image/')
    const isVideo = file.type.startsWith('video/')

    if (!isImage && !isVideo) {
      showToast('Please select an image or video file', 'error')
      return
    }

    // Check file size (max 100MB for video, 10MB for image)
    const maxSize = isVideo ? 100 * 1024 * 1024 : 10 * 1024 * 1024
    if (file.size > maxSize) {
      showToast(`File size exceeds ${isVideo ? '100MB' : '10MB'} limit`, 'error')
      return
    }

    setSelectedFile(file)
    setFileType(isImage ? 'image' : 'video')
    setPreviewUrl(URL.createObjectURL(file))
    setShowScheduleModal(true)
  }

  const handleScheduleStory = async () => {
    if (!selectedFile) {
      showToast('Please select a file', 'error')
      return
    }

    setIsUploading(true)
    try {
      // Upload file to Supabase
      const formData = new FormData()
      formData.append('file', selectedFile)
      formData.append('bucket', 'stories') // Using stories bucket
      formData.append('folder', '')

      const uploadResponse = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })

      const uploadData = await uploadResponse.json()

      if (!uploadResponse.ok || !uploadData.success) {
        throw new Error(uploadData.error || 'Upload failed')
      }

      const { url } = uploadData

      // Determine status based on whether date/time is set
      const status = (scheduledDate && scheduledTime) ? 'scheduled' : 'draft'
      const scheduledDateTime = (scheduledDate && scheduledTime) 
        ? `${scheduledDate}T${scheduledTime}:00` 
        : new Date().toISOString() // Use current time for drafts

      // Create story entry in database
      const storyData = {
        type: fileType,
        url,
        scheduledTime: scheduledDateTime,
        status,
        duration: fileType === 'image' ? 5 : 15,
        caption
      }

      const saveResponse = await fetch('/api/stories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(storyData)
      })

      const saveData = await saveResponse.json()

      if (!saveResponse.ok || !saveData.success) {
        throw new Error(saveData.error || 'Failed to save story')
      }

      // Add to local state
      setStories([saveData.story, ...stories])
      showToast(status === 'draft' ? 'Story saved as draft!' : 'Story scheduled successfully!', 'success')
      
      // Reset form
      setShowScheduleModal(false)
      setSelectedFile(null)
      setPreviewUrl('')
      setCaption('')
      setScheduledDate('')
      setScheduledTime('')
    } catch (error) {
      console.error('Error scheduling story:', error)
      showToast('Failed to schedule story', 'error')
    } finally {
      setIsUploading(false)
    }
  }

  const handleDeleteStory = async (id: string) => {
    if (!confirm('Are you sure you want to delete this story?')) return

    try {
      const response = await fetch(`/api/stories/${id}`, {
        method: 'DELETE'
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to delete story')
      }

      setStories(stories.filter(s => s.id !== id))
      showToast('Story deleted', 'success')
    } catch (error) {
      console.error('Error deleting story:', error)
      showToast('Failed to delete story', 'error')
    }
  }

  const handleEditStory = (story: Story) => {
    setEditingStory(story)
    setCaption(story.caption || '')
    const scheduleDate = new Date(story.scheduledTime)
    setScheduledDate(scheduleDate.toISOString().split('T')[0])
    setScheduledTime(scheduleDate.toTimeString().slice(0, 5))
    setPreviewUrl(story.url)
    setFileType(story.type)
    setShowScheduleModal(true)
  }

  const handleUpdateStory = async () => {
    if (!editingStory) return

    setIsUploading(true)
    try {
      const status = (scheduledDate && scheduledTime) ? 'scheduled' : 'draft'
      const scheduledDateTime = (scheduledDate && scheduledTime) 
        ? new Date(`${scheduledDate}T${scheduledTime}`).toISOString()
        : null

      const response = await fetch(`/api/stories/${editingStory.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          caption,
          scheduledTime: scheduledDateTime,
          status
        })
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to update story')
      }

      // Update local state
      setStories(stories.map(s => s.id === editingStory.id ? data.story : s))
      showToast('Story updated successfully!', 'success')
      
      // Reset form
      setShowScheduleModal(false)
      setEditingStory(null)
      setCaption('')
      setScheduledDate('')
      setScheduledTime('')
      setPreviewUrl('')
    } catch (error) {
      console.error('Error updating story:', error)
      showToast('Failed to update story', 'error')
    } finally {
      setIsUploading(false)
    }
  }

  const handlePostNow = async (story: Story) => {
    if (!confirm('Post this story to Instagram now?')) return

    try {
      showToast('Posting story to Instagram...', 'info')

      const response = await fetch('/api/instagram/post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'story',
          mediaUrl: story.url,
          isVideo: story.type === 'video'
        })
      })

      const data = await response.json()

      if (!data.success) {
        throw new Error(data.error || 'Failed to post story')
      }

      // Update story status to posted
      const updateResponse = await fetch(`/api/stories/${story.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'posted'
        })
      })

      if (!updateResponse.ok) {
        throw new Error('Failed to update story status')
      }

      showToast('✅ Story posted to Instagram successfully!', 'success')
      loadStories()
    } catch (error) {
      console.error('Error posting story:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      showToast(`Failed to post story: ${errorMessage}`, 'error')
    }
  }

  const handleProcessScheduled = async () => {
    try {
      showToast('Checking for scheduled stories...', 'info')
      
      const now = new Date()
      const dueStories = stories.filter(story => 
        story.status === 'scheduled' && 
        new Date(story.scheduledTime) <= now
      )

      if (dueStories.length === 0) {
        showToast('No scheduled stories are due yet', 'info')
        return
      }

      showToast(`Posting ${dueStories.length} story(ies)...`, 'info')
      
      let posted = 0
      let failed = 0

      for (const story of dueStories) {
        try {
          const response = await fetch('/api/instagram/post', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: 'story',
              mediaUrl: story.url,
              isVideo: story.type === 'video'
            })
          })

          const data = await response.json()
          
          if (!data.success) {
            throw new Error(data.error || 'Failed to post')
          }

          // Update status to posted
          await fetch(`/api/stories/${story.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'posted' })
          })

          posted++
        } catch (error) {
          console.error('Error posting story:', story.id, error)
          failed++
        }
      }

      if (posted > 0) {
        showToast(`✅ Posted ${posted} story(ies) successfully!`, 'success')
        loadStories()
      }
      
      if (failed > 0) {
        showToast(`⚠️ ${failed} story(ies) failed to post`, 'error')
      }

    } catch (error) {
      console.error('Error processing scheduled stories:', error)
      showToast('An error occurred while processing scheduled stories', 'error')
    }
  }

  const formatDateTime = (dateTime: string) => {
    const date = new Date(dateTime)
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
  }

  const isScheduledInPast = (scheduledTime: string) => {
    return new Date(scheduledTime) < new Date()
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <ToastContainer />

      {/* Header */}
      <div className="flex items-center justify-between animate-slide-down">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Stories</h1>
          <p className="text-foreground-secondary mt-1">Schedule and manage Instagram Stories (Images: 5s, Videos: up to 60s)</p>
        </div>
        <div className="flex gap-3">
          {filter === 'scheduled' && (
            <button 
              onClick={handleProcessScheduled}
              className="btn-secondary flex items-center gap-2"
              title="Manually process all scheduled stories that are due"
            >
              <Clock className="w-5 h-5" />
              Process Scheduled
            </button>
          )}
          <label className="btn-primary flex items-center gap-2 cursor-pointer">
            <Plus className="w-5 h-5" />
            Add Story
            <input
              type="file"
              accept="image/*,video/*"
              className="hidden"
              onChange={handleFileSelect}
            />
          </label>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 overflow-x-auto pb-2 animate-slide-up">
        {(['all', 'scheduled', 'posted', 'draft'] as const).map((tab, index) => (
          <button
            key={tab}
            onClick={() => setFilter(tab)}
            style={{ animationDelay: `${index * 50}ms` }}
            className={`px-4 py-2 rounded-lg font-medium text-sm transition-all duration-300 whitespace-nowrap ${
              filter === tab
                ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20 scale-105'
                : 'bg-background-tertiary text-foreground-secondary hover:text-foreground hover:bg-background-tertiary/80 hover:scale-105'
            }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          { label: 'Scheduled', value: stories.filter(s => s.status === 'scheduled').length, icon: Clock, color: 'text-primary' },
          { label: 'Posted', value: stories.filter(s => s.status === 'posted').length, icon: Eye, color: 'text-primary' },
          { label: 'Drafts', value: stories.filter(s => s.status === 'draft').length, icon: ImageIcon, color: 'text-primary' },
          { label: 'Total', value: stories.length, icon: Sparkles, color: 'text-primary' },
        ].map((stat, index) => (
          <div 
            key={stat.label}
            className="stat-card"
            style={{ animationDelay: `${index * 100}ms` }}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-foreground-secondary">{stat.label}</p>
                <p className="text-3xl font-bold text-foreground mt-1">{stat.value}</p>
              </div>
              <div className={`p-3 rounded-lg bg-background-tertiary ${stat.color}`}>
                <stat.icon className="w-6 h-6" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Stories Grid */}
      <div className="card p-6">
        <h2 className="text-xl font-bold text-foreground mb-6">Scheduled Stories</h2>
        
        {stories.length === 0 ? (
          <div className="text-center py-12">
            <Camera className="w-16 h-16 text-foreground-muted mx-auto mb-4" />
            <p className="text-foreground-secondary mb-4">No stories scheduled yet</p>
            <label className="btn-primary inline-flex items-center gap-2 cursor-pointer">
              <Plus className="w-5 h-5" />
              Create Your First Story
              <input
                type="file"
                accept="image/*,video/*"
                className="hidden"
                onChange={handleFileSelect}
              />
            </label>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {stories.filter(story => filter === 'all' || story.status === filter).map((story, index) => (
              <div
                key={story.id}
                className="group relative bg-background-secondary rounded-xl overflow-hidden border border-border hover:border-primary transition-all duration-300 animate-scale-in hover:scale-105"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                {/* Story Preview */}
                <div className="aspect-[9/16] relative bg-background-tertiary">
                  {story.type === 'image' ? (
                    <img
                      src={story.url}
                      alt="Story"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement
                        target.style.display = 'none'
                      }}
                    />
                  ) : (
                    <div className="relative w-full h-full">
                      {/* Video element to show first frame */}
                      <video
                        src={story.url}
                        className="w-full h-full object-cover"
                        preload="metadata"
                        muted
                        playsInline
                        onLoadedMetadata={(e) => {
                          const video = e.target as HTMLVideoElement
                          video.currentTime = 0.1 // Set to first frame
                        }}
                      />
                      <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                        <Play className="w-12 h-12 text-white" />
                      </div>
                    </div>
                  )}

                  {/* Type Badge */}
                  <div className="absolute top-2 left-2 px-2 py-1 bg-black/70 rounded-lg flex items-center gap-1">
                    {story.type === 'image' ? (
                      <ImageIcon className="w-3 h-3 text-white" />
                    ) : (
                      <Video className="w-3 h-3 text-white" />
                    )}
                    <span className="text-xs text-white">{story.duration}s</span>
                  </div>

                  {/* Status Badge */}
                  <div className={`absolute top-2 right-2 px-2 py-1 rounded-lg text-xs font-medium ${
                    story.status === 'scheduled' ? 'bg-teal/90 text-white' :
                    story.status === 'posted' ? 'bg-green-500/90 text-white' :
                    'bg-yellow-500/90 text-white'
                  }`}>
                    {story.status}
                  </div>

                  {/* Hover Overlay */}
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <button
                      onClick={() => setSelectedStory(story)}
                      className="p-2 bg-white/90 hover:bg-white rounded-full transition-colors"
                    >
                      <Eye className="w-4 h-4 text-gray-900" />
                    </button>
                    <button
                      onClick={() => handleEditStory(story)}
                      className="p-2 bg-teal/90 hover:bg-teal rounded-full transition-colors"
                    >
                      <Edit className="w-4 h-4 text-white" />
                    </button>
                    <button
                      onClick={() => handleDeleteStory(story.id)}
                      className="p-2 bg-red-500/90 hover:bg-red-500 rounded-full transition-colors"
                    >
                      <Trash2 className="w-4 h-4 text-white" />
                    </button>
                  </div>
                </div>

                {/* Story Info */}
                <div className="p-3">
                  <div className="flex items-center gap-2 text-xs text-foreground-secondary mb-2">
                    <Clock className="w-3 h-3" />
                    <span className={isScheduledInPast(story.scheduledTime) ? 'text-red-500' : ''}>
                      {formatDateTime(story.scheduledTime)}
                    </span>
                  </div>
                  {story.caption && (
                    <p className="text-sm text-foreground line-clamp-2 mb-2">{story.caption}</p>
                  )}
                  
                  {/* Action Button */}
                  {story.status === 'scheduled' && (
                    <button
                      onClick={() => handlePostNow(story)}
                      className="w-full px-3 py-1.5 bg-primary hover:bg-primary-hover text-primary-foreground rounded-lg text-xs font-medium transition-all duration-300 flex items-center justify-center gap-1"
                    >
                      <Upload className="w-3 h-3" />
                      Post Now
                    </button>
                  )}
                  
                  {story.status === 'draft' && (
                    <button
                      onClick={() => handleEditStory(story)}
                      className="w-full px-3 py-1.5 bg-background-tertiary hover:bg-primary/20 text-foreground hover:text-primary rounded-lg text-xs font-medium transition-all duration-300"
                    >
                      Schedule
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Schedule Modal */}
      {showScheduleModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-background-secondary rounded-2xl border border-border max-w-2xl w-full max-h-[90vh] overflow-y-auto animate-scale-in">
            <div className="sticky top-0 bg-background-secondary border-b border-border p-6 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-foreground">{editingStory ? 'Edit Story' : 'Schedule Story'}</h2>
              <button
                onClick={() => {
                  setShowScheduleModal(false)
                  setSelectedFile(null)
                  setPreviewUrl('')
                  setEditingStory(null)
                  setCaption('')
                  setScheduledDate('')
                  setScheduledTime('')
                }}
                className="p-2 hover:bg-background-tertiary rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-foreground-secondary" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Preview */}
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">Preview</label>
                <div className="aspect-[9/16] max-w-xs mx-auto rounded-xl overflow-hidden border border-border">
                  {fileType === 'image' ? (
                    <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <video src={previewUrl} className="w-full h-full object-cover" controls />
                  )}
                </div>
              </div>

              {/* Caption */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-foreground">
                    Caption (Optional)
                  </label>
                  <AICaptionImprover 
                    caption={caption} 
                    onImprove={setCaption}
                  />
                </div>
                <textarea
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  placeholder="Add a caption to your story..."
                  className="w-full px-4 py-3 bg-background border border-border rounded-lg text-foreground placeholder:text-foreground-muted focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                  rows={3}
                />
              </div>

              {/* Date & Time */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">
                    <Calendar className="w-4 h-4 inline mr-1" />
                    Date (Optional for Draft)
                  </label>
                  <input
                    type="date"
                    value={scheduledDate}
                    onChange={(e) => setScheduledDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full px-4 py-3 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">
                    <Clock className="w-4 h-4 inline mr-1" />
                    Time (Optional for Draft)
                  </label>
                  <input
                    type="time"
                    value={scheduledTime}
                    onChange={(e) => setScheduledTime(e.target.value)}
                    className="w-full px-4 py-3 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
              </div>

              {/* Music Selector */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground flex items-center gap-2">
                  <Play className="w-4 h-4" />
                  Background Music (Optional)
                </label>
                {selectedMusic ? (
                  <div className="flex items-center gap-2 p-3 bg-primary/10 border border-primary/30 rounded-lg">
                    <Play className="w-4 h-4 text-primary" />
                    <span className="flex-1 text-sm text-foreground">
                      {savedSongs.find(s => s.id === selectedMusic)?.title || 'Selected Song'}
                    </span>
                    <button
                      onClick={() => setSelectedMusic('')}
                      className="text-red-500 hover:text-red-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowMusicSelector(!showMusicSelector)}
                    className="w-full px-4 py-2 bg-background-tertiary border border-dashed border-border hover:border-primary text-foreground-secondary hover:text-primary rounded-lg text-sm transition-all flex items-center justify-center gap-2"
                  >
                    <Play className="w-4 h-4" />
                    {savedSongs.length > 0 ? 'Choose from My Songs' : 'No songs available'}
                  </button>
                )}
                
                {/* Music Selector Dropdown */}
                {showMusicSelector && savedSongs.length > 0 && (
                  <div className="max-h-48 overflow-y-auto bg-background-secondary border border-border rounded-lg divide-y divide-border">
                    {savedSongs.map((song) => (
                      <button
                        key={song.id}
                        onClick={() => {
                          setSelectedMusic(song.id)
                          setShowMusicSelector(false)
                        }}
                        className="w-full p-3 hover:bg-background-tertiary transition-all text-left flex items-center gap-3"
                      >
                        {song.imageUrl ? (
                          <img
                            src={song.imageUrl}
                            alt={song.title}
                            className="w-10 h-10 rounded object-cover"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded bg-primary/20 flex items-center justify-center">
                            <Play className="w-5 h-5 text-primary" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-foreground truncate text-sm">{song.title}</div>
                          <div className="text-xs text-foreground-secondary">
                            {Math.floor(song.duration / 60)}:{String(Math.floor(song.duration % 60)).padStart(2, '0')}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {savedSongs.length === 0 && (
                  <p className="text-xs text-foreground-secondary">
                    Generate AI music from the{' '}
                    <a href="/dashboard/ai-music" className="text-primary hover:underline">
                      AI Music
                    </a>
                    {' '}page and save it to use here.
                  </p>
                )}
              </div>

              <div className="text-xs text-foreground-secondary bg-background-tertiary p-3 rounded-lg">
                💡 <strong>Tip:</strong> Leave date/time empty to save as a draft, or set them to schedule the story.
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => {
                    setShowScheduleModal(false)
                    setSelectedFile(null)
                    setPreviewUrl('')
                  }}
                  className="flex-1 px-6 py-3 bg-background-tertiary text-foreground rounded-lg hover:bg-background-tertiary/80 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={editingStory ? handleUpdateStory : handleScheduleStory}
                  disabled={isUploading}
                  className="flex-1 btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      {editingStory ? 'Updating...' : 'Saving...'}
                    </>
                  ) : editingStory ? (
                    <>
                      <Edit className="w-5 h-5" />
                      Update Story
                    </>
                  ) : (scheduledDate && scheduledTime) ? (
                    <>
                      <Calendar className="w-5 h-5" />
                      Schedule Story
                    </>
                  ) : (
                    <>
                      <Download className="w-5 h-5" />
                      Save as Draft
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Story Preview Modal */}
      {selectedStory && (
        <div 
          className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedStory(null)}
        >
          <div className="relative max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setSelectedStory(null)}
              className="absolute -top-12 right-0 p-2 text-white hover:bg-white/10 rounded-full transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
            <div className="aspect-[9/16] rounded-xl overflow-hidden">
              {selectedStory.type === 'image' ? (
                <img src={selectedStory.url} alt="Story" className="w-full h-full object-cover" />
              ) : (
                <video src={selectedStory.url} className="w-full h-full object-cover" controls autoPlay />
              )}
            </div>
            {selectedStory.caption && (
              <div className="absolute bottom-4 left-4 right-4 p-4 bg-black/70 rounded-lg">
                <p className="text-white text-sm">{selectedStory.caption}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
