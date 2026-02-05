'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Mail, Lock, Eye, EyeOff, Loader2, Sparkles, KeyRound } from 'lucide-react'

type LoginMode = 'password' | 'otp'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [otp, setOtp] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [loginMode, setLoginMode] = useState<LoginMode>('password')
  const [otpSent, setOtpSent] = useState(false)

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      })

      const data = await response.json()

      if (data.success) {
        router.push('/dashboard')
      } else {
        setError(data.error || 'Login failed. Please try again.')
      }
    } catch (error) {
      setError('Something went wrong. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSendOTP = async () => {
    if (!email) {
      setError('Please enter your email first')
      return
    }
    setError('')
    setIsLoading(true)

    try {
      const response = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, purpose: 'login' })
      })

      const data = await response.json()

      if (data.success) {
        setOtpSent(true)
      } else {
        setError(data.error || 'Failed to send OTP')
      }
    } catch (error) {
      setError('Something went wrong. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleOTPLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      const response = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp, purpose: 'login' })
      })

      const data = await response.json()

      if (data.success) {
        router.push('/dashboard')
      } else {
        setError(data.error || 'Invalid OTP')
      }
    } catch (error) {
      setError('Something went wrong. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const switchLoginMode = (mode: LoginMode) => {
    setLoginMode(mode)
    setError('')
    setOtp('')
    setOtpSent(false)
  }

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4">
      {/* Background gradient effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-teal/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-golden/10 rounded-full blur-3xl"></div>
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Logo and Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-teal to-primary-hover flex items-center justify-center shadow-lg shadow-teal/50">
              <Sparkles className="w-8 h-8 text-white" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-plum mb-2">Welcome Back</h1>
          <p className="text-foreground-secondary">Sign in to your SniperThinkAI account</p>
        </div>

        {/* Login Form */}
        <div className="bg-background-secondary backdrop-blur-xl border border-border rounded-2xl p-8 shadow-2xl">
          {/* Login Mode Toggle */}
          <div className="flex mb-6 bg-background-tertiary rounded-lg p-1">
            <button
              type="button"
              onClick={() => switchLoginMode('password')}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${
                loginMode === 'password'
                  ? 'bg-teal text-white'
                  : 'text-foreground-secondary hover:text-plum'
              }`}
            >
              <Lock className="w-4 h-4 inline mr-2" />
              Password
            </button>
            <button
              type="button"
              onClick={() => switchLoginMode('otp')}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${
                loginMode === 'otp'
                  ? 'bg-teal text-white'
                  : 'text-foreground-secondary hover:text-plum'
              }`}
            >
              <KeyRound className="w-4 h-4 inline mr-2" />
              Email OTP
            </button>
          </div>

          {loginMode === 'password' ? (
            <form onSubmit={handlePasswordLogin} className="space-y-6">
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

              {/* Password Input */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-foreground-muted" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="••••••••"
                    className="w-full pl-12 pr-12 py-3 bg-white border border-border rounded-lg text-plum placeholder:text-foreground-muted focus:outline-none focus:ring-2 focus:ring-teal/50 focus:border-teal transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-foreground-muted hover:text-foreground transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {/* Error Message */}
              {error && (
                <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-3 text-red-600 text-sm">
                  {error}
                </div>
              )}

              {/* Remember & Forgot */}
              <div className="flex items-center justify-between text-sm">
                <label className="flex items-center text-foreground-secondary cursor-pointer hover:text-foreground">
                  <input
                    type="checkbox"
                    className="mr-2 w-4 h-4 rounded border-border bg-white text-teal focus:ring-teal focus:ring-offset-0"
                  />
                  Remember me
                </label>
                <Link
                  href="/forgot-password"
                  className="text-teal hover:text-primary-hover transition-colors"
                >
                  Forgot password?
                </Link>
              </div>

              {/* Login Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 bg-gradient-to-r from-teal to-primary-hover hover:from-primary-hover hover:to-teal text-white rounded-lg font-semibold transition-all duration-300 flex items-center justify-center gap-2 shadow-lg shadow-teal/30 hover:shadow-teal/50 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 disabled:hover:scale-100"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  <>Sign In</>
                )}
              </button>
            </form>
          ) : (
            <form onSubmit={handleOTPLogin} className="space-y-6">
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
                    onChange={(e) => {
                      setEmail(e.target.value)
                      setOtpSent(false)
                    }}
                    required
                    placeholder="you@example.com"
                    className="w-full pl-12 pr-4 py-3 bg-white border border-border rounded-lg text-plum placeholder:text-foreground-muted focus:outline-none focus:ring-2 focus:ring-teal/50 focus:border-teal transition-all"
                  />
                </div>
              </div>

              {otpSent ? (
                <>
                  {/* OTP Sent Message */}
                  <div className="bg-sage/20 border border-sage rounded-lg p-3 text-teal text-sm text-center">
                    ✓ Verification code sent to {email}
                  </div>

                  {/* OTP Input */}
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Enter 6-digit code
                    </label>
                    <input
                      type="text"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      required
                      maxLength={6}
                      placeholder="000000"
                      autoFocus
                      className="w-full px-4 py-4 bg-white border border-border rounded-lg text-plum text-center text-2xl tracking-[0.5em] font-mono placeholder:text-foreground-muted focus:outline-none focus:ring-2 focus:ring-teal/50 focus:border-teal transition-all"
                    />
                  </div>

                  {/* Resend Option */}
                  <p className="text-center text-foreground-muted text-sm">
                    Didn&apos;t receive code?{' '}
                    <button
                      type="button"
                      onClick={handleSendOTP}
                      disabled={isLoading}
                      className="text-teal hover:text-primary-hover transition-colors disabled:opacity-50"
                    >
                      Resend
                    </button>
                  </p>
                </>
              ) : (
                /* Send OTP Button */
                <button
                  type="button"
                  onClick={handleSendOTP}
                  disabled={isLoading || !email}
                  className="w-full py-3 bg-background-tertiary hover:bg-border text-plum rounded-lg font-semibold transition-all duration-300 flex items-center justify-center gap-2 border border-border disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Mail className="w-5 h-5" />
                      Send Verification Code
                    </>
                  )}
                </button>
              )}

              {/* Error Message */}
              {error && (
                <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-3 text-red-600 text-sm">
                  {error}
                </div>
              )}

              {/* Verify OTP Button */}
              {otpSent && (
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
                    <>Sign In</>
                  )}
                </button>
              )}
            </form>
          )}

          {/* Divider */}
          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-background-secondary text-foreground-muted">
                Don&apos;t have an account?
              </span>
            </div>
          </div>

          {/* Sign Up Link */}
          <Link
            href="/signup"
            className="block w-full py-3 bg-white hover:bg-background-tertiary border border-border hover:border-teal text-plum rounded-lg font-semibold text-center transition-all duration-300"
          >
            Create Account
          </Link>
        </div>

        {/* Footer */}
        <p className="text-center text-foreground-muted text-sm mt-8">
          By signing in, you agree to our{' '}
          <Link href="/terms" className="text-teal hover:text-primary-hover">
            Terms of Service
          </Link>{' '}
          and{' '}
          <Link href="/privacy" className="text-teal hover:text-primary-hover">
            Privacy Policy
          </Link>
        </p>
      </div>
    </div>
  )
}
