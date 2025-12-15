'use client'

import { useState, useEffect } from 'react'
import { 
  Music, 
  Wand2, 
  Download, 
  Play,
  Pause,
  Loader2,
  Coins,
  Sparkles,
  Settings,
  Copy,
  Check,
  Save,
  Library
} from 'lucide-react'

export default function AIMusicPage() {
  // Credits state
  const [aiCredits, setAICredits] = useState(0)
  const [isLoadingCredits, setIsLoadingCredits] = useState(true)
  
  // Generation settings
  const [customMode, setCustomMode] = useState(false)
  const [instrumental, setInstrumental] = useState(false)
  const [model, setModel] = useState('V3_5')
  const [prompt, setPrompt] = useState('')
  const [style, setStyle] = useState('')
  const [title, setTitle] = useState('')
  
  // Advanced settings
  const [negativeTags, setNegativeTags] = useState('')
  const [vocalGender, setVocalGender] = useState<'m' | 'f' | ''>('')
  const [styleWeight, setStyleWeight] = useState(0.65)
  const [weirdnessConstraint, setWeirdnessConstraint] = useState(0.65)
  
  // Generation state
  const [isGenerating, setIsGenerating] = useState(false)
  const [taskId, setTaskId] = useState('')
  const [generatedSongs, setGeneratedSongs] = useState<any[]>([])
  const [generationProgress, setGenerationProgress] = useState(0)
  
  // Audio player state
  const [playingSongId, setPlayingSongId] = useState<string | null>(null)
  const [isCopied, setIsCopied] = useState(false)

  const models = [
    { id: 'V3_5', name: 'V3.5', credits: 10, duration: '~2 min', description: 'Solid & creative' },
    { id: 'V4', name: 'V4', credits: 15, duration: '~4 min', description: 'Best quality' },
    { id: 'V4_5', name: 'V4.5', credits: 20, duration: '~8 min', description: 'Genre blending' },
    { id: 'V4_5PLUS', name: 'V4.5+', credits: 25, duration: '~8 min', description: 'Richer sound' },
    { id: 'V5', name: 'V5', credits: 30, duration: '~8 min', description: 'Fastest & best' },
  ]

  const musicStyles = [
    'Pop', 'Rock', 'Jazz', 'Classical', 'Electronic', 'Hip Hop',
    'R&B', 'Country', 'Folk', 'Blues', 'Reggae', 'Metal'
  ]

  const promptTemplates = [
    { 
      title: 'Upbeat Background Music',
      prompt: 'Create upbeat background music for social media content',
      style: 'Electronic Pop',
      emoji: '🎉'
    },
    { 
      title: 'Calm Meditation',
      prompt: 'Peaceful meditation music with soft piano and nature sounds',
      style: 'Ambient Classical',
      emoji: '🧘'
    },
    { 
      title: 'Epic Cinematic',
      prompt: 'Epic cinematic orchestral music with dramatic crescendos',
      style: 'Orchestral Epic',
      emoji: '🎬'
    },
    { 
      title: 'Lo-fi Study',
      prompt: 'Relaxing lo-fi beats perfect for studying or working',
      style: 'Lo-fi Hip Hop',
      emoji: '📚'
    },
  ]

  useEffect(() => {
    fetchCredits()
  }, [])

  const fetchCredits = async () => {
    try {
      const response = await fetch('/api/credits/balance')
      const data = await response.json()
      if (data.success) {
        setAICredits(data.credits.ai_credits || 0)
      }
    } catch (error) {
      console.error('Failed to load credits:', error)
    } finally {
      setIsLoadingCredits(false)
    }
  }

  const getCurrentModel = () => {
    return models.find(m => m.id === model) || models[0]
  }

  const getMaxPromptLength = () => {
    if (!customMode) return 500
    return ['V3_5', 'V4'].includes(model) ? 3000 : 5000
  }

  const getMaxStyleLength = () => {
    return ['V3_5', 'V4'].includes(model) ? 200 : 1000
  }

  const handleUseTemplate = (template: any) => {
    setPrompt(template.prompt)
    setStyle(template.style)
    setTitle(template.title)
    setCustomMode(true)
  }

  const handleGenerateMusic = async () => {
    // Validation
    if (customMode) {
      if (instrumental) {
        if (!style || !title) {
          alert('Custom Mode with instrumental requires Style and Title')
          return
        }
      } else {
        if (!style || !title || !prompt) {
          alert('Custom Mode requires Prompt, Style, and Title')
          return
        }
      }
    } else {
      if (!prompt) {
        alert('Please enter a music description')
        return
      }
    }

    // Check credits
    const currentModel = getCurrentModel()
    if (aiCredits < currentModel.credits) {
      alert(`Insufficient AI credits! You need ${currentModel.credits} AI credits.`)
      return
    }

    setIsGenerating(true)
    setGenerationProgress(0)
    setGeneratedSongs([])

    try {
      const response = await fetch('/api/suno/generate-music', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          style,
          title,
          customMode,
          instrumental,
          model,
          negativeTags: negativeTags || undefined,
          vocalGender: vocalGender || undefined,
          styleWeight,
          weirdnessConstraint
        })
      })

      const data = await response.json()

      if (data.success) {
        setTaskId(data.taskId)
        
        // Update credits
        if (data.remainingAICredits !== undefined) {
          setAICredits(data.remainingAICredits)
        }

        // Start polling for status
        pollMusicStatus(data.taskId)
      } else {
        alert('Failed to generate music: ' + (data.message || data.error))
        setIsGenerating(false)
      }
    } catch (error) {
      console.error('Generation error:', error)
      alert('Failed to generate music. Please try again.')
      setIsGenerating(false)
    }
  }

  const pollMusicStatus = async (taskId: string) => {
    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(`/api/suno/check-status?taskId=${taskId}`)
        const data = await response.json()

        if (data.success) {
          setGenerationProgress(data.progress)

          if (data.status === 'complete') {
            clearInterval(pollInterval)
            setGeneratedSongs(data.songs)
            setIsGenerating(false)
            alert('🎵 Music generated successfully! 2 songs ready.')
          } else if (data.status === 'failed') {
            clearInterval(pollInterval)
            setIsGenerating(false)
            alert('Music generation failed. Please try again.')
          }
        }
      } catch (error) {
        console.error('Status check error:', error)
      }
    }, 5000) // Check every 5 seconds

    // Timeout after 5 minutes
    setTimeout(() => {
      clearInterval(pollInterval)
      if (isGenerating) {
        setIsGenerating(false)
        alert('Generation timed out. Please check back later.')
      }
    }, 300000)
  }

  const handleCopyUrl = (url: string) => {
    navigator.clipboard.writeText(url)
    setIsCopied(true)
    setTimeout(() => setIsCopied(false), 2000)
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2 flex items-center gap-3">
          <Music className="w-8 h-8 text-primary" />
          AI Music Generator
        </h1>
        <p className="text-foreground-secondary">
          Generate professional music tracks using Suno AI - Each request creates 2 unique songs
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Generation Form */}
        <div className="lg:col-span-2 space-y-6">
          <div className="card p-6">
            <h2 className="text-xl font-bold text-foreground mb-4">Create Music</h2>
            
            {/* Mode Toggle */}
            <div className="space-y-2 mb-6">
              <label className="text-sm font-medium text-foreground">Generation Mode</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setCustomMode(false)}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    !customMode
                      ? 'border-primary bg-primary/10'
                      : 'border-border hover:border-primary/50 bg-background-tertiary'
                  }`}
                >
                  <div className="text-sm font-bold text-foreground">Simple Mode</div>
                  <div className="text-xs text-foreground-secondary mt-1">
                    Just describe what you want
                  </div>
                </button>
                <button
                  onClick={() => setCustomMode(true)}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    customMode
                      ? 'border-primary bg-primary/10'
                      : 'border-border hover:border-primary/50 bg-background-tertiary'
                  }`}
                >
                  <div className="text-sm font-bold text-foreground">Custom Mode</div>
                  <div className="text-xs text-foreground-secondary mt-1">
                    Full control over style & title
                  </div>
                </button>
              </div>
            </div>

            {/* Instrumental Toggle */}
            <div className="flex items-center justify-between p-4 bg-background-tertiary rounded-lg mb-6">
              <div>
                <div className="font-medium text-foreground">Instrumental Only</div>
                <div className="text-xs text-foreground-secondary">No vocals, just music</div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={instrumental}
                  onChange={(e) => setInstrumental(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-border peer-focus:ring-2 peer-focus:ring-primary rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
              </label>
            </div>

            {/* Model Selection */}
            <div className="space-y-2 mb-6">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-foreground">AI Model</label>
                <div className="text-xs text-orange-500 font-bold">
                  {getCurrentModel().credits} AI credits
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                {models.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => setModel(m.id)}
                    className={`p-3 rounded-lg border-2 transition-all text-center ${
                      model === m.id
                        ? 'border-primary bg-primary/10'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <div className="text-sm font-bold text-foreground">{m.name}</div>
                    <div className="text-xs text-primary mt-0.5">{m.credits} cr</div>
                    <div className="text-xs text-foreground-secondary mt-0.5">{m.duration}</div>
                  </button>
                ))}
              </div>
              <p className="text-xs text-foreground-secondary">{getCurrentModel().description}</p>
            </div>

            {/* Prompt */}
            <div className="space-y-2 mb-6">
              <label className="text-sm font-medium text-foreground">
                {customMode && !instrumental ? 'Lyrics / Music Description' : 'Music Description'}
                <span className="text-xs text-foreground-secondary ml-2">
                  ({prompt.length}/{getMaxPromptLength()})
                </span>
              </label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                maxLength={getMaxPromptLength()}
                placeholder={
                  customMode && !instrumental
                    ? 'Enter exact lyrics or describe the music...'
                    : 'Describe the music you want to create...'
                }
                className="input-field h-32 resize-none"
              />
            </div>

            {/* Custom Mode Fields */}
            {customMode && (
              <>
                <div className="space-y-2 mb-6">
                  <label className="text-sm font-medium text-foreground">
                    Music Style
                    <span className="text-xs text-foreground-secondary ml-2">
                      ({style.length}/{getMaxStyleLength()})
                    </span>
                  </label>
                  <input
                    type="text"
                    value={style}
                    onChange={(e) => setStyle(e.target.value)}
                    maxLength={getMaxStyleLength()}
                    placeholder="e.g., Electronic Pop, Jazz, Classical..."
                    className="input-field"
                  />
                  <div className="flex flex-wrap gap-2 mt-2">
                    {musicStyles.map((s) => (
                      <button
                        key={s}
                        onClick={() => setStyle(s)}
                        className="px-3 py-1 text-xs bg-background-tertiary hover:bg-primary/10 border border-border hover:border-primary rounded-full transition-all"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2 mb-6">
                  <label className="text-sm font-medium text-foreground">
                    Song Title
                    <span className="text-xs text-foreground-secondary ml-2">
                      ({title.length}/80)
                    </span>
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    maxLength={80}
                    placeholder="Give your song a name..."
                    className="input-field"
                  />
                </div>
              </>
            )}

            {/* Advanced Options */}
            <details className="mb-6">
              <summary className="cursor-pointer text-sm font-medium text-foreground flex items-center gap-2 mb-4 hover:text-primary transition-colors">
                <Settings className="w-4 h-4" />
                Advanced Options (Optional)
              </summary>
              <div className="space-y-4 pl-6 pt-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Vocal Gender</label>
                  <select
                    value={vocalGender}
                    onChange={(e) => setVocalGender(e.target.value as 'm' | 'f' | '')}
                    className="input-field"
                  >
                    <option value="">Auto</option>
                    <option value="m">Male</option>
                    <option value="f">Female</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">
                    Style Weight: {styleWeight.toFixed(2)}
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={styleWeight}
                    onChange={(e) => setStyleWeight(parseFloat(e.target.value))}
                    className="w-full"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">
                    Creativity: {weirdnessConstraint.toFixed(2)}
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={weirdnessConstraint}
                    onChange={(e) => setWeirdnessConstraint(parseFloat(e.target.value))}
                    className="w-full"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Negative Tags</label>
                  <input
                    type="text"
                    value={negativeTags}
                    onChange={(e) => setNegativeTags(e.target.value)}
                    placeholder="Styles to avoid: Heavy Metal, Drums..."
                    className="input-field"
                  />
                </div>
              </div>
            </details>

            {/* Generate Button */}
            <div className="space-y-3">
              <div className="p-3 bg-orange-500/10 border border-orange-500/20 rounded-lg flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Coins className="w-5 h-5 text-orange-500" />
                  <span className="text-sm font-medium text-foreground">
                    Cost: <span className="font-bold text-orange-500">{getCurrentModel().credits}</span> AI credits
                  </span>
                </div>
                <div className="text-xs text-foreground-secondary">
                  Generates 2 songs • {getCurrentModel().duration}
                </div>
              </div>
              
              <button 
                onClick={handleGenerateMusic}
                disabled={isGenerating || aiCredits < getCurrentModel().credits}
                className="w-full px-6 py-4 bg-primary hover:bg-primary-hover text-white rounded-lg font-bold transition-all duration-300 flex items-center justify-center gap-2 shadow-lg shadow-primary/20 hover:shadow-primary/40 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Generating... {generationProgress}%
                  </>
                ) : aiCredits < getCurrentModel().credits ? (
                  <>
                    <Coins className="w-5 h-5" />
                    Insufficient AI Credits
                  </>
                ) : (
                  <>
                    <Wand2 className="w-5 h-5" />
                    Generate Music ({getCurrentModel().credits} AI credits)
                  </>
                )}
              </button>
            </div>

            {/* Generation Progress */}
            {isGenerating && (
              <div className="mt-4 p-4 bg-primary/5 border border-primary/20 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-foreground">
                    🎵 Generating your music...
                  </span>
                  <span className="text-sm font-bold text-primary">{generationProgress}%</span>
                </div>
                <div className="w-full bg-background-tertiary rounded-full h-2 overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-primary to-primary/80 transition-all duration-500"
                    style={{ width: `${generationProgress}%` }}
                  />
                </div>
                <p className="text-xs text-foreground-secondary mt-2">
                  Stream URL ready in 30-40 seconds • Download ready in 2-3 minutes
                </p>
              </div>
            )}
          </div>

          {/* Generated Songs */}
          {generatedSongs.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-foreground">Generated Songs (2)</h3>
              {generatedSongs.map((song, index) => (
                <div key={song.id} className="card p-6">
                  <div className="flex items-start gap-4">
                    {song.imageUrl && (
                      <img 
                        src={song.imageUrl} 
                        alt={song.title}
                        className="w-24 h-24 rounded-lg object-cover"
                      />
                    )}
                    <div className="flex-1">
                      <h4 className="font-bold text-foreground mb-1">{song.title || `Song ${index + 1}`}</h4>
                      {song.duration && (
                        <p className="text-sm text-foreground-secondary mb-3">
                          Duration: {Math.floor(song.duration / 60)}:{(song.duration % 60).toFixed(0).padStart(2, '0')}
                        </p>
                      )}
                      
                      {/* Audio Player */}
                      {song.streamUrl && (
                        <audio controls className="w-full mb-3">
                          <source src={song.streamUrl} type="audio/mpeg" />
                        </audio>
                      )}
                      
                      {/* Action Buttons */}
                      <div className="flex gap-2">
                        {song.audioUrl && (
                          <a
                            href={song.audioUrl}
                            download
                            className="btn-primary text-sm px-4 py-2"
                          >
                            <Download className="w-4 h-4 mr-2" />
                            Download
                          </a>
                        )}
                        <button
                          onClick={() => handleCopyUrl(song.audioUrl || song.streamUrl)}
                          className="btn-secondary text-sm px-4 py-2"
                        >
                          {isCopied ? (
                            <Check className="w-4 h-4 mr-2" />
                          ) : (
                            <Copy className="w-4 h-4 mr-2" />
                          )}
                          Copy URL
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Credits Display */}
          <div className="card p-6">
            <h3 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
              <Coins className="w-5 h-5 text-orange-500" />
              AI Credits
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-foreground-secondary">Remaining:</span>
                <span className="text-2xl font-bold text-orange-500">
                  {isLoadingCredits ? '...' : aiCredits}
                </span>
              </div>
              <div className="w-full bg-background-tertiary rounded-full h-2">
                <div 
                  className="bg-orange-500 h-full rounded-full transition-all"
                  style={{ 
                    width: `${Math.min((aiCredits / 500) * 100, 100)}%` 
                  }}
                />
              </div>
            </div>
          </div>

          {/* Quick Templates */}
          <div className="card p-6">
            <h3 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              Quick Templates
            </h3>
            <div className="space-y-2">
              {promptTemplates.map((template) => (
                <button
                  key={template.title}
                  onClick={() => handleUseTemplate(template)}
                  className="w-full text-left p-3 bg-background-tertiary hover:bg-primary/10 border border-border hover:border-primary rounded-lg transition-all"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xl">{template.emoji}</span>
                    <span className="text-sm font-medium text-foreground">{template.title}</span>
                  </div>
                  <p className="text-xs text-foreground-secondary">{template.style}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Info */}
          <div className="card p-6 bg-primary/5 border-primary/20">
            <h3 className="text-sm font-bold text-foreground mb-2">💡 Tips</h3>
            <ul className="text-xs text-foreground-secondary space-y-2">
              <li>• Each generation creates 2 unique songs</li>
              <li>• Stream URL available in 30-40 seconds</li>
              <li>• Download URL ready in 2-3 minutes</li>
              <li>• V5 model is fastest with best quality</li>
              <li>• Custom Mode gives full creative control</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
