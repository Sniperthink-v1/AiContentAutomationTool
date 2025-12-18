'use client'

import { useState, useEffect } from 'react'
import { 
  Music, Wand2, Play, Pause, Loader2, Sparkles, Save, Library, Download, Check, X
} from 'lucide-react'

export default function AIMusicPage() {
  const [aiCredits, setAICredits] = useState(0)
  const [customMode, setCustomMode] = useState(false)
  const [instrumental, setInstrumental] = useState(false)
  const [model, setModel] = useState('V3_5')
  const [prompt, setPrompt] = useState('')
  const [style, setStyle] = useState('')
  const [title, setTitle] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedSongs, setGeneratedSongs] = useState<any[]>([])
  const [playingSongId, setPlayingSongId] = useState<string | null>(null)
  const [savingStates, setSavingStates] = useState<Record<string, boolean>>({})

  const models = [
    { id: 'V3_5', name: 'V3.5', credits: 10, time: '2 min', emoji: '⚡' },
    { id: 'V4', name: 'V4', credits: 15, time: '4 min', emoji: '🎵' },
    { id: 'V4_5', name: 'V4.5', credits: 20, time: '8 min', emoji: '🎸' },
    { id: 'V4_5PLUS', name: 'V4.5+', credits: 25, time: '8 min', emoji: '🎹' },
    { id: 'V5', name: 'V5', credits: 30, time: '8 min', emoji: '🚀' },
  ]

  const templates = [
    { title: 'Upbeat Pop', prompt: 'Upbeat pop music with catchy melody', style: 'Pop Electronic', emoji: '🎉' },
    { title: 'Chill Lofi', prompt: 'Relaxing lo-fi beats for studying', style: 'Lo-fi Hip Hop', emoji: '📚' },
    { title: 'Epic Cinematic', prompt: 'Epic orchestral music with dramatic crescendos', style: 'Orchestral', emoji: '🎬' },
    { title: 'Calm Piano', prompt: 'Peaceful piano meditation music', style: 'Classical Piano', emoji: '🧘' },
  ]

  useEffect(() => {
    fetchCredits()
  }, [])

  const fetchCredits = async () => {
    try {
      const res = await fetch('/api/credits/balance')
      const data = await res.json()
      if (data.success) setAICredits(data.credits.ai_credits || 0)
    } catch (error) {
      console.error('Failed to load credits:', error)
    }
  }

  const handleGenerate = async () => {
    if (!prompt.trim()) return alert('Please enter a prompt')
    if (customMode && (!style.trim() || !title.trim())) {
      return alert('Please fill in all custom fields')
    }

    const selectedModel = models.find(m => m.id === model)
    if (!selectedModel || aiCredits < selectedModel.credits) {
      return alert('Not enough AI credits')
    }

    setIsGenerating(true)
    setGeneratedSongs([])

    try {
      const res = await fetch('/api/suno/generate-music', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customMode,
          instrumental,
          model,
          prompt,
          style: customMode ? style : undefined,
          title: customMode ? title : undefined,
        })
      })

      const data = await res.json()
      if (data.success) {
        setAICredits(data.remainingAICredits)
        pollMusicStatus(data.taskId)
      } else {
        alert(data.error || 'Generation failed')
        setIsGenerating(false)
      }
    } catch (error) {
      console.error('Generate error:', error)
      alert('Failed to generate music')
      setIsGenerating(false)
    }
  }

  const pollMusicStatus = async (taskId: string) => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/suno/check-status?taskId=${taskId}`)
        const data = await res.json()

        if (data.success && data.status === 'complete') {
          clearInterval(interval)
          setGeneratedSongs(data.songs)
          setIsGenerating(false)
        } else if (data.status === 'failed') {
          clearInterval(interval)
          setIsGenerating(false)
          alert('Generation failed')
        }
      } catch (error) {
        console.error('Poll error:', error)
      }
    }, 5000)

    setTimeout(() => {
      clearInterval(interval)
      if (isGenerating) setIsGenerating(false)
    }, 300000)
  }

  const handleSaveSong = async (song: any) => {
    setSavingStates({ ...savingStates, [song.id]: true })
    
    try {
      const res = await fetch('/api/songs/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          songId: song.id,
          title: song.title,
          audioUrl: song.audioUrl,
          imageUrl: song.imageUrl,
          duration: song.duration,
          tags: song.tags,
          modelName: song.modelName
        })
      })

      if (res.ok) {
        alert('Song saved to your library!')
      } else {
        alert('Failed to save song')
      }
    } catch (error) {
      console.error('Save error:', error)
      alert('Failed to save song')
    } finally {
      setSavingStates({ ...savingStates, [song.id]: false })
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-white flex items-center gap-3">
              <Sparkles className="w-10 h-10 text-purple-400" />
              AI Music Generator
            </h1>
            <p className="text-gray-400 mt-2">Create professional music with Suno AI</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="px-6 py-3 bg-gradient-to-r from-purple-600/20 to-pink-600/20 border border-purple-500/30 rounded-xl">
              <div className="text-sm text-gray-400">AI Credits</div>
              <div className="text-2xl font-bold text-white">{aiCredits}</div>
            </div>
            <a
              href="/dashboard/my-songs"
              className="px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-xl font-semibold hover:from-blue-700 hover:to-cyan-700 transition-all flex items-center gap-2"
            >
              <Library className="w-5 h-5" />
              My Library
            </a>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left: Generation Form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Mode Selection */}
            <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
              <h2 className="text-xl font-bold text-white mb-4">Generation Mode</h2>
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => setCustomMode(false)}
                  className={`p-6 rounded-xl border-2 transition-all ${
                    !customMode
                      ? 'border-purple-500 bg-purple-600/20'
                      : 'border-gray-700 bg-gray-800/30 hover:border-gray-600'
                  }`}
                >
                  <div className="text-3xl mb-2">⚡</div>
                  <div className="text-lg font-bold text-white">Simple</div>
                  <div className="text-sm text-gray-400 mt-1">Just describe what you want</div>
                </button>
                <button
                  onClick={() => setCustomMode(true)}
                  className={`p-6 rounded-xl border-2 transition-all ${
                    customMode
                      ? 'border-purple-500 bg-purple-600/20'
                      : 'border-gray-700 bg-gray-800/30 hover:border-gray-600'
                  }`}
                >
                  <div className="text-3xl mb-2">🎛️</div>
                  <div className="text-lg font-bold text-white">Custom</div>
                  <div className="text-sm text-gray-400 mt-1">Full control over style & lyrics</div>
                </button>
              </div>
            </div>

            {/* Model Selection */}
            <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
              <h2 className="text-xl font-bold text-white mb-4">Select Model</h2>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                {models.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => setModel(m.id)}
                    className={`p-4 rounded-xl border-2 transition-all text-center ${
                      model === m.id
                        ? 'border-purple-500 bg-purple-600/20'
                        : 'border-gray-700 hover:border-gray-600'
                    }`}
                  >
                    <div className="text-2xl mb-1">{m.emoji}</div>
                    <div className="font-bold text-white">{m.name}</div>
                    <div className="text-xs text-purple-400 mt-1">{m.credits} credits</div>
                    <div className="text-xs text-gray-400">{m.time}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Quick Templates */}
            <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
              <h2 className="text-xl font-bold text-white mb-4">Quick Templates</h2>
              <div className="grid grid-cols-2 gap-3">
                {templates.map((t, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setPrompt(t.prompt)
                      setStyle(t.style)
                      setTitle(t.title)
                      setCustomMode(true)
                    }}
                    className="p-4 rounded-xl border border-gray-700 hover:border-purple-500 bg-gray-800/30 hover:bg-purple-600/10 transition-all text-left"
                  >
                    <div className="text-2xl mb-2">{t.emoji}</div>
                    <div className="font-semibold text-white">{t.title}</div>
                    <div className="text-xs text-gray-400 mt-1">{t.style}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Input Fields */}
            <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-white mb-2">
                  {customMode ? 'Lyrics / Description' : 'Music Description'}
                </label>
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Describe your music..."
                  className="w-full px-4 py-3 bg-gray-900/50 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 h-32 resize-none"
                />
              </div>

              {customMode && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-white mb-2">Style</label>
                      <input
                        type="text"
                        value={style}
                        onChange={(e) => setStyle(e.target.value)}
                        placeholder="e.g., Pop, Jazz..."
                        className="w-full px-4 py-3 bg-gray-900/50 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-white mb-2">Title</label>
                      <input
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="Song title..."
                        className="w-full px-4 py-3 bg-gray-900/50 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                    </div>
                  </div>
                </>
              )}

              <div className="flex items-center justify-between p-4 bg-gray-900/50 rounded-xl">
                <div>
                  <div className="font-semibold text-white">Instrumental Only</div>
                  <div className="text-xs text-gray-400">No vocals</div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={instrumental}
                    onChange={(e) => setInstrumental(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-700 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                </label>
              </div>

              <button
                onClick={handleGenerate}
                disabled={isGenerating || !prompt.trim()}
                className="w-full py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-bold text-lg hover:from-purple-700 hover:to-pink-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-6 h-6 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Wand2 className="w-6 h-6" />
                    Generate Music
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Right: Generated Songs */}
          <div className="space-y-6">
            <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
              <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <Music className="w-6 h-6 text-purple-400" />
                Generated Songs ({generatedSongs.length})
              </h2>

              {isGenerating && (
                <div className="text-center py-12">
                  <Loader2 className="w-12 h-12 text-purple-500 animate-spin mx-auto mb-4" />
                  <p className="text-gray-400">Creating your music...</p>
                  <p className="text-sm text-gray-500 mt-2">This may take 2-8 minutes</p>
                </div>
              )}

              {!isGenerating && generatedSongs.length === 0 && (
                <div className="text-center py-12">
                  <Music className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-400">No songs generated yet</p>
                  <p className="text-sm text-gray-500 mt-2">Fill the form and click Generate</p>
                </div>
              )}

              <div className="space-y-4">
                {generatedSongs.map((song) => (
                  <div key={song.id} className="bg-gray-900/50 border border-gray-700 rounded-xl overflow-hidden hover:border-purple-500/50 transition-all">
                    {/* Image */}
                    <div className="relative h-32 bg-gradient-to-br from-purple-600/20 to-pink-600/20">
                      {song.imageUrl ? (
                        <img src={song.imageUrl} alt={song.title} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Music className="w-12 h-12 text-purple-400" />
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="p-4">
                      <h3 className="font-bold text-white mb-1">{song.title}</h3>
                      <p className="text-xs text-gray-400 mb-3">
                        {Math.floor(song.duration / 60)}:{String(Math.floor(song.duration % 60)).padStart(2, '0')}
                      </p>

                      {playingSongId === song.id && (
                        <audio
                          src={song.audioUrl}
                          autoPlay
                          controls
                          className="w-full mb-3"
                          onEnded={() => setPlayingSongId(null)}
                        />
                      )}

                      <div className="flex gap-2">
                        <button
                          onClick={() => setPlayingSongId(playingSongId === song.id ? null : song.id)}
                          className="flex-1 px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-all flex items-center justify-center gap-2"
                        >
                          {playingSongId === song.id ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                        </button>
                        <button
                          onClick={() => handleSaveSong(song)}
                          disabled={savingStates[song.id]}
                          className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all disabled:opacity-50"
                        >
                          {savingStates[song.id] ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        </button>
                        <button
                          onClick={() => window.open(song.audioUrl, '_blank')}
                          className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
