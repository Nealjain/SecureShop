import { Link, Navigate } from 'react-router-dom'
import { Shield, ShoppingBag, Lock, Zap, Cpu, Key } from 'lucide-react'
import { useAuth } from '../AuthContext'

export default function Landing() {
  const { user } = useAuth()

  // Already logged in — go straight to shop
  if (user) return <Navigate to="/shop" replace />

  return (
    <div className="space-y-20 pb-20">
      {/* Hero */}
      <section className="text-center py-20 bg-gradient-to-b from-blue-50 to-white -mx-4 px-4">
        <div className="inline-flex items-center gap-2 bg-blue-100 text-blue-700 text-sm font-medium px-4 py-1.5 rounded-full mb-6">
          <Shield size={14} /> CCS Project — Shah & Anchor Kutchhi Engineering College
        </div>
        <h1 className="text-5xl font-extrabold text-gray-900 mb-6 tracking-tight">
          Secure Shopping,{' '}
          <span className="text-blue-600">Zero Trust</span> Architecture.
        </h1>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-10 leading-relaxed">
          Every byte encrypted. Every record hashed. Every transaction fraud-checked.
          A full-stack CCS demonstration of AES-256-GCM, PBKDF2, JWT, TOTP, and Isolation Forest ML.
        </p>
        <div className="flex justify-center gap-4 flex-wrap">
          <Link to="/register" className="btn-primary text-lg px-8 py-3">Get Started</Link>
          <Link to="/login" state={{ from: { pathname: '/shop' } }} className="btn-secondary text-lg px-8 py-3">Sign In</Link>
        </div>
      </section>

      {/* Feature cards */}
      <section className="grid md:grid-cols-3 gap-8">
        {[
          { icon: <Lock size={28} />, color: 'blue', title: 'AES-256-GCM Encryption', desc: 'All sensitive fields (users, orders, sessions) stored as a single encrypted blob. Nothing readable in the DB without the key.' },
          { icon: <Shield size={28} />, color: 'green', title: 'SHA-256 Tamper Detection', desc: 'Every document has a composite record hash. Any field-level modification is detected instantly on read.' },
          { icon: <Cpu size={28} />, color: 'purple', title: 'Isolation Forest ML', desc: '3-layer fraud detection: velocity rules + IP/device fingerprint + Isolation Forest anomaly detection (8 features).' },
          { icon: <Key size={28} />, color: 'orange', title: 'TOTP Multi-Factor Auth', desc: 'RFC 6238 TOTP via pyotp. OTP secrets stored AES-256-GCM encrypted. ±1 window clock drift tolerance.' },
          { icon: <Zap size={28} />, color: 'red', title: 'PCI DSS Tokenization', desc: 'Card numbers never stored in orders. Luhn-validated, AES-encrypted in token_vault. Only last 4 digits visible.' },
          { icon: <ShoppingBag size={28} />, color: 'blue', title: 'PBKDF2 Password Hashing', desc: 'NIST SP 800-132 compliant. 310,000 iterations, 16-byte random salt, constant-time comparison.' },
        ].map(f => (
          <div key={f.title} className="card p-6 hover:shadow-md transition-shadow">
            <div className={`bg-${f.color}-100 w-12 h-12 rounded-xl flex items-center justify-center text-${f.color}-600 mb-4`}>
              {f.icon}
            </div>
            <h3 className="text-lg font-bold mb-2">{f.title}</h3>
            <p className="text-gray-500 text-sm leading-relaxed">{f.desc}</p>
          </div>
        ))}
      </section>

      {/* CO Mapping */}
      <section className="card p-8">
        <h2 className="text-2xl font-bold mb-6 text-center">Course Outcome Mapping</h2>
        <div className="grid md:grid-cols-2 gap-4">
          {[
            { co: 'CO1', title: 'Secure Authentication', items: ['PBKDF2-HMAC-SHA256 (310k iter)', 'TOTP RFC 6238 MFA', 'RBAC + account lockout'] },
            { co: 'CO2', title: 'Data Confidentiality & Integrity', items: ['AES-256-GCM encryption', 'SHA-256 composite record hash', 'PCI DSS card tokenization'] },
            { co: 'CO3', title: 'Secure Communication', items: ['JWT HS256 sessions', '30-min inactivity timeout', 'Security headers + rate limiting'] },
            { co: 'CO4', title: 'Fraud & Tamper Detection', items: ['Isolation Forest ML (8 features)', '4 velocity rules engine', 'Device fingerprint + IP check'] },
          ].map(c => (
            <div key={c.co} className="bg-gray-50 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="badge-blue font-bold">{c.co}</span>
                <span className="font-semibold">{c.title}</span>
              </div>
              {c.items.map(i => <p key={i} className="text-sm text-gray-600">• {i}</p>)}
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="bg-gray-900 text-white rounded-3xl p-12 relative overflow-hidden">
        <div className="relative z-10">
          <h2 className="text-3xl font-bold mb-4">Ready to explore?</h2>
          <p className="text-gray-400 max-w-xl mb-8">
            Register an account or use the demo credentials to explore the full security stack in action.
          </p>
          <div className="flex gap-4 flex-wrap">
            <Link to="/register" className="btn-primary px-6 py-2.5">
              Create Account
            </Link>
            <Link to="/login" state={{ from: { pathname: '/shop' } }}
              className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white font-medium px-6 py-2.5 rounded-lg transition-colors">
              <ShoppingBag size={18} /> Explore the Storefront
            </Link>
          </div>
          <p className="text-gray-500 text-sm mt-4">
            Demo: admin@secureshop.com / Admin@123 &nbsp;·&nbsp; neal@secureshop.com / Neal@123
          </p>
        </div>
        <div className="absolute -right-20 -bottom-20 opacity-10 bg-blue-500 w-96 h-96 rounded-full blur-3xl" />
      </section>
    </div>
  )
}
