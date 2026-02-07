'use client'

import { useState, useEffect } from 'react'
import { 
  MessageCircle,
  Send,
  Trash2,
  Loader2,
  Image as ImageIcon,
  Video,
  RefreshCw,
  User,
  Clock,
  Heart,
  Reply,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  CheckCircle,
  Search,
  Filter,
  MoreHorizontal,
  ExternalLink,
  Sparkles,
  Plus,
  Power,
  PowerOff,
  Zap
} from 'lucide-react'
import { useToast } from '@/lib/components/Toast'

interface Comment {
  id: string
  text: string
  username: string
  timestamp: string
  replies?: Comment[]
}

interface Media {
  id: string
  caption?: string
  media_type: 'IMAGE' | 'VIDEO' | 'CAROUSEL_ALBUM' | 'REELS'
  media_url: string
  thumbnail_url?: string
  permalink: string
  timestamp: string
  like_count?: number
  comments_count?: number
}

interface AutoDMRule {
  id: number
  keyword: string
  dm_message: string
  media_id?: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export default function CommentsPage() {
  const { showToast, ToastContainer } = useToast()
  const [media, setMedia] = useState<Media[]>([])
  const [selectedMedia, setSelectedMedia] = useState<Media | null>(null)
  const [comments, setComments] = useState<Comment[]>([])
  const [autoDMRules, setAutoDMRules] = useState<AutoDMRule[]>([])
  const [isLoadingMedia, setIsLoadingMedia] = useState(true)
  const [isLoadingComments, setIsLoadingComments] = useState(false)
  const [isLoadingRules, setIsLoadingRules] = useState(false)
  const [replyingTo, setReplyingTo] = useState<string | null>(null)
  const [replyText, setReplyText] = useState('')
  const [isSendingReply, setIsSendingReply] = useState(false)
  const [expandedComments, setExpandedComments] = useState<Set<string>>(new Set())
  const [searchQuery, setSearchQuery] = useState('')
  const [filterType, setFilterType] = useState<'all' | 'IMAGE' | 'VIDEO' | 'REELS'>('all')
  const [isConnected, setIsConnected] = useState(true)
  const [showAddRuleModal, setShowAddRuleModal] = useState(false)
  const [newKeyword, setNewKeyword] = useState('')
  const [newMessage, setNewMessage] = useState('')
  const [showAutoDMSection, setShowAutoDMSection] = useState(false)

  // Fetch user's media on mount
  useEffect(() => {
    fetchMedia()
  }, [])

  const fetchMedia = async () => {
    setIsLoadingMedia(true)
    try {
      const response = await fetch('/api/comments/media?limit=50')
      const data = await response.json()
      
      if (!response.ok) {
        if (response.status === 401) {
          setIsConnected(false)
        }
        throw new Error(data.error || 'Failed to fetch media')
      }
      
      setMedia(data.media || [])
      setIsConnected(true)
    } catch (error) {
      console.error('Error fetching media:', error)
      if ((error as Error).message.includes('not connected')) {
        setIsConnected(false)
      }
    } finally {
      setIsLoadingMedia(false)
    }
  }

  const fetchComments = async (mediaId: string) => {
    setIsLoadingComments(true)
    try {
      const response = await fetch(`/api/comments?mediaId=${mediaId}`)
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch comments')
      }
      
      setComments(data.comments || [])
    } catch (error) {
      console.error('Error fetching comments:', error)
      showToast('Failed to load comments', 'error')
    } finally {
      setIsLoadingComments(false)
    }
  }

  const handleSelectMedia = (mediaItem: Media) => {
    setSelectedMedia(mediaItem)
    setComments([])
    fetchComments(mediaItem.id)
    fetchAutoDMRules(mediaItem.id)
  }

