'use client'

import { 
  TrendingUp, 
  Users, 
  Heart, 
  Eye,
  ArrowUpRight,
  ArrowDownRight,
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

// Sample data
const followerData = [
  { date: 'Mon', followers: 4200 },
  { date: 'Tue', followers: 4350 },
  { date: 'Wed', followers: 4500 },
  { date: 'Thu', followers: 4650 },
  { date: 'Fri', followers: 4900 },
  { date: 'Sat', followers: 5200 },
  { date: 'Sun', followers: 5500 },
]

const engagementData = [
  { date: 'Mon', likes: 320, comments: 45, shares: 12 },
  { date: 'Tue', likes: 380, comments: 52, shares: 18 },
  { date: 'Wed', likes: 420, comments: 61, shares: 22 },
  { date: 'Thu', likes: 390, comments: 48, shares: 15 },
  { date: 'Fri', likes: 510, comments: 72, shares: 28 },
  { date: 'Sat', likes: 680, comments: 95, shares: 42 },
  { date: 'Sun', likes: 720, comments: 108, shares: 51 },
]

const recentPosts = [
  { id: 1, image: '🌅', caption: 'Beautiful sunset vibes', likes: 1240, comments: 89, engagement: 8.2 },
  { id: 2, image: '🎨', caption: 'New art collection drop', likes: 2130, comments: 156, engagement: 12.5 },
  { id: 3, image: '☕', caption: 'Morning coffee routine', likes: 890, comments: 45, engagement: 6.1 },
  { id: 4, image: '🏃', caption: 'Fitness motivation', likes: 1650, comments: 98, engagement: 9.8 },
]

const stats = [
  { 
    name: 'Total Followers', 
    value: 5500, 
    change: 12.5, 
    icon: Users, 
    color: 'text-primary',
    bgColor: 'bg-primary/10'
  },
  { 
    name: 'Engagement Rate', 
    value: '8.2%', 
    change: 3.2, 
    icon: Heart, 
    color: 'text-primary',
    bgColor: 'bg-primary/10'
  },
  { 
    name: 'Total Reach', 
    value: 125000, 
    change: -2.4, 
    icon: Eye, 
    color: 'text-primary',
    bgColor: 'bg-primary/10'
  },
  { 
    name: 'Posts This Week', 
    value: 7, 
    change: 16.7, 
    icon: ImageIcon, 
    color: 'text-primary',
    bgColor: 'bg-primary/10'
  },
]

export default function DashboardPage() {
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between animate-slide-down">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
          <p className="text-foreground-secondary mt-1">Welcome back! Here&apos;s your social media overview.</p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => {
          const Icon = stat.icon
          const isPositive = stat.change > 0
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
                <div className={`flex items-center gap-1 text-sm font-medium ${isPositive ? 'text-primary' : 'text-foreground-muted'} transition-all duration-300`}>
                  <TrendIcon className="w-4 h-4" />
                  {formatPercentage(Math.abs(stat.change))}
                </div>
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
              <p className="text-sm text-foreground-secondary mt-1">Last 7 days</p>
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
              <p className="text-sm text-foreground-secondary mt-1">Weekly performance</p>
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {recentPosts.map((post, index) => (
            <div 
              key={post.id} 
              className="card-hover p-4 rounded-lg border border-border group cursor-pointer animate-scale-in"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="aspect-square bg-background-tertiary rounded-lg flex items-center justify-center text-6xl mb-4 group-hover:scale-105 transition-transform">
                {post.image}
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
