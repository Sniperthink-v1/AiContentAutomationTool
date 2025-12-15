'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'

export default function Home() {
  const router = useRouter()

  useEffect(() => {
    // Check if user is authenticated
    fetch('/api/auth/me')
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          router.push('/dashboard')
        } else {
          router.push('/login')
        }
      })
      .catch(() => {
        router.push('/login')
      })
  }, [router])

  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="w-12 h-12 text-blue-500 animate-spin mx-auto mb-4" />
        <p className="text-gray-400">Loading...</p>
      </div>
    </div>
  )
}
