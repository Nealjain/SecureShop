import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { Lock, Eye, EyeOff } from 'lucide-react'
import api from '../api'
import { useAuth } from '../AuthContext'
import SecurityBadge from '../components/SecurityBadge'

export default function Login() {
  const [form, setForm] = useState({ email: '', password: '' })
  const [showPw, setShowPw] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showDemo, setShowDemo] = useState(false)
  const [lockoutUntil, setLockoutUntil] = useState<Date | null>(null)
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as any)?.from?.pathname || '/shop'
  const { login } = useAuth()

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { data } = await api.post('/auth/login', { email: form.email, password: form.password })
      if (data.mfa_required) {
        navigate('/verify-otp', { state: { partial_token: data.partial_token } })
      } else {
        login({ email: form.email, role: data.role, name: data.name }, data.access_token)
        navigate(from, { replace: true })
      }
    } catch (err: any) {
      const detail = err.response?.data?.detail || 'Login failed'
      if (err.response?.status === 423) {
        setLockoutUntil(new Date(Date.now() + 15 * 60 * 1000))
        setError('Account locked due to too many failed attempts.')
      } else {
        setError(detail)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center">
      <div className="card w-full max-w-md">
        <div className="text-center mb-6 flex flex-col items-center">
          <div className="mb-2 bg-blue-100 p-3 rounded-full text-blue-600"><Lock size={32} /></div>
          <h1 className="text-2xl font-bold text-gray-900">Sign in</h1>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 mb-4 text-sm">
            {error}
            {lockoutUntil && <p className="mt-1 font-medium">Try again after 15 minutes.</p>}
          </div>
        )}

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input className="input" type="email" required autoComplete="email" aria-label="Email address"
              value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
              placeholder="you@example.com" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <div className="relative">
              <input className="input pr-10" type={showPw ? 'text' : 'password'} required
                autoComplete="current-password" aria-label="Password"
                value={form.password} onChange={e => setForm({ ...form, password: e.target.value })}
                placeholder="••••••••" />
              <button type="button" onClick={() => setShowPw(!showPw)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                aria-label={showPw ? 'Hide password' : 'Show password'}>
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div className="flex justify-end text-sm">
            <Link to="/forgot-password" className="text-blue-600 hover:underline">Forgot password?</Link>
          </div>

          <button type="submit" className="btn-primary w-full flex justify-center items-center h-10" disabled={loading}>
            {loading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : 'Sign in'}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-6">
          No account? <Link to="/register" className="text-blue-600 hover:underline">Register</Link>
        </p>

        <div className="mt-3 p-3 bg-gray-50 rounded-lg text-xs text-gray-500 text-center">
          <button onClick={() => setShowDemo(!showDemo)}
            className="text-blue-600 hover:underline font-medium w-full flex justify-center items-center gap-1">
            {showDemo ? 'Hide' : 'Show'} Demo Accounts {showDemo ? '▲' : '▼'}
          </button>
          {showDemo && (
            <div className="mt-2 space-y-1 text-left">
              <p>👑 <strong>Admin:</strong> admin@secureshop.com / Admin@123</p>
              <p>👤 <strong>Customer:</strong> neal@secureshop.com / Neal@123</p>
            </div>
          )}
        </div>

        <SecurityBadge title="🔒 Authentication Security" items={[
          { label: "PBKDF2-HMAC-SHA256", color: "blue" },
          { label: "310,000 iterations", color: "blue" },
          { label: "JWT HS256 Session", color: "green" },
          { label: "Rate limit: 5/min", color: "orange" },
          { label: "Lockout after 5 fails", color: "red" },
          { label: "Device Fingerprint", color: "purple" },
        ]} />
      </div>
    </div>
  )
}
