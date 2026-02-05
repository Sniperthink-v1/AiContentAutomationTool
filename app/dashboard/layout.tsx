'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { 
  LayoutDashboard, 
  Image, 
  Video, 
  BarChart3, 
  Settings, 
  LogOut,
  Bell,
  Search,
  Menu,
  X,
  ImagePlus,
  Smartphone,
  MessageCircle,
  Coins,
  Music,
  Library,
  FolderOpen,
  Sparkles,
  Check,
  Film
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useState, useEffect, useRef } from 'react'
import { NotificationProvider, useNotifications } from '@/lib/contexts/NotificationContext'
import { ToastContainer } from '@/lib/components/ToastContainer'

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Posts', href: '/dashboard/posts', icon: Image },
  { name: 'Stories', href: '/dashboard/stories', icon: Smartphone },
  { name: 'AI Photos', href: '/dashboard/ai-photos', icon: ImagePlus },
  { name: 'AI Video', href: '/dashboard/ai-video', icon: Video },
  { name: 'Video Editor', href: '/dashboard/video-editor', icon: Film },
  { name: 'AI Music', href: '/dashboard/ai-music', icon: Music },
  { name: 'My Songs', href: '/dashboard/my-songs', icon: Library },
  { name: 'My Media', href: '/dashboard/my-media', icon: FolderOpen },
  { name: 'Thumbnails', href: '/dashboard/thumbnails', icon: ImagePlus },
  { name: 'Comments', href: '/dashboard/comments', icon: MessageCircle },
  { name: 'Analytics', href: '/dashboard/analytics', icon: BarChart3 },
  { name: 'Settings', href: '/dashboard/settings', icon: Settings },
]

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <NotificationProvider>
      <DashboardLayoutInner>{children}</DashboardLayoutInner>
      <ToastContainer />
    </NotificationProvider>
  )
}

