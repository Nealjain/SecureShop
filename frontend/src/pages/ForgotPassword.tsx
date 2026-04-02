import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { KeyRound, ArrowLeft, Eye, EyeOff } from 'lucide-react'
import api from '../api'
import SecurityBadge from '../components/SecurityBadge'

export default function ForgotPassword() {
  const [form, setForm] = useState({ email: '', new_password: '', otp: '' })
  const [showPw, setShowPw] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await api.post('/auth/reset-password-otp', {
        email: form.email,
        new_password: form.new_password,
        otp_code: form.otp
      })
      setSuccess('Your password has been changed successfully. You can now log in.')
      setTimeout(() => navigate('/login'), 4000)
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to change password. Validate details and OTP.')
    } finally {
      setLoading(false)
    }
  }

  if (success) return (
    <div className="min-h-[80vh] flex items-center justify-center">
      <div className="card w-full max-w-md text-center">
        <div className="text-5xl mb-3">✅</div>
        <h2 className="text-xl font-bold mb-2">Password Changed</h2>
        <p className="text-gray-600 text-sm mb-4">{success}</p>
        <Link to="/login" className="btn-primary w-full block text-center">Go to Login</Link>
      </div>
    </div>
  )

  return (
    <div className="min-h-[80vh] flex items-center justify-center">
      <div className="card w-full max-w-md">
        <div className="text-center mb-6">
          <div className="mb-2 bg-blue-100 p-3 rounded-full text-blue-600 inline-block"><KeyRound size={28} /></div>
          <h1 className="text-2xl font-bold">Change Password</h1>
          <p className="text-gray-500 text-sm mt-1">Use your Google Authenticator to reset without emails</p>
        </div>

        {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 mb-4 text-sm">{error}</div>}

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email address</label>
            <input className="input" type="email" required value={form.email}
              onChange={e => setForm({...form, email: e.target.value})} placeholder="you@example.com" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
            <div className="relative">
              <input className="input pr-10" type={showPw ? 'text' : 'password'} required
                value={form.new_password} onChange={e => setForm({ ...form, new_password: e.target.value })}
                placeholder="••••••••" />
              <button type="button" onClick={() => setShowPw(!showPw)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Authenticator Code (OTP)</label>
            <input className="input font-mono tracking-widest text-lg" required maxLength={6}
              value={form.otp} onChange={e => setForm({ ...form, otp: e.target.value.replace(/\D/g, '') })}
              placeholder="000000" />
          </div>

          <button type="submit" className="btn-primary w-full" disabled={loading || form.otp.length !== 6}>
            {loading ? 'Verifying & Changing...' : 'Change Password Securely'}
          </button>
        </form>

        <Link to="/login" className="flex items-center gap-1 text-sm text-gray-500 hover:text-blue-600 mt-4 justify-center">
          <ArrowLeft size={14} /> Back to Login
        </Link>

        <SecurityBadge title="🔒 Reset Security" items={[
          { label: "PBKDF2-HMAC-SHA256 rehash", color: "blue" },
          { label: "TOTP RFC 6238 challenge", color: "green" },
          { label: "AES-256-GCM secret", color: "purple" },
          { label: "No email hijacking risks", color: "orange" },
        ]} />
      </div>
    </div>
  )
}
