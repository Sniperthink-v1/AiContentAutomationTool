'use client'

import { useState, useRef } from 'react'
import { 
  Upload, 
  Wand2, 
  Download, 
  Image as ImageIcon,
  Sparkles,
  Palette,
  Type,
  Loader2,
  Copy,
  Coins,
  ImagePlus,
  FileText,
  ChevronRight,
  X,
  ZoomIn
} from 'lucide-react'
import { useToast } from '@/lib/components/Toast'
import { VoiceInput } from '@/lib/components/VoiceInput'

type ThumbnailStyle = 'vibrant' | 'minimal' | 'professional' | 'bold' | 'elegant' | 'modern' | 'gaming' | 'cinematic'
type GenerationMode = 'text-to-thumbnail' | 'image-to-thumbnail'

interface GeneratedThumbnail {
  url: string
  style: ThumbnailStyle
  prompt: string
  mode: GenerationMode
  timestamp: string
}

export default function ThumbnailGeneratorPage() {
  const { showToast, ToastContainer } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  // Mode selection
  const [selectedMode, setSelectedMode] = useState<GenerationMode | null>(null)
  
  // Form states
  const [sourceImage, setSourceImage] = useState<string | null>(null)
  const [sourceImageFile, setSourceImageFile] = useState<File | null>(null)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [selectedStyle, setSelectedStyle] = useState<ThumbnailStyle>('vibrant')
  const [customPrompt, setCustomPrompt] = useState('')
  
  // Generation states
  const [isGenerating, setIsGenerating] = useState(false)
  const [thumbnails, setThumbnails] = useState<GeneratedThumbnail[]>([])
  
  // Preview modal
  const [previewImage, setPreviewImage] = useState<string | null>(null)

  const styles: { value: ThumbnailStyle; label: string; description: string; icon: string }[] = [
    { value: 'vibrant', label: 'Vibrant', description: 'Bold colors, high contrast', icon: '🌈' },
    { value: 'minimal', label: 'Minimal', description: 'Clean and simple', icon: '⚪' },
    { value: 'professional', label: 'Professional', description: 'Business appropriate', icon: '💼' },
    { value: 'bold', label: 'Bold', description: 'Eye-catching dramatic', icon: '⚡' },
    { value: 'elegant', label: 'Elegant', description: 'Refined sophisticated', icon: '✨' },
    { value: 'modern', label: 'Modern', description: 'Contemporary trendy', icon: '🎨' },
    { value: 'gaming', label: 'Gaming', description: 'Neon, action style', icon: '🎮' },
    { value: 'cinematic', label: 'Cinematic', description: 'Movie poster style', icon: '🎬' }
  ]

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      showToast('Please select an image file', 'error')
      return
    }

    const maxSize = 10 * 1024 * 1024 // 10MB
    if (file.size > maxSize) {
      showToast('Image too large. Max 10MB', 'error')
      return
    }

    setSourceImageFile(file)
    
    // Convert to base64
    const reader = new FileReader()
    reader.onloadend = () => {
      setSourceImage(reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  const handleGenerateThumbnail = async () => {
    if (!selectedMode) {
      showToast('Please select a generation mode', 'error')
      return
    }

    if (selectedMode === 'image-to-thumbnail' && !sourceImage) {
      showToast('Please upload a source image', 'error')
      return
    }

    if (selectedMode === 'text-to-thumbnail' && !title && !customPrompt) {
      showToast('Please enter a title or custom prompt', 'error')
      return
    }

    setIsGenerating(true)
    try {
      // Build prompt
      let prompt = customPrompt
      if (!prompt) {
        prompt = `Create an eye-catching YouTube thumbnail for: "${title}"`
        if (description) {
          prompt += `. Content: ${description}`
        }
      }

      const response = await fetch('/api/gemini/generate-thumbnail', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          mode: selectedMode,
          sourceImage: selectedMode === 'image-to-thumbnail' ? sourceImage : undefined,
          style: selectedStyle,
          title
        })
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to generate thumbnail')
      }

      // Add to thumbnails array
      const newThumbnail: GeneratedThumbnail = {
        url: data.imageUrl,
        style: selectedStyle,
        prompt: data.prompt,
        mode: selectedMode,
        timestamp: new Date().toISOString()
      }

      setThumbnails([newThumbnail, ...thumbnails])
      showToast(`Thumbnail generated! (${data.creditsUsed} credits used)`, 'success')
    } catch (error: any) {
      console.error('Error generating thumbnail:', error)
      showToast(error.message || 'Failed to generate thumbnail', 'error')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleDownloadThumbnail = async (url: string, index: number) => {
    try {
      // For base64 data URLs, create blob directly
      if (url.startsWith('data:')) {
        const response = await fetch(url)
        const blob = await response.blob()
        const downloadUrl = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = downloadUrl
        link.download = `thumbnail-${Date.now()}.png`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(downloadUrl)
      } else {
        // Use download proxy for external URLs
        const proxyUrl = `/api/download?url=${encodeURIComponent(url)}`
        const link = document.createElement('a')
        link.href = proxyUrl
        link.download = `thumbnail-${Date.now()}.png`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
      }
      showToast('Thumbnail downloaded!', 'success')
    } catch (error) {
      console.error('Error downloading thumbnail:', error)
      showToast('Failed to download thumbnail', 'error')
    }
  }

  const resetForm = () => {
    setSelectedMode(null)
    setSourceImage(null)
    setSourceImageFile(null)
    setTitle('')
    setDescription('')
    setCustomPrompt('')
    setSelectedStyle('vibrant')
  }

  // Pricing display
  const CREDIT_COST = 4

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
      <ToastContainer />

      {/* Preview Modal */}
      {previewImage && (
        <div 
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
          onClick={() => setPreviewImage(null)}
        >
          <div className="relative max-w-5xl w-full">
            <button
              onClick={() => setPreviewImage(null)}
              className="absolute -top-12 right-0 text-white hover:text-gray-300"
            >
              <X className="w-8 h-8" />
            </button>
            <img
              src={previewImage}
              alt="Preview"
              className="w-full rounded-lg"
            />
          </div>
        </div>
      )}

      {/* Header */}
      <div className="animate-slide-down">
        <h1 className="text-3xl font-bold text-foreground">AI Thumbnail Generator</h1>
        <p className="text-foreground-secondary mt-1">Create eye-catching thumbnails with Gemini AI</p>
        <div className="flex items-center gap-2 mt-2 text-sm">
          <Coins className="w-4 h-4 text-primary" />
          <span className="text-foreground-secondary">{CREDIT_COST} credits per thumbnail</span>
        </div>
      </div>

      {/* Mode Selection */}
      {!selectedMode ? (
        <div className="grid md:grid-cols-2 gap-6 animate-fade-in">
          {/* Text to Thumbnail */}
          <button
            onClick={() => setSelectedMode('text-to-thumbnail')}
            className="card p-8 text-left hover:border-primary transition-all group"
          >
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-teal flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <FileText className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-2">Text to Thumbnail</h2>
            <p className="text-foreground-secondary mb-4">
              Generate a thumbnail from your video title and description. AI creates a complete design from scratch.
            </p>
            <div className="flex items-center gap-2 text-primary font-medium">
              <span>Get Started</span>
              <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </div>
            <div className="mt-4 pt-4 border-t border-border">
              <div className="flex items-center gap-2 text-sm text-foreground-secondary">
                <Coins className="w-4 h-4 text-primary" />
                <span>{CREDIT_COST} credits</span>
              </div>
            </div>
          </button>

          {/* Image to Thumbnail */}
          <button
            onClick={() => setSelectedMode('image-to-thumbnail')}
            className="card p-8 text-left hover:border-primary transition-all group"
          >
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-teal to-primary flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <ImagePlus className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-2">Image to Thumbnail</h2>
            <p className="text-foreground-secondary mb-4">
              Transform your existing image into a professional thumbnail. AI enhances and styles your photo.
            </p>
            <div className="flex items-center gap-2 text-primary font-medium">
              <span>Get Started</span>
              <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </div>
            <div className="mt-4 pt-4 border-t border-border">
              <div className="flex items-center gap-2 text-sm text-foreground-secondary">
                <Coins className="w-4 h-4 text-primary" />
                <span>{CREDIT_COST} credits</span>
              </div>
            </div>
          </button>
        </div>
      ) : (
        <div className="grid lg:grid-cols-2 gap-6 animate-fade-in">
          {/* Left Column - Input */}
          <div className="space-y-6">
            {/* Back Button & Mode Header */}
            <div className="card p-6">
              <div className="flex items-center justify-between mb-4">
                <button
                  onClick={resetForm}
                  className="text-sm text-foreground-secondary hover:text-foreground flex items-center gap-1"
                >
                  ← Back to modes
                </button>
                <div className="flex items-center gap-2 text-sm">
                  <Coins className="w-4 h-4 text-primary" />
                  <span className="text-foreground-secondary">{CREDIT_COST} credits</span>
                </div>
              </div>
              
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                  selectedMode === 'text-to-thumbnail' 
                    ? 'bg-gradient-to-br from-primary to-teal' 
                    : 'bg-gradient-to-br from-teal to-primary'
                }`}>
                  {selectedMode === 'text-to-thumbnail' 
                    ? <FileText className="w-6 h-6 text-white" />
                    : <ImagePlus className="w-6 h-6 text-white" />
                  }
                </div>
                <div>
                  <h2 className="text-xl font-bold text-foreground">
                    {selectedMode === 'text-to-thumbnail' ? 'Text to Thumbnail' : 'Image to Thumbnail'}
                  </h2>
                  <p className="text-sm text-foreground-secondary">
                    {selectedMode === 'text-to-thumbnail' 
                      ? 'Generate from text description' 
                      : 'Transform your image into a thumbnail'
                    }
                  </p>
                </div>
              </div>
            </div>

            {/* Image Upload (for image-to-thumbnail mode) */}
            {selectedMode === 'image-to-thumbnail' && (
              <div className="card p-6">
                <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                  <ImageIcon className="w-5 h-5 text-primary" />
                  Source Image
                </h3>

                {!sourceImage ? (
                  <label className="block cursor-pointer">
                    <div className="border-2 border-dashed border-border hover:border-primary rounded-xl p-8 text-center transition-colors">
                      <Upload className="w-12 h-12 text-foreground-muted mx-auto mb-3" />
                      <p className="text-foreground font-medium mb-1">Upload your image</p>
                      <p className="text-sm text-foreground-secondary">PNG, JPG up to 10MB</p>
                    </div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleFileSelect}
                    />
                  </label>
                ) : (
                  <div className="space-y-3">
                    <div className="relative rounded-lg overflow-hidden bg-black/5">
                      <img
                        src={sourceImage}
                        alt="Source"
                        className="w-full max-h-[200px] object-contain"
                      />
                      <button
                        onClick={() => setPreviewImage(sourceImage)}
                        className="absolute top-2 right-2 p-2 bg-black/50 hover:bg-black/70 rounded-lg text-white"
                      >
                        <ZoomIn className="w-4 h-4" />
                      </button>
                    </div>
                    <button
                      onClick={() => {
                        setSourceImage(null)
                        setSourceImageFile(null)
                        if (fileInputRef.current) fileInputRef.current.value = ''
                      }}
                      className="text-sm text-red-500 hover:text-red-600"
                    >
                      Remove image
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Title */}
            <div className="card p-6">
              <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                <Type className="w-5 h-5 text-primary" />
                Video Title
              </h3>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter your video title..."
                className="w-full px-4 py-3 bg-background border border-border rounded-lg text-foreground placeholder:text-foreground-muted focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>

            {/* Description */}
            <div className="card p-6">
              <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                <Type className="w-5 h-5 text-primary" />
                Description (Optional)
              </h3>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief description of your video content..."
                className="w-full px-4 py-3 bg-background border border-border rounded-lg text-foreground placeholder:text-foreground-muted focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                rows={3}
              />
            </div>

            {/* Style Selection */}
            <div className="card p-6">
              <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                <Palette className="w-5 h-5 text-primary" />
                Thumbnail Style
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {styles.map((style) => (
                  <button
                    key={style.value}
                    onClick={() => setSelectedStyle(style.value)}
                    className={`p-3 rounded-lg border-2 transition-all text-center ${
                      selectedStyle === style.value
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <div className="text-2xl mb-1">{style.icon}</div>
                    <div className="font-medium text-foreground text-sm">{style.label}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Prompt */}
            <div className="card p-6">
              <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" />
                Custom Prompt (Optional)
              </h3>
              <div className="relative">
                <textarea
                  value={customPrompt}
                  onChange={(e) => setCustomPrompt(e.target.value)}
                  placeholder="Add specific instructions (e.g., 'Include a surprised face', 'Add red arrows', 'Show the product on the left')..."
                  className="w-full px-4 py-3 pr-12 bg-background border border-border rounded-lg text-foreground placeholder:text-foreground-muted focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                  rows={3}
                />
                <VoiceInput
                  onTranscription={(text) => setCustomPrompt(prev => prev ? `${prev} ${text}` : text)}
                  className="absolute right-3 top-3"
                />
              </div>
            </div>

            {/* Generate Button */}
            <button
              onClick={handleGenerateThumbnail}
              disabled={isGenerating || (selectedMode === 'text-to-thumbnail' && !title && !customPrompt) || (selectedMode === 'image-to-thumbnail' && !sourceImage)}
              className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Generating Thumbnail...
                </>
              ) : (
                <>
                  <Wand2 className="w-5 h-5" />
                  Generate Thumbnail ({CREDIT_COST} credits)
                </>
              )}
            </button>
          </div>

          {/* Right Column - Generated Thumbnails */}
          <div className="card p-6">
            <h3 className="text-lg font-semibold text-foreground mb-6 flex items-center gap-2">
              <ImageIcon className="w-5 h-5 text-primary" />
              Generated Thumbnails
            </h3>

            {thumbnails.length === 0 ? (
              <div className="text-center py-16 border-2 border-dashed border-border rounded-xl">
                <Sparkles className="w-16 h-16 text-foreground-muted mx-auto mb-4" />
                <p className="text-foreground-secondary font-medium">No thumbnails generated yet</p>
                <p className="text-sm text-foreground-muted mt-2">Fill in the details and click Generate</p>
              </div>
            ) : (
              <div className="space-y-6 max-h-[800px] overflow-y-auto pr-2">
                {thumbnails.map((thumbnail, index) => (
                  <div
                    key={index}
                    className="group relative border border-border rounded-xl overflow-hidden hover:border-primary transition-all animate-scale-in"
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    <img
                      src={thumbnail.url}
                      alt={`Thumbnail ${index + 1}`}
                      className="w-full aspect-video object-cover cursor-pointer"
                      onClick={() => setPreviewImage(thumbnail.url)}
                    />
                    
                    {/* Overlay */}
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                      <button
                        onClick={() => setPreviewImage(thumbnail.url)}
                        className="p-3 bg-white hover:bg-gray-100 rounded-full transition-colors"
                        title="Preview"
                      >
                        <ZoomIn className="w-5 h-5 text-gray-900" />
                      </button>
                      <button
                        onClick={() => handleDownloadThumbnail(thumbnail.url, index)}
                        className="p-3 bg-white hover:bg-gray-100 rounded-full transition-colors"
                        title="Download"
                      >
                        <Download className="w-5 h-5 text-gray-900" />
                      </button>
                      <button
                        onClick={() => {
                          setCustomPrompt(thumbnail.prompt)
                          showToast('Prompt copied to custom prompt field', 'success')
                        }}
                        className="p-3 bg-white hover:bg-gray-100 rounded-full transition-colors"
                        title="Copy prompt"
                      >
                        <Copy className="w-5 h-5 text-gray-900" />
                      </button>
                    </div>

                    {/* Badges */}
                    <div className="absolute top-3 left-3 flex gap-2">
                      <span className="px-3 py-1 bg-black/70 rounded-lg text-white text-xs font-medium">
                        {styles.find(s => s.value === thumbnail.style)?.label}
                      </span>
                      <span className={`px-3 py-1 rounded-lg text-white text-xs font-medium ${
                        thumbnail.mode === 'text-to-thumbnail' 
                          ? 'bg-primary/80' 
                          : 'bg-teal/80'
                      }`}>
                        {thumbnail.mode === 'text-to-thumbnail' ? 'Text' : 'Image'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tips Section */}
      <div className="card p-6 animate-slide-up">
        <h3 className="text-lg font-semibold text-foreground mb-4">💡 Tips for Great Thumbnails</h3>
        <div className="grid md:grid-cols-3 gap-4 text-sm">
          <div className="p-4 bg-background rounded-lg">
            <p className="font-medium text-foreground mb-1">Keep it Simple</p>
            <p className="text-foreground-secondary">Use 3-5 words max. Viewers see thumbnails at small sizes.</p>
          </div>
          <div className="p-4 bg-background rounded-lg">
            <p className="font-medium text-foreground mb-1">High Contrast</p>
            <p className="text-foreground-secondary">Make text stand out against the background with contrasting colors.</p>
          </div>
          <div className="p-4 bg-background rounded-lg">
            <p className="font-medium text-foreground mb-1">Show Emotion</p>
            <p className="text-foreground-secondary">Faces with expressive emotions get 38% more clicks.</p>
          </div>
        </div>
      </div>
    </div>
  )
}
