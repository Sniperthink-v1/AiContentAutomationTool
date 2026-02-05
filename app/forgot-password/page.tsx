'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Mail, Loader2, Sparkles, ArrowLeft, CheckCircle, KeyRound } from 'lucide-react'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [step, setStep] = useState<'email' | 'otp'>('email')
  const [otp, setOtp] = useState('')
  const [resetToken, setResetToken] = useState('')

  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      const response = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, purpose: 'reset' })
      })

      const data = await response.json()

      if (data.success) {
        setStep('otp')
      } else {
        setError(data.error || 'Failed to send verification code')
      }
    } catch (error) {
      setError('Something went wrong. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      const response = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp, purpose: 'reset' })
      })

      const data = await response.json()

      if (data.success && data.resetToken) {
        setResetToken(data.resetToken)
        setSuccess(true)
        // Redirect to reset password page with token
        window.location.href = `/reset-password?token=${data.resetToken}`
      } else {
        setError(data.error || 'Invalid verification code')
      }
    } catch (error) {
      setError('Something went wrong. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleResendOTP = async () => {
    setError('')
    setIsLoading(true)

    try {
      const response = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, purpose: 'reset' })
      })

      const data = await response.json()

      if (data.success) {
        setError('')
      } else {
        setError(data.error || 'Failed to resend code')
      }
    } catch (error) {
      setError('Something went wrong. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4">
      {/* Background gradient effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-teal/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-golden/10 rounded-full blur-3xl"></div>
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Back Link */}
        <Link
          href="/login"
          className="inline-flex items-center gap-2 text-foreground-secondary hover:text-plum mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Login
        </Link>

        {/* Logo and Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-teal to-primary-hover flex items-center justify-center shadow-lg shadow-teal/50">
              <KeyRound className="w-8 h-8 text-white" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-plum mb-2">Forgot Password?</h1>
          <p className="text-foreground-secondary">
            {step === 'email' 
              ? "Enter your email and we'll send you a verification code" 
              : 'Enter the 6-digit code sent to your email'}
          </p>
        </div>

        {/* Form */}
        <div className="bg-background-secondary backdrop-blur-xl border border-border rounded-2xl p-8 shadow-2xl">
          {step === 'email' ? (
            <form onSubmit={handleSendOTP} className="space-y-6">
              {/* Email Input */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-foreground-muted" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="you@example.com"
                    className="w-full pl-12 pr-4 py-3 bg-white border border-border rounded-lg text-plum placeholder:text-foreground-muted focus:outline-none focus:ring-2 focus:ring-teal/50 focus:border-teal transition-all"
                  />
                </div>
              </div>

              {/* Error Message */}
              {error && (
                <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-3 text-red-600 text-sm">
                  {error}
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 bg-gradient-to-r from-teal to-primary-hover hover:from-primary-hover hover:to-teal text-white rounded-lg font-semibold transition-all duration-300 flex items-center justify-center gap-2 shadow-lg shadow-teal/30 hover:shadow-teal/50 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 disabled:hover:scale-100"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Sending Code...
                  </>
                ) : (
                  <>Send Verification Code</>
                )}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOTP} className="space-y-6">
              {/* OTP Display */}
              <div className="text-center">
                <p className="text-foreground-secondary text-sm mb-4">
                  Code sent to <span className="text-teal">{email}</span>
                </p>
              </div>

              {/* OTP Input */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Verification Code
                </label>
                <input
                  type="text"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  required
                  maxLength={6}
                  placeholder="Enter 6-digit code"
                  className="w-full px-4 py-4 bg-white border border-border rounded-lg text-plum text-center text-2xl tracking-[0.5em] font-mono placeholder:text-foreground-muted placeholder:text-base placeholder:tracking-normal focus:outline-none focus:ring-2 focus:ring-teal/50 focus:border-teal transition-all"
                />
              </div>

              {/* Error Message */}
              {error && (
                <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-3 text-red-600 text-sm">
                  {error}
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading || otp.length !== 6}
                className="w-full py-3 bg-gradient-to-r from-teal to-primary-hover hover:from-primary-hover hover:to-teal text-white rounded-lg font-semibold transition-all duration-300 flex items-center justify-center gap-2 shadow-lg shadow-teal/30 hover:shadow-teal/50 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 disabled:hover:scale-100"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  <>Verify Code</>
                )}
              </button>

              {/* Resend Option */}
              <div className="text-center">
                <p className="text-foreground-muted text-sm">
                  Didn&apos;t receive the code?{' '}
                  <button
                    type="button"
                    onClick={handleResendOTP}
                    disabled={isLoading}
                    className="text-teal hover:text-primary-hover transition-colors disabled:opacity-50"
                  >
                    Resend
                  </button>
                </p>
                <button
                  type="button"
                  onClick={() => setStep('email')}
                  className="text-foreground-secondary hover:text-plum text-sm mt-2 transition-colors"
                >
                  Change email address
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-foreground-muted text-sm mt-8">
          Remember your password?{' '}
          <Link href="/login" className="text-teal hover:text-primary-hover">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
