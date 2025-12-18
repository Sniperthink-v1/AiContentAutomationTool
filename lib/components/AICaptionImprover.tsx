'use client'

import { useState } from 'react'
import { Sparkles, Loader2 } from 'lucide-react'

interface AICaptionImproverProps {
  caption: string
  onImprove: (improvedCaption: string) => void
  onError?: (message: string) => void
  onSuccess?: (message: string) => void
  className?: string
}

export function AICaptionImprover({ caption, onImprove, onError, onSuccess, className = '' }: AICaptionImproverProps) {
  const [isImproving, setIsImproving] = useState(false)

  const showError = (msg: string) => {
    if (onError) onError(msg)
    else console.error(msg)
  }

  const handleImprove = async () => {
    if (!caption.trim()) return

    setIsImproving(true)
    try {
      const response = await fetch('/api/gemini/improve-caption', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ caption })
      })

      const data = await response.json()

      if (data.success && data.improved) {
        onImprove(data.improved)
        if (onSuccess) onSuccess('Caption improved successfully!')
      } else {
        // Show user-friendly error message
        const errorMsg = response.status === 503 
          ? 'AI service is busy. Please try again in a moment.'
          : data.error || 'Failed to improve caption'
        showError(errorMsg)
      }
    } catch (error) {
      console.error('Error improving caption:', error)
      showError('Network error. Please check your connection and try again.')
    } finally {
      setIsImproving(false)
    }
  }

  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      <div className="flex items-center gap-1.5 px-2 py-1 bg-orange-500/10 border border-orange-500/20 rounded-lg">
        <Sparkles className="w-3 h-3 text-orange-500" />
        <span className="text-xs font-medium text-foreground">
          Cost: <span className="text-orange-500 font-bold">5</span>
        </span>
      </div>
      <button
        type="button"
        onClick={handleImprove}
        disabled={isImproving || !caption.trim()}
        className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-primary hover:text-primary/80 bg-primary/10 hover:bg-primary/20 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isImproving ? (
          <>
            <Loader2 className="w-3 h-3 animate-spin" />
            Improving...
          </>
        ) : (
          <>
            <Sparkles className="w-3 h-3" />
            AI Improve
          </>
        )}
      </button>
    </div>
  )
}
