'use client'

import { useNotifications, NotificationType } from '@/lib/contexts/NotificationContext'
import { X, Video, ImagePlus, Music, Coins, Sparkles, Bell, Check, AlertTriangle, AlertCircle } from 'lucide-react'

const iconMap: Record<NotificationType, React.ReactNode> = {
  video: <Video className="w-4 h-4" />,
  photo: <ImagePlus className="w-4 h-4" />,
  music: <Music className="w-4 h-4" />,
  credits: <Coins className="w-4 h-4" />,
  feature: <Sparkles className="w-4 h-4" />,
  info: <Bell className="w-4 h-4" />,
  success: <Check className="w-4 h-4" />,
  warning: <AlertTriangle className="w-4 h-4" />,
  error: <AlertCircle className="w-4 h-4" />
}

const colorMap: Record<NotificationType, string> = {
  video: 'text-blue-500',
  photo: 'text-purple-500',
  music: 'text-pink-500',
  credits: 'text-yellow-500',
  feature: 'text-cyan-500',
  info: 'text-blue-500',
  success: 'text-green-500',
  warning: 'text-orange-500',
  error: 'text-red-500'
}

const bgColorMap: Record<NotificationType, string> = {
  video: 'bg-blue-500/10 border-blue-500/20',
  photo: 'bg-purple-500/10 border-purple-500/20',
  music: 'bg-pink-500/10 border-pink-500/20',
  credits: 'bg-yellow-500/10 border-yellow-500/20',
  feature: 'bg-cyan-500/10 border-cyan-500/20',
  info: 'bg-blue-500/10 border-blue-500/20',
  success: 'bg-green-500/10 border-green-500/20',
  warning: 'bg-orange-500/10 border-orange-500/20',
  error: 'bg-red-500/10 border-red-500/20'
}

export function ToastContainer() {
  const { toasts, dismissToast } = useNotifications()

  if (toasts.length === 0) return null

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`
            flex items-start gap-3 p-4 rounded-xl border backdrop-blur-xl
            shadow-lg animate-slide-in-right
            ${bgColorMap[toast.type]}
          `}
          style={{
            background: 'rgba(10, 10, 15, 0.95)',
            animation: 'slideInRight 0.3s ease-out'
          }}
        >
          {/* Icon */}
          <div className={`flex-shrink-0 mt-0.5 ${colorMap[toast.type]}`}>
            {iconMap[toast.type]}
          </div>
          
          {/* Content */}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white">{toast.title}</p>
            <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">{toast.message}</p>
          </div>
          
          {/* Close button */}
          <button
            onClick={() => dismissToast(toast.id)}
            className="flex-shrink-0 p-1 text-gray-500 hover:text-white transition-colors rounded-lg hover:bg-white/10"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
      
      <style jsx global>{`
        @keyframes slideInRight {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  )
}
