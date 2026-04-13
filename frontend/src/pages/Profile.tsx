import { useState, useEffect } from 'react'
import api from '../api'
import SecurityBadge from '../components/SecurityBadge'

export default function Profile() {
  const [addr, setAddr] = useState({ full_name: '', phone: '', address_line1: '', address_line2: '', city: '', state: '', pincode: '' })
  const [card, setCard] = useState({ card_number: '', expiry: '', card_brand: 'Visa' })
  const [newCard, setNewCard] = useState('')
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(false)
  const [me, setMe] = useState<any>(null)
  const [otpUri, setOtpUri] = useState('')
  const [showQR, setShowQR] = useState(false)

  useEffect(() => {
    api.get('/auth/me').then(r => setMe(r.data)).catch(() => {})
    api.get('/profile').then(r => { if (r.data.address) setAddr(r.data.address) }).catch(() => {})
    api.get('/profile/card-raw').then(r => {
      if (r.data.card?.card_number) setCard({ card_number: r.data.card.card_number, expiry: r.data.card.expiry || '', card_brand: r.data.card.card_brand || 'Visa' })
    }).catch(() => {})
  }, [])

  async function save(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const cardToSave = newCard ? { card_number: newCard.replace(/\s/g,''), expiry: card.expiry, card_brand: card.card_brand } : (card.card_number ? card : undefined)
      await api.post('/profile', { address: addr, ...(cardToSave ? { saved_card: cardToSave } : {}) })
      if (newCard) { setCard({ ...card, card_number: newCard.replace(/\s/g,'') }); setNewCard('') }
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch {}
    setLoading(false)
  }

  async function deleteCard() {
    if (!confirm('Remove saved card?')) return
    setLoading(true)
    try {
      await api.post('/profile', { address: addr, delete_card: true })
      setCard({ card_number: '', expiry: '', card_brand: 'Visa' })
      setNewCard('')
    } catch {}
    setLoading(false)
  }

  async function getOtpQR() {
    try {
      const r = await api.get('/profile/otp-uri')
      setOtpUri(r.data.otp_uri)
      setShowQR(true)
    } catch { alert('Could not load QR code') }
  }

  const roleBadge = me?.role === 'admin'
    ? <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-blue-100 text-blue-800">Admin</span>
    : <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-green-100 text-green-800">Customer</span>

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
              <div className="flex gap-2 mt-1 flex-wrap">
                {roleBadge}
                {me.mfa_enabled && <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-blue-100 text-blue-800">MFA On</span>}
                <span className={me.integrity_status === 'ok' ? 'badge-green' : 'badge-red'}>
                  {me.integrity_status === 'ok' ? '✓ Record Hash OK' : '⚠ Tampered'}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      <SecurityBadge title="Profile Security" items={[
        { label: "Address: AES-256-GCM encrypted", color: "blue" },
        { label: "Card: AES-256-GCM encrypted", color: "blue" },
        { label: "SHA-256 record hash", color: "green" },
        { label: "Convex DB: single data column", color: "purple" },
      ]} />

      {saved && <div className="bg-green-50 border border-green-200 text-green-700 rounded-lg p-3 mt-4 text-sm">Profile saved successfully.</div>}

      <form onSubmit={save} className="space-y-4 mt-4">
        {/* Address */}
        <div className="card">
          <h2 className="font-semibold mb-3">Saved Address</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
              <input className="input" autoComplete="name" aria-label="Full name"
                value={addr.full_name} onChange={e => setAddr({...addr, full_name: e.target.value})} placeholder="Your full name" />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
              <input className="input" type="tel" autoComplete="tel" aria-label="Phone number"
                value={addr.phone} onChange={e => setAddr({...addr, phone: e.target.value})} placeholder="+91 98765 43210" />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Address Line 1</label>
              <input className="input" autoComplete="address-line1" aria-label="Address line 1"
                value={addr.address_line1} onChange={e => setAddr({...addr, address_line1: e.target.value})} placeholder="House/Flat No, Street" />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Address Line 2</label>
              <input className="input" autoComplete="address-line2" aria-label="Address line 2"
                value={addr.address_line2} onChange={e => setAddr({...addr, address_line2: e.target.value})} placeholder="Landmark, Area" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
              <input className="input" autoComplete="address-level2" aria-label="City"
                value={addr.city} onChange={e => setAddr({...addr, city: e.target.value})} placeholder="Mumbai" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
              <input className="input" autoComplete="address-level1" aria-label="State"
                value={addr.state} onChange={e => setAddr({...addr, state: e.target.value})} placeholder="Maharashtra" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Pincode</label>
              <input className="input" maxLength={6} autoComplete="postal-code" aria-label="Pincode"
                value={addr.pincode} onChange={e => setAddr({...addr, pincode: e.target.value})} placeholder="400001" />
            </div>
          </div>
        </div>

        {/* Card */}
        <div className="card">
          <h2 className="font-semibold mb-1">Saved Card</h2>
          <p className="text-xs text-gray-500 mb-3">Stored AES-256-GCM encrypted. CVV is never saved.</p>
          {card.card_number ? (
            <div className="bg-gray-50 rounded-lg p-3 mb-3 flex items-center justify-between">
              <div>
                <p className="font-medium text-sm">{card.card_brand} **** **** **** {card.card_number.slice(-4)}</p>
                <p className="text-xs text-gray-500">Expires {card.expiry}</p>
              </div>
              <button type="button" onClick={deleteCard} className="text-xs text-red-500 hover:text-red-700 hover:underline">Remove card</button>
            </div>
          ) : (
            <p className="text-sm text-gray-400 mb-3">No card saved.</p>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">{card.card_number ? 'Replace Card Number' : 'Card Number'}</label>
              <input className="input font-mono" autoComplete="cc-number" aria-label="Card number"
                placeholder="4111 1111 1111 1111" value={newCard}
                onChange={e => setNewCard(e.target.value.replace(/[^\d\s]/g,'').slice(0,19))} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Expiry</label>
              <input className="input" autoComplete="cc-exp" aria-label="Card expiry"
                value={card.expiry} onChange={e => setCard({...card, expiry: e.target.value})} placeholder="MM/YY" maxLength={5} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Brand</label>
              <select className="input" value={card.card_brand} onChange={e => setCard({...card, card_brand: e.target.value})}>
                <option>Visa</option><option>Mastercard</option><option>Amex</option><option>RuPay</option>
              </select>
            </div>
          </div>
        </div>

        {/* MFA */}
        <div className="card">
          <h2 className="font-semibold mb-1">Two-Factor Authentication (TOTP)</h2>
          <p className="text-xs text-gray-500 mb-3">
            {me?.mfa_enabled ? 'MFA is enabled on your account.' : 'MFA is not yet enabled. Scan the QR code with Google Authenticator or Authy.'}
          </p>
          <button type="button" onClick={getOtpQR} className="btn-secondary text-sm py-1.5 px-3">
            {me?.mfa_enabled ? 'Re-scan QR Code' : 'Set Up MFA'}
          </button>
          {showQR && otpUri && (
            <div className="mt-3 p-3 bg-blue-50 rounded-lg text-center">
              <p className="text-xs text-blue-700 mb-2">Scan with your Authenticator app:</p>
              <img src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(otpUri)}`}
                alt="TOTP QR Code" className="mx-auto rounded" />
              <button type="button" onClick={() => setShowQR(false)} className="text-xs text-gray-500 mt-2 hover:underline">Hide</button>
            </div>
          )}
        </div>

        <button type="submit" className="btn-primary w-full" disabled={loading}>
          {loading ? 'Saving...' : 'Save Profile'}
        </button>
      </form>
    </div>
  )
}
