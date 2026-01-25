'use client'

import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react'

export type NotificationType = 'video' | 'photo' | 'music' | 'credits' | 'feature' | 'info' | 'success' | 'warning' | 'error'

export interface Notification {
  id: number
  title: string
  message: string
  type: NotificationType
  read: boolean
  time: string
  link?: string
  created_at?: string
}

export interface ToastNotification {
  id: string
  title: string
  message: string
  type: NotificationType
  duration?: number
}

interface NotificationContextType {
  // Notification history (from database)
  notifications: Notification[]
  unreadCount: number
  isLoading: boolean
  
  // Actions
  fetchNotifications: () => Promise<void>
  markAsRead: (notificationId: number) => Promise<void>
  markAllAsRead: () => Promise<void>
  
  // Toast notifications (temporary UI popups)
  toasts: ToastNotification[]
  showToast: (toast: Omit<ToastNotification, 'id'>) => void
  dismissToast: (id: string) => void
  
  // Send notification to server (saves to database)
  sendNotification: (params: {
    title: string
    message: string
    type: NotificationType
    link?: string
  }) => Promise<boolean>
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined)

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [toasts, setToasts] = useState<ToastNotification[]>([])

  // Fetch notifications from API
  const fetchNotifications = useCallback(async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/notifications?limit=20')
      const data = await response.json()
      if (data.success) {
        setNotifications(data.notifications)
        setUnreadCount(data.unreadCount)
      }
    } catch (error) {
      console.error('Failed to fetch notifications:', error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Mark single notification as read
  const markAsRead = useCallback(async (notificationId: number) => {
    try {
      await fetch('/api/notifications/read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationId })
      })
      setNotifications(prev => prev.map(n => 
        n.id === notificationId ? { ...n, read: true } : n
      ))
      setUnreadCount(prev => Math.max(0, prev - 1))
    } catch (error) {
      console.error('Failed to mark notification as read:', error)
    }
  }, [])

  // Mark all notifications as read
  const markAllAsRead = useCallback(async () => {
    try {
      const response = await fetch('/api/notifications/read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markAll: true })
      })
      const data = await response.json()
      if (data.success) {
        setNotifications(prev => prev.map(n => ({ ...n, read: true })))
        setUnreadCount(0)
      }
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error)
    }
  }, [])

  // Dismiss a toast
  const dismissToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  // Show a toast notification (temporary popup)
  const showToast = useCallback((toast: Omit<ToastNotification, 'id'>) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    const newToast: ToastNotification = { ...toast, id }
    
    setToasts(prev => [...prev, newToast])
    
    // Auto dismiss after duration (default 5 seconds)
    const duration = toast.duration || 5000
    setTimeout(() => {
      dismissToast(id)
    }, duration)
  }, [dismissToast])

  // Send notification to server (saves to database and shows toast)
  const sendNotification = useCallback(async (params: {
    title: string
    message: string
    type: NotificationType
    link?: string
  }): Promise<boolean> => {
    try {
      const response = await fetch('/api/notifications/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params)
      })
      const data = await response.json()
      
      if (data.success) {
        // Show toast
        showToast({
          title: params.title,
          message: params.message,
          type: params.type
        })
        
        // Refresh notifications list
        await fetchNotifications()
        return true
      }
      return false
    } catch (error) {
      console.error('Failed to send notification:', error)
      return false
    }
  }, [showToast, fetchNotifications])

  // Fetch notifications on mount
  useEffect(() => {
    fetchNotifications()
    
    // Refresh every 30 seconds
    const interval = setInterval(fetchNotifications, 30000)
    return () => clearInterval(interval)
  }, [fetchNotifications])

  return (
    <NotificationContext.Provider value={{
      notifications,
      unreadCount,
      isLoading,
      fetchNotifications,
      markAsRead,
      markAllAsRead,
      toasts,
      showToast,
      dismissToast,
      sendNotification
    }}>
      {children}
    </NotificationContext.Provider>
  )
}

export function useNotifications() {
  const context = useContext(NotificationContext)
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider')
  }
  return context
}
