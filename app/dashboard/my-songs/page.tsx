'use client'

import { useState, useEffect } from 'react'
import { Music, Play, Pause, Download, Trash2, Plus, Search, Filter } from 'lucide-react'

interface SavedSong {
  id: string
  title: string
  audioUrl: string
  imageUrl: string
  duration: number
  tags: string
  createdAt: string
  modelName: string
  prompt?: string
}

export default function MySongsPage() {
  const [songs, setSongs] = useState<SavedSong[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [playingSongId, setPlayingSongId] = useState<string | null>(null)

  useEffect(() => {
    fetchSavedSongs()
  }, [])

  const fetchSavedSongs = async () => {
    try {
      const response = await fetch('/api/songs/list')
      const data = await response.json()
      if (data.success) {
        setSongs(data.songs)
      }
    } catch (error) {
      console.error('Failed to load songs:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async (songId: string) => {
    if (!confirm('Are you sure you want to delete this song?')) return

    try {
      const response = await fetch('/api/songs/delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ songId })
      })

      if (response.ok) {
        setSongs(songs.filter(s => s.id !== songId))
      }
    } catch (error) {
      console.error('Failed to delete song:', error)
    }
  }

  const togglePlay = (songId: string) => {
    setPlayingSongId(playingSongId === songId ? null : songId)
  }

  const filteredSongs = songs.filter(song =>
    song.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    song.tags.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <Music className="w-8 h-8 text-primary" />
            My Songs Library
          </h1>
          <p className="text-foreground-secondary mt-2">Manage and use your AI-generated music</p>
        </div>
        <a
          href="/dashboard/ai-music"
          className="px-6 py-3 bg-primary text-white rounded-xl font-semibold hover:bg-primary/90 transition-all flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Generate New
        </a>
      </div>

      {/* Search Bar */}
      <div className="mb-6 relative">
        <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-foreground-secondary w-5 h-5" />
        <input
          type="text"
          placeholder="Search songs by title or tags..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="input-field pl-12"
        />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="card p-6">
          <div className="text-3xl font-bold text-foreground">{songs.length}</div>
          <div className="text-foreground-secondary mt-1">Total Songs</div>
        </div>
        <div className="card p-6">
          <div className="text-3xl font-bold text-foreground">
            {Math.floor(songs.reduce((acc, s) => acc + s.duration, 0) / 60)}m
          </div>
          <div className="text-foreground-secondary mt-1">Total Duration</div>
        </div>
        <div className="card p-6">
          <div className="text-3xl font-bold text-foreground">{filteredSongs.length}</div>
          <div className="text-foreground-secondary mt-1">Filtered Results</div>
        </div>
      </div>

        {/* Songs Grid */}
        {isLoading ? (
          <div className="text-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="text-foreground-secondary mt-4">Loading your songs...</p>
          </div>
        ) : filteredSongs.length === 0 ? (
          <div className="text-center py-20">
            <Music className="w-16 h-16 text-border mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-foreground-secondary mb-2">
              {searchQuery ? 'No songs found' : 'No songs yet'}
            </h3>
            <p className="text-foreground-secondary mb-6">
              {searchQuery ? 'Try a different search term' : 'Generate your first AI music track'}
            </p>
            {!searchQuery && (
              <a
                href="/dashboard/ai-music"
                className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-xl hover:bg-primary/90 transition-all"
              >
                <Plus className="w-5 h-5" />
                Generate Music
              </a>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredSongs.map((song) => (
              <div
                key={song.id}
                className="card overflow-hidden hover:border-primary/50 transition-all group"
              >
                {/* Song Image */}
                <div className="relative h-48 bg-background-tertiary">
                  {song.imageUrl ? (
                    <img
                      src={song.imageUrl}
                      alt={song.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Music className="w-16 h-16 text-primary" />
                    </div>
                  )}
                  {/* Play Button Overlay */}
                  <button
                    onClick={() => togglePlay(song.id)}
                    className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    {playingSongId === song.id ? (
                      <Pause className="w-16 h-16 text-white" />
                    ) : (
                      <Play className="w-16 h-16 text-white" />
                    )}
                  </button>
                </div>

                {/* Song Info */}
                <div className="p-4">
                  <h3 className="text-lg font-semibold text-foreground mb-1 truncate">
                    {song.title}
                  </h3>
                  <div className="flex items-center gap-2 text-sm text-foreground-secondary mb-3">
                    <span>{Math.floor(song.duration / 60)}:{String(Math.floor(song.duration % 60)).padStart(2, '0')}</span>
                    <span>•</span>
                    <span className="truncate">{song.modelName}</span>
                  </div>
                  
                  {song.tags && (
                    <div className="flex flex-wrap gap-1 mb-3">
                      {song.tags.split(',').slice(0, 2).map((tag, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-1 bg-primary/20 text-primary text-xs rounded-full"
                        >
                          {tag.trim()}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Prompt Display */}
                  {song.prompt && (
                    <p className="text-xs text-foreground-secondary mb-3 line-clamp-2" title={song.prompt}>
                      <span className="font-medium">Prompt:</span> {song.prompt}
                    </p>
                  )}

                  {/* Audio Player */}
                  {playingSongId === song.id && (
                    <audio
                      src={song.audioUrl}
                      autoPlay
                      controls
                      className="w-full mb-3"
                      onEnded={() => setPlayingSongId(null)}
                    />
                  )}

                  {/* Action Buttons */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => window.open(song.audioUrl, '_blank')}
                      className="flex-1 px-3 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-all flex items-center justify-center gap-2 text-sm"
                    >
                      <Download className="w-4 h-4" />
                      Download
                    </button>
                    <button
                      onClick={() => handleDelete(song.id)}
                      className="px-3 py-2 bg-red-600/20 text-red-400 rounded-lg hover:bg-red-600/30 transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
    </div>
  )
}
