'use client'

import { useState, useEffect } from 'react'
import { 
  User, 
  Bell, 
  Shield, 
  Palette,
  Save,
  RefreshCw,
  Trash2,
  Link as LinkIcon,
  Upload,
  Camera,
  Instagram,
  CheckCircle,
  XCircle,
  ExternalLink
} from 'lucide-react'
import { useToast } from '@/lib/components/Toast'
import { User as UserType } from '@/lib/types/user'

export default function SettingsPage() {
  const { showToast, ToastContainer } = useToast()
  const [activeTab, setActiveTab] = useState('account')
  const [user, setUser] = useState<UserType | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  
  // Form states
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [bio, setBio] = useState('')
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string>('')
  
  // Instagram connection state
  const [igUsername, setIgUsername] = useState<string | null>(null)
  const [igConnecting, setIgConnecting] = useState(false)

  useEffect(() => {
    loadUser()
    checkInstagramConnection()
    
    // Check for success/error messages from OAuth callback
    const urlParams = new URLSearchParams(window.location.search)
    const success = urlParams.get('success')
    const error = urlParams.get('error')
    
    if (success) {
      showToast(success, 'success')
      // Clean up URL
      window.history.replaceState({}, '', '/dashboard/settings')
      checkInstagramConnection()
    }
    if (error) {
      showToast(error, 'error')
      window.history.replaceState({}, '', '/dashboard/settings')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const loadUser = async () => {
    setIsLoading(true)
    try {
      console.log('Loading user...')
      const response = await fetch('/api/user')
      const data = await response.json()
      console.log('User data received:', data)
      
      if (data.success && data.user) {
        setUser(data.user)
        setFirstName(data.user.firstName || '')
        setLastName(data.user.lastName || '')
        setEmail(data.user.email || '')
        setBio(data.user.bio || '')
        setAvatarPreview(data.user.avatarUrl || '')
        console.log('User state updated:', {
          id: data.user.id,
          firstName: data.user.firstName,
          lastName: data.user.lastName
        })
      } else {
        showToast('Failed to load user data', 'error')
      }
    } catch (error) {
      console.error('Failed to load user:', error)
      showToast('Failed to load user data', 'error')
    } finally {
      setIsLoading(false)
    }
  }

  const checkInstagramConnection = () => {
    // Check for ig_username cookie
    const cookies = document.cookie.split(';')
    const igCookie = cookies.find(c => c.trim().startsWith('ig_username='))
    if (igCookie) {
      const username = igCookie.split('=')[1]
      setIgUsername(username)
    }
  }

  const handleConnectInstagram = () => {
    setIgConnecting(true)
    // Redirect to Instagram OAuth
    window.location.href = '/api/auth/instagram'
  }

  const handleDisconnectInstagram = async () => {
    // Clear cookies
    document.cookie = 'ig_access_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;'
    document.cookie = 'ig_user_id=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;'
    document.cookie = 'ig_username=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;'
    setIgUsername(null)
    showToast('Instagram disconnected', 'success')
  }

  const handleAvatarSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        showToast('Image must be less than 2MB', 'error')
        return
      }
      setAvatarFile(file)
      
      // Create preview URL for display
      const url = URL.createObjectURL(file)
      setAvatarPreview(url)
    }
  }

  const handleSaveProfile = async () => {
    if (!user) {
      showToast('No user loaded', 'error')
      return
    }

    setIsSaving(true)
    try {
      let avatarUrl = user.avatarUrl

      // Upload avatar to Supabase if a new file was selected
      if (avatarFile) {
        try {
          showToast('Uploading avatar...', 'info')
          
          const formData = new FormData()
          formData.append('file', avatarFile)
          formData.append('bucket', 'avatars')
          formData.append('folder', 'user-avatars')

          const uploadResponse = await fetch('/api/upload', {
            method: 'POST',
            body: formData
          })

          const uploadData = await uploadResponse.json()
          
          if (!uploadData.success) {
            throw new Error(uploadData.error || 'Upload failed')
          }

          avatarUrl = uploadData.url
          console.log('✅ Avatar uploaded:', avatarUrl)
        } catch (error: any) {
          console.error('Failed to upload avatar:', error)
          showToast(`Failed to upload avatar: ${error.message}`, 'error')
          setIsSaving(false)
          return
        }
      }

      console.log('Saving profile...', {
        firstName,
        lastName,
        bio,
        hasAvatar: !!avatarUrl
      })

      const response = await fetch('/api/user/update', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName,
          lastName,
          bio,
          avatarUrl
        })
      })

      const data = await response.json()
      console.log('Save response:', data)
      
      if (data.success) {
        setUser(data.user)
        setAvatarFile(null) // Clear the file after successful save
        showToast('Profile updated successfully!', 'success')
      } else {
        showToast('Failed to update profile: ' + data.error, 'error')
      }
    } catch (error) {
      console.error('Save error:', error)
      showToast('An error occurred while saving', 'error')
    } finally {
      setIsSaving(false)
    }
  }

  const getInitials = () => {
    if (firstName && lastName) {
      return `${firstName[0]}${lastName[0]}`.toUpperCase()
    }
    if (email) {
      return email.substring(0, 2).toUpperCase()
    }
    return 'U'
  }

  const tabs = [
    { id: 'account', name: 'Account', icon: User },
    { id: 'instagram', name: 'Instagram', icon: Instagram },
    { id: 'notifications', name: 'Notifications', icon: Bell },
    { id: 'appearance', name: 'Appearance', icon: Palette },
    { id: 'security', name: 'Security', icon: Shield },
  ]

  return (
    <div className="space-y-6 animate-fade-in">
      <ToastContainer />
      {/* Header */}
      <div className="animate-slide-down">
        <h1 className="text-3xl font-bold text-foreground">Settings</h1>
        <p className="text-foreground-secondary mt-1">Manage your account and preferences</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar */}
        <div className="lg:col-span-1 animate-slide-right">
          <div className="card p-2 space-y-1">
            {tabs.map((tab, index) => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-300 animate-scale-in hover:scale-105 ${
                    activeTab === tab.id
                      ? 'bg-primary text-primary-foreground shadow-lg'
                      : 'text-foreground-secondary hover:text-foreground hover:bg-background-tertiary'
                  }`}
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <Icon className="w-5 h-5" />
                  {tab.name}
                </button>
              )
            })}
          </div>
        </div>

        {/* Content */}
        <div className="lg:col-span-3">
          {/* Account Settings */}
          {activeTab === 'account' && (
            <div className="space-y-6 animate-slide-up">
              <div className="card p-6 hover:shadow-2xl transition-all duration-300">
                <h2 className="text-xl font-bold text-foreground mb-6">Profile Information</h2>
                
                <div className="flex items-center gap-6 mb-6 pb-6 border-b border-border">
                  <div className="relative group">
                    {avatarPreview ? (
                      <img 
                        src={avatarPreview} 
                        alt="Avatar"
                        className="w-20 h-20 rounded-full object-cover group-hover:scale-110 transition-all duration-300 animate-pulse-soft"
                      />
                    ) : (
                      <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center text-2xl font-bold text-white group-hover:scale-110 transition-all duration-300 animate-pulse-soft">
                        {getInitials()}
                      </div>
                    )}
                    <label className="absolute bottom-0 right-0 p-2 bg-primary rounded-full cursor-pointer hover:scale-110 transition-all duration-300 shadow-lg">
                      <Camera className="w-4 h-4 text-white" />
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleAvatarSelect}
                        className="hidden"
                      />
                    </label>
                  </div>
                  <div>
                    <label className="btn-primary text-sm cursor-pointer inline-block">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleAvatarSelect}
                        className="hidden"
                      />
                      Change Avatar
                    </label>
                    <p className="text-xs text-foreground-secondary mt-2">JPG, PNG or GIF. Max 2MB.</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2 animate-scale-in" style={{ animationDelay: '50ms' }}>
                      <label className="text-sm font-medium text-foreground">First Name</label>
                      <input
                        type="text"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        className="input-field"
                        disabled={isLoading}
                      />
                    </div>
                    <div className="space-y-2 animate-scale-in" style={{ animationDelay: '100ms' }}>
                      <label className="text-sm font-medium text-foreground">Last Name</label>
                      <input
                        type="text"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        className="input-field"
                        disabled={isLoading}
                      />
                    </div>
                  </div>

                  <div className="space-y-2 animate-scale-in" style={{ animationDelay: '150ms' }}>
                    <label className="text-sm font-medium text-foreground">Email</label>
                    <input
                      type="email"
                      value={email}
                      className="input-field bg-background-tertiary"
                      disabled
                      readOnly
                    />
                    <p className="text-xs text-foreground-secondary">Email cannot be changed</p>
                  </div>

                  <div className="space-y-2 animate-scale-in" style={{ animationDelay: '200ms' }}>
                    <label className="text-sm font-medium text-foreground">Bio</label>
                    <textarea
                      rows={3}
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      className="input-field resize-none"
                      disabled={isLoading}
                      placeholder="Tell us about yourself..."
                    />
                  </div>
                </div>

                <div className="flex gap-3 mt-6">
                  <button 
                    onClick={handleSaveProfile}
                    disabled={isSaving || isLoading}
                    className="btn-primary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSaving ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        Save Changes
                      </>
                    )}
                  </button>
                  <button 
                    onClick={loadUser}
                    disabled={isLoading}
                    className="btn-secondary"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Instagram Settings */}
          {activeTab === 'instagram' && (
            <div className="space-y-6 animate-slide-up">
              {/* Connection Status Card */}
              <div className="card p-6 hover:shadow-2xl transition-all duration-300">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-3 bg-gradient-to-br from-purple-500 via-pink-500 to-orange-500 rounded-xl">
                    <Instagram className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-foreground">Instagram Connection</h2>
                    <p className="text-sm text-foreground-secondary">Connect your Instagram Business account to post content</p>
                  </div>
                </div>

                {igUsername ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 p-4 bg-green-500/10 border border-green-500/30 rounded-xl animate-scale-in">
                      <CheckCircle className="w-6 h-6 text-green-500" />
                      <div>
                        <p className="font-medium text-foreground">Connected to Instagram</p>
                        <p className="text-sm text-foreground-secondary">@{igUsername}</p>
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <button
                        onClick={handleDisconnectInstagram}
                        className="px-4 py-2 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white rounded-lg font-medium transition-all duration-300 flex items-center gap-2"
                      >
                        <XCircle className="w-4 h-4" />
                        Disconnect
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="p-4 bg-background-tertiary rounded-xl">
                      <p className="text-sm text-foreground-secondary mb-3">
                        Connect your Instagram Business or Creator account to:
                      </p>
                      <ul className="space-y-2 text-sm text-foreground">
                        <li className="flex items-center gap-2">
                          <CheckCircle className="w-4 h-4 text-primary" />
                          Post AI-generated photos and videos
                        </li>
                        <li className="flex items-center gap-2">
                          <CheckCircle className="w-4 h-4 text-primary" />
                          Share Reels and Stories
                        </li>
                        <li className="flex items-center gap-2">
                          <CheckCircle className="w-4 h-4 text-primary" />
                          View analytics and insights
                        </li>
                        <li className="flex items-center gap-2">
                          <CheckCircle className="w-4 h-4 text-primary" />
                          Manage comments
                        </li>
                      </ul>
                    </div>

                    <button
                      onClick={handleConnectInstagram}
                      disabled={igConnecting}
                      className="btn-primary flex items-center gap-2 bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500 hover:from-purple-600 hover:via-pink-600 hover:to-orange-600"
                    >
                      {igConnecting ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          Connecting...
                        </>
                      ) : (
                        <>
                          <Instagram className="w-5 h-5" />
                          Connect Instagram Account
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>

              {/* Requirements Card */}
              <div className="card p-6 hover:shadow-2xl transition-all duration-300 animate-scale-in" style={{ animationDelay: '100ms' }}>
                <h3 className="text-lg font-semibold text-foreground mb-4">⚠️ Requirements (Read Before Connecting)</h3>
                <div className="space-y-3">
                  <div className="flex items-start gap-3 p-3 bg-background-tertiary rounded-lg">
                    <div className="p-1.5 bg-primary/20 rounded-full mt-0.5">
                      <CheckCircle className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">Step 1: Instagram Business/Creator Account</p>
                      <p className="text-sm text-foreground-secondary">Personal accounts are NOT supported by Instagram API</p>
                      <p className="text-xs text-foreground-muted mt-1">Instagram App → Settings → Account → Switch to Professional Account</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 bg-background-tertiary rounded-lg">
                    <div className="p-1.5 bg-primary/20 rounded-full mt-0.5">
                      <CheckCircle className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">Step 2: Create a Facebook Page</p>
                      <p className="text-sm text-foreground-secondary">You need a Facebook Page (not a profile)</p>
                      <p className="text-xs text-foreground-muted mt-1">Go to facebook.com/pages/create to create one</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 bg-background-tertiary rounded-lg">
                    <div className="p-1.5 bg-primary/20 rounded-full mt-0.5">
                      <CheckCircle className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">Step 3: Connect Instagram to Facebook Page</p>
                      <p className="text-sm text-foreground-secondary">Link your Instagram Business account to your Facebook Page</p>
                      <p className="text-xs text-foreground-muted mt-1">Facebook Page → Settings → Linked Accounts → Instagram → Connect</p>
                    </div>
                  </div>
                </div>
                
                <div className="flex flex-col gap-2 mt-4">
                  <a 
                    href="https://help.instagram.com/502981923235522" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
                  >
                    📱 How to switch to a Business account
                    <ExternalLink className="w-4 h-4" />
                  </a>
                  <a 
                    href="https://www.facebook.com/business/help/898752960195806" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
                  >
                    🔗 How to connect Instagram to Facebook Page
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              </div>

              {/* Troubleshooting Card */}
              <div className="card p-6 hover:shadow-2xl transition-all duration-300 animate-scale-in border-orange-500/30" style={{ animationDelay: '150ms' }}>
                <h3 className="text-lg font-semibold text-foreground mb-4">🔧 Troubleshooting</h3>
                <div className="space-y-3">
                  <div className="p-3 bg-orange-500/10 border border-orange-500/20 rounded-lg">
                    <p className="font-medium text-orange-400 text-sm">Error: &quot;No Instagram Business account found&quot;</p>
                    <p className="text-sm text-foreground-secondary mt-2">This means:</p>
                    <ul className="text-xs text-foreground-muted mt-1 space-y-1 ml-4 list-disc">
                      <li>Your Instagram account is still a Personal account, OR</li>
                      <li>Your Instagram is not connected to any Facebook Page, OR</li>
                      <li>You didn&apos;t select the correct Facebook Page during authorization</li>
                    </ul>
                    <p className="text-xs text-foreground-secondary mt-2">
                      <strong>Solution:</strong> Complete all 3 steps above, then try connecting again.
                    </p>
                  </div>
                  <div className="p-3 bg-background-tertiary rounded-lg">
                    <p className="font-medium text-foreground text-sm">Still having issues?</p>
                    <p className="text-xs text-foreground-secondary mt-1">
                      Make sure you&apos;re logging into the same Facebook account that owns the Page connected to your Instagram.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Notifications */}
          {activeTab === 'notifications' && (
            <div className="card p-6 animate-slide-up hover:shadow-2xl transition-all duration-300">
              <h2 className="text-xl font-bold text-foreground mb-6">Notification Preferences</h2>
              
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-semibold text-foreground mb-3">Post Activity</h3>
                  <div className="space-y-3">
                    {[
                      { label: 'New comments on posts', description: 'Get notified when someone comments' },
                      { label: 'New likes on posts', description: 'Get notified when someone likes your post' },
                      { label: 'Post published', description: 'Confirm when scheduled posts go live' },
                    ].map((item, idx) => (
                      <div 
                        key={idx} 
                        className="flex items-center justify-between animate-scale-in hover:scale-[1.02] transition-all duration-300"
                        style={{ animationDelay: `${idx * 50}ms` }}
                      >
                        <div>
                          <p className="text-sm font-medium text-foreground">{item.label}</p>
                          <p className="text-xs text-foreground-secondary mt-1">{item.description}</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer group">
                          <input type="checkbox" className="sr-only peer" defaultChecked={idx === 0} />
                          <div className="w-11 h-6 bg-background-tertiary peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary group-hover:scale-110 peer-checked:shadow-lg peer-checked:shadow-primary/50"></div>
                        </label>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="border-t border-border pt-6">
                  <h3 className="text-sm font-semibold text-foreground mb-3">AI Video Generation</h3>
                  <div className="space-y-3">
                    {[
                      { label: 'Video generation complete', description: 'Alert when AI finishes generating video' },
                      { label: 'Generation failed', description: 'Notify if video generation encounters errors' },
                    ].map((item, idx) => (
                      <div 
                        key={idx} 
                        className="flex items-center justify-between animate-scale-in hover:scale-[1.02] transition-all duration-300"
                        style={{ animationDelay: `${(idx + 3) * 50}ms` }}
                      >
                        <div>
                          <p className="text-sm font-medium text-foreground">{item.label}</p>
                          <p className="text-xs text-foreground-secondary mt-1">{item.description}</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer group">
                          <input type="checkbox" className="sr-only peer" defaultChecked />
                          <div className="w-11 h-6 bg-background-tertiary peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary group-hover:scale-110 peer-checked:shadow-lg peer-checked:shadow-primary/50"></div>
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Appearance */}
          {activeTab === 'appearance' && (
            <div className="card p-6 animate-slide-up hover:shadow-2xl transition-all duration-300">
              <h2 className="text-xl font-bold text-foreground mb-6">Appearance Settings</h2>
              
              <div className="space-y-6">
                <div>
                  <label className="text-sm font-medium text-foreground mb-3 block">Theme</label>
                  <div className="grid grid-cols-3 gap-4">
                    {[
                      { id: 'dark', name: 'Dark', active: true },
                      { id: 'light', name: 'Light', active: false },
                      { id: 'auto', name: 'Auto', active: false },
                    ].map((theme, index) => (
                      <button
                        key={theme.id}
                        className={`p-4 rounded-lg border-2 transition-all duration-300 hover:scale-105 animate-scale-in ${
                          theme.active
                            ? 'border-primary bg-primary/10 shadow-lg'
                            : 'border-border hover:border-border/60'
                        }`}
                        style={{ animationDelay: `${index * 50}ms` }}
                      >
                        <div className="w-full aspect-video bg-background-tertiary rounded mb-2"></div>
                        <p className="text-sm font-medium text-foreground">{theme.name}</p>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="animate-scale-in" style={{ animationDelay: '150ms' }}>
                  <label className="text-sm font-medium text-foreground mb-3 block">Accent Color</label>
                  <div className="flex gap-3">
                    {['#3b82f6', '#60a5fa', '#93c5fd'].map((color, index) => (
                      <button
                        key={color}
                        className="w-12 h-12 rounded-lg border-2 border-border hover:border-white transition-all duration-300 hover:scale-110 animate-scale-in"
                        style={{ 
                          backgroundColor: color,
                          animationDelay: `${index * 50}ms`
                        }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Security */}
          {activeTab === 'security' && (
            <div className="space-y-6 animate-slide-up">
              <div className="card p-6 hover:shadow-2xl transition-all duration-300">
                <h2 className="text-xl font-bold text-foreground mb-6">Change Password</h2>
                
                <div className="space-y-4">
                  <div className="space-y-2 animate-scale-in">
                    <label className="text-sm font-medium text-foreground">Current Password</label>
                    <input
                      type="password"
                      className="input-field"
                    />
                  </div>
                  <div className="space-y-2 animate-scale-in" style={{ animationDelay: '50ms' }}>
                    <label className="text-sm font-medium text-foreground">New Password</label>
                    <input
                      type="password"
                      className="input-field"
                    />
                  </div>
                  <div className="space-y-2 animate-scale-in" style={{ animationDelay: '100ms' }}>
                    <label className="text-sm font-medium text-foreground">Confirm New Password</label>
                    <input
                      type="password"
                      className="input-field"
                    />
                  </div>
                </div>

                <button className="mt-6 btn-primary">
                  Update Password
                </button>
              </div>

              <div className="card p-6 border-red-500/50 hover:border-red-500 transition-all duration-300 animate-scale-in hover:shadow-2xl" style={{ animationDelay: '150ms' }}>
                <h2 className="text-xl font-bold text-red-500 mb-2">Danger Zone</h2>
                <p className="text-sm text-foreground-secondary mb-4">Irreversible actions</p>
                
                <button className="px-6 py-2 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white rounded-lg font-medium transition-all duration-300 hover:scale-105 active:scale-95">
                  Delete Account
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