  const fetchAutoDMRules = async (mediaId: string) => {
    setIsLoadingRules(true)
    try {
      const response = await fetch('/api/auto-dm/rules')
      const data = await response.json()
      if (data.success) {
        // Filter rules for this specific media or global rules
        const relevantRules = data.rules.filter((rule: AutoDMRule) => 
          !rule.media_id || rule.media_id === mediaId
        )
        setAutoDMRules(relevantRules)
      }
    } catch (error) {
      console.error('Failed to load auto-DM rules:', error)
    } finally {
      setIsLoadingRules(false)
    }
  }

  const handleAddRule = async () => {
    if (!newKeyword || !newMessage) {
      showToast('Please enter keyword and message', 'error')
      return
    }

    if (!selectedMedia) {
      showToast('Please select a post first', 'error')
      return
    }

    try {
      const response = await fetch('/api/auto-dm/rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          keyword: newKeyword,
          dmMessage: newMessage,
          mediaId: selectedMedia.id,
        }),
      })

      const data = await response.json()
      
      if (data.success) {
        showToast('Auto-DM rule created successfully!', 'success')
        setNewKeyword('')
        setNewMessage('')
        setShowAddRuleModal(false)
        fetchAutoDMRules(selectedMedia.id)
      } else {
        showToast(data.error || 'Failed to create rule', 'error')
      }
    } catch (error) {
      console.error('Failed to create rule:', error)
      showToast('Failed to create rule', 'error')
    }
  }

  const handleToggleRule = async (ruleId: number, isActive: boolean) => {
    try {
      const response = await fetch('/api/auto-dm/rules', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ruleId,
          isActive: !isActive,
        }),
      })

      const data = await response.json()
      
      if (data.success) {
        showToast(`Rule ${!isActive ? 'enabled' : 'disabled'}`, 'success')
        if (selectedMedia) {
          fetchAutoDMRules(selectedMedia.id)
        }
      }
    } catch (error) {
      console.error('Failed to toggle rule:', error)
      showToast('Failed to update rule', 'error')
    }
  }

  const handleDeleteRule = async (ruleId: number) => {
    if (!confirm('Are you sure you want to delete this rule?')) return

    try {
      const response = await fetch(`/api/auto-dm/rules?ruleId=${ruleId}`, {
        method: 'DELETE',
      })

      const data = await response.json()
      
      if (data.success) {
        showToast('Rule deleted successfully', 'success')
        if (selectedMedia) {
          fetchAutoDMRules(selectedMedia.id)
        }
      }
    } catch (error) {
      console.error('Failed to delete rule:', error)
      showToast('Failed to delete rule', 'error')
    }
  }

  const handleReply = async (commentId: string) => {
    if (!replyText.trim()) {
      showToast('Please enter a reply message', 'error')
      return
    }

    setIsSendingReply(true)
    try {
      const response = await fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          commentId,
          message: replyText
        })
      })

      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to send reply')
      }

      showToast('Reply sent successfully!', 'success')
      setReplyText('')
      setReplyingTo(null)
      
      // Refresh comments
      if (selectedMedia) {
        fetchComments(selectedMedia.id)
      }
    } catch (error) {
      console.error('Error sending reply:', error)
      showToast('Failed to send reply', 'error')
    } finally {
      setIsSendingReply(false)
    }
  }

  const handleDeleteComment = async (commentId: string) => {
    if (!confirm('Are you sure you want to delete this comment?')) return

    try {
      const response = await fetch(`/api/comments?commentId=${commentId}`, {
        method: 'DELETE'
      })

      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete comment')
      }

      showToast('Comment deleted successfully', 'success')
      
      // Refresh comments
      if (selectedMedia) {
        fetchComments(selectedMedia.id)
      }
    } catch (error) {
      console.error('Error deleting comment:', error)
      showToast('Failed to delete comment', 'error')
    }
  }

  const toggleCommentExpand = (commentId: string) => {
    setExpandedComments(prev => {
      const newSet = new Set(prev)
      if (newSet.has(commentId)) {
        newSet.delete(commentId)
      } else {
        newSet.add(commentId)
      }
      return newSet
    })
  }

  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffHours < 1) return 'Just now'
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString()
  }

  const getMediaIcon = (type: string) => {
    switch (type) {
      case 'VIDEO':
      case 'REELS':
        return <Video className="w-4 h-4" />
      default:
        return <ImageIcon className="w-4 h-4" />
    }
  }

  const filteredMedia = media.filter(item => {
    const matchesSearch = item.caption?.toLowerCase().includes(searchQuery.toLowerCase()) || true
    const matchesType = filterType === 'all' || item.media_type === filterType
    return matchesSearch && matchesType
  })

  if (!isConnected) {
    return (
      <div className="space-y-6 animate-fade-in">
        <ToastContainer />
        <div className="animate-slide-down">
          <h1 className="text-3xl font-bold text-foreground">Comments & Replies</h1>
          <p className="text-foreground-secondary mt-1">Manage your Instagram comments and engage with your audience</p>
        </div>
        
        <div className="card p-12 text-center">
          <AlertCircle className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-foreground mb-2">Instagram Not Connected</h2>
          <p className="text-foreground-secondary mb-6">
            Connect your Instagram account to manage comments and replies.
          </p>
          <a 
            href="/dashboard/settings"
            className="btn-primary inline-flex items-center gap-2"
          >
            Go to Settings
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <ToastContainer />

      {/* Header */}
      <div className="animate-slide-down">
        <h1 className="text-3xl font-bold text-foreground">Comments & Replies</h1>
        <p className="text-foreground-secondary mt-1">Manage your Instagram comments and engage with your audience</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Media List */}
        <div className="lg:col-span-1 space-y-4">
          <div className="card p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                <ImageIcon className="w-5 h-5 text-primary" />
                Your Posts
              </h2>
              <button
                onClick={fetchMedia}
                className="p-2 text-foreground-secondary hover:text-foreground hover:bg-background-tertiary rounded-lg transition-colors"
                title="Refresh"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>

            {/* Search & Filter */}
            <div className="space-y-3 mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground-muted" />
                <input
                  type="text"
                  placeholder="Search posts..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-background border border-border rounded-lg text-sm text-foreground placeholder:text-foreground-muted focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
              <div className="flex gap-2">
                {(['all', 'IMAGE', 'VIDEO', 'REELS'] as const).map((type) => (
                  <button
                    key={type}
                    onClick={() => setFilterType(type)}
                    className={`px-3 py-1 text-xs rounded-full transition-colors ${
                      filterType === type
                        ? 'bg-primary text-white'
                        : 'bg-background-secondary text-foreground-secondary hover:bg-background-tertiary'
                    }`}
                  >
                    {type === 'all' ? 'All' : type}
                  </button>
                ))}
              </div>
            </div>

            {/* Media List */}
            {isLoadingMedia ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : filteredMedia.length === 0 ? (
              <div className="text-center py-8">
                <ImageIcon className="w-12 h-12 text-foreground-muted mx-auto mb-3" />
                <p className="text-foreground-secondary">No posts found</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[600px] overflow-y-auto">
                {filteredMedia.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => handleSelectMedia(item)}
                    className={`w-full p-3 rounded-lg border transition-all text-left ${
                      selectedMedia?.id === item.id
                        ? 'border-primary bg-primary/10'
                        : 'border-border hover:border-primary/50 bg-background-secondary'
                    }`}
                  >
                    <div className="flex gap-3">
                      <div className="relative w-16 h-16 rounded-lg overflow-hidden bg-background-tertiary flex-shrink-0">
                        <img
                          src={item.thumbnail_url || item.media_url}
                          alt=""
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = '/placeholder.png'
                          }}
                        />
                        <div className="absolute top-1 right-1 p-1 bg-black/60 rounded text-white">
                          {getMediaIcon(item.media_type)}
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-foreground line-clamp-2">
                          {item.caption || 'No caption'}
                        </p>
                        <div className="flex items-center gap-3 mt-2 text-xs text-foreground-secondary">
                          <span className="flex items-center gap-1">
                            <Heart className="w-3 h-3" />
                            {item.like_count || 0}
                          </span>
                          <span className="flex items-center gap-1">
                            <MessageCircle className="w-3 h-3" />
                            {item.comments_count || 0}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatDate(item.timestamp)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column - Comments */}
        <div className="lg:col-span-2">
          <div className="card p-6 min-h-[600px]">
            {!selectedMedia ? (
              <div className="flex flex-col items-center justify-center h-full py-12">
                <MessageCircle className="w-16 h-16 text-foreground-muted mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-2">Select a Post</h3>
                <p className="text-foreground-secondary text-center max-w-md">
                  Choose a post from the left to view and manage its comments. You can reply to comments and engage with your audience.
                </p>
              </div>
            ) : (
              <>
                {/* Selected Media Header */}
                <div className="flex items-start gap-4 pb-4 border-b border-border mb-4">
                  <div className="w-20 h-20 rounded-lg overflow-hidden bg-background-tertiary flex-shrink-0">
                    <img
                      src={selectedMedia.thumbnail_url || selectedMedia.media_url}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1">
                    <p className="text-foreground line-clamp-2 mb-2">
                      {selectedMedia.caption || 'No caption'}
                    </p>
                    <div className="flex items-center gap-4 text-sm text-foreground-secondary">
                      <span className="flex items-center gap-1">
                        <Heart className="w-4 h-4" />
                        {selectedMedia.like_count || 0} likes
                      </span>
                      <span className="flex items-center gap-1">
                        <MessageCircle className="w-4 h-4" />
                        {selectedMedia.comments_count || 0} comments
                      </span>
                      <a
                        href={selectedMedia.permalink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-primary hover:underline"
                      >
                        <ExternalLink className="w-4 h-4" />
                        View on Instagram
                      </a>
                    </div>
                  </div>
                  <button
                    onClick={() => fetchComments(selectedMedia.id)}
                    className="p-2 text-foreground-secondary hover:text-foreground hover:bg-background-tertiary rounded-lg transition-colors"
                    title="Refresh comments"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                </div>

                {/* Auto-DM Section */}
                <div className="mb-6">
                  <button
                    onClick={() => setShowAutoDMSection(!showAutoDMSection)}
                    className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-purple-500/20 rounded-lg hover:border-purple-500/40 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Zap className="w-5 h-5 text-purple-400" />
                      <div className="text-left">
                        <h3 className="font-semibold text-foreground">Auto-DM Rules for this Post</h3>
                        <p className="text-sm text-foreground-secondary">
                          {autoDMRules.length} rule{autoDMRules.length !== 1 ? 's' : ''} active
                        </p>
                      </div>
                    </div>
                    <ChevronDown className={`w-5 h-5 text-foreground-secondary transition-transform ${showAutoDMSection ? 'rotate-180' : ''}`} />
                  </button>

                  {showAutoDMSection && (
                    <div className="mt-4 space-y-3">
                      {/* Add Rule Button */}
                      <button
                        onClick={() => setShowAddRuleModal(true)}
                        className="w-full p-3 bg-primary hover:bg-primary-hover text-primary-foreground rounded-lg flex items-center justify-center gap-2 transition-colors"
                      >
                        <Plus className="w-4 h-4" />
                        Add Auto-DM Rule
                      </button>

                      {/* Rules List */}
                      {isLoadingRules ? (
                        <div className="flex items-center justify-center py-8">
                          <Loader2 className="w-6 h-6 animate-spin text-primary" />
                        </div>
                      ) : autoDMRules.length === 0 ? (
                        <div className="text-center py-6 bg-background-secondary rounded-lg">
                          <Sparkles className="w-12 h-12 text-foreground-tertiary mx-auto mb-3" />
                          <p className="text-foreground-secondary text-sm">
                            No auto-DM rules for this post yet
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {autoDMRules.map((rule) => (
                            <div
                              key={rule.id}
                              className="p-4 bg-background-secondary border border-border rounded-lg"
                            >
                              <div className="flex items-start justify-between mb-2">
                                <div className="flex items-center gap-2 flex-1">
                                  <span className="px-3 py-1 bg-primary/20 text-primary rounded-full text-sm font-medium">
                                    {rule.keyword}
                                  </span>
                                  {rule.media_id ? (
                                    <span className="px-2 py-1 bg-purple-500/20 text-purple-400 rounded text-xs">
                                      This Post
                                    </span>
                                  ) : (
                                    <span className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded text-xs">
                                      All Posts
                                    </span>
                                  )}
                                  <span className={`px-2 py-1 rounded text-xs ${
                                    rule.is_active 
                                      ? 'bg-green-500/20 text-green-400' 
                                      : 'bg-gray-500/20 text-gray-400'
                                  }`}>
                                    {rule.is_active ? 'Active' : 'Disabled'}
                                  </span>
                                </div>
                                <div className="flex gap-1">
                                  <button
                                    onClick={() => handleToggleRule(rule.id, rule.is_active)}
                                    className={`p-1.5 rounded transition-colors ${
                                      rule.is_active
                                        ? 'bg-green-500/20 hover:bg-green-500/30 text-green-400'
                                        : 'bg-gray-500/20 hover:bg-gray-500/30 text-gray-400'
                                    }`}
                                    title={rule.is_active ? 'Disable' : 'Enable'}
                                  >
                                    {rule.is_active ? <Power className="w-3.5 h-3.5" /> : <PowerOff className="w-3.5 h-3.5" />}
                                  </button>
                                  <button
                                    onClick={() => handleDeleteRule(rule.id)}
                                    className="p-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded transition-colors"
                                    title="Delete"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                              <p className="text-sm text-foreground-secondary mt-2">
                                {rule.dm_message}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Comments List */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                    <MessageCircle className="w-5 h-5 text-primary" />
                    Comments ({comments.length})
                  </h3>

                  {isLoadingComments ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    </div>
                  ) : comments.length === 0 ? (
                    <div className="text-center py-12">
                      <MessageCircle className="w-12 h-12 text-foreground-muted mx-auto mb-3" />
                      <p className="text-foreground-secondary">No comments yet</p>
                      <p className="text-sm text-foreground-muted mt-1">
                        Comments on this post will appear here
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4 max-h-[400px] overflow-y-auto">
                      {comments.map((comment) => (
                        <div
                          key={comment.id}
                          className="p-4 bg-background-secondary rounded-lg border border-border"
                        >
                          <div className="flex items-start gap-3">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-semibold flex-shrink-0">
                              {comment.username.charAt(0).toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-semibold text-foreground">
                                  @{comment.username}
                                </span>
                                <span className="text-xs text-foreground-muted">
                                  {formatDate(comment.timestamp)}
                                </span>
                              </div>
                              <p className="text-foreground">{comment.text}</p>
                              
                              {/* Action Buttons */}
                              <div className="flex items-center gap-2 mt-3">
                                <button
                                  onClick={() => setReplyingTo(replyingTo === comment.id ? null : comment.id)}
                                  className="flex items-center gap-1 px-3 py-1.5 text-sm text-foreground-secondary hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                                >
                                  <Reply className="w-4 h-4" />
                                  Reply
                                </button>
                                <button
                                  onClick={() => handleDeleteComment(comment.id)}
                                  className="flex items-center gap-1 px-3 py-1.5 text-sm text-foreground-secondary hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                                >
                                  <Trash2 className="w-4 h-4" />
                                  Delete
                                </button>
                              </div>

                              {/* Reply Input */}
                              {replyingTo === comment.id && (
                                <div className="mt-3 p-3 bg-background rounded-lg border border-border">
                                  <div className="flex items-center gap-2 text-sm text-foreground-secondary mb-2">
                                    <Reply className="w-4 h-4" />
                                    Replying to @{comment.username}
                                  </div>
                                  <div className="flex gap-2">
                                    <input
                                      type="text"
                                      value={replyText}
                                      onChange={(e) => setReplyText(e.target.value)}
                                      placeholder="Write a reply..."
                                      className="flex-1 px-4 py-2 bg-background-secondary border border-border rounded-lg text-foreground placeholder:text-foreground-muted focus:outline-none focus:ring-2 focus:ring-primary/50"
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter' && !e.shiftKey) {
                                          e.preventDefault()
                                          handleReply(comment.id)
                                        }
                                      }}
                                    />
                                    <button
                                      onClick={() => handleReply(comment.id)}
                                      disabled={!replyText.trim() || isSendingReply}
                                      className="btn-primary px-4 disabled:opacity-50"
                                    >
                                      {isSendingReply ? (
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                      ) : (
                                        <Send className="w-5 h-5" />
                                      )}
                                    </button>
                                  </div>
                                </div>
                              )}

                              {/* Replies (if any) */}
                              {comment.replies && comment.replies.length > 0 && (
                                <div className="mt-3 pl-4 border-l-2 border-border space-y-3">
                                  {comment.replies.map((reply) => (
                                    <div key={reply.id} className="p-2">
                                      <div className="flex items-center gap-2 mb-1">
                                        <span className="font-semibold text-sm text-foreground">
                                          @{reply.username}
                                        </span>
                                        <span className="text-xs text-foreground-muted">
                                          {formatDate(reply.timestamp)}
                                        </span>
                                      </div>
                                      <p className="text-sm text-foreground">{reply.text}</p>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Quick Tips Card */}
      <div className="card p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
          <CheckCircle className="w-5 h-5 text-green-500" />
          Tips for Engaging with Comments
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-background-secondary rounded-lg">
            <h4 className="font-medium text-foreground mb-2">⚡ Respond Quickly</h4>
            <p className="text-sm text-foreground-secondary">
              Reply to comments within the first hour to boost engagement and visibility.
            </p>
          </div>
          <div className="p-4 bg-background-secondary rounded-lg">
            <h4 className="font-medium text-foreground mb-2">💬 Be Personal</h4>
            <p className="text-sm text-foreground-secondary">
              Use the commenter&apos;s name and personalize your response to build connections.
            </p>
          </div>
          <div className="p-4 bg-background-secondary rounded-lg">
            <h4 className="font-medium text-foreground mb-2">🎯 Ask Questions</h4>
            <p className="text-sm text-foreground-secondary">
              End your replies with questions to encourage further conversation.
            </p>
          </div>
        </div>
      </div>

      {/* Add Auto-DM Rule Modal */}
      {showAddRuleModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-background-secondary rounded-xl shadow-2xl max-w-lg w-full p-6">
            <h2 className="text-2xl font-bold text-foreground mb-6">Add Auto-DM Rule</h2>
            
            <div className="space-y-4">
              <div className="p-3 bg-purple-500/10 border border-purple-500/20 rounded-lg">
                <p className="text-sm text-foreground-secondary">
                  <span className="font-semibold text-purple-400">For this post:</span> {selectedMedia?.caption?.slice(0, 60) || 'No caption'}...
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Trigger Keyword
                </label>
                <input
                  type="text"
                  value={newKeyword}
                  onChange={(e) => setNewKeyword(e.target.value)}
                  placeholder="e.g., link, price, info"
                  className="w-full px-4 py-2 bg-background-primary border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <p className="text-xs text-foreground-tertiary mt-1">
                  When someone comments this word on this post, they&apos;ll get a DM
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  DM Message
                </label>
                <textarea
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Hi! Thanks for your interest! Check out: https://..."
                  rows={4}
                  className="w-full px-4 py-2 bg-background-primary border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                />
                <p className="text-xs text-foreground-tertiary mt-1">
                  This message will be sent automatically
                </p>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowAddRuleModal(false)
                  setNewKeyword('')
                  setNewMessage('')
                }}
                className="flex-1 px-4 py-2 bg-background-tertiary hover:bg-background-primary text-foreground rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddRule}
                className="flex-1 px-4 py-2 bg-primary hover:bg-primary-hover text-primary-foreground rounded-lg transition-colors"
              >
                Create Rule
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
