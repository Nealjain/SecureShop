import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { Eye, EyeOff } from 'lucide-react'
import api from '../api'
import { useAuth } from '../AuthContext'
import SecurityBadge from '../components/SecurityBadge'

export default function Login() {
  const [form, setForm] = useState({ email: '', password: '' })
  const [showPw, setShowPw] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showDemo, setShowDemo] = useState(false)
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
      if (err.response?.status === 423) {
        setError('Account locked. Try again after 15 minutes.')
      } else {
        setError(err.response?.data?.detail || 'Login failed')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center">
      <div className="card w-full max-w-md">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Sign in</h1>
          <p className="text-gray-500 text-sm mt-1">SecureShop — CCS Project</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 mb-4 text-sm">{error}</div>
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
                placeholder="Enter your password" />
              <button type="button" onClick={() => setShowPw(!showPw)}
                aria-label={showPw ? 'Hide password' : 'Show password'}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
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
            className="text-blue-600 hover:underline font-medium w-full">
            {showDemo ? 'Hide' : 'Show'} demo accounts
          </button>
          {showDemo && (
            <div className="mt-2 space-y-1 text-left">
              <p><strong>Admin:</strong> admin@secureshop.com / Admin@123</p>
              <p><strong>Customer:</strong> neal@secureshop.com / Neal@123</p>
            </div>
          )}
        </div>

        <SecurityBadge title="Authentication Security" items={[
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
