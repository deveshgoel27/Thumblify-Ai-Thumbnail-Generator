import React, { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import SoftBackDrop from '../components/SoftBackDrop'
import { useAuth } from '../Context/AuthContext'

const ResetPassword = () => {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') ?? ''

  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const { resetPassword } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    if (password.length < 6) {
      return
    }

    if (password !== confirm) {
      return
    }

    setLoading(true)
    const success = await resetPassword(token, password)
    setLoading(false)

    if (success) {
      setDone(true)
      setTimeout(() => navigate('/login'), 3000)
    }
  }

  if (!token) {
    return (
      <>
        <SoftBackDrop />
        <div className="min-h-screen flex items-center justify-center">
          <div className="w-full sm:w-87.5 text-center bg-white/6 border border-white/10 rounded-2xl px-8 py-12">
            <h2 className="text-white text-2xl font-medium">Invalid link</h2>
            <p className="text-gray-400 text-sm mt-2">This reset link is missing a token.</p>
            <button
              onClick={() => navigate('/login')}
              className="mt-8 w-full h-11 rounded-full text-white bg-pink-600 hover:bg-pink-500 transition text-sm"
            >
              Back to login
            </button>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <SoftBackDrop />
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-full sm:w-87.5 text-center bg-white/6 border border-white/10 rounded-2xl px-8 py-10">

          {done ? (
            // Success state
            <div className="py-4">
              <div className="w-14 h-14 rounded-full bg-pink-500/10 flex items-center justify-center mx-auto mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-pink-400">
                  <path d="M20 6 9 17l-5-5" />
                </svg>
              </div>
              <h2 className="text-white text-2xl font-medium">Password updated</h2>
              <p className="text-gray-400 text-sm mt-2">Your password has been reset successfully.</p>
              <p className="text-gray-500 text-xs mt-1">Redirecting you to login...</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <h1 className="text-white text-3xl font-medium">Set new password</h1>
              <p className="text-gray-400 text-sm mt-2">Choose a strong password for your account.</p>

              {/* New password */}
              <div className="flex items-center mt-6 w-full bg-white/5 ring-2 ring-white/10 focus-within:ring-pink-500/60 h-12 rounded-full overflow-hidden pl-6 pr-4 gap-2 transition-all">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="text-white/75 shrink-0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect width="18" height="11" x="3" y="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="New password"
                  minLength={6}
                  className="w-full bg-transparent text-white placeholder-white/60 border-none outline-none"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(p => !p)}
                  className="text-white/40 hover:text-white/70 transition shrink-0"
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" /><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" /><line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>

              {/* Confirm password */}
              <div className="flex items-center mt-4 w-full bg-white/5 ring-2 ring-white/10 focus-within:ring-pink-500/60 h-12 rounded-full overflow-hidden pl-6 gap-2 transition-all">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="text-white/75 shrink-0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect width="18" height="11" x="3" y="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
                <input
                  type="password"
                  placeholder="Confirm new password"
                  className="w-full bg-transparent text-white placeholder-white/60 border-none outline-none"
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  required
                />
              </div>

              {/* Validation hints */}
              <div className="mt-3 text-left space-y-1">
                {password.length > 0 && password.length < 6 && (
                  <p className="text-xs text-red-400 pl-2">Password must be at least 6 characters</p>
                )}
                {confirm.length > 0 && password !== confirm && (
                  <p className="text-xs text-red-400 pl-2">Passwords do not match</p>
                )}
              </div>

              <button
                type="submit"
                disabled={loading || password !== confirm || password.length < 6}
                className="mt-5 w-full h-11 rounded-full text-white bg-pink-600 hover:bg-pink-500 transition disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              >
                {loading ? 'Updating...' : 'Reset password'}
              </button>

              <button
                type="button"
                onClick={() => navigate('/login')}
                className="mt-3 mb-8 text-sm text-gray-500 hover:text-gray-300 transition"
              >
                Back to login
              </button>
            </form>
          )}
        </div>
      </div>
    </>
  )
}

export default ResetPassword