function DashboardLayoutInner({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const router = useRouter()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [credits, setCredits] = useState({ total_credits: 0, used_credits: 0, remaining_credits: 0 })
  const [isLoadingCredits, setIsLoadingCredits] = useState(true)
  const [user, setUser] = useState<{ firstName: string; lastName: string; email: string } | null>(null)
  const [showNotifications, setShowNotifications] = useState(false)
  const notificationRef = useRef<HTMLDivElement>(null)
  const [isInstagramConnected, setIsInstagramConnected] = useState<boolean | null>(null)
  const [isCheckingConnection, setIsCheckingConnection] = useState(true)

  // Use notification context for notifications
  const { 
    notifications, 
    unreadCount, 
    isLoading: isLoadingNotifications, 
    fetchNotifications, 
    markAsRead, 
    markAllAsRead 
  } = useNotifications()

  // Close notification dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setShowNotifications(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Load user data on mount
  useEffect(() => {
    fetchUser()
  }, [])

  // Check Instagram connection on navigation
  useEffect(() => {
    checkInstagramConnection()
  }, [pathname])

  const fetchUser = async () => {
    try {
      const response = await fetch('/api/user')
      const data = await response.json()
      if (data.success && data.user) {
        setUser({
          firstName: data.user.firstName || '',
          lastName: data.user.lastName || '',
          email: data.user.email || ''
        })
      }
    } catch (error) {
      console.error('Failed to load user:', error)
    }
  }

  const checkInstagramConnection = async () => {
    setIsCheckingConnection(true)
    try {
      const response = await fetch('/api/instagram/status')
      const data = await response.json()
      setIsInstagramConnected(Boolean(data.success && data.connected))
    } catch (error) {
      console.error('Failed to check Instagram connection:', error)
      setIsInstagramConnected(false)
    } finally {
      setIsCheckingConnection(false)
    }
  }

  // Load credits on mount
  useEffect(() => {
    fetchCredits()
    // Refresh credits every 30 seconds
    const interval = setInterval(fetchCredits, 30000)
    return () => clearInterval(interval)
  }, [])

  const fetchCredits = async () => {
    try {
      const response = await fetch('/api/credits/balance')
      const data = await response.json()
      if (data.success) {
        setCredits(data.credits)
      }
    } catch (error) {
      console.error('Failed to load credits:', error)
    } finally {
      setIsLoadingCredits(false)
    }
  }

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
      router.push('/login')
    } catch (error) {
      console.error('Logout failed:', error)
    }
  }

  const shouldShowConnectMessage =
    isInstagramConnected === false && pathname !== '/dashboard/settings'

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "fixed top-0 left-0 z-50 h-screen w-64 bg-background-secondary border-r border-border transition-transform duration-300 lg:translate-x-0",
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-between h-16 px-6 border-b border-border">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg overflow-hidden flex items-center justify-center">
                <img 
                  src="/logo.jpg" 
                  alt="SniperThinkAI Logo" 
                  className="w-full h-full object-contain"
                />
              </div>
              <span className="text-lg font-bold text-foreground">SniperThinkAI</span>
            </div>
            <button 
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden text-foreground-secondary hover:text-foreground"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
            {navigation.map((item, index) => {
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setSidebarOpen(false)}
                  style={{ animationDelay: `${index * 50}ms` }}
                  className={cn(
                    "nav-item animate-slide-right",
                    isActive
                      ? "nav-item-active"
                      : "nav-item-inactive"
                  )}
                >
                  <item.icon className="w-5 h-5 transition-transform duration-300 group-hover:scale-110" />
                  {item.name}
                </Link>
              )
            })}
          </nav>

          {/* User section */}
          <div className="p-4 border-t border-border animate-fade-in">
            <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-background-tertiary hover:bg-background-tertiary/80 transition-all duration-300 cursor-pointer group">
              <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-sm font-bold text-white group-hover:scale-110 transition-transform duration-300">
                {user ? `${user.firstName?.charAt(0) || ''}${user.lastName?.charAt(0) || ''}`.toUpperCase() : 'U'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  {user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email : 'Loading...'}
                </p>
                <p className="text-xs text-foreground-secondary truncate">
                  @{user?.email?.split('@')[0] || 'user'}
                </p>
              </div>
            </div>
            <button 
              onClick={handleLogout}
              className="w-full mt-2 flex items-center justify-center gap-2 px-4 py-2 text-sm text-foreground-secondary hover:text-red-500 transition-all duration-300 hover:bg-red-500/10 rounded-lg"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Header */}
        <header className="sticky top-0 z-30 h-16 bg-background-secondary/80 backdrop-blur-xl border-b border-border">
          <div className="flex items-center justify-between h-full px-6">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden text-foreground-secondary hover:text-foreground"
            >
              <Menu className="w-6 h-6" />
            </button>

            <div className="flex-1"></div>

            {/* Actions */}
            <div className="flex items-center gap-3">
              {/* Credits Display */}
              <div className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 border border-primary/20 rounded-lg hover:bg-primary/15 transition-all duration-300 cursor-pointer group">
                <Coins className="w-4 h-4 text-primary group-hover:scale-110 transition-transform" />
                <div className="flex items-baseline gap-1">
                  <span className="text-sm font-bold text-foreground">
                    {isLoadingCredits ? '...' : credits.remaining_credits.toLocaleString()}
                  </span>
                  <span className="text-xs text-foreground-secondary">credits</span>
                </div>
              </div>
              
              {/* Notification Bell with Dropdown */}
              <div className="relative" ref={notificationRef}>
                <button 
                  onClick={() => {
                    setShowNotifications(!showNotifications)
                    if (!showNotifications) fetchNotifications()
                  }}
                  className="relative p-2 text-foreground-secondary hover:text-foreground hover:bg-background-tertiary rounded-lg transition-all"
                >
                  <Bell className="w-5 h-5" />
                  {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 w-2 h-2 bg-danger rounded-full animate-pulse"></span>
                  )}
                </button>

                {/* Notification Dropdown */}
                {showNotifications && (
                  <div className="absolute right-0 top-full mt-2 w-80 rounded-xl overflow-hidden z-50 animate-fade-in shadow-2xl"
                       style={{ 
                         background: '#FFFFFF',
                         border: '1px solid #E5E7EB'
                       }}>
                    {/* Header */}
                    <div className="px-4 py-3 border-b border-border">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-teal/10 flex items-center justify-center">
                            <Bell className="w-4 h-4 text-teal" />
                          </div>
                          <h3 className="text-sm font-bold text-plum">Notifications</h3>
                        </div>
                        {unreadCount > 0 && (
                          <span className="text-xs font-medium text-teal bg-teal/10 px-2 py-0.5 rounded-full">
                            {unreadCount} new
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Notification List */}
                    <div className="max-h-[320px] overflow-y-auto">
                      {isLoadingNotifications ? (
                        <div className="px-4 py-8 text-center">
                          <div className="w-6 h-6 border-2 border-teal/30 border-t-teal rounded-full animate-spin mx-auto"></div>
                          <p className="text-foreground-muted text-xs mt-2">Loading...</p>
                        </div>
                      ) : notifications.length === 0 ? (
                        <div className="px-4 py-8 text-center">
                          <div className="w-12 h-12 rounded-xl bg-background-tertiary flex items-center justify-center mx-auto mb-2">
                            <Bell className="w-6 h-6 text-teal/50" />
                          </div>
                          <p className="text-foreground-muted text-xs">No notifications yet</p>
                        </div>
                      ) : (
                        notifications.map((notification, index) => (
                          <div
                            key={notification.id}
                            onClick={() => !notification.read && markAsRead(notification.id)}
                            className={`px-4 py-3 border-b border-border hover:bg-teal/5 transition-all duration-200 cursor-pointer group ${!notification.read ? 'bg-teal/5' : ''}`}
                            style={{ animationDelay: `${index * 50}ms` }}
                          >
                            <div className="flex items-start gap-3">
                              {/* Icon Container - Teal icon on light bg */}
                              <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-105 bg-background-tertiary`}>
                                {notification.type === 'video' && <Video className="w-4 h-4 text-teal" />}
                                {notification.type === 'photo' && <ImagePlus className="w-4 h-4 text-teal" />}
                                {notification.type === 'music' && <Music className="w-4 h-4 text-teal" />}
                                {notification.type === 'credits' && <Coins className="w-4 h-4 text-golden" />}
                                {notification.type === 'feature' && <Sparkles className="w-4 h-4 text-orange" />}
                                {notification.type === 'info' && <Bell className="w-4 h-4 text-teal" />}
                                {notification.type === 'success' && <Check className="w-4 h-4 text-sage" />}
                                {notification.type === 'warning' && <Coins className="w-4 h-4 text-golden" />}
                                {notification.type === 'error' && <X className="w-4 h-4 text-red-500" />}
                              </div>
                              
                              {/* Content */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <p className={`text-xs font-semibold ${!notification.read ? 'text-plum' : 'text-foreground-secondary'}`}>
                                    {notification.title}
                                  </p>
                                  {!notification.read && (
                                    <span className="w-1.5 h-1.5 rounded-full bg-teal"></span>
                                  )}
                                </div>
                                <p className="text-xs text-foreground-muted mt-0.5 line-clamp-1">
                                  {notification.message}
                                </p>
                                <p className="text-xs text-teal/60 mt-1">
                                  {notification.time}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>

                    {/* Footer */}
                    <div className="px-4 py-2 border-t border-border bg-background-secondary">
                      {notifications.length > 0 && unreadCount > 0 ? (
                        <button 
                          onClick={markAllAsRead}
                          className="w-full text-center text-xs text-teal hover:text-primary-hover font-medium py-1.5 rounded-lg hover:bg-teal/10 transition-all duration-200 flex items-center justify-center gap-1.5"
                        >
                          <Check className="w-3 h-3" /> Mark all as read
                        </button>
                      ) : notifications.length > 0 ? (
                        <p className="text-center text-xs text-foreground-muted py-1.5">
                          All caught up! ✓
                        </p>
                      ) : null}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="p-6">
          {shouldShowConnectMessage ? (
            <div className="card p-6 text-sm text-foreground-secondary">
              Connect your Instagram account to get analytics.{' '}
              <Link href="/dashboard/settings" className="text-primary underline">
                Go to Settings
              </Link>
            </div>
          ) : isCheckingConnection ? (
            <div className="card p-6 text-sm text-foreground-secondary">
              Checking Instagram connection...
            </div>
          ) : (
            children
          )}
        </main>
      </div>
    </div>
  )
}
