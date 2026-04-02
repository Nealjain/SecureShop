import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Mail, ArrowLeft } from 'lucide-react'
import SecurityBadge from '../components/SecurityBadge'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)

  function submit(e: React.FormEvent) {
    e.preventDefault()
    // In a real system this would call /api/auth/forgot-password
    // For the CCS demo we show the flow without actual email sending
    setSubmitted(true)
  }

  if (submitted) return (
    <div className="min-h-[80vh] flex items-center justify-center">
      <div className="card w-full max-w-md text-center">
        <div className="text-5xl mb-3">📧</div>
        <h2 className="text-xl font-bold mb-2">Check your email</h2>
        <p className="text-gray-600 text-sm mb-4">
          If <strong>{email}</strong> is registered, a password reset link has been sent.
        </p>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-700 text-left mb-4">
          <p className="font-semibold mb-1">🔐 Security Note (CCS Demo)</p>
          <p>Reset tokens are single-use, time-limited (15 min), and hashed with SHA-256 before storage.</p>
          <p className="mt-1">The response is identical whether the email exists or not — prevents user enumeration attacks.</p>
        </div>
        <Link to="/login" className="btn-primary w-full block text-center">Back to Login</Link>
      </div>
    </div>
  )

  return (
    <div className="min-h-[80vh] flex items-center justify-center">
      <div className="card w-full max-w-md">
        <div className="text-center mb-6">
          <div className="mb-2 bg-blue-100 p-3 rounded-full text-blue-600 inline-block"><Mail size={28} /></div>
          <h1 className="text-2xl font-bold">Reset Password</h1>
          <p className="text-gray-500 text-sm mt-1">Enter your email to receive a reset link</p>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email address</label>
            <input className="input" type="email" required value={email}
              onChange={e => setEmail(e.target.value)} placeholder="you@example.com" />
          </div>
          <button type="submit" className="btn-primary w-full">Send Reset Link</button>
        </form>

        <Link to="/login" className="flex items-center gap-1 text-sm text-gray-500 hover:text-blue-600 mt-4 justify-center">
          <ArrowLeft size={14} /> Back to Login
        </Link>

        <SecurityBadge title="🔒 Reset Security" items={[
          { label: "SHA-256 token hash", color: "blue" },
          { label: "15 min expiry", color: "orange" },
          { label: "Single-use token", color: "green" },
          { label: "No user enumeration", color: "purple" },
        ]} />
      </div>
    </div>
  )
}
