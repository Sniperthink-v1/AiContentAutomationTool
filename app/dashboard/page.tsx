'use client'

import { useEffect, useState } from 'react'
import {
  TrendingUp,
  Users,
  Heart,
  Eye,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  Video,
  Image as ImageIcon,
  ImagePlus
} from 'lucide-react'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts'
import { formatNumber, formatPercentage } from '@/lib/utils'

type DashboardResponse = {
  connected: boolean
  stats: {
    followers: number
    engagementRate: number
    reach: number
    postsThisWeek: number
  }
  followerData: Array<{ date: string; followers: number }>
  engagementData: Array<{ date: string; likes: number; comments: number; shares: number }>
  recentPosts: Array<{
    id: string
    caption: string
    likes: number
    comments: number
    engagement: number
    thumbnailUrl: string
  }>
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [range, setRange] = useState('last_month')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')

  useEffect(() => {
    let isMounted = true

    const loadDashboard = async () => {
      try {
        setLoading(true)
        const params = new URLSearchParams({ range })
        if (range === 'custom') {
          if (!customFrom || !customTo) {
            setLoading(false)
            return
          }
          params.set('from', customFrom)
          params.set('to', customTo)
        }
        const response = await fetch(`/api/instagram/dashboard?${params.toString()}`)
        const payload = await response.json()
        if (!response.ok) {
          throw new Error(payload?.error || 'Failed to load dashboard')
        }
        if (isMounted) {
          setData(payload)
          setError(null)
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err?.message || 'Failed to load dashboard')
        }
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    loadDashboard()
    return () => {
      isMounted = false
    }
  }, [range, customFrom, customTo])

  const statsData = data?.stats || {
    followers: 0,
    engagementRate: 0,
    reach: 0,
    postsThisWeek: 0,
  }
  const followerData = data?.followerData || []
  const engagementData = data?.engagementData || []
  const recentPosts = data?.recentPosts || []
  const emptyState = !loading && data?.connected === false

  const postsLabel = range === 'last_week' ? 'Posts This Week' : 'Posts In Range'
  const stats = [
    {
      name: 'Total Followers',
      value: statsData.followers,
      change: 'Live',
      icon: Users,
      color: 'text-primary',
      bgColor: 'bg-primary/10'
    },
    {
      name: 'Engagement Rate',
      value: `${statsData.engagementRate}%`,
      change: 'Live',
      icon: Heart,
      color: 'text-primary',
      bgColor: 'bg-primary/10'
    },
    {
      name: 'Total Reach',
      value: statsData.reach,
      change: 'Live',
      icon: Eye,
      color: 'text-primary',
      bgColor: 'bg-primary/10'
    },
    {
      name: postsLabel,
      value: statsData.postsThisWeek,
      change: 'Live',
      icon: ImageIcon,
      color: 'text-primary',
      bgColor: 'bg-primary/10'
    },
  ]

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between animate-slide-down">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
          <p className="text-foreground-secondary mt-1">Welcome back! Here&apos;s your social media overview.</p>
        </div>
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-foreground-secondary" />
          <select
            className="btn-secondary"
            value={range}
            onChange={(event) => setRange(event.target.value)}
          >
            <option value="last_week">Last week</option>
            <option value="last_month">Last 30 days</option>
            <option value="last_6_months">Last 6 months</option>
            <option value="last_year">Last 1 year</option>
            <option value="custom">Custom range</option>
          </select>
          {range === 'custom' && (
            <>
              <input
                type="date"
                className="btn-secondary"
                value={customFrom}
                onChange={(event) => setCustomFrom(event.target.value)}
              />
              <input
                type="date"
                className="btn-secondary"
                value={customTo}
                onChange={(event) => setCustomTo(event.target.value)}
              />
            </>
          )}
        </div>
      </div>

      {error && (
        <div className="card p-4 text-sm text-red-500 border border-red-500/20">
          {error}
        </div>
      )}

      {loading && (
        <div className="card p-6 text-sm text-foreground-secondary">
          Loading dashboard...
        </div>
      )}

      {emptyState && (
        <div className="card p-6 text-sm text-foreground-secondary">
          Connect your Instagram account to see your dashboard data.{' '}
          <a href="/dashboard/settings" className="text-primary underline">
            Go to Settings
          </a>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => {
          const Icon = stat.icon
          const numericChange =
            typeof stat.change === 'number' ? stat.change : null
          const isNumericChange = numericChange !== null
          const isPositive = isNumericChange && numericChange > 0
          const TrendIcon = isPositive ? ArrowUpRight : ArrowDownRight

          return (
            <div
              key={stat.name}
              className="stat-card group"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="flex items-start justify-between">
                <div className={`p-3 rounded-lg ${stat.bgColor} transition-all duration-300 group-hover:scale-110`}>
                  <Icon className={`w-6 h-6 ${stat.color}`} />
                </div>
                {isNumericChange ? (
                  <div className={`flex items-center gap-1 text-sm font-medium ${isPositive ? 'text-primary' : 'text-foreground-muted'} transition-all duration-300`}>
                    <TrendIcon className="w-4 h-4" />
                    {formatPercentage(Math.abs(numericChange))}
                  </div>
                ) : (
                  <div className="flex items-center gap-1 text-sm font-medium text-primary transition-all duration-300">
                    <ArrowUpRight className="w-4 h-4" />
                    {stat.change}
                  </div>
                )}
              </div>
              <div className="mt-4">
                <h3 className="text-2xl font-bold text-foreground transition-all duration-300 group-hover:text-primary">
                  {typeof stat.value === 'number' ? formatNumber(stat.value) : stat.value}
                </h3>
                <p className="text-sm text-foreground-secondary mt-1">{stat.name}</p>
              </div>
            </div>
          )
        })}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Follower Growth */}
        <div className="card p-6 animate-slide-up hover:shadow-2xl transition-all duration-300">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold text-foreground">Follower Growth</h2>
              <p className="text-sm text-foreground-secondary mt-1">Selected range</p>
            </div>
            <TrendingUp className="w-5 h-5 text-primary animate-bounce-soft" />
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={followerData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f1f1f" />
              <XAxis dataKey="date" stroke="#737373" />
              <YAxis stroke="#737373" />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0a0a0a',
                  border: '1px solid #1f1f1f',
                  borderRadius: '8px',
                  color: '#ffffff'
                }}
              />
              <Line
                type="monotone"
                dataKey="followers"
                stroke="#3b82f6"
                strokeWidth={3}
                dot={{ fill: '#3b82f6', r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Engagement Stats */}
        <div className="card p-6 animate-slide-up hover:shadow-2xl transition-all duration-300" style={{ animationDelay: '100ms' }}>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold text-foreground">Engagement Overview</h2>
              <p className="text-sm text-foreground-secondary mt-1">Range performance</p>
            </div>
            <Heart className="w-5 h-5 text-primary animate-pulse-soft" />
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={engagementData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f1f1f" />
              <XAxis dataKey="date" stroke="#737373" />
              <YAxis stroke="#737373" />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0a0a0a',
                  border: '1px solid #1f1f1f',
                  borderRadius: '8px',
                  color: '#ffffff'
                }}
              />
              <Legend />
              <Bar dataKey="likes" fill="#3b82f6" radius={[8, 8, 0, 0]} />
              <Bar dataKey="comments" fill="#60a5fa" radius={[8, 8, 0, 0]} />
              <Bar dataKey="shares" fill="#93c5fd" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent Posts */}
      <div className="card p-6 animate-slide-up" style={{ animationDelay: '200ms' }}>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-foreground">Top Performing Posts</h2>
            <p className="text-sm text-foreground-secondary mt-1">Your best content this week</p>
          </div>
          <button className="text-sm text-primary hover:text-primary-hover font-medium transition-all duration-300 hover:translate-x-1">
            View All →
          </button>
        </div>
        {recentPosts.length === 0 ? (
          <div className="text-sm text-foreground-secondary">No post data yet.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {recentPosts.map((post, index) => (
              <div
                key={post.id}
                className="card-hover p-4 rounded-lg border border-border group cursor-pointer animate-scale-in"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="aspect-square bg-background-tertiary rounded-lg flex items-center justify-center text-6xl mb-4 group-hover:scale-105 transition-transform overflow-hidden">
                  {post.thumbnailUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={post.thumbnailUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span>📷</span>
                  )}
                </div>
                <p className="text-sm text-foreground font-medium mb-3 line-clamp-2">{post.caption}</p>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-foreground-secondary">Likes</span>
                    <span className="text-foreground font-medium">{formatNumber(post.likes)}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-foreground-secondary">Comments</span>
                    <span className="text-foreground font-medium">{post.comments}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-foreground-secondary">Engagement</span>
                    <span className="text-primary font-medium">{post.engagement}%</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { icon: ImagePlus, title: 'Generate AI Photo', desc: 'Create stunning images with AI-powered Gemini', color: 'primary', link: '/dashboard/ai-photos' },
          { icon: Video, title: 'Generate AI Video', desc: 'Create engaging video content with AI assistance', color: 'primary', link: '/dashboard/ai-video' },
          { icon: ImageIcon, title: 'Schedule Post', desc: 'Plan and schedule your Instagram content', color: 'primary', link: '/dashboard/posts' },
        ].map((action, index) => (
          <a
            key={action.title}
            href={action.link}
            className="card card-hover p-6 cursor-pointer group animate-scale-in block"
            style={{ animationDelay: `${index * 100}ms` }}
          >
            <div className={`w-12 h-12 rounded-lg bg-${action.color}/10 flex items-center justify-center mb-4 group-hover:scale-110 group-hover:rotate-6 transition-all duration-300`}>
              <action.icon className={`w-6 h-6 text-${action.color}`} />
            </div>
            <h3 className="text-lg font-bold text-foreground mb-2 group-hover:text-primary transition-colors duration-300">{action.title}</h3>
            <p className="text-sm text-foreground-secondary">{action.desc}</p>
          </a>
        ))}
      </div>
    </div>
  )
}
