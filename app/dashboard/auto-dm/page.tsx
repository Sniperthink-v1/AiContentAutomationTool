'use client'

import { useState, useEffect } from 'react'
import { Plus, Trash2, Power, PowerOff, MessageSquare, Eye } from 'lucide-react'
import { useToast } from '@/lib/components/Toast'

interface AutoDMRule {
  id: number
  keyword: string
  dm_message: string
  media_id?: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

interface AutoDMLog {
  id: number
  commenter_username: string
  keyword: string
  dm_message: string
  sent_at: string
}

interface InstagramMedia {
  id: string
  caption?: string
  media_type: string
  media_url: string
  thumbnail_url?: string
  permalink: string
  timestamp: string
}

export default function AutoDMPage() {
  const [rules, setRules] = useState<AutoDMRule[]>([])
  const [logs, setLogs] = useState<AutoDMLog[]>([])
  const [media, setMedia] = useState<InstagramMedia[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingMedia, setIsLoadingMedia] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showLogsModal, setShowLogsModal] = useState(false)
  const [newKeyword, setNewKeyword] = useState('')
  const [newMessage, setNewMessage] = useState('')
  const [selectedMediaId, setSelectedMediaId] = useState<string>('')
  const { showToast } = useToast()

  const loadRules = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/auto-dm/rules')
      const data = await response.json()
      if (data.success) {
        setRules(data.rules)
      }
    } catch (error) {
      console.error('Failed to load rules:', error)
      showToast('Failed to load auto-DM rules', 'error')
    } finally {
      setIsLoading(false)
    }
  }

  const loadMedia = async () => {
    setIsLoadingMedia(true)
    try {
      const response = await fetch('/api/comments/media?limit=20')
      const data = await response.json()
      if (data.success) {
        setMedia(data.media)
      }
    } catch (error) {
      console.error('Failed to load media:', error)
    } finally {
      setIsLoadingMedia(false)
    }
  }

  useEffect(() => {
    loadRules()
  }, [])

  const loadLogs = async () => {
    try {
      const response = await fetch('/api/auto-dm/logs?limit=50')
      const data = await response.json()
      if (data.success) {
        setLogs(data.logs)
        setShowLogsModal(true)
      }
    } catch (error) {
      console.error('Failed to load logs:', error)
      showToast('Failed to load logs', 'error')
    }
  }

  const handleAddRule = async () => {
    if (!newKeyword || !newMessage) {
      showToast('Please enter keyword and message', 'error')
      return
    }

    try {
      const response = await fetch('/api/auto-dm/rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          keyword: newKeyword,
          dmMessage: newMessage,
          mediaId: selectedMediaId || null,
        }),
      })

      const data = await response.json()
      
      if (data.success) {
        showToast('Auto-DM rule created successfully!', 'success')
        setNewKeyword('')
        setNewMessage('')
        setSelectedMediaId('')
        setShowAddModal(false)
        loadRules()
      } else {
        showToast(data.error || 'Failed to create rule', 'error')
      }
    } catch (error) {
      console.error('Failed to create rule:', error)
      showToast('Failed to create rule', 'error')
    }
  }

  const handleToggleRule = async (ruleId: number, isActive: boolean) => {
    try {
      const response = await fetch('/api/auto-dm/rules', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ruleId,
          isActive: !isActive,
        }),
      })

      const data = await response.json()
      
      if (data.success) {
        showToast(`Rule ${!isActive ? 'enabled' : 'disabled'}`, 'success')
        loadRules()
      }
    } catch (error) {
      console.error('Failed to toggle rule:', error)
      showToast('Failed to update rule', 'error')
    }
  }

  const handleDeleteRule = async (ruleId: number) => {
    if (!confirm('Are you sure you want to delete this rule?')) return

    try {
      const response = await fetch(`/api/auto-dm/rules?ruleId=${ruleId}`, {
        method: 'DELETE',
      })

      const data = await response.json()
      
      if (data.success) {
        showToast('Rule deleted successfully', 'success')
        loadRules()
      }
    } catch (error) {
      console.error('Failed to delete rule:', error)
      showToast('Failed to delete rule', 'error')
    }
  }

  return (
    <div className="min-h-screen bg-background-primary p-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">Auto-DM Rules</h1>
            <p className="text-foreground-secondary">
              Automatically send DMs when people comment with specific keywords
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={loadLogs}
              className="px-4 py-2 bg-background-secondary hover:bg-background-tertiary text-foreground rounded-lg flex items-center gap-2 transition-colors"
            >
              <Eye className="w-4 h-4" />
              View Logs
            </button>
            <button
              onClick={() => {
                setShowAddModal(true)
                loadMedia()
              }}
              className="px-4 py-2 bg-primary hover:bg-primary-hover text-primary-foreground rounded-lg flex items-center gap-2 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Rule
            </button>
          </div>
        </div>

        {/* Info Box */}
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 mb-6">
          <h3 className="font-semibold text-blue-400 mb-2">📌 How it works:</h3>
          <ul className="text-sm text-foreground-secondary space-y-1">
            <li>• When someone comments with your trigger keyword, they&apos;ll automatically receive a DM</li>
            <li>• Choose &quot;All Posts&quot; for global keywords, or select a specific post/reel</li>
            <li>• Keywords are case-insensitive (e.g., &quot;LINK&quot; matches &quot;link&quot;, &quot;Link&quot;, etc.)</li>
            <li>• Each comment triggers only ONE rule (first match)</li>
          </ul>
        </div>

        {/* Rules List */}
        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-foreground-secondary">Loading rules...</p>
          </div>
        ) : rules.length === 0 ? (
          <div className="text-center py-12 bg-background-secondary rounded-lg">
            <MessageSquare className="w-16 h-16 text-foreground-tertiary mx-auto mb-4" />
            <p className="text-foreground-secondary mb-4">No auto-DM rules yet</p>
            <button
              onClick={() => setShowAddModal(true)}
              className="px-6 py-2 bg-primary hover:bg-primary-hover text-primary-foreground rounded-lg transition-colors"
            >
              Create Your First Rule
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {rules.map((rule) => (
              <div
                key={rule.id}
                className="bg-background-secondary border border-border rounded-lg p-6 hover:border-primary/50 transition-colors"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="px-3 py-1 bg-primary/20 text-primary rounded-full text-sm font-medium">
                        {rule.keyword}
                      </span>
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                        rule.is_active 
                          ? 'bg-green-500/20 text-green-400' 
                          : 'bg-gray-500/20 text-gray-400'
                      }`}>
                        {rule.is_active ? 'Active' : 'Disabled'}
                      </span>
                      {rule.media_id ? (
                        <span className="px-3 py-1 bg-purple-500/20 text-purple-400 rounded-full text-sm font-medium">
                          Specific Post
                        </span>
                      ) : (
                        <span className="px-3 py-1 bg-blue-500/20 text-blue-400 rounded-full text-sm font-medium">
                          All Posts
                        </span>
                      )}
                    </div>
                    <p className="text-foreground-secondary text-sm">
                      Created: {new Date(rule.created_at).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleToggleRule(rule.id, rule.is_active)}
                      className={`p-2 rounded-lg transition-colors ${
                        rule.is_active
                          ? 'bg-green-500/20 hover:bg-green-500/30 text-green-400'
                          : 'bg-gray-500/20 hover:bg-gray-500/30 text-gray-400'
                      }`}
                      title={rule.is_active ? 'Disable rule' : 'Enable rule'}
                    >
                      {rule.is_active ? <Power className="w-4 h-4" /> : <PowerOff className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={() => handleDeleteRule(rule.id)}
                      className="p-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition-colors"
                      title="Delete rule"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div className="bg-background-primary rounded-lg p-4">
                  <p className="text-sm text-foreground-tertiary mb-1">Auto-Reply Message:</p>
                  <p className="text-foreground whitespace-pre-wrap">{rule.dm_message}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Add Rule Modal */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-background-secondary rounded-xl shadow-2xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
              <h2 className="text-2xl font-bold text-foreground mb-6">Add Auto-DM Rule</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Apply to
                  </label>
                  <select
                    value={selectedMediaId}
                    onChange={(e) => setSelectedMediaId(e.target.value)}
                    className="w-full px-4 py-2 bg-background-primary border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="">All Posts (Global)</option>
                    {isLoadingMedia ? (
                      <option disabled>Loading posts...</option>
                    ) : (
                      media.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.media_type} - {item.caption?.slice(0, 50) || 'No caption'} ({new Date(item.timestamp).toLocaleDateString()})
                        </option>
                      ))
                    )}
                  </select>
                  <p className="text-xs text-foreground-tertiary mt-1">
                    Choose &quot;All Posts&quot; or select a specific post/reel
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Trigger Keyword
                  </label>
                  <input
                    type="text"
                    value={newKeyword}
                    onChange={(e) => setNewKeyword(e.target.value)}
                    placeholder="e.g., link, price, info"
                    className="w-full px-4 py-2 bg-background-primary border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  <p className="text-xs text-foreground-tertiary mt-1">
                    When someone comments this word, they&apos;ll get a DM
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    DM Message
                  </label>
                  <textarea
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Hi! Thanks for your interest! Check out: https://..."
                    rows={4}
                    className="w-full px-4 py-2 bg-background-primary border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                  />
                  <p className="text-xs text-foreground-tertiary mt-1">
                    This message will be sent automatically
                  </p>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => {
                    setShowAddModal(false)
                    setNewKeyword('')
                    setNewMessage('')
                    setSelectedMediaId('')
                  }}
                  className="flex-1 px-4 py-2 bg-background-tertiary hover:bg-background-primary text-foreground rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddRule}
                  className="flex-1 px-4 py-2 bg-primary hover:bg-primary-hover text-primary-foreground rounded-lg transition-colors"
                >
                  Create Rule
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Logs Modal */}
        {showLogsModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-background-secondary rounded-xl shadow-2xl max-w-4xl w-full p-6 max-h-[80vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-foreground">Auto-DM Logs</h2>
                <button
                  onClick={() => setShowLogsModal(false)}
                  className="p-2 hover:bg-background-tertiary rounded-lg transition-colors"
                >
                  ✕
                </button>
              </div>
              
              {logs.length === 0 ? (
                <p className="text-center text-foreground-secondary py-8">No DMs sent yet</p>
              ) : (
                <div className="space-y-3">
                  {logs.map((log) => (
                    <div key={log.id} className="bg-background-primary rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <span className="font-medium text-foreground">@{log.commenter_username}</span>
                          <span className="text-foreground-tertiary text-sm ml-2">
                            triggered by: <span className="text-primary">{log.keyword}</span>
                          </span>
                        </div>
                        <span className="text-xs text-foreground-tertiary">
                          {new Date(log.sent_at).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-sm text-foreground-secondary">{log.dm_message}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
