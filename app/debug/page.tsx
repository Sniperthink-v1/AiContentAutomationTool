'use client'

import { useState } from 'react'

export default function DebugPage() {
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const testGetUser = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/user')
      const data = await response.json()
      console.log('GET /api/user:', data)
      setResult({ endpoint: 'GET /api/user', data })
    } catch (error: any) {
      console.error('Error:', error)
      setResult({ endpoint: 'GET /api/user', error: error.message })
    } finally {
      setLoading(false)
    }
  }

  const testUpdateUser = async () => {
    setLoading(true)
    try {
      // First get the user
      const getResponse = await fetch('/api/user')
      const getUserData = await getResponse.json()
      
      if (!getUserData.success) {
        throw new Error('Failed to get user')
      }

      const userId = getUserData.user.id

      // Now update
      const response = await fetch('/api/user/update', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          firstName: 'Test',
          lastName: 'User',
          bio: 'Updated via debug page at ' + new Date().toLocaleTimeString()
        })
      })
      const data = await response.json()
      console.log('PUT /api/user/update:', data)
      setResult({ endpoint: 'PUT /api/user/update', data })
    } catch (error: any) {
      console.error('Error:', error)
      setResult({ endpoint: 'PUT /api/user/update', error: error.message })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-foreground mb-8">API Debug Page</h1>
        
        <div className="space-y-4">
          <button
            onClick={testGetUser}
            disabled={loading}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Testing...' : 'Test GET /api/user'}
          </button>

          <button
            onClick={testUpdateUser}
            disabled={loading}
            className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed ml-4"
          >
            {loading ? 'Testing...' : 'Test PUT /api/user/update'}
          </button>
        </div>

        {result && (
          <div className="mt-8 p-6 bg-gray-800 rounded-lg">
            <h2 className="text-xl font-bold text-white mb-4">
              {result.endpoint}
            </h2>
            <pre className="text-sm text-green-400 overflow-auto">
              {JSON.stringify(result.data || result.error, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  )
}
