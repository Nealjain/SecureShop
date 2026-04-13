import { useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { Shield, ShoppingBag, Lock, Zap, Cpu, Key } from 'lucide-react'
import { useAuth } from '../AuthContext'

export default function Landing() {
  const { user } = useAuth()
  const [showDemo, setShowDemo] = useState(false)

  if (user) return <Navigate to="/shop" replace />

  return (
    <div className="space-y-16 pb-16">
      {/* Hero */}
      <section className="text-center py-16 bg-gradient-to-b from-blue-50 to-white -mx-4 px-4">
        <div className="inline-flex items-center gap-2 bg-blue-100 text-blue-700 text-sm font-medium px-4 py-1.5 rounded-full mb-6">
          <Shield size={14} /> CCS Project — Shah & Anchor Kutchhi Engineering College
        </div>
        <h1 className="text-4xl font-extrabold text-gray-900 mb-4 tracking-tight">
          Secure Shopping, <span className="text-blue-600">Zero Trust</span> Architecture.
        </h1>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto mb-8 leading-relaxed">
          A full-stack e-commerce platform demonstrating AES-256-GCM encryption, PBKDF2 password hashing,
          JWT sessions, TOTP multi-factor auth, and Isolation Forest fraud detection.
        </p>
        <div className="flex justify-center gap-4 flex-wrap">
          <Link to="/register" className="btn-primary px-8 py-3">Get Started</Link>
          <Link to="/login" state={{ from: { pathname: '/shop' } }} className="btn-secondary px-8 py-3">Sign In</Link>
        </div>
      </section>

      {/* Feature cards */}
      <section className="grid md:grid-cols-3 gap-6">
        {[
          { icon: <Lock size={24} />, color: 'blue', title: 'AES-256-GCM Encryption', desc: 'All sensitive data — users, orders, sessions — stored as a single encrypted blob. Nothing is readable in the database without the key.' },
          { icon: <Shield size={24} />, color: 'green', title: 'SHA-256 Tamper Detection', desc: 'Every document has a composite record hash. Any field-level modification is detected instantly on read.' },
          { icon: <Cpu size={24} />, color: 'purple', title: 'Isolation Forest ML', desc: '3-layer fraud detection: velocity rules, IP and device fingerprint check, and Isolation Forest anomaly detection using 8 features.' },
          { icon: <Key size={24} />, color: 'orange', title: 'TOTP Multi-Factor Auth', desc: 'RFC 6238 TOTP via pyotp. OTP secrets stored AES-256-GCM encrypted. Supports clock drift tolerance of plus or minus one window.' },
          { icon: <Zap size={24} />, color: 'red', title: 'PCI DSS Tokenization', desc: 'Card numbers are never stored in orders. Luhn-validated, AES-encrypted in a token vault. Only the last 4 digits are ever shown.' },
          { icon: <ShoppingBag size={24} />, color: 'blue', title: 'PBKDF2 Password Hashing', desc: 'NIST SP 800-132 compliant. 310,000 iterations, 16-byte random salt, constant-time comparison to prevent timing attacks.' },
        ].map(f => (
          <div key={f.title} className="card p-5 hover:shadow-md transition-shadow">
            <div className={`bg-${f.color}-100 w-10 h-10 rounded-lg flex items-center justify-center text-${f.color}-600 mb-3`}>
              {f.icon}
            </div>
            <h3 className="font-bold mb-1">{f.title}</h3>
            <p className="text-gray-500 text-sm leading-relaxed">{f.desc}</p>
          </div>
        ))}
      </section>

      {/* Course Outcome Mapping */}
      <section className="card p-6">
        <h2 className="text-xl font-bold mb-5 text-center">Course Outcome Mapping</h2>
        <div className="grid md:grid-cols-2 gap-4">
          {[
            { co: 'CO1', title: 'Secure Authentication', items: ['PBKDF2-HMAC-SHA256 (310k iterations)', 'TOTP RFC 6238 MFA', 'RBAC and account lockout'] },
            { co: 'CO2', title: 'Data Confidentiality and Integrity', items: ['AES-256-GCM encryption', 'SHA-256 composite record hash', 'PCI DSS card tokenization'] },
            { co: 'CO3', title: 'Secure Communication', items: ['JWT HS256 sessions', '30-minute inactivity timeout', 'Security headers and rate limiting'] },
            { co: 'CO4', title: 'Fraud and Tamper Detection', items: ['Isolation Forest ML (8 features)', '4 velocity rules engine', 'Device fingerprint and IP check'] },
          ].map(c => (
            <div key={c.co} className="bg-gray-50 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="badge-blue font-bold">{c.co}</span>
                <span className="font-semibold text-sm">{c.title}</span>
              </div>
              <ul className="list-disc list-inside space-y-0.5">
                {c.items.map(i => <li key={i} className="text-sm text-gray-600">{i}</li>)}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="bg-gray-900 text-white rounded-2xl p-10 relative overflow-hidden">
        <div className="relative z-10">
          <h2 className="text-2xl font-bold mb-3">Ready to explore?</h2>
          <p className="text-gray-400 max-w-xl mb-6 text-sm">
            Register an account or use the demo credentials to explore the full security stack in action.
          </p>
          <div className="flex gap-4 flex-wrap">
            <Link to="/register" className="btn-primary px-6 py-2.5">Create Account</Link>
            <Link to="/shop" className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white font-medium px-6 py-2.5 rounded-lg transition-colors text-sm">
              <ShoppingBag size={16} /> Explore the Store
            </Link>
          </div>
          <div className="mt-4">
            <button onClick={() => setShowDemo(!showDemo)} className="text-gray-400 hover:text-gray-300 text-sm underline">
              {showDemo ? 'Hide' : 'Show'} demo credentials
            </button>
            {showDemo && (
              <p className="text-gray-400 text-sm mt-2">
                admin@secureshop.com / Admin@123 &nbsp;·&nbsp; neal@secureshop.com / Neal@123
              </p>
            )}
          </div>
        </div>
        <div className="absolute -right-20 -bottom-20 opacity-10 bg-blue-500 w-80 h-80 rounded-full blur-3xl" />
      </section>
    </div>
  )
}
