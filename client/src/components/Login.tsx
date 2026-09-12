import React, { useEffect, useState } from 'react'
import SoftBackDrop from './SoftBackDrop'
import { useAuth } from '../Context/AuthContext'
import { useNavigate } from 'react-router-dom'

type PageState = 'login' | 'register' | 'forgot'

const Login = () => {
  const [state, setState] = useState<PageState>('login')
  const [loading, setLoading] = useState(false)

  const { user, login, signUp, forgotPassword } = useAuth()
  const navigate = useNavigate()

  const [formData, setFormData] = useState({ name: '', email: '', password: '' })
  const [forgotEmail, setForgotEmail] = useState('')
  const [forgotSent, setForgotSent] = useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    if (state === 'login') {
      await login(formData)
    } else {
      await signUp(formData)
    }
    setLoading(false)
  }

  const handleForgotSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    await forgotPassword(forgotEmail)
    setForgotSent(true)
    setLoading(false)
  }

  useEffect(() => {
    if (user) navigate('/')
  }, [user])

  // ── Forgot Password view ──────────────────────────────────────────────────
  if (state === 'forgot') {
    return (
      <>
        <SoftBackDrop />
        <div className='min-h-screen flex items-center justify-center'>
          <div className="w-full sm:w-87.5 text-center bg-white/6 border border-white/10 rounded-2xl px-8 py-10">

            {/* Back button */}
            <button
              onClick={() => { setState('login'); setForgotSent(false); setForgotEmail('') }}
              className="flex items-center gap-1.5 text-gray-400 hover:text-white text-sm mb-6 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m15 18-6-6 6-6" />
              </svg>
              Back to login
            </button>

            {forgotSent ? (
              // Success state
              <div className="py-4">
                <div className="w-14 h-14 rounded-full bg-pink-500/10 flex items-center justify-center mx-auto mb-4">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-pink-400">
                    <path d="m22 7-8.991 5.727a2 2 0 0 1-2.009 0L2 7" /><rect x="2" y="4" width="20" height="16" rx="2" />
                  </svg>
                </div>
                <h2 className="text-white text-2xl font-medium">Check your email</h2>
                <p className="text-gray-400 text-sm mt-2 leading-relaxed">
                  We sent a password reset link to<br />
                  <span className="text-pink-400 font-medium">{forgotEmail}</span>
                </p>
                <p className="text-gray-500 text-xs mt-4">The link expires in 15 minutes.</p>
                <button
                  onClick={() => { setState('login'); setForgotSent(false); setForgotEmail('') }}
                  className="mt-8 w-full h-11 rounded-full text-white bg-pink-600 hover:bg-pink-500 transition text-sm"
                >
                  Back to login
                </button>
              </div>
            ) : (
              // Email input form
              <form onSubmit={handleForgotSubmit}>
                <h1 className="text-white text-3xl font-medium">Forgot password?</h1>
                <p className="text-gray-400 text-sm mt-2 leading-relaxed">
                  Enter your email and we'll send you a reset link.
                </p>

                <div className="flex items-center w-full mt-6 bg-white/5 ring-2 ring-white/10 focus-within:ring-pink-500/60 h-12 rounded-full overflow-hidden pl-6 gap-2 transition-all">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="text-white/75 shrink-0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m22 7-8.991 5.727a2 2 0 0 1-2.009 0L2 7" /><rect x="2" y="4" width="20" height="16" rx="2" />
                  </svg>
                  <input
                    type="email"
                    placeholder="Your email address"
                    className="w-full bg-transparent text-white placeholder-white/60 border-none outline-none"
                    value={forgotEmail}
                    onChange={e => setForgotEmail(e.target.value)}
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="mt-5 w-full h-11 rounded-full text-white bg-pink-600 hover:bg-pink-500 transition disabled:opacity-60 disabled:cursor-not-allowed text-sm"
                >
                  {loading ? 'Sending...' : 'Send reset link'}
                </button>
              </form>
            )}
          </div>
        </div>
      </>
    )
  }

  // ── Login / Register view ─────────────────────────────────────────────────
  return (
    <>
      <SoftBackDrop />
      <div className='min-h-screen flex items-center justify-center'>
        <form
          onSubmit={handleSubmit}
          className="w-full sm:w-87.5 text-center bg-white/6 border border-white/10 rounded-2xl px-8"
        >
          <h1 className="text-white text-3xl mt-10 font-medium">
            {state === 'login' ? 'Login' : 'Sign up'}
          </h1>

          <p className="text-gray-400 text-sm mt-2">Please sign in to continue</p>

          {state !== 'login' && (
            <div className="flex items-center mt-6 w-full bg-white/5 ring-2 ring-white/10 focus-within:ring-pink-500/60 h-12 rounded-full overflow-hidden pl-6 gap-2 transition-all">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="text-white/60 shrink-0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="8" r="5" /><path d="M20 21a8 8 0 0 0-16 0" />
              </svg>
              <input type="text" name="name" placeholder="Name" className="w-full bg-transparent text-white placeholder-white/60 border-none outline-none" value={formData.name} onChange={handleChange} required />
            </div>
          )}

          <div className={`flex items-center w-full ${state !== 'login' ? 'mt-4' : 'mt-6'} bg-white/5 ring-2 ring-white/10 focus-within:ring-pink-500/60 h-12 rounded-full overflow-hidden pl-6 gap-2 transition-all`}>
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="text-white/75 shrink-0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m22 7-8.991 5.727a2 2 0 0 1-2.009 0L2 7" /><rect x="2" y="4" width="20" height="16" rx="2" />
            </svg>
            <input type="email" name="email" placeholder="Email id" className="w-full bg-transparent text-white placeholder-white/60 border-none outline-none" value={formData.email} onChange={handleChange} required />
          </div>

          <div className="flex items-center mt-4 w-full bg-white/5 ring-2 ring-white/10 focus-within:ring-pink-500/60 h-12 rounded-full overflow-hidden pl-6 gap-2 transition-all">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="text-white/75 shrink-0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect width="18" height="11" x="3" y="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            <input type="password" name="password" placeholder="Password" className="w-full bg-transparent text-white placeholder-white/60 border-none outline-none" value={formData.password} onChange={handleChange} required />
          </div>

          {state === 'login' && (
            <div className="mt-3 text-right">
              <button
                type="button"
                onClick={() => setState('forgot')}
                className="text-sm text-pink-400 hover:underline"
              >
                Forgot password?
              </button>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="mt-4 w-full h-11 rounded-full text-white bg-pink-600 hover:bg-pink-500 transition disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? (state === 'login' ? 'Logging in...' : 'Signing up...') : (state === 'login' ? 'Login' : 'Sign up')}
          </button>

          <p
            onClick={() => setState(prev => prev === 'login' ? 'register' : 'login')}
            className="text-gray-400 text-sm mt-3 mb-11 cursor-pointer"
          >
            {state === 'login' ? "Don't have an account?" : 'Already have an account?'}
            <span className="text-pink-400 hover:underline ml-1">click here</span>
          </p>
        </form>
      </div>
    </>
  )
}

export default Login
