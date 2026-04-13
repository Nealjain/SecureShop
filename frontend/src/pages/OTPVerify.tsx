import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import api from '../api'
import { setAuth } from '../store'
import SecurityBadge from '../components/SecurityBadge'

export default function OTPVerify() {
  const [otp, setOtp] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()
  const partial_token = (location.state as any)?.partial_token

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { data } = await api.post('/auth/verify-otp', { partial_token, otp_code: otp })
      setAuth({ email: '', role: data.role, name: data.name }, data.access_token)
      navigate('/')
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Invalid OTP')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center">
      <div className="card w-full max-w-sm text-center">
        <h1 className="text-xl font-bold mb-1">Two-Factor Authentication</h1>
        <p className="text-gray-500 text-sm mb-6">Enter the 6-digit code from your authenticator app</p>

        {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 mb-4 text-sm">{error}</div>}

        <form onSubmit={submit} className="space-y-4">
          <input className="input text-center text-2xl tracking-widest font-mono" maxLength={6}
            autoComplete="one-time-code" aria-label="OTP code"
            value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g, ''))}
            placeholder="000000" required />
          <button type="submit" className="btn-primary w-full" disabled={loading || otp.length !== 6}>
            {loading ? 'Verifying...' : 'Verify'}
          </button>
        </form>

        <SecurityBadge title="MFA Security" items={[
          { label: "TOTP RFC 6238", color: "green" },
          { label: "AES-256-GCM secret", color: "blue" },
        ]} />
      </div>
    </div>
  )
}
