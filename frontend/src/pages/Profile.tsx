import { useState, useEffect } from 'react'
import api from '../api'
import { useAuth } from '../AuthContext'
import SecurityBadge from '../components/SecurityBadge'

export default function Profile() {
  const { user } = useAuth()
  const [profile, setProfile] = useState<any>(null)
  const [addr, setAddr] = useState({ full_name: '', phone: '', address_line1: '', address_line2: '', city: '', state: '', pincode: '' })
  const [card, setCard] = useState({ card_number: '', expiry: '', card_brand: 'Visa' })
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(false)
  const [me, setMe] = useState<any>(null)

  useEffect(() => {
    api.get('/auth/me').then(r => setMe(r.data)).catch(() => {})
    api.get('/profile').then(r => {
      setProfile(r.data)
      if (r.data.address) setAddr(r.data.address)
    }).catch(() => {})
    api.get('/profile/card-raw').then(r => {
      if (r.data.card) {
        // Store full number internally for saving, but never display it
        setCard({ card_number: r.data.card.card_number || '', expiry: r.data.card.expiry || '', card_brand: r.data.card.card_brand || 'Visa' })
      }
    }).catch(() => {})
  }, [])

  async function save(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      await api.post('/profile', {
        address: addr,
        ...(card.card_number ? { saved_card: card } : {})
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch {}
    setLoading(false)
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">My Profile</h1>

      {me && (
        <div className="card mb-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-xl font-bold text-blue-600">
              {me.name?.[0]?.toUpperCase()}
            </div>
            <div>
              <p className="font-semibold">{me.name}</p>
              <p className="text-sm text-gray-500">{me.email}</p>
              <div className="flex gap-2 mt-1">
                <span className={me.role === 'admin' ? 'badge-blue' : 'badge-green'}>{me.role}</span>
                {me.mfa_enabled && <span className="badge-blue">🔑 MFA On</span>}
                <span className={me.integrity_status === 'ok' ? 'badge-green' : 'badge-red'}>
                  {me.integrity_status === 'ok' ? '✓ Record Hash OK' : '⚠ Tampered'}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      <SecurityBadge title="🔒 Profile Security" items={[
        { label: "Address: AES-256-GCM encrypted", color: "blue" },
        { label: "Card: AES-256-GCM encrypted", color: "blue" },
        { label: "SHA-256 record hash", color: "green" },
        { label: "Convex DB: single data column", color: "purple" },
      ]} />

      {saved && <div className="bg-green-50 border border-green-200 text-green-700 rounded-lg p-3 mt-4 text-sm">✅ Profile saved securely</div>}

      <form onSubmit={save} className="space-y-4 mt-4">
        <div className="card">
          <h2 className="font-semibold mb-3">Saved Address</h2>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
              <input className="input" value={addr.full_name} onChange={e => setAddr({...addr, full_name: e.target.value})} placeholder="Your full name" />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
              <input className="input" value={addr.phone} onChange={e => setAddr({...addr, phone: e.target.value})} placeholder="+91 98765 43210" />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Address Line 1</label>
              <input className="input" value={addr.address_line1} onChange={e => setAddr({...addr, address_line1: e.target.value})} placeholder="House/Flat No, Street" />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Address Line 2</label>
              <input className="input" value={addr.address_line2} onChange={e => setAddr({...addr, address_line2: e.target.value})} placeholder="Landmark, Area" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
              <input className="input" value={addr.city} onChange={e => setAddr({...addr, city: e.target.value})} placeholder="Mumbai" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
              <input className="input" value={addr.state} onChange={e => setAddr({...addr, state: e.target.value})} placeholder="Maharashtra" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Pincode</label>
              <input className="input" maxLength={6} value={addr.pincode} onChange={e => setAddr({...addr, pincode: e.target.value})} placeholder="400001" />
            </div>
          </div>
        </div>

        <div className="card">
          <h2 className="font-semibold mb-1">Saved Card</h2>
          <p className="text-xs text-gray-500 mb-3">Stored AES-256-GCM encrypted. CVV is never saved.</p>
          {profile?.saved_card && (
            <div className="bg-gray-50 rounded-lg p-3 mb-3 text-sm">
              <p className="font-medium">Current: {profile.saved_card.card_brand} {profile.saved_card.masked} · {profile.saved_card.expiry}</p>
            </div>
          )}
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Card Number</label>
              {/* Show masked if saved, allow new entry if blank */}
              <input className="input font-mono"
                value={card.card_number ? `**** **** **** ${card.card_number.slice(-4)}` : ''}
                readOnly={!!card.card_number}
                placeholder="Enter new card number"
                onClick={() => { if (card.card_number) setCard({...card, card_number: ''}) }}
              />
              {card.card_number && (
                <p className="text-xs text-gray-500 mt-1">Click to replace. Full number AES-256-GCM encrypted in DB.</p>
              )}
              {!card.card_number && (
                <input className="input font-mono mt-2" placeholder="4111111111111111"
                  onChange={e => setCard({...card, card_number: e.target.value.replace(/\s/g,'')})} />
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Expiry</label>
              <input className="input" value={card.expiry} onChange={e => setCard({...card, expiry: e.target.value})} placeholder="MM/YY" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Brand</label>
              <select className="input" value={card.card_brand} onChange={e => setCard({...card, card_brand: e.target.value})}>
                <option>Visa</option><option>Mastercard</option><option>Amex</option><option>RuPay</option>
              </select>
            </div>
          </div>
        </div>

        <button type="submit" className="btn-primary w-full" disabled={loading}>
          {loading ? 'Saving...' : 'Save Profile'}
        </button>
      </form>
    </div>
  )
}
