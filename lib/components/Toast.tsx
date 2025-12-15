'use client'

import { useEffect, useState, useCallback } from 'react'
import { Check, X, AlertCircle, Bell, Sparkles, Video, CheckCircle2, XCircle, AlertTriangle, Info } from 'lucide-react'

export type ToastType = 'success' | 'error' | 'warning' | 'info'

interface ToastProps {
  message: string
  type: ToastType
  onClose: () => void
  duration?: number
  index?: number
}

export function Toast({ message, type, onClose, duration = 5000, index = 0 }: ToastProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [isLeaving, setIsLeaving] = useState(false)
  const [progress, setProgress] = useState(100)

  const handleClose = useCallback(() => {
    setIsLeaving(true)
    setTimeout(() => {
      onClose()
    }, 300)
  }, [onClose])

  useEffect(() => {
    // Trigger enter animation
    requestAnimationFrame(() => {
      setIsVisible(true)
    })

    // Progress bar animation
    const startTime = Date.now()
    const progressInterval = setInterval(() => {
      const elapsed = Date.now() - startTime
      const remaining = Math.max(0, 100 - (elapsed / duration) * 100)
      setProgress(remaining)
      if (remaining <= 0) {
        clearInterval(progressInterval)
      }
    }, 50)

    const timer = setTimeout(() => {
      handleClose()
    }, duration)

    return () => {
      clearTimeout(timer)
      clearInterval(progressInterval)
    }
  }, [duration, handleClose])

  const icons = {
    success: <CheckCircle2 className="w-5 h-5" />,
    error: <XCircle className="w-5 h-5" />,
    warning: <AlertTriangle className="w-5 h-5" />,
    info: <Info className="w-5 h-5" />
  }

  const titles = {
    success: 'Success',
    error: 'Error',
    warning: 'Warning',
    info: 'Notification'
  }

  // Blue and black theme colors - matching your app theme
  const colors = {
    success: {
      bg: 'bg-gradient-to-r from-[#0a1628] via-[#0d1f35] to-[#0a2818]',
      border: 'border-emerald-500/50',
      icon: 'bg-emerald-500/20 text-emerald-400 ring-1 ring-emerald-500/30',
      title: 'text-emerald-400',
      progressBg: 'bg-emerald-500/20',
      progressBar: 'bg-gradient-to-r from-emerald-500 to-emerald-400',
      glow: 'shadow-emerald-500/20'
    },
    error: {
      bg: 'bg-gradient-to-r from-[#0a1628] via-[#0d1f35] to-[#280a0a]',
      border: 'border-red-500/50',
      icon: 'bg-red-500/20 text-red-400 ring-1 ring-red-500/30',
      title: 'text-red-400',
      progressBg: 'bg-red-500/20',
      progressBar: 'bg-gradient-to-r from-red-500 to-red-400',
      glow: 'shadow-red-500/20'
    },
    warning: {
      bg: 'bg-gradient-to-r from-[#0a1628] via-[#0d1f35] to-[#28200a]',
      border: 'border-amber-500/50',
      icon: 'bg-amber-500/20 text-amber-400 ring-1 ring-amber-500/30',
      title: 'text-amber-400',
      progressBg: 'bg-amber-500/20',
      progressBar: 'bg-gradient-to-r from-amber-500 to-amber-400',
      glow: 'shadow-amber-500/20'
    },
    info: {
      bg: 'bg-gradient-to-r from-[#0a1628] via-[#0d1f35] to-[#0a1c28]',
      border: 'border-blue-500/50',
      icon: 'bg-blue-500/20 text-blue-400 ring-1 ring-blue-500/30',
      title: 'text-blue-400',
      progressBg: 'bg-blue-500/20',
      progressBar: 'bg-gradient-to-r from-blue-500 to-blue-400',
      glow: 'shadow-blue-500/20'
    }
  }

  const colorScheme = colors[type]

  return (
    <div 
      className={`transform transition-all duration-300 ease-out outline-none ${isVisible && !isLeaving ? 'translate-x-0 opacity-100 scale-100' : 'translate-x-full opacity-0 scale-95'}`}
      style={{ transitionDelay: `${index * 50}ms` }}
    >
      <div 
        className={`relative overflow-hidden flex items-start gap-4 px-4 py-4 rounded-2xl border ${colorScheme.border} ${colorScheme.bg} backdrop-blur-xl min-w-[360px] max-w-[420px] shadow-2xl ${colorScheme.glow} outline-none focus:outline-none`}
        style={{ outline: 'none' }}
      >
        {/* Animated background glow */}
        <div className="absolute inset-0 opacity-30">
          <div className={`absolute top-0 right-0 w-32 h-32 ${type === 'success' ? 'bg-emerald-500' : type === 'error' ? 'bg-red-500' : type === 'warning' ? 'bg-amber-500' : 'bg-blue-500'} rounded-full blur-3xl`} />
        </div>

        {/* Icon container */}
        <div className={`relative flex-shrink-0 w-11 h-11 rounded-xl flex items-center justify-center ${colorScheme.icon} transition-transform duration-300 hover:scale-110`}>
          {icons[type]}
        </div>

        {/* Content */}
        <div className="relative flex-1 min-w-0 pt-0.5">
          <p className={`text-xs font-semibold uppercase tracking-wider mb-1 ${colorScheme.title}`}>
            {titles[type]}
          </p>
          <p className="text-sm font-medium text-white/90 leading-relaxed">
            {message}
          </p>
        </div>

        {/* Close button */}
        <button
          onClick={handleClose}
          className="relative flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-gray-500 hover:text-white hover:bg-white/10 transition-all duration-200 hover:scale-110 active:scale-95"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Progress bar */}
        <div className={`absolute bottom-0 left-0 right-0 h-1 ${colorScheme.progressBg}`}>
          <div 
            className={`h-full ${colorScheme.progressBar} transition-all duration-100 ease-linear rounded-full`}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  )
}

export function useToast() {
  const [toasts, setToasts] = useState<Array<{ id: number; message: string; type: ToastType }>>([])

  const showToast = (message: string, type: ToastType = 'info', saveToHistory: boolean = false) => {
    const id = Date.now()
    setToasts(prev => [...prev, { id, message, type }])
    
    // Optionally save to notification history database
    if (saveToHistory) {
      fetch('/api/notifications/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: type.charAt(0).toUpperCase() + type.slice(1),
          message,
          type: type === 'info' ? 'info' : type === 'success' ? 'success' : type === 'error' ? 'error' : 'warning'
        })
      }).catch(err => console.error('Failed to save notification to history:', err))
    }
  }

  // Show toast AND save to notification history
  const showAndSaveToast = (title: string, message: string, type: ToastType = 'info', link?: string) => {
    const id = Date.now()
    setToasts(prev => [...prev, { id, message, type }])
    
    // Save to notification history database
    fetch('/api/notifications/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title,
        message,
        type: type === 'info' ? 'info' : type === 'success' ? 'success' : type === 'error' ? 'error' : 'warning',
        link
      })
    }).catch(err => console.error('Failed to save notification to history:', err))
  }

  const removeToast = (id: number) => {
    setToasts(prev => prev.filter(toast => toast.id !== id))
  }

  const ToastContainer = () => (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-3 pointer-events-none">
      {toasts.map((toast, index) => (
        <div key={toast.id} className="pointer-events-auto">
          <Toast
            message={toast.message}
            type={toast.type}
            onClose={() => removeToast(toast.id)}
            index={index}
            duration={5000}
          />
        </div>
      ))}
    </div>
  )

  return { showToast, showAndSaveToast, ToastContainer }
}
