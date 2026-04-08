import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Check, X } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import api from '../api'
import { useAuth } from '../AuthContext'
import SecurityBadge from '../components/SecurityBadge'

function PasswordStrength({ password }: { password: string }) {
  const checks = [
    { label: 'At least 8 characters', ok: password.length >= 8 },
    { label: 'Uppercase letter', ok: /[A-Z]/.test(password) },
    { label: 'Lowercase letter', ok: /[a-z]/.test(password) },
    { label: 'Number', ok: /\d/.test(password) },
    { label: 'Special character', ok: /[^A-Za-z0-9]/.test(password) },
  ]
  const score = checks.filter(c => c.ok).length
  const color = score <= 2 ? 'bg-red-500' : score <= 3 ? 'bg-yellow-500' : score === 4 ? 'bg-blue-500' : 'bg-green-500'
  const label = score <= 2 ? 'Weak' : score <= 3 ? 'Fair' : score === 4 ? 'Good' : 'Strong'

  if (!password) return null
  return (
    <div className="mt-2">
      <div className="flex gap-1 mb-1">
        {[1,2,3,4,5].map(i => (
          <div key={i} className={`h-1 flex-1 rounded-full ${i <= score ? color : 'bg-gray-200'}`} />
        ))}
      </div>
      <p className="text-xs text-gray-500">{label}</p>
      <div className="mt-1 space-y-0.5">
        {checks.map(c => (
          <p key={c.label} className={`text-xs flex items-center gap-1 ${c.ok ? 'text-green-600' : 'text-gray-400'}`}>
            {c.ok ? <Check size={10} /> : <X size={10} />} {c.label}
          </p>
        ))}
      </div>
    </div>
  )
}

export default function Register() {
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' })
  const [showPw, setShowPw] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const { login } = useAuth()

  const passwordMatch = form.confirm.length > 0 && form.password === form.confirm
  const passwordMismatch = form.confirm.length > 0 && form.password !== form.confirm

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (form.password !== form.confirm) { setError('Passwords do not match'); return }
    setError('')
    setLoading(true)
    try {
      const { data } = await api.post('/auth/register', { name: form.name, email: form.email, password: form.password })
      setResult(data)
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  if (result) return (
    <div className="min-h-[80vh] flex items-center justify-center">
      <div className="card w-full max-w-md text-center">
        <div className="text-4xl mb-3">✅</div>
        <h2 className="text-xl font-bold mb-2">Registration Successful</h2>
        <p className="text-gray-600 text-sm mb-4">Welcome, {result.name}!</p>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-left text-xs mb-4">
          <p className="font-semibold text-blue-800 mb-2">🔐 MFA Setup (Optional but Recommended)</p>
          <p className="text-blue-700 mb-3">Scan this QR code with Google Authenticator or Authy:</p>
          <div className="flex justify-center mb-3 bg-white p-3 rounded-lg">
            <QRCodeSVG value={result.otp_uri} size={160} />
          </div>
          <p className="text-blue-700 mb-1">Can't scan? Manual key:</p>
          <code className="block bg-blue-100 rounded p-1 break-all text-blue-900 font-mono">{result.otp_secret}</code>
          <p className="text-blue-600 mt-2">Enable MFA from your Profile page after logging in.</p>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-left text-xs mb-4">
          <p className="font-semibold text-green-800 mb-1">✅ Security Applied</p>
          <p className="text-green-700">• Password: PBKDF2-HMAC-SHA256 (310,000 iterations)</p>
          <p className="text-green-700">• OTP secret: AES-256-GCM encrypted</p>
          <p className="text-green-700">• Record hash: SHA-256 composite stored</p>
        </div>
        <button onClick={() => navigate('/login')} className="btn-secondary w-full mb-2">Go to Login Manually</button>
        <button onClick={async () => {
          try {
            const { data } = await api.post('/auth/login', { email: result.email, password: form.password })
            if (!data.mfa_required) {
              login({ email: result.email, role: data.role, name: data.name }, data.access_token)
              navigate('/shop')
            } else {
              navigate('/verify-otp', { state: { partial_token: data.partial_token } })
            }
          } catch { navigate('/login') }
        }} className="btn-primary w-full">Continue to Shop →</button>
      </div>
    </div>
  )

  return (
    <div className="min-h-[80vh] flex items-center justify-center">
      <div className="card w-full max-w-md">
        <div className="text-center mb-6">
          <div className="text-4xl mb-2">👤</div>
          <h1 className="text-2xl font-bold">Create account</h1>
        </div>

        {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 mb-4 text-sm">{error}</div>}

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
            <input className="input" required autoComplete="name" aria-label="Full name"
              value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Your name" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input className="input" type="email" required autoComplete="email" aria-label="Email address"
              value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="you@example.com" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <div className="relative">
              <input className="input pr-10" type={showPw ? 'text' : 'password'} required
                autoComplete="new-password" aria-label="Password"
                value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} placeholder="Min 8 characters" />
              <button type="button" onClick={() => setShowPw(!showPw)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <PasswordStrength password={form.password} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
            <div className="relative">
              <input
                className={`input pr-10 ${passwordMatch ? 'border-green-400 focus:ring-green-400' : passwordMismatch ? 'border-red-400 focus:ring-red-400' : ''}`}
                type={showConfirm ? 'text' : 'password'} required
                autoComplete="new-password" aria-label="Confirm password"
                value={form.confirm} onChange={e => setForm({ ...form, confirm: e.target.value })} placeholder="Re-enter password" />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
                {passwordMatch && <Check size={14} className="text-green-500" />}
                {passwordMismatch && <X size={14} className="text-red-500" />}
                <button type="button" onClick={() => setShowConfirm(!showConfirm)}
                  className="text-gray-400 hover:text-gray-600 ml-1">
                  {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            {passwordMismatch && <p className="text-xs text-red-500 mt-1">Passwords do not match</p>}
            {passwordMatch && <p className="text-xs text-green-600 mt-1">✓ Passwords match</p>}
          </div>
          <button type="submit" className="btn-primary w-full" disabled={loading || passwordMismatch}>
            {loading ? 'Creating account...' : 'Create account'}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-4">
          Already have an account? <Link to="/login" className="text-blue-600 hover:underline">Sign in</Link>
        </p>

        <SecurityBadge title="🔒 Registration Security" items={[
          { label: "PBKDF2-HMAC-SHA256", color: "blue" },
          { label: "310,000 iterations", color: "blue" },
          { label: "AES-256-GCM OTP storage", color: "green" },
          { label: "TOTP RFC 6238", color: "green" },
          { label: "SHA-256 Record Hash", color: "purple" },
          { label: "Rate limit: 3/min", color: "orange" },
        ]} />
      </div>
    </div>
  )
}
