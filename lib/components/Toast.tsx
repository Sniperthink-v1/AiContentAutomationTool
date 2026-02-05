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

  // Brand theme colors
  const colors = {
    success: {
      bg: 'bg-gradient-to-r from-[#F8F9FA] via-[#F1F3F5] to-[#E8F5E9]',
      border: 'border-sage/50',
      icon: 'bg-sage/20 text-teal ring-1 ring-sage/30',
      title: 'text-teal',
      progressBg: 'bg-sage/20',
      progressBar: 'bg-gradient-to-r from-sage to-teal',
      glow: 'shadow-sage/20'
    },
    error: {
      bg: 'bg-gradient-to-r from-[#F8F9FA] via-[#F1F3F5] to-[#FFEBEE]',
      border: 'border-red-500/50',
      icon: 'bg-red-500/20 text-red-500 ring-1 ring-red-500/30',
      title: 'text-red-500',
      progressBg: 'bg-red-500/20',
      progressBar: 'bg-gradient-to-r from-red-500 to-red-400',
      glow: 'shadow-red-500/20'
    },
    warning: {
      bg: 'bg-gradient-to-r from-[#F8F9FA] via-[#F1F3F5] to-[#FFF8E1]',
      border: 'border-golden/50',
      icon: 'bg-golden/20 text-golden ring-1 ring-golden/30',
      title: 'text-golden',
      progressBg: 'bg-golden/20',
      progressBar: 'bg-gradient-to-r from-golden to-orange',
      glow: 'shadow-golden/20'
    },
    info: {
      bg: 'bg-gradient-to-r from-[#F8F9FA] via-[#F1F3F5] to-[#E8F4F4]',
      border: 'border-teal/50',
      icon: 'bg-teal/20 text-teal ring-1 ring-teal/30',
      title: 'text-teal',
      progressBg: 'bg-teal/20',
      progressBar: 'bg-gradient-to-r from-teal to-primary-hover',
      glow: 'shadow-teal/20'
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
          <div className={`absolute top-0 right-0 w-32 h-32 ${type === 'success' ? 'bg-sage' : type === 'error' ? 'bg-red-500' : type === 'warning' ? 'bg-golden' : 'bg-teal'} rounded-full blur-3xl`} />
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
          <p className="text-sm font-medium text-plum leading-relaxed">
            {message}
          </p>
        </div>

        {/* Close button */}
        <button
          onClick={handleClose}
          className="relative flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-foreground-muted hover:text-plum hover:bg-plum/10 transition-all duration-200 hover:scale-110 active:scale-95"
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
