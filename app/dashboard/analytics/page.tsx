'use client'

import { useEffect, useState } from 'react'
import {
  TrendingUp,
  Users,
  Heart,
  Eye,
  Calendar,
  ArrowUpRight
} from 'lucide-react'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts'
import { formatNumber } from '@/lib/utils'

type AnalyticsResponse = {
  connected: boolean
  profile?: {
    username: string
    followers: number
    mediaCount: number
    profilePictureUrl: string
  }
  overview: {
    followers: number
    engagementRate: number
    reach: number
    impressions: number
  }
  growth: Array<{ period: string; posts: number; engagement: number }>
  contentDistribution: Array<{ name: string; value: number; color: string }>
  topPosts: Array<{
    id: string
    caption: string
    likes: number
    comments: number
    shares: number
    engagement: number
    thumbnailUrl: string
  }>
  audience: Array<{ age: string; male: number; female: number }>
}

const RANGE_OPTIONS = [
  { value: 'last_week', label: 'Last week' },
  { value: 'last_month', label: 'Last 30 days' },
  { value: 'last_6_months', label: 'Last 6 months' },
  { value: 'last_year', label: 'Last 1 year' },
  { value: 'custom', label: 'Custom range' },
]

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [range, setRange] = useState('last_month')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')

  useEffect(() => {
    let isMounted = true

    const loadAnalytics = async () => {
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
        const response = await fetch(`/api/instagram/analytics?${params.toString()}`)
        const payload = await response.json()
        if (!response.ok) {
          throw new Error(payload?.error || 'Failed to load analytics')
        }
        if (isMounted) {
          setData(payload)
          setError(null)
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err?.message || 'Failed to load analytics')
        }
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    loadAnalytics()
    return () => {
      isMounted = false
    }
  }, [range, customFrom, customTo])

  const overview = data?.overview || {
    followers: 0,
    engagementRate: 0,
    reach: 0,
    impressions: 0,
  }
  const growthData = data?.growth || []
  const postPerformance = data?.contentDistribution || []
  const topPosts = data?.topPosts || []
  const audienceData = data?.audience || []
  const username = data?.profile?.username || ''

  const hasConnection = data?.connected
  const emptyState = !loading && hasConnection === false

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between animate-slide-down">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Analytics</h1>
          <p className="text-foreground-secondary mt-1">
            Deep insights into your Instagram performance{username ? ` · @${username}` : ''}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-foreground-secondary" />
            <select
              className="btn-secondary"
              value={range}
              onChange={(event) => setRange(event.target.value)}
            >
              {RANGE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          {range === 'custom' && (
            <div className="flex items-center gap-2">
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
            </div>
          )}
          <button className="btn-primary flex items-center gap-2">
            Export Report
          </button>
        </div>
      </div>

      {error && (
        <div className="card p-4 text-sm text-red-500 border border-red-500/20">
          {error}
        </div>
      )}

      {loading && (
        <div className="card p-6 text-sm text-foreground-secondary">
          Loading analytics...
        </div>
      )}

      {emptyState && (
        <div className="card p-6 text-sm text-foreground-secondary">
          Connect your Instagram account to unlock analytics.{' '}
          <a href="/dashboard/settings" className="text-primary underline">
            Go to Settings
          </a>
        </div>
      )}

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          { icon: Users, label: 'Total Followers', value: overview.followers, change: 'Live' },
          { icon: Heart, label: 'Avg Engagement', value: `${overview.engagementRate}%`, change: 'Live' },
          { icon: Eye, label: 'Total Reach', value: overview.reach, change: 'Live' },
          { icon: TrendingUp, label: 'Impressions', value: overview.impressions, change: 'Live' },
        ].map((stat, index) => {
          const Icon = stat.icon
          return (
            <div
              key={stat.label}
              className="stat-card group"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 bg-primary/10 rounded-lg transition-all duration-300 group-hover:scale-110">
                  <Icon className="w-5 h-5 text-primary" />
                </div>
                <div className="flex items-center gap-1 text-primary text-sm font-medium animate-pulse-soft">
                  <ArrowUpRight className="w-4 h-4" />
                  {stat.change}
                </div>
              </div>
              <h3 className="text-2xl font-bold text-foreground group-hover:text-primary transition-colors">
                {typeof stat.value === 'number' ? formatNumber(stat.value) : stat.value}
              </h3>
              <p className="text-sm text-foreground-secondary mt-1">{stat.label}</p>
            </div>
          )
        })}
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Engagement Growth */}
        <div className="lg:col-span-2 card p-6 animate-slide-up hover:shadow-2xl transition-all duration-300">
          <h2 className="text-xl font-bold text-foreground mb-6">Engagement Overview</h2>
          <ResponsiveContainer width="100%" height={350}>
            <LineChart data={growthData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f1f1f" />
              <XAxis dataKey="period" stroke="#737373" />
              <YAxis yAxisId="left" stroke="#737373" />
              <YAxis yAxisId="right" orientation="right" stroke="#737373" />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0a0a0a',
                  border: '1px solid #1f1f1f',
                  borderRadius: '8px',
                  color: '#ffffff'
                }}
              />
              <Legend />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="posts"
                stroke="#3b82f6"
                strokeWidth={3}
                dot={{ fill: '#3b82f6', r: 5 }}
                name="Posts"
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="engagement"
                stroke="#60a5fa"
                strokeWidth={3}
                dot={{ fill: '#60a5fa', r: 5 }}
                name="Engagement"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Content Type Distribution */}
        <div className="card p-6 animate-slide-up hover:shadow-2xl transition-all duration-300" style={{ animationDelay: '100ms' }}>
          <h2 className="text-xl font-bold text-foreground mb-6">Content Distribution</h2>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={postPerformance}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={5}
                dataKey="value"
              >
                {postPerformance.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0a0a0a',
                  border: '1px solid #1f1f1f',
                  borderRadius: '8px',
                  color: '#ffffff'
                }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="mt-4 space-y-2">
            {postPerformance.map((item) => (
              <div key={item.name} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-sm text-foreground-secondary">{item.name}</span>
                </div>
                <span className="text-sm font-medium text-foreground">{item.value}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Audience Demographics */}
      <div className="card p-6 animate-slide-up hover:shadow-2xl transition-all duration-300" style={{ animationDelay: '200ms' }}>
        <h2 className="text-xl font-bold text-foreground mb-6">Audience Demographics</h2>
        {audienceData.length === 0 ? (
          <div className="text-sm text-foreground-secondary">Audience insights are not available yet.</div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={audienceData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f1f1f" />
              <XAxis dataKey="age" stroke="#737373" />
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
              <Bar dataKey="male" fill="#3b82f6" radius={[8, 8, 0, 0]} name="Male" />
              <Bar dataKey="female" fill="#60a5fa" radius={[8, 8, 0, 0]} name="Female" />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Top Performing Posts */}
      <div className="card p-6 animate-slide-up hover:shadow-2xl transition-all duration-300" style={{ animationDelay: '300ms' }}>
        <h2 className="text-xl font-bold text-foreground mb-6">Top Performing Posts</h2>
        {topPosts.length === 0 ? (
          <div className="text-sm text-foreground-secondary">No post analytics available yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4 text-sm font-medium text-foreground-secondary">Post</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-foreground-secondary">Likes</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-foreground-secondary">Comments</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-foreground-secondary">Shares</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-foreground-secondary">Engagement</th>
                </tr>
              </thead>
              <tbody>
                {topPosts.map((post, index) => (
                  <tr
                    key={post.id}
                    className="border-b border-border/50 hover:bg-background-tertiary/50 transition-all duration-300 animate-fade-in"
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-background-tertiary rounded-lg flex items-center justify-center overflow-hidden">
                          {post.thumbnailUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={post.thumbnailUrl} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-xl">📷</span>
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground">{post.caption}</p>
                          <p className="text-xs text-foreground-secondary">Rank #{index + 1}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-right text-sm text-foreground">{formatNumber(post.likes)}</td>
                    <td className="py-4 px-4 text-right text-sm text-foreground">{post.comments}</td>
                    <td className="py-4 px-4 text-right text-sm text-foreground">{post.shares}</td>
                    <td className="py-4 px-4 text-right">
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary rounded text-xs font-medium animate-pulse-soft">
                        <TrendingUp className="w-3 h-3" />
                        {formatNumber(post.engagement)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
