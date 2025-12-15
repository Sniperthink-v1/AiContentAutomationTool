'use client'

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

const followerGrowth = [
  { month: 'Jan', followers: 3200, engagement: 6.2 },
  { month: 'Feb', followers: 3650, engagement: 6.8 },
  { month: 'Mar', followers: 4100, engagement: 7.1 },
  { month: 'Apr', followers: 4400, engagement: 7.5 },
  { month: 'May', followers: 4900, engagement: 7.9 },
  { month: 'Jun', followers: 5500, engagement: 8.2 },
]

const postPerformance = [
  { name: 'Reels', value: 45, color: '#3b82f6' },
  { name: 'Photos', value: 30, color: '#60a5fa' },
  { name: 'Carousels', value: 25, color: '#93c5fd' },
]

const topPosts = [
  { id: 1, thumbnail: '🌅', caption: 'Sunset vibes', likes: 2340, comments: 189, shares: 67, engagement: 12.5 },
  { id: 2, thumbnail: '🎨', caption: 'Art collection', likes: 2130, comments: 156, shares: 42, engagement: 11.8 },
  { id: 3, thumbnail: '☕', caption: 'Morning routine', likes: 1890, comments: 134, shares: 38, engagement: 10.2 },
  { id: 4, thumbnail: '🏃', caption: 'Fitness goals', likes: 1650, comments: 98, shares: 28, engagement: 9.8 },
  { id: 5, thumbnail: '🍕', caption: 'Food lover', likes: 1420, comments: 87, shares: 22, engagement: 8.9 },
]

const audienceData = [
  { age: '13-17', male: 5, female: 8 },
  { age: '18-24', male: 22, female: 28 },
  { age: '25-34', male: 18, female: 12 },
  { age: '35-44', male: 4, female: 3 },
]

export default function AnalyticsPage() {
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between animate-slide-down">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Analytics</h1>
          <p className="text-foreground-secondary mt-1">Deep insights into your Instagram performance</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="btn-secondary flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            Last 30 days
          </button>
          <button className="btn-primary flex items-center gap-2">
            Export Report
          </button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          { icon: Users, label: 'Total Followers', value: 5500, change: '+12.5%' },
          { icon: Heart, label: 'Avg Engagement', value: '8.2%', change: '+8.2%' },
          { icon: Eye, label: 'Total Reach', value: 125000, change: '+15.3%' },
          { icon: TrendingUp, label: 'Impressions', value: 245000, change: '+23.1%' },
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
              <h3 className="text-2xl font-bold text-foreground group-hover:text-primary transition-colors">{typeof stat.value === 'number' ? formatNumber(stat.value) : stat.value}</h3>
              <p className="text-sm text-foreground-secondary mt-1">{stat.label}</p>
            </div>
          )
        })}
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Follower Growth */}
        <div className="lg:col-span-2 card p-6 animate-slide-up hover:shadow-2xl transition-all duration-300">
          <h2 className="text-xl font-bold text-foreground mb-6">Growth Overview</h2>
          <ResponsiveContainer width="100%" height={350}>
            <LineChart data={followerGrowth}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f1f1f" />
              <XAxis dataKey="month" stroke="#737373" />
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
                dataKey="followers" 
                stroke="#3b82f6" 
                strokeWidth={3}
                dot={{ fill: '#3b82f6', r: 5 }}
                name="Followers"
              />
              <Line 
                yAxisId="right"
                type="monotone" 
                dataKey="engagement" 
                stroke="#60a5fa" 
                strokeWidth={3}
                dot={{ fill: '#60a5fa', r: 5 }}
                name="Engagement %"
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
            <Bar dataKey="male" fill="#3b82f6" radius={[8, 8, 0, 0]} name="Male %" />
            <Bar dataKey="female" fill="#60a5fa" radius={[8, 8, 0, 0]} name="Female %" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Top Performing Posts */}
      <div className="card p-6 animate-slide-up hover:shadow-2xl transition-all duration-300" style={{ animationDelay: '300ms' }}>
        <h2 className="text-xl font-bold text-foreground mb-6">Top Performing Posts</h2>
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
                      <div className="w-10 h-10 bg-background-tertiary rounded-lg flex items-center justify-center text-2xl">
                        {post.thumbnail}
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
                      {post.engagement}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
