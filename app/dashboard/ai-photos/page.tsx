'use client'

import { useState, useEffect } from 'react'
import { 
  Sparkles, 
  Image as ImageIcon, 
  Download, 
  Wand2,
  Copy,
  Check,
  Edit3,
  Loader2,
  RefreshCw,
  Palette,
  Sun,
  Layers,
  Zap,
  Upload,
  X,
  Coins,
  BookmarkPlus,
  Calendar,
  Send
} from 'lucide-react'
import { useToast } from '@/lib/components/Toast'

// Helper function to create notifications
const createNotification = async (title: string, message: string, type: string, link?: string) => {
  try {
    await fetch('/api/notifications/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, message, type, link })
    })
  } catch (error) {
    console.error('Failed to create notification:', error)
  }
}

export default function AIPhotosPage() {
  // Toast notifications
  const { showToast, showAndSaveToast, ToastContainer } = useToast()
  const [prompt, setPrompt] = useState('')
  const [enhancedPrompt, setEnhancedPrompt] = useState('')
  const [isEnhancing, setIsEnhancing] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [selectedStyle, setSelectedStyle] = useState('photorealistic')
  const [showEnhancedPrompt, setShowEnhancedPrompt] = useState(false)
  const [isCopied, setIsCopied] = useState(false)
  const [isEditingPrompt, setIsEditingPrompt] = useState(false)
  const [showEnhanceOptions, setShowEnhanceOptions] = useState(false)
  const [customEnhanceInstructions, setCustomEnhanceInstructions] = useState('')
  
  // Store last used prompts for saving
  const [lastGeneratedPrompt, setLastGeneratedPrompt] = useState('')
  const [lastGeneratedEnhancedPrompt, setLastGeneratedEnhancedPrompt] = useState('')
  
  // Save functionality states
  const [showSaveModal, setShowSaveModal] = useState(false)
  const [saveType, setSaveType] = useState<'story' | 'post'>('story')
  const [isSaving, setIsSaving] = useState(false)
  
  // Credits state
  const [credits, setCredits] = useState(0)
  const [isLoadingCredits, setIsLoadingCredits] = useState(true)
  
  // Image to Image states
  const [mode, setMode] = useState<'text-to-image' | 'image-to-image'>('text-to-image')
  const [sourceImage, setSourceImage] = useState<string | null>(null)
  const [sourceImageFile, setSourceImageFile] = useState<File | null>(null)
  const [showImageModal, setShowImageModal] = useState(false)
  
  // Advanced options states
  const [aspectRatio, setAspectRatio] = useState('1:1') // Instagram default
  const [quality, setQuality] = useState('high')
  const [mood, setMood] = useState('vibrant')
  const [lighting, setLighting] = useState('natural')
  const [colorPalette, setColorPalette] = useState('none')
  const [composition, setComposition] = useState('centered')
  const [detailLevel, setDetailLevel] = useState('high')
  
  // Generated image states
  const [generatedImageUrl, setGeneratedImageUrl] = useState('')
  const [generationHistory, setGenerationHistory] = useState<string[]>([])

  // Calculate credits based on mode and settings
  const calculateCredits = () => {
    if (mode === 'image-to-image') {
      // gen4_image_turbo: 2 credits for any resolution
      return 2
    } else {
      // gen4_image: text-to-image
      // Standard quality: 5 credits, High/Ultra quality: 8 credits
      return (quality === 'high' || quality === 'ultra') ? 8 : 5
    }
  }

  const requiredCredits = calculateCredits()

  // Load credits on mount
  useEffect(() => {
    fetchCredits()
  }, [])

  const fetchCredits = async () => {
    try {
      const response = await fetch('/api/credits/balance')
      const data = await response.json()
      if (data.success) {
        setCredits(data.credits.remaining_credits)
      }
    } catch (error) {
      console.error('Error fetching credits:', error)
    } finally {
      setIsLoadingCredits(false)
    }
  }

  const deductCredits = async (actionType: string, creditsUsed: number, description: string) => {
    try {
      const response = await fetch('/api/credits/deduct', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          actionType,
          creditsUsed,
          modelUsed: 'FLUX-1.1-pro',
          description
        })
      })

      const data = await response.json()
      if (data.success) {
        setCredits(data.remaining_credits)
        return true
      } else {
        showToast(data.error + ` (Need ${creditsUsed} credits, have ${credits})`, 'error')
        return false
      }
    } catch (error) {
      console.error('Error deducting credits:', error)
      return false
    }
  }

  const styles = [
    { id: 'photorealistic', name: 'Photorealistic', emoji: '📸', description: 'Lifelike photos' },
    { id: 'artistic', name: 'Artistic', emoji: '🎨', description: 'Creative art' },
    { id: 'minimal', name: 'Minimal', emoji: '⚪', description: 'Clean & simple' },
    { id: 'vibrant', name: 'Vibrant', emoji: '🌈', description: 'Bold colors' },
    { id: 'vintage', name: 'Vintage', emoji: '📷', description: 'Retro look' },
    { id: 'modern', name: 'Modern', emoji: '✨', description: 'Contemporary' },
    { id: 'fantasy', name: 'Fantasy', emoji: '🦄', description: 'Magical & surreal' },
    { id: 'abstract', name: 'Abstract', emoji: '🔮', description: 'Conceptual art' },
  ]

  const aspectRatios = [
    { id: '1:1', label: '1:1', description: 'Square Posts' },
    { id: '4:5', label: '4:5', description: 'Portrait Feed' },
    { id: '9:16', label: '9:16', description: 'Stories/Reels' },
    { id: '16:9', label: '16:9', description: 'Landscape' },
  ]

  const qualities = [
    { id: 'standard', label: 'Standard', description: '720p' },
    { id: 'high', label: 'High', description: '1080p' },
    { id: 'ultra', label: 'Ultra', description: '4K' },
  ]

  const moods = [
    { id: 'vibrant', label: 'Vibrant', emoji: '🌟' },
    { id: 'calm', label: 'Calm', emoji: '🌊' },
    { id: 'dramatic', label: 'Dramatic', emoji: '⚡' },
    { id: 'dreamy', label: 'Dreamy', emoji: '💭' },
    { id: 'energetic', label: 'Energetic', emoji: '🔥' },
    { id: 'mysterious', label: 'Mysterious', emoji: '🌙' },
  ]

  const lightingOptions = [
    { id: 'natural', label: 'Natural', emoji: '☀️' },
    { id: 'studio', label: 'Studio', emoji: '💡' },
    { id: 'golden-hour', label: 'Golden Hour', emoji: '🌅' },
    { id: 'dramatic', label: 'Dramatic', emoji: '🎭' },
    { id: 'soft', label: 'Soft', emoji: '🕯️' },
  ]

  const colorPalettes = [
    { id: 'none', label: 'No Filter', colors: ['#808080', '#808080', '#808080'] },
    { id: 'vivid', label: 'Vivid', colors: ['#FF6B6B', '#4ECDC4', '#FFD93D'] },
    { id: 'pastel', label: 'Pastel', colors: ['#FFB3BA', '#BAFFC9', '#BAE1FF'] },
    { id: 'monochrome', label: 'Monochrome', colors: ['#000000', '#808080', '#FFFFFF'] },
    { id: 'warm', label: 'Warm', colors: ['#FF6B35', '#F7931E', '#FDC830'] },
    { id: 'cool', label: 'Cool', colors: ['#4A90E2', '#50C9CE', '#A8E6CF'] },
  ]

  const promptTemplates = [
    { 
      title: 'Product Shot',
      prompt: 'Professional product photography with clean background, studio lighting, and sharp focus on details',
      emoji: '📦'
    },
    { 
      title: 'Portrait',
      prompt: 'Professional portrait with natural lighting, bokeh background, and expressive facial features',
      emoji: '👤'
    },
    { 
      title: 'Food Photography',
      prompt: 'Appetizing food photography with natural daylight, artistic plating, and fresh ingredients',
      emoji: '🍽️'
    },
    { 
      title: 'Nature Scene',
      prompt: 'Breathtaking landscape photography with dramatic sky, vivid colors, and stunning composition',
      emoji: '🌄'
    },
    { 
      title: 'Fashion Shot',
      prompt: 'High-fashion editorial photography with bold styling, dramatic poses, and professional makeup',
      emoji: '👗'
    },
    { 
      title: 'Architecture',
      prompt: 'Modern architectural photography with geometric lines, interesting angles, and dramatic lighting',
      emoji: '🏛️'
    },
  ]

  const handleEnhancePrompt = async () => {
    if (!prompt.trim()) return

    setIsEnhancing(true)
    try {
      const response = await fetch('/api/gemini/enhance-image-prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          customInstructions: customEnhanceInstructions.trim() || undefined,
          settings: {
            style: selectedStyle,
            aspectRatio,
            quality,
            mood,
            lighting,
            colorPalette,
          }
        })
      })

      const data = await response.json()
      
      if (data.success) {
        setEnhancedPrompt(data.enhancedScript)
        setShowEnhancedPrompt(true)
        showToast('Prompt enhanced successfully!', 'success')
      } else {
        showToast('Failed to enhance prompt: ' + (data.message || data.error), 'error')
      }
    } catch (error) {
      console.error('Error enhancing prompt:', error)
      showToast('Failed to enhance prompt. Please try again.', 'error')
    } finally {
      setIsEnhancing(false)
    }
  }

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Check file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        showToast('Image size should be less than 5MB', 'warning')
        return
      }

      // Check file type
      if (!file.type.startsWith('image/')) {
        showToast('Please upload an image file', 'warning')
        return
      }

      setSourceImageFile(file)
      
      // Create preview URL
      const reader = new FileReader()
      reader.onloadend = () => {
        setSourceImage(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const removeSourceImage = () => {
    setSourceImage(null)
    setSourceImageFile(null)
  }

  const handleGenerateImage = async () => {
    const finalPrompt = enhancedPrompt || prompt
    
    if (!finalPrompt.trim()) {
      showToast('Please enter a prompt first', 'warning')
      return
    }

    if (mode === 'image-to-image' && !sourceImage) {
      showToast('Please upload a source image first', 'warning')
      return
    }

    // Check credits first - API will handle the actual deduction
    // Text-to-image: 5-8 credits, Image-to-image: 2 credits
    const requiredCredits = mode === 'image-to-image' ? 2 : (quality === 'high' || quality === 'ultra' ? 8 : 5)
    if (credits < requiredCredits) {
      showToast(`Insufficient credits! You need ${requiredCredits} credits but only have ${credits} remaining.`, 'error')
      return
    }

    setIsGenerating(true)
    setGeneratedImageUrl('')
    
    try {
      // Use appropriate API based on mode
      const apiEndpoint = mode === 'image-to-image' 
        ? '/api/runway/image-to-image'
        : '/api/gemini/text-to-image'

      const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: finalPrompt,
          sourceImage: mode === 'image-to-image' ? sourceImage : null,
          mode: mode,
          settings: {
            style: selectedStyle,
            aspectRatio,
            quality,
            mood,
            lighting,
            colorPalette,
            composition,
            detailLevel,
          }
        })
      })

      const data = await response.json()
      
      if (data.success && data.imageData) {
        const imageUrl = data.imageData
        setGeneratedImageUrl(imageUrl)
        setGenerationHistory(prev => [imageUrl, ...prev])
        
        // Refresh credits after successful generation (API already deducted them)
        fetchCredits()
        
        // Store prompts for later manual save (when user clicks Save to My Media)
        setLastGeneratedPrompt(prompt || finalPrompt)
        setLastGeneratedEnhancedPrompt(enhancedPrompt || '')
        
        // Clear prompts after successful generation
        setPrompt('')
        setEnhancedPrompt('')
        setShowEnhancedPrompt(false)
        showToast('Photo Generated Successfully!', 'success')
      } else {
        showToast('Failed to generate image: ' + (data.message || data.error), 'error')
      }
    } catch (error: any) {
      console.error('Error generating image:', error)
      showToast('Failed to generate image: ' + (error.message || 'Please try again.'), 'error')
    } finally {
      setIsGenerating(false)
    }
  }

  const copyPrompt = () => {
    navigator.clipboard.writeText(enhancedPrompt)
    setIsCopied(true)
    setTimeout(() => setIsCopied(false), 2000)
  }

  const useTemplate = (template: string) => {
    setPrompt(template)
    setEnhancedPrompt('')
    setShowEnhancedPrompt(false)
  }

  const handleSaveImage = async (action: 'draft' | 'schedule' | 'now') => {
    if (!generatedImageUrl) return

    setIsSaving(true)
    try {
      // Upload image to storage first
      const uploadResponse = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          file: generatedImageUrl,
          type: saveType === 'story' ? 'story' : 'post'
        })
      })

      const uploadData = await uploadResponse.json()
      
      if (!uploadData.success) {
        showToast('Failed to upload image', 'error')
        return
      }

      const imageUrl = uploadData.url

      if (action === 'draft') {
        // Save as draft
        const draftResponse = await fetch('/api/drafts/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: saveType,
            content: {
              imageUrl,
              caption: prompt || enhancedPrompt || 'AI Generated Image'
            }
          })
        })

        const draftData = await draftResponse.json()
        if (draftData.success) {
          showToast(`Saved to ${saveType} drafts!`, 'success')
          setShowSaveModal(false)
        }
      } else if (action === 'schedule') {
        // Redirect to schedule page with image
        const scheduleUrl = saveType === 'story' 
          ? `/dashboard/stories?imageUrl=${encodeURIComponent(imageUrl)}`
          : `/dashboard/posts?imageUrl=${encodeURIComponent(imageUrl)}`
        window.location.href = scheduleUrl
      } else if (action === 'now') {
        // Post immediately to Instagram
        showToast('Posting to Instagram...', 'info')
        
        // Check if the URL is publicly accessible (not base64)
        if (imageUrl.startsWith('data:')) {
          showToast('Instagram requires files to be uploaded to cloud storage. Please configure Supabase.', 'error')
          setIsSaving(false)
          return
        }

        const captionText = prompt || enhancedPrompt || 'AI Generated Image'
        
        if (saveType === 'story') {
          // Post as story
          const postResponse = await fetch('/api/instagram/post', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: 'story',
              mediaUrl: imageUrl,
              isVideo: false
            })
          })

          const postData = await postResponse.json()
          if (postData.success) {
            showToast('Story posted to Instagram! 🎉', 'success')
            setShowSaveModal(false)
          } else {
            if (postData.error?.includes('not connected')) {
              showToast('Instagram account not connected. Please connect in Settings.', 'error')
            } else {
              showToast('Failed to post story: ' + postData.error, 'error')
            }
          }
        } else {
          // Post as regular post
          const postResponse = await fetch('/api/instagram/post', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: 'image',
              mediaUrl: imageUrl,
              caption: captionText
            })
          })

          const postData = await postResponse.json()
          if (postData.success) {
            showToast('Posted to Instagram! 🎉', 'success')
            setShowSaveModal(false)
          } else {
            if (postData.error?.includes('not connected')) {
              showToast('Instagram account not connected. Please connect in Settings.', 'error')
            } else {
              showToast('Failed to post: ' + postData.error, 'error')
            }
          }
        }
      }
    } catch (error) {
      console.error('Error saving image:', error)
      showToast('Failed to save image', 'error')
    } finally {
      setIsSaving(false)
    }
  }

  const saveToMyMedia = async () => {
    if (!generatedImageUrl) return
    
    setIsSaving(true)
    try {
      // Use the last generated prompts (saved before clearing)
      const promptToSave = lastGeneratedPrompt || prompt || 'AI Generated Image'
      const enhancedPromptToSave = lastGeneratedEnhancedPrompt || enhancedPrompt || ''
      
      const response = await fetch('/api/user/media/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageData: generatedImageUrl,
          prompt: promptToSave,
          enhancedPrompt: enhancedPromptToSave,
          model: mode === 'image-to-image' ? 'gemini-imagen-3' : 'gemini-imagen-3',
          mode: mode,
          settings: {
            style: selectedStyle,
            aspectRatio,
            quality,
            mood,
            lighting
          }
        })
      })
      
      const data = await response.json()
      if (data.success) {
        showToast('Saved to My Media!', 'success')
      } else {
        showToast(data.error || 'Failed to save', 'error')
      }
    } catch (error) {
      console.error('Error saving to My Media:', error)
      showToast('Failed to save to My Media', 'error')
    } finally {
      setIsSaving(false)
    }
  }

  const downloadImage = () => {
    if (!generatedImageUrl) return
    
    const link = document.createElement('a')
    link.href = generatedImageUrl
    link.download = `ai-photo-${Date.now()}.png`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="min-h-screen bg-background p-6 space-y-6">
      {/* Toast Notifications */}
      <ToastContainer />
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal to-teal-dark flex items-center justify-center">
              <ImageIcon className="w-6 h-6 text-white" />
            </div>
            AI Photo Generation
          </h1>
          <p className="text-foreground-secondary mt-2">
            Create stunning images with AI using Gemini Imagen (2 credits per image)
          </p>
        </div>
      </div>

      {/* Mode Selector */}
      <div className="bg-background-secondary rounded-xl p-6 border border-border">
        <h3 className="text-lg font-semibold text-foreground mb-4">GENERATION MODE</h3>
        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={() => setMode('text-to-image')}
            className={`p-4 rounded-lg border-2 transition-all duration-200 hover:scale-105 ${
              mode === 'text-to-image'
                ? 'border-primary bg-primary/10'
                : 'border-border bg-background hover:border-border-hover'
            }`}
          >
            <div className="flex items-center gap-3 mb-2">
              <Sparkles className={`w-5 h-5 ${mode === 'text-to-image' ? 'text-primary' : 'text-foreground-secondary'}`} />
              <span className="font-medium text-foreground">Text to Image</span>
            </div>
            <p className="text-sm text-foreground-secondary text-left">Generate images from text descriptions</p>
          </button>
          
          <button
            onClick={() => setMode('image-to-image')}
            className={`p-4 rounded-lg border-2 transition-all duration-200 hover:scale-105 ${
              mode === 'image-to-image'
                ? 'border-primary bg-primary/10'
                : 'border-border bg-background hover:border-border-hover'
            }`}
          >
            <div className="flex items-center gap-3 mb-2">
              <ImageIcon className={`w-5 h-5 ${mode === 'image-to-image' ? 'text-primary' : 'text-foreground-secondary'}`} />
              <span className="font-medium text-foreground">Image to Image</span>
            </div>
            <p className="text-sm text-foreground-secondary text-left">Transform existing images with AI</p>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column - Input & Settings */}
        <div className="space-y-6">
          {/* Prompt Input - Moved to Top */}
          <div className="bg-background-secondary rounded-xl p-6 border border-border space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-foreground">
                {mode === 'text-to-image' ? 'YOUR PROMPT' : 'TRANSFORMATION PROMPT'}
              </h3>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 px-3 py-1 bg-orange-500/10 border border-orange-500/20 rounded-lg">
                  <Wand2 className="w-3.5 h-3.5 text-orange-500" />
                  <span className="text-xs font-medium text-foreground">
                    Cost: <span className="text-orange-500 font-bold">5 AI credits</span>
                  </span>
                </div>
                <button
                  onClick={() => setShowEnhanceOptions(!showEnhanceOptions)}
                  disabled={!prompt.trim()}
                  className="px-4 py-2 bg-primary/20 hover:bg-primary/30 text-primary rounded-lg transition-all duration-200 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                >
                  <Wand2 className="w-4 h-4" />
                  {showEnhanceOptions ? 'Hide Options' : 'Enhance with AI'}
                </button>
              </div>
            </div>
            
            {/* Custom Enhancement Options */}
            {showEnhanceOptions && (
              <div className="space-y-3 p-4 bg-background-tertiary rounded-lg border border-border">
                <label className="block text-sm font-medium text-foreground">
                  Custom Enhancement Instructions (Optional)
                </label>
                <textarea
                  value={customEnhanceInstructions}
                  onChange={(e) => setCustomEnhanceInstructions(e.target.value)}
                  placeholder="e.g., 'Make it more dramatic with stormy weather' or 'Add vintage film look' or 'Focus on warm colors and sunset lighting'"
                  className="w-full px-4 py-3 bg-background border border-border rounded-lg text-foreground placeholder-foreground-secondary resize-none focus:outline-none focus:ring-2 focus:ring-primary"
                  rows={3}
                />
                <p className="text-xs text-foreground-secondary">
                  Describe how you want to enhance your prompt. Leave empty for standard AI enhancement.
                </p>
                <button
                  onClick={handleEnhancePrompt}
                  disabled={!prompt.trim() || isEnhancing}
                  className="w-full px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                >
                  {isEnhancing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Enhancing...
                    </>
                  ) : (
                    <>
                      <Wand2 className="w-4 h-4" />
                      Enhance Prompt
                    </>
                  )}
                </button>
              </div>
            )}
            
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder={
                mode === 'text-to-image'
                  ? "Describe the image you want to create... (e.g., 'A serene mountain landscape at sunset with vibrant colors')"
                  : "Describe how you want to transform the source image... (e.g., 'Change it to a watercolor painting style', 'Make it nighttime', 'Add snow to the scene')"
              }
              className="w-full h-40 bg-background border border-border rounded-lg p-4 text-foreground placeholder-foreground-secondary/50 resize-none focus:outline-none focus:ring-2 focus:ring-primary/50 text-base"
            />

            {/* Source Image Upload Section (Image-to-Image mode only) */}
            {mode === 'image-to-image' && (
              <div className="space-y-3">
                <label className="text-sm font-medium text-foreground flex items-center gap-2">
                  <Upload className="w-4 h-4" />
                  Source Image
                  <span className="text-foreground-secondary text-xs font-normal">(Required for image transformation)</span>
                </label>
                
                {!sourceImage ? (
                  <div className="relative">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                      id="source-image-upload"
                    />
                    <label
                      htmlFor="source-image-upload"
                      className="flex flex-col items-center justify-center w-full h-40 bg-background border-2 border-dashed border-border rounded-lg cursor-pointer hover:bg-background-secondary hover:border-primary/50 transition-all group"
                    >
                      <div className="flex flex-col items-center justify-center space-y-2">
                        <Upload className="w-10 h-10 text-foreground-secondary group-hover:text-primary transition-colors" />
                        <p className="text-sm text-foreground-secondary group-hover:text-foreground transition-colors">
                          Click to upload or drag and drop
                        </p>
                        <p className="text-xs text-foreground-secondary/70">
                          PNG, JPG, or WEBP (Max 5MB)
                        </p>
                      </div>
                    </label>
                  </div>
                ) : (
                  <div className="relative group">
                    <img
                      src={sourceImage}
                      alt="Source image"
                      onClick={() => setShowImageModal(true)}
                      className="w-full h-48 object-cover rounded-lg border border-border cursor-pointer hover:opacity-90 transition-opacity"
                    />
                    <button
                      onClick={removeSourceImage}
                      className="absolute top-2 right-2 p-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors shadow-lg opacity-0 group-hover:opacity-100"
                    >
                      <X className="w-4 h-4" />
                    </button>
                    <div className="absolute bottom-2 left-2 px-3 py-1 bg-black/70 text-white text-xs rounded-lg backdrop-blur-sm">
                      Source Image Uploaded • Click to view
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Enhanced Prompt Display */}
            {showEnhancedPrompt && enhancedPrompt && (
              <div className="space-y-2 animate-fadeIn">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-primary flex items-center gap-2">
                    <Sparkles className="w-4 h-4" />
                    AI Enhanced Prompt
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setIsEditingPrompt(!isEditingPrompt)}
                      className="p-2 hover:bg-background-tertiary rounded-lg transition-colors"
                    >
                      <Edit3 className="w-4 h-4 text-foreground-secondary" />
                    </button>
                    <button
                      onClick={copyPrompt}
                      className="p-2 hover:bg-background-tertiary rounded-lg transition-colors"
                    >
                      {isCopied ? (
                        <Check className="w-4 h-4 text-green-500" />
                      ) : (
                        <Copy className="w-4 h-4 text-foreground-secondary" />
                      )}
                    </button>
                  </div>
                </div>
                {isEditingPrompt ? (
                  <textarea
                    value={enhancedPrompt}
                    onChange={(e) => setEnhancedPrompt(e.target.value)}
                    className="w-full h-40 bg-background border border-primary/30 rounded-lg p-4 text-foreground text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                ) : (
                  <div className="bg-background border border-primary/30 rounded-lg p-4 text-sm text-foreground-secondary whitespace-pre-wrap max-h-40 overflow-y-auto">
                    {enhancedPrompt}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Advanced Options */}
          <div className="bg-background-secondary rounded-xl p-6 border border-border space-y-6">
            <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <Layers className="w-5 h-5 text-primary" />
              ADDITIONAL OPTIONS
            </h3>

            {/* Aspect Ratio */}
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">ASPECT RATIO</label>
              <div className="grid grid-cols-4 gap-2">
                {aspectRatios.map((ratio) => (
                  <button
                    key={ratio.id}
                    onClick={() => setAspectRatio(ratio.id)}
                    onDoubleClick={() => setAspectRatio('1:1')} // Reset to default on double-click
                    className={`p-3 rounded-lg border-2 transition-all text-center ${
                      aspectRatio === ratio.id
                        ? 'border-primary bg-primary/10'
                        : 'border-border bg-background hover:border-border-hover'
                    }`}
                  >
                    <div className="text-sm font-medium text-foreground">{ratio.label}</div>
                    <div className="text-xs text-foreground-secondary mt-1">{ratio.description}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Quality */}
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">QUALITY</label>
              <div className="grid grid-cols-3 gap-2">
                {qualities.map((q) => (
                  <button
                    key={q.id}
                    onClick={() => setQuality(q.id)}
                    onDoubleClick={() => setQuality('high')} // Reset to default on double-click
                    className={`p-3 rounded-lg border-2 transition-all ${
                      quality === q.id
                        ? 'border-primary bg-primary/10'
                        : 'border-border bg-background hover:border-border-hover'
                    }`}
                  >
                    <div className="text-sm font-medium text-foreground">{q.label}</div>
                    <div className="text-xs text-foreground-secondary">{q.description}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Generate Button */}
          <div className="space-y-3">
            {/* Credit Cost Display */}
            <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <Coins className="w-5 h-5 text-primary" />
                  <span className="text-sm font-medium text-foreground">
                    Cost: <span className="font-bold text-primary">{requiredCredits}</span> credits
                  </span>
                </div>
                <div className="text-xs text-foreground-secondary">
                  {mode === 'image-to-image' ? 'Per transformation' : 'Per image generation'}
                </div>
              </div>
              {mode === 'text-to-image' && (quality === 'high' || quality === 'ultra') && (
                <div className="text-xs text-orange-500 flex items-center gap-1 mt-2">
                  <span className="font-semibold">+3 credits</span>
                  <span className="text-foreground-secondary">for high quality</span>
                </div>
              )}
            </div>
            
            {/* Generate Button */}
            <button
              onClick={handleGenerateImage}
              disabled={isGenerating || (!prompt.trim() && !enhancedPrompt) || credits < requiredCredits}
              className="w-full py-4 bg-gradient-to-r from-teal to-teal-dark hover:from-teal-dark hover:to-teal text-white rounded-xl font-semibold transition-all duration-300 flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 disabled:hover:scale-100 shadow-lg hover:shadow-xl"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Generating Your Image...
                </>
              ) : credits < requiredCredits ? (
                <>
                  <Coins className="w-5 h-5" />
                  Insufficient Credits
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  {mode === 'image-to-image' ? 'Transform Image' : 'Generate AI Photo'} ({requiredCredits} credits)
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right Column - Preview & Results */}
        <div className="space-y-6">
          {/* Main Preview */}
          <div className="bg-background-secondary rounded-xl p-6 border border-border">
            <h3 className="text-lg font-semibold text-foreground mb-4">
              Preview
              {aspectRatio && (
                <span className="ml-2 text-sm font-normal text-foreground-secondary">
                  ({aspectRatio})
                </span>
              )}
            </h3>
            
            {/* Dynamic aspect ratio container */}
            <div 
              className={`bg-background border border-border rounded-lg flex items-center justify-center overflow-hidden ${
                aspectRatio === '1:1' ? 'aspect-square' :
                aspectRatio === '4:5' ? 'aspect-[4/5]' :
                aspectRatio === '9:16' ? 'aspect-[9/16]' :
                aspectRatio === '16:9' ? 'aspect-[16/9]' :
                'aspect-square'
              }`}
            >
              {isGenerating ? (
                <div className="text-center space-y-4">
                  <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto" />
                  <div>
                    <p className="text-foreground font-medium">Creating your image...</p>
                    <p className="text-sm text-foreground-secondary mt-1">
                      {aspectRatio} • {quality} quality
                    </p>
                  </div>
                </div>
              ) : generatedImageUrl ? (
                <div className="relative w-full h-full group">
                  <img 
                    src={generatedImageUrl} 
                    alt="Generated" 
                    className="w-full h-full object-contain" // Changed from object-cover to object-contain to show full image
                  />
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                    <button
                      onClick={downloadImage}
                      className="p-3 bg-white/90 hover:bg-white rounded-full transition-colors"
                    >
                      <Download className="w-5 h-5 text-gray-900" />
                    </button>
                    <button
                      onClick={handleGenerateImage}
                      className="p-3 bg-white/90 hover:bg-white rounded-full transition-colors"
                    >
                      <RefreshCw className="w-5 h-5 text-gray-900" />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-center space-y-3">
                  <ImageIcon className="w-16 h-16 text-foreground-secondary/30 mx-auto" />
                  <div>
                    <p className="text-foreground-secondary">Your generated image will appear here</p>
                    <p className="text-sm text-foreground-secondary/70 mt-1">Enter a prompt and click generate</p>
                  </div>
                </div>
              )}
            </div>

            {generatedImageUrl && (
              <div className="mt-4 grid grid-cols-2 gap-2">
                <button
                  onClick={downloadImage}
                  className="py-3 bg-primary hover:bg-primary-hover text-white rounded-lg font-medium transition-all duration-200 flex items-center justify-center gap-2"
                >
                  <Download className="w-5 h-5" />
                  Download
                </button>
                <button
                  onClick={saveToMyMedia}
                  disabled={isSaving}
                  className="py-3 bg-teal hover:bg-teal-dark text-white rounded-lg font-medium transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <BookmarkPlus className="w-5 h-5" />
                  {isSaving ? 'Saving...' : 'Save to My Media'}
                </button>
                <button
                  onClick={() => setShowSaveModal(true)}
                  className="py-3 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium transition-all duration-200 flex items-center justify-center gap-2"
                >
                  <Send className="w-5 h-5" />
                  Post / Schedule
                </button>
                <button
                  onClick={handleGenerateImage}
                  className="py-3 bg-background-tertiary hover:bg-background-tertiary/80 text-foreground rounded-lg font-medium transition-all duration-200 flex items-center justify-center gap-2"
                >
                  <RefreshCw className="w-5 h-5" />
                  Regenerate
                </button>
              </div>
            )}
          </div>

          {/* Generation History */}
          {generationHistory.length > 0 && (
            <div className="bg-background-secondary rounded-xl p-6 border border-border">
              <h3 className="text-lg font-semibold text-foreground mb-4">Generation History</h3>
              <div className="grid grid-cols-3 gap-3">
                {generationHistory.map((url, index) => (
                  <button
                    key={index}
                    onClick={() => setGeneratedImageUrl(url)}
                    className="aspect-square rounded-lg overflow-hidden border-2 border-border hover:border-primary transition-all hover:scale-105"
                  >
                    <img src={url} alt={`Generated ${index}`} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Tips */}
          <div className="bg-gradient-to-br from-teal/10 to-teal-dark/10 rounded-xl p-6 border border-teal/20">
            <h3 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              Pro Tips
            </h3>
            <ul className="space-y-2 text-sm text-foreground-secondary">
              <li className="flex items-start gap-2">
                <span className="text-primary mt-0.5">•</span>
                <span>Be specific with details like colors, lighting, and composition</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-0.5">•</span>
                <span>Use the &ldquo;Enhance with AI&rdquo; feature for better prompts</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-0.5">•</span>
                <span>Experiment with different styles and moods</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-0.5">•</span>
                <span>Start with templates and customize them</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Source Image Modal */}
      {showImageModal && sourceImage && (
        <div 
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn"
          onClick={() => setShowImageModal(false)}
        >
          <div 
            className="relative max-w-5xl max-h-[90vh] animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              onClick={() => setShowImageModal(false)}
              className="absolute -top-12 right-0 p-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors backdrop-blur-sm"
            >
              <X className="w-6 h-6" />
            </button>
            
            {/* Image */}
            <img
              src={sourceImage}
              alt="Source image preview"
              className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl border border-white/10"
            />
            
            {/* Image info */}
            <div className="absolute bottom-4 left-4 right-4 bg-black/70 backdrop-blur-sm text-white px-4 py-3 rounded-lg">
              <p className="text-sm font-medium">Source Image</p>
              <p className="text-xs text-white/70 mt-1">
                {sourceImageFile?.name || 'Uploaded image'} • {sourceImageFile?.size ? `${(sourceImageFile.size / 1024 / 1024).toFixed(2)} MB` : 'Size unknown'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Save Modal */}
      {showSaveModal && (
        <div 
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setShowSaveModal(false)}
        >
          <div 
            className="bg-background-secondary rounded-xl p-6 max-w-md w-full border border-border"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-xl font-bold text-foreground mb-4">Save Image</h3>
            
            {/* Save Type Selection */}
            <div className="space-y-3 mb-6">
              <label className="text-sm font-medium text-foreground">Save to:</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setSaveType('story')}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    saveType === 'story'
                      ? 'border-primary bg-primary/10'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <span className="font-medium text-foreground">Story</span>
                </button>
                <button
                  onClick={() => setSaveType('post')}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    saveType === 'post'
                      ? 'border-primary bg-primary/10'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <span className="font-medium text-foreground">Post</span>
                </button>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
              <button
                onClick={() => handleSaveImage('draft')}
                disabled={isSaving}
                className="w-full py-3 bg-background-tertiary hover:bg-background-tertiary/80 text-foreground rounded-lg font-medium transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <BookmarkPlus className="w-5 h-5" />
                Save as Draft
              </button>
              <button
                onClick={() => handleSaveImage('schedule')}
                disabled={isSaving}
                className="w-full py-3 bg-teal hover:bg-teal-dark text-white rounded-lg font-medium transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Calendar className="w-5 h-5" />
                Schedule {saveType === 'story' ? 'Story' : 'Post'}
              </button>
              <button
                onClick={() => handleSaveImage('now')}
                disabled={isSaving}
                className="w-full py-3 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Send className="w-5 h-5" />
                Post Now
              </button>
              <button
                onClick={() => setShowSaveModal(false)}
                disabled={isSaving}
                className="w-full py-3 bg-background border border-border hover:bg-background-tertiary text-foreground rounded-lg font-medium transition-all disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
