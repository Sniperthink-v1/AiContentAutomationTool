'use client'

import { useState, useEffect } from 'react'
import { 
  Plus, 
  Calendar, 
  Image as ImageIcon, 
  Video,
  MoreVertical,
  Edit,
  Trash2,
  Send,
  Clock,
  X,
  Upload,
  Sparkles,
  Hash,
  AtSign,
  MapPin,
  FileText,
  Play
} from 'lucide-react'
import { formatNumber } from '@/lib/utils'
import { useToast } from '@/lib/components/Toast'
import { AICaptionImprover } from '@/lib/components/AICaptionImprover'

// Helper function to convert file to base64
const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.readAsDataURL(file)
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = error => reject(error)
  })
}

interface Draft {
  id: string
  originalPrompt: string
  enhancedScript: string
  videoUrl: string | null
  thumbnailUrl: string | null
  status: string
  scheduledDate?: string
  postedAt?: string
  instagramMediaId?: string
  settings: any
  createdAt: string
}

export default function PostsPage() {
  const { showToast, ToastContainer } = useToast()
  const [filter, setFilter] = useState<'all' | 'published' | 'scheduled' | 'draft'>('all')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showScheduleModal, setShowScheduleModal] = useState(false)
  const [drafts, setDrafts] = useState<Draft[]>([])
  const [isLoadingDrafts, setIsLoadingDrafts] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [currentDraftId, setCurrentDraftId] = useState<string | null>(null)
  
  // Create post form states
  const [postType, setPostType] = useState<'image' | 'video' | 'carousel'>('image')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string>('')
  const [caption, setCaption] = useState('')
  const [location, setLocation] = useState('')
  const [hashtags, setHashtags] = useState<string[]>([])
  const [mentions, setMentions] = useState<string[]>([])
  const [scheduleDate, setScheduleDate] = useState('')
  const [scheduleTime, setScheduleTime] = useState('')
  const [selectedMusic, setSelectedMusic] = useState<string>('')
  const [savedSongs, setSavedSongs] = useState<any[]>([])
  const [showMusicSelector, setShowMusicSelector] = useState(false)
  
  // Load drafts from database
  useEffect(() => {
    loadDrafts()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter])

  // Load saved songs
  useEffect(() => {
    if (showCreateModal) {
      loadSavedSongs()
    }
  }, [showCreateModal])

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

  const loadDrafts = async () => {
    setIsLoadingDrafts(true)
    try {
      // Map filter to status (empty means load all)
      let status = ''
      if (filter === 'draft') status = 'draft'
      if (filter === 'scheduled') status = 'scheduled'
      if (filter === 'published') status = 'published'
      
      const url = status ? `/api/drafts/list?status=${status}` : '/api/drafts/list'
      const response = await fetch(url)
      const data = await response.json()
      if (data.success) {
        setDrafts(data.drafts)
      }
    } catch (error) {
      console.error('Failed to load drafts:', error)
    } finally {
      setIsLoadingDrafts(false)
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setSelectedFile(file)
      const url = URL.createObjectURL(file)
      setPreviewUrl(url)
    }
  }

  const addHashtag = () => {
    const input = prompt('Enter hashtag (without #):')
    if (input) {
      setHashtags([...hashtags, input.trim()])
    }
  }

  const removeHashtag = (index: number) => {
    setHashtags(hashtags.filter((_, i) => i !== index))
  }

  const addMention = () => {
    const input = prompt('Enter username to mention (without @):')
    if (input) {
      setMentions([...mentions, input.trim()])
    }
  }

  const removeMention = (index: number) => {
    setMentions(mentions.filter((_, i) => i !== index))
  }

  const handleCreatePost = async (action: 'now' | 'schedule' | 'draft') => {
    setIsSaving(true)
    try {
      // Upload file - try Supabase first, fallback to base64
      let fileUrl = ''
      if (selectedFile) {
        // Check if Supabase is configured
        const hasSupabaseKeys = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY && 
                                 process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY !== 'your_supabase_anon_key_here'
        
        if (hasSupabaseKeys) {
          try {
            showToast('Uploading file...', 'info')
            
            const formData = new FormData()
            formData.append('file', selectedFile)
            formData.append('bucket', postType === 'video' ? 'videos' : 'images')
            formData.append('folder', 'posts')

            const uploadResponse = await fetch('/api/upload', {
              method: 'POST',
              body: formData
            })

            const uploadData = await uploadResponse.json()
            
            if (!uploadData.success) {
              throw new Error(uploadData.error || 'Upload failed')
            }

            fileUrl = uploadData.url
            console.log('✅ File uploaded to Supabase:', fileUrl)
          } catch (error: any) {
            console.warn('Supabase upload failed, using base64 fallback:', error)
            // Fallback to base64
            const base64 = await fileToBase64(selectedFile)
            fileUrl = base64
          }
        } else {
          // Use base64 if Supabase not configured
          console.log('Using base64 upload (Supabase not configured)')
          const base64 = await fileToBase64(selectedFile)
          fileUrl = base64
        }
      }

      // Prepare post data with mentions
      const fullCaption = `${caption}\n\n${mentions.length > 0 ? mentions.map(m => `@${m}`).join(' ') + '\n' : ''}${hashtags.map(h => `#${h}`).join(' ')}${location ? `\n📍 ${location}` : ''}`
      
      if (action === 'draft') {
        // Save to drafts table (or update if editing)
        const response = await fetch('/api/drafts/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: currentDraftId, // Include ID if updating existing draft
            originalPrompt: caption,
            enhancedScript: fullCaption,
            videoUrl: postType === 'video' ? fileUrl : null,
            thumbnailUrl: postType === 'image' ? fileUrl : null,
            settings: {
              postType,
              hashtags,
              location,
              mentions
            }
          })
        })

        const data = await response.json()
        if (data.success) {
          showToast(currentDraftId ? 'Draft updated!' : 'Post saved to drafts!', 'success')
          loadDrafts()
          resetForm()
          setShowCreateModal(false)
        } else {
          showToast('Failed to save draft: ' + data.error, 'error')
        }
      } else if (action === 'schedule') {
        // If date/time already set (editing scheduled post), update it directly
        if (scheduleDate && scheduleTime && currentDraftId) {
          const scheduledDateTime = new Date(`${scheduleDate}T${scheduleTime}`)
          const response = await fetch('/api/drafts/schedule', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              draftId: currentDraftId,
              scheduledDate: scheduledDateTime.toISOString()
            })
          })

          const data = await response.json()
          if (data.success) {
            showToast('Scheduled post updated!', 'success')
            loadDrafts()
            resetForm()
            setShowCreateModal(false)
          } else {
            showToast('Failed to update schedule: ' + data.error, 'error')
          }
        } else {
          // First save as draft, then open schedule modal
          const draftResponse = await fetch('/api/drafts/save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              id: currentDraftId,
              originalPrompt: caption,
              enhancedScript: fullCaption,
              videoUrl: postType === 'video' ? fileUrl : null,
              thumbnailUrl: postType === 'image' ? fileUrl : null,
              settings: {
                postType,
                hashtags,
                location,
                mentions
              }
            })
          })

          const draftData = await draftResponse.json()
          if (draftData.success) {
            setCurrentDraftId(draftData.draftId)
            setShowCreateModal(false)
            setShowScheduleModal(true)
          } else {
            showToast('Failed to create draft for scheduling: ' + draftData.error, 'error')
          }
        }
      } else if (action === 'now') {
        // Post immediately to Instagram
        showToast('Posting to Instagram...', 'info')
        
        // Determine post type and media URL
        const mediaUrl = postType === 'video' ? fileUrl : fileUrl
        const igPostType = postType === 'video' ? 'reel' : 'image'
        
        // Check if we have a media URL (either from upload or existing URL)
        if (!mediaUrl) {
          showToast('Please select a file to post', 'error')
          setIsSaving(false)
          return
        }

        // Check if it's a base64 URL - Instagram requires publicly accessible URLs
        if (mediaUrl.startsWith('data:')) {
          showToast('Instagram requires files to be uploaded to cloud storage. Please configure Supabase for file hosting.', 'error')
          setIsSaving(false)
          return
        }

        try {
          // Call Instagram API to post
          const postResponse = await fetch('/api/instagram/post', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: igPostType,
              mediaUrl: mediaUrl,
              caption: fullCaption
            })
          })

          const postData = await postResponse.json()
          
          if (postData.success) {
            // Save to drafts as published
            const saveResponse = await fetch('/api/drafts/save', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                id: currentDraftId,
                originalPrompt: caption,
                enhancedScript: fullCaption,
                videoUrl: postType === 'video' ? fileUrl : null,
                thumbnailUrl: postType === 'image' ? fileUrl : null,
                settings: {
                  postType,
                  hashtags,
                  location,
                  mentions,
                  status: 'posted',
                  instagramMediaId: postData.mediaId
                }
              })
            })

            showToast('Successfully posted to Instagram! 🎉', 'success')
            loadDrafts()
            resetForm()
            setShowCreateModal(false)
          } else {
            // Check for common errors
            if (postData.error?.includes('not connected')) {
              showToast('Instagram account not connected. Please connect in Settings.', 'error')
            } else {
              showToast('Failed to post to Instagram: ' + postData.error, 'error')
            }
          }
        } catch (error) {
          console.error('Instagram posting error:', error)
          showToast('Failed to connect to Instagram. Please check your connection.', 'error')
        }
      }
    } catch (error) {
      console.error('Error creating post:', error)
      showToast('An error occurred. Please try again.', 'error')
    } finally {
      setIsSaving(false)
    }
  }

  const resetForm = () => {
    setCaption('')
    setSelectedFile(null)
    setPreviewUrl('')
    setHashtags([])
    setMentions([])
    setLocation('')
    setPostType('image')
    setScheduleDate('')
    setScheduleTime('')
    setCurrentDraftId(null)
  }

  const handleSchedulePost = async () => {
    if (!scheduleDate || !scheduleTime) {
      showToast('Please select both date and time', 'warning')
      return
    }

    setIsSaving(true)
    try {
      if (!currentDraftId) {
        showToast('No draft selected', 'error')
        return
      }

      const scheduledDateTime = new Date(`${scheduleDate}T${scheduleTime}`)

      const response = await fetch('/api/drafts/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          draftId: currentDraftId,
          scheduledDate: scheduledDateTime.toISOString()
        })
      })

      const data = await response.json()
      if (data.success) {
        showToast('Post scheduled successfully!', 'success')
        setShowScheduleModal(false)
        resetForm()
        loadDrafts() // Reload to update the list
      } else {
        showToast('Failed to schedule post: ' + data.error, 'error')
      }
    } catch (error) {
      console.error('Error scheduling post:', error)
      showToast('An error occurred. Please try again.', 'error')
    } finally {
      setIsSaving(false)
    }
  }

  const handleEditDraft = (draft: Draft) => {
    // Populate form with draft data
    setCaption(draft.originalPrompt || '')
    
    // Parse settings
    const settings = draft.settings as any
    if (settings) {
      setPostType(settings.postType || 'image')
      setHashtags(settings.hashtags || [])
      setMentions(settings.mentions || [])
      setLocation(settings.location || '')
    }

    // Set media preview
    if (draft.videoUrl) {
      setPreviewUrl(draft.videoUrl)
      setPostType('video')
    } else if (draft.thumbnailUrl) {
      setPreviewUrl(draft.thumbnailUrl)
      setPostType('image')
    }

    // Set scheduled date/time if it's a scheduled post
    if (draft.scheduledDate) {
      const scheduledDateTime = new Date(draft.scheduledDate)
      const dateStr = scheduledDateTime.toISOString().split('T')[0] // YYYY-MM-DD
      const timeStr = scheduledDateTime.toTimeString().slice(0, 5) // HH:MM
      setScheduleDate(dateStr)
      setScheduleTime(timeStr)
    }

    // Set current draft ID for updating
    setCurrentDraftId(draft.id)
    
    // Open the create modal
    setShowCreateModal(true)
    showToast('Editing draft...', 'info')
  }

  const handleDeleteDraft = async (draftId: string) => {
    if (!confirm('Are you sure you want to delete this draft?')) {
      return
    }

    try {
      const response = await fetch(`/api/drafts/delete?id=${draftId}`, {
        method: 'DELETE'
      })

      const data = await response.json()
      if (data.success) {
        showToast('Draft deleted successfully!', 'success')
        loadDrafts() // Reload the list
      } else {
        showToast('Failed to delete draft: ' + data.error, 'error')
      }
    } catch (error) {
      console.error('Error deleting draft:', error)
      showToast('An error occurred. Please try again.', 'error')
    }
  }

  const handlePostNow = async (draft: Draft) => {
    try {
      const response = await fetch('/api/drafts/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: draft.id,
          originalPrompt: draft.originalPrompt,
          enhancedScript: draft.enhancedScript,
          videoUrl: draft.videoUrl,
          thumbnailUrl: draft.thumbnailUrl,
          settings: {
            ...draft.settings,
            status: 'posted'
          }
        })
      })

      const data = await response.json()
      if (data.success) {
        showToast('Post published successfully!', 'success')
        loadDrafts()
      } else {
        showToast('Failed to publish post: ' + data.error, 'error')
      }
    } catch (error) {
      console.error('Error publishing post:', error)
      showToast('An error occurred. Please try again.', 'error')
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <ToastContainer />
      {/* Header */}
      <div className="flex items-center justify-between animate-slide-down">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Posts</h1>
          <p className="text-foreground-secondary mt-1">Manage your Instagram content</p>
        </div>
        <button 
          onClick={() => setShowCreateModal(true)}
          className="btn-primary flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Create Post
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 overflow-x-auto pb-2 animate-slide-up">
        {(['all', 'published', 'scheduled', 'draft'] as const).map((tab, index) => (
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

      {/* Posts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Show all posts from database */}
        {drafts.map((draft, index) => (
          <div key={draft.id} className="card card-hover group animate-scale-in" style={{ animationDelay: `${index * 100}ms` }}>
            {/* Thumbnail */}
            <div className="relative aspect-square bg-background-tertiary rounded-t-lg flex items-center justify-center overflow-hidden transition-all duration-300 group-hover:scale-105">
              {draft.videoUrl ? (
                <video src={draft.videoUrl} className="w-full h-full object-cover" />
              ) : draft.thumbnailUrl ? (
                <img src={draft.thumbnailUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="text-7xl">🎬</div>
              )}
              
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/60 transition-all duration-300 flex items-center justify-center opacity-0 group-hover:opacity-100">
                <div className="flex gap-2 scale-75 group-hover:scale-100 transition-transform duration-300">
                  <button 
                    onClick={() => handleEditDraft(draft)}
                    className="p-2 bg-background-secondary rounded-lg hover:bg-primary transition-all duration-300 hover:scale-110"
                  >
                    <Edit className="w-5 h-5" />
                  </button>
                  <button 
                    onClick={() => handleDeleteDraft(draft.id)}
                    className="p-2 bg-background-secondary rounded-lg hover:bg-red-500 transition-all duration-300 hover:scale-110"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
              
              {/* Status Badge */}
              <div className="absolute top-3 right-3">
                <span className={`px-3 py-1 text-xs font-medium rounded-full border backdrop-blur-sm ${
                  draft.status === 'published' 
                    ? 'bg-green-500/20 text-green-500 border-green-500/30'
                    : draft.status === 'scheduled'
                    ? 'bg-teal/20 text-teal border-teal/30'
                    : 'bg-yellow-500/20 text-yellow-500 border-yellow-500/30'
                }`}>
                  {draft.status.charAt(0).toUpperCase() + draft.status.slice(1)}
                </span>
              </div>

              {/* Type Icon */}
              <div className="absolute top-3 left-3">
                <div className="p-2 bg-background-secondary/80 backdrop-blur-sm rounded-lg">
                  {draft.videoUrl ? (
                    <Video className="w-4 h-4 text-primary" />
                  ) : (
                    <ImageIcon className="w-4 h-4 text-primary" />
                  )}
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="p-4 space-y-3">
              <p className="text-sm text-foreground line-clamp-2">
                {draft.originalPrompt || 'AI Generated Video'}
              </p>
              
              {/* Show posted time if published */}
              {draft.status === 'published' && draft.postedAt && (
                <div className="text-xs text-foreground-secondary">
                  Posted {new Date(draft.postedAt).toLocaleDateString()}
                </div>
              )}

              {/* Show scheduled time if scheduled */}
              {draft.status === 'scheduled' && draft.scheduledDate && (
                <div className="flex items-center gap-1 text-xs text-teal">
                  <Clock className="w-3 h-3" />
                  {new Date(draft.scheduledDate).toLocaleString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit',
                    hour12: true
                  })}
                </div>
              )}

              {/* Show created time for drafts */}
              {draft.status === 'draft' && (
                <div className="text-xs text-foreground-secondary">
                  Created {new Date(draft.createdAt).toLocaleDateString()}
                </div>
              )}

              {/* Actions based on status */}
              <div className="flex gap-2 pt-2">
                {draft.status === 'published' ? (
                  <a 
                    href={draft.instagramMediaId ? `https://www.instagram.com/p/${draft.instagramMediaId}` : '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 px-4 py-2 bg-primary hover:bg-primary-hover text-primary-foreground rounded-lg text-sm font-medium transition-all duration-300 flex items-center justify-center gap-2 hover:scale-105"
                  >
                    View on Instagram
                  </a>
                ) : (
                  <>
                    <button 
                      onClick={() => handleEditDraft(draft)}
                      className="flex-1 px-4 py-2 bg-background-tertiary hover:bg-primary/20 text-foreground hover:text-primary rounded-lg text-sm font-medium transition-all duration-300 hover:scale-105"
                    >
                      Edit
                    </button>
                    {draft.status === 'scheduled' ? (
                      <button 
                        onClick={() => handlePostNow(draft)}
                        className="flex-1 px-4 py-2 bg-primary hover:bg-primary-hover text-primary-foreground rounded-lg text-sm font-medium transition-all duration-300 flex items-center justify-center gap-2 hover:scale-105"
                      >
                        <Send className="w-4 h-4" />
                        Post Now
                      </button>
                    ) : (
                      <button 
                        onClick={() => {
                          setCurrentDraftId(draft.id)
                          setShowScheduleModal(true)
                        }}
                        className="flex-1 px-4 py-2 bg-primary hover:bg-primary-hover text-primary-foreground rounded-lg text-sm font-medium transition-all duration-300 flex items-center justify-center gap-2 hover:scale-105"
                      >
                        <Clock className="w-4 h-4" />
                        Schedule
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {drafts.length === 0 && !isLoadingDrafts && (
        <div className="card p-12 text-center animate-scale-in">
          <div className="w-20 h-20 mx-auto bg-background-tertiary rounded-full flex items-center justify-center mb-4 animate-bounce-soft">
            <ImageIcon className="w-10 h-10 text-foreground-muted" />
          </div>
          <h3 className="text-xl font-bold text-foreground mb-2">No posts found</h3>
          <p className="text-foreground-secondary mb-6">
            {filter === 'draft' 
              ? 'Generate videos with AI to create drafts'
              : filter === 'scheduled'
              ? 'Schedule a post to see it here'
              : filter === 'published'
              ? 'Published posts will appear here'
              : 'Create your first post to get started'
            }
          </p>
          {filter === 'draft' ? (
            <a href="/dashboard/ai-video" className="btn-primary inline-flex items-center gap-2">
              <Sparkles className="w-5 h-5" />
              Create AI Video
            </a>
          ) : (
            <button 
              onClick={() => setShowCreateModal(true)}
              className="btn-primary inline-flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Create Post
            </button>
          )}
        </div>
      )}

      {/* Create Post Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-background border border-border rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto animate-scale-in shadow-2xl">
            {/* Modal Header */}
            <div className="sticky top-0 bg-background border-b border-border p-4 flex items-center justify-between z-10">
              <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                <Plus className="w-6 h-6 text-primary" />
                Create New Post
              </h2>
              <button 
                onClick={() => setShowCreateModal(false)}
                className="p-2 hover:bg-background-tertiary rounded-lg transition-all duration-300"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Post Type Selection */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Post Type</label>
                <div className="grid grid-cols-3 gap-3">
                  {(['image', 'video', 'carousel'] as const).map((type) => (
                    <button
                      key={type}
                      onClick={() => setPostType(type)}
                      className={`p-4 rounded-lg border-2 transition-all duration-300 hover:scale-105 ${
                        postType === type
                          ? 'border-primary bg-primary/10'
                          : 'border-border hover:border-primary/50 bg-background-tertiary'
                      }`}
                    >
                      <div className="flex flex-col items-center gap-2">
                        {type === 'image' && <ImageIcon className="w-6 h-6" />}
                        {type === 'video' && <Video className="w-6 h-6" />}
                        {type === 'carousel' && <ImageIcon className="w-6 h-6" />}
                        <span className="text-sm font-medium capitalize">{type}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* File Upload */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  Upload {postType === 'image' ? 'Image' : 'Video'}
                </label>
                <div className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary transition-all duration-300">
                  {previewUrl ? (
                    <div className="relative">
                      {postType === 'video' ? (
                        <video src={previewUrl} controls className="max-h-64 mx-auto rounded-lg" />
                      ) : (
                        <img src={previewUrl} alt="Preview" className="max-h-64 mx-auto rounded-lg" />
                      )}
                      <button
                        onClick={() => {
                          setPreviewUrl('')
                          setSelectedFile(null)
                        }}
                        className="absolute top-2 right-2 p-2 bg-red-500 hover:bg-red-600 rounded-lg transition-all"
                      >
                        <X className="w-4 h-4 text-white" />
                      </button>
                    </div>
                  ) : (
                    <label className="cursor-pointer">
                      <input
                        type="file"
                        accept={postType === 'video' ? 'video/*' : 'image/*'}
                        onChange={handleFileSelect}
                        className="hidden"
                      />
                      <Upload className="w-12 h-12 mx-auto text-foreground-muted mb-3" />
                      <p className="text-foreground font-medium mb-1">
                        Click to upload or drag and drop
                      </p>
                      <p className="text-sm text-foreground-secondary">
                        {postType === 'video' ? 'MP4, MOV up to 100MB' : 'PNG, JPG up to 10MB'}
                      </p>
                    </label>
                  )}
                </div>
              </div>

              {/* Caption */}
              <div className="space-y-2">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-foreground">Caption</label>
                  <AICaptionImprover 
                    caption={caption} 
                    onImprove={setCaption}
                  />
                </div>
                <textarea
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  placeholder="Write a caption..."
                  rows={4}
                  className="w-full px-4 py-3 bg-background-tertiary border border-border rounded-lg text-foreground placeholder:text-foreground-muted focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                />
                <div className="flex items-center justify-between text-xs text-foreground-secondary">
                  <span>{caption.length} / 2200 characters</span>
                </div>
              </div>

              {/* Hashtags */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground flex items-center gap-2">
                  <Hash className="w-4 h-4" />
                  Hashtags
                </label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {hashtags.map((tag, index) => (
                    <span
                      key={index}
                      className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm flex items-center gap-2 group hover:bg-primary/20 transition-all"
                    >
                      #{tag}
                      <button
                        onClick={() => removeHashtag(index)}
                        className="hover:text-red-500 transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                  <button
                    onClick={addHashtag}
                    className="px-3 py-1 border-2 border-dashed border-border hover:border-primary text-foreground-secondary hover:text-primary rounded-full text-sm transition-all duration-300"
                  >
                    + Add Hashtag
                  </button>
                </div>
              </div>

              {/* Mentions */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground flex items-center gap-2">
                  <AtSign className="w-4 h-4" />
                  Mentions
                </label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {mentions.map((mention, index) => (
                    <span
                      key={index}
                      className="px-3 py-1 bg-teal/10 text-teal rounded-full text-sm flex items-center gap-2 group hover:bg-teal/20 transition-all"
                    >
                      @{mention}
                      <button
                        onClick={() => removeMention(index)}
                        className="hover:text-red-500 transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                  <button
                    onClick={addMention}
                    className="px-3 py-1 border-2 border-dashed border-border hover:border-teal text-foreground-secondary hover:text-teal rounded-full text-sm transition-all duration-300"
                  >
                    + Add Mention
                  </button>
                </div>
              </div>

              {/* Location */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  Location (Optional)
                </label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Add location..."
                  className="w-full px-4 py-2 bg-background-tertiary border border-border rounded-lg text-foreground placeholder:text-foreground-muted focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
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
                    {savedSongs.length > 0 ? 'Choose from My Songs' : 'No songs available - Generate AI Music first'}
                  </button>
                )}
                
                {/* Music Selector Dropdown */}
                {showMusicSelector && savedSongs.length > 0 && (
                  <div className="max-h-64 overflow-y-auto bg-background-secondary border border-border rounded-lg divide-y divide-border">
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
                          <div className="font-medium text-foreground truncate">{song.title}</div>
                          <div className="text-xs text-foreground-secondary">
                            {Math.floor(song.duration / 60)}:{String(Math.floor(song.duration % 60)).padStart(2, '0')}
                            {song.tags && <span className="ml-2">• {song.tags.split(',')[0]}</span>}
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

              {/* Schedule Date/Time (shown when editing scheduled post or manually toggled) */}
              {(scheduleDate || scheduleTime) && (
                <div className="space-y-2 p-4 bg-teal/10 border border-teal/30 rounded-lg">
                  <label className="text-sm font-medium text-foreground flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-teal" />
                    Scheduled Time
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs text-foreground-secondary">Date</label>
                      <input
                        type="date"
                        value={scheduleDate}
                        onChange={(e) => setScheduleDate(e.target.value)}
                        className="w-full px-3 py-2 bg-background-tertiary border border-border rounded-lg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-foreground-secondary">Time</label>
                      <input
                        type="time"
                        value={scheduleTime}
                        onChange={(e) => setScheduleTime(e.target.value)}
                        className="w-full px-3 py-2 bg-background-tertiary border border-border rounded-lg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                      />
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setScheduleDate('')
                      setScheduleTime('')
                    }}
                    className="text-xs text-red-500 hover:text-red-600 flex items-center gap-1"
                  >
                    <X className="w-3 h-3" />
                    Remove schedule
                  </button>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4 border-t border-border">
                <button
                  onClick={() => handleCreatePost('draft')}
                  disabled={isSaving || !caption}
                  className="flex-1 px-6 py-3 bg-background-tertiary hover:bg-background-tertiary/80 text-foreground rounded-lg font-medium transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                >
                  {isSaving ? 'Saving...' : 'Save as Draft'}
                </button>
                <button
                  onClick={() => handleCreatePost('schedule')}
                  disabled={isSaving || !selectedFile || !caption}
                  className="flex-1 px-6 py-3 bg-primary/20 hover:bg-primary/30 text-primary rounded-lg font-medium transition-all duration-300 flex items-center justify-center gap-2 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                >
                  <Calendar className="w-5 h-5" />
                  {scheduleDate && scheduleTime && currentDraftId ? 'Update Schedule' : 'Schedule'}
                </button>
                <button
                  onClick={() => handleCreatePost('now')}
                  disabled={isSaving || !selectedFile || !caption}
                  className="flex-1 px-6 py-3 bg-primary hover:bg-primary-hover text-primary-foreground rounded-lg font-medium transition-all duration-300 flex items-center justify-center gap-2 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                >
                  {isSaving ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Posting...
                    </>
                  ) : (
                    <>
                      <Send className="w-5 h-5" />
                      Post Now
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Schedule Modal */}
      {showScheduleModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-background border border-border rounded-2xl w-full max-w-md animate-scale-in shadow-2xl">
            <div className="p-6 space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                  <Calendar className="w-6 h-6 text-primary" />
                  Schedule Post
                </h2>
                <button 
                  onClick={() => setShowScheduleModal(false)}
                  className="p-2 hover:bg-background-tertiary rounded-lg transition-all duration-300"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Date</label>
                  <input
                    type="date"
                    value={scheduleDate}
                    onChange={(e) => setScheduleDate(e.target.value)}
                    className="w-full px-4 py-2 bg-background-tertiary border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Time</label>
                  <input
                    type="time"
                    value={scheduleTime}
                    onChange={(e) => setScheduleTime(e.target.value)}
                    className="w-full px-4 py-2 bg-background-tertiary border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => {
                    setShowScheduleModal(false)
                    resetForm()
                  }}
                  disabled={isSaving}
                  className="flex-1 px-6 py-3 bg-background-tertiary hover:bg-background-tertiary/80 text-foreground rounded-lg font-medium transition-all duration-300 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSchedulePost}
                  disabled={isSaving || !scheduleDate || !scheduleTime}
                  className="flex-1 px-6 py-3 bg-primary hover:bg-primary-hover text-primary-foreground rounded-lg font-medium transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isSaving ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Scheduling...
                    </>
                  ) : (
                    'Schedule Post'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
