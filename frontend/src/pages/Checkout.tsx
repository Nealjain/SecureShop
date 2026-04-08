import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api'
import { getCart, saveCart } from '../store'
import SecurityBadge from '../components/SecurityBadge'

const EMPTY_ADDR = { full_name: '', phone: '', address_line1: '', address_line2: '', city: '', state: '', pincode: '' }
const EMPTY_CARD = { card_number: '', cvv: '', expiry: '', card_brand: 'Visa' }

export default function Checkout() {
  const [addr, setAddr] = useState(EMPTY_ADDR)
  const [card, setCard] = useState(EMPTY_CARD)
  const [saveDetails, setSaveDetails] = useState(true)
  const [hasSaved, setHasSaved] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const cart = getCart()
  const total = cart.reduce((s, i) => s + i.price * i.qty, 0)

  // Load saved profile on mount
  useEffect(() => {
    api.get('/profile').then(r => {
      if (r.data.address) {
        setAddr(r.data.address)
        setHasSaved(true)
      }
    }).catch(() => {})

    api.get('/profile/card-raw').then(r => {
      if (r.data.card) {
        const c = r.data.card
        setCard({ card_number: c.card_number || '', cvv: '', expiry: c.expiry || '', card_brand: c.card_brand || 'Visa' })
        setHasSaved(true)
      }
    }).catch(() => {})
  }, [])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    // Explicit validation so Full Name is always checked first
    if (!addr.full_name.trim()) { setError('Full Name is required'); return }
    if (!addr.phone.trim()) { setError('Phone is required'); return }
    if (!addr.address_line1.trim()) { setError('Address is required'); return }
    if (!card.card_number.trim()) { setError('Card number is required'); return }
    setLoading(true)
    try {
      // Save profile if checkbox checked
      if (saveDetails) {
        await api.post('/profile', {
          address: addr,
          saved_card: { card_number: card.card_number, expiry: card.expiry, card_brand: card.card_brand }
        }).catch(() => {})
      }

      const items = cart.map(i => ({ product_id: i.product_id, qty: i.qty, price: i.price }))
      const { data } = await api.post('/orders', { items, card_data: card, address: addr })
      setResult(data)
      saveCart([])
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Order failed')
    } finally {
      setLoading(false)
    }
  }

  if (result) return (
    <div className="max-w-lg mx-auto">
      <div className="card text-center">
        <div className="text-5xl mb-3">{result.fraud_result?.is_fraudulent ? '⚠️' : '✅'}</div>
        <h2 className="text-xl font-bold mb-1">
          {result.fraud_result?.is_fraudulent ? 'Order Flagged for Review' : 'Order Confirmed!'}
        </h2>
        <p className="text-gray-500 text-sm mb-4">
          Order ID: <code className="bg-gray-100 px-1 rounded text-xs">{result.order_id}</code>
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm mb-4">
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-gray-500 text-xs">Total</p>
            <p className="font-bold text-blue-600">₹{result.total?.toLocaleString()}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-gray-500 text-xs">Card (PCI DSS)</p>
            <p className="font-bold">****{result.card_last4}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-gray-500 text-xs">Risk Level</p>
            <p className={`font-bold capitalize ${
              result.fraud_result?.risk_level === 'low' ? 'text-green-600' :
              result.fraud_result?.risk_level === 'medium' ? 'text-yellow-600' : 'text-red-600'
            }`}>{result.fraud_result?.risk_level}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-gray-500 text-xs">ML Score</p>
            <p className="font-bold">{result.fraud_result?.ml_risk_score}</p>
          </div>
        </div>

        {result.fraud_result?.flags?.length > 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-left mb-4">
            <p className="text-yellow-800 font-medium text-sm mb-1">⚠ Fraud Flags:</p>
            {result.fraud_result.flags.map((f: string, i: number) => (
              <p key={i} className="text-yellow-700 text-xs">• {f}</p>
            ))}
          </div>
        )}

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-left mb-4">
          <p className="text-blue-800 font-semibold text-xs mb-1">🔐 Security Applied</p>
          <p className="text-blue-700 text-xs">• Card: AES-256-GCM encrypted · Token: {result.payment_token}</p>
          <p className="text-blue-700 text-xs break-all">• SHA-256 hash: {result.integrity_hash?.slice(0, 40)}...</p>
          <p className="text-blue-700 text-xs">• 3-layer fraud detection (Rules + IP/Device + Isolation Forest)</p>
        </div>

        <button onClick={() => navigate('/orders')} className="btn-primary w-full">View Orders</button>
      </div>
    </div>
  )

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Checkout</h1>

      {/* Order Summary */}
      <div className="card mb-4">
        <h2 className="font-semibold mb-3">Order Summary</h2>
        {cart.map(i => (
          <div key={i.product_id} className="flex items-center justify-between text-sm py-2">
            <div className="flex items-center gap-3">
              <img src={i.image} alt={i.name} className="w-12 h-12 object-cover rounded bg-gray-100 flex-shrink-0" />
              <span>{i.name} × {i.qty}</span>
            </div>
            <span className="font-medium">₹{(i.price * i.qty).toLocaleString()}</span>
          </div>
        ))}
        <div className="border-t mt-2 pt-2 flex justify-between font-bold">
          <span>Total</span>
          <span className="text-blue-600">₹{total.toLocaleString()}</span>
        </div>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 mb-4 text-sm">{error}</div>}

      {hasSaved && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4 text-sm text-green-700">
          ✓ Pre-filled from your saved profile. Update below if needed.
        </div>
      )}

      <form onSubmit={submit} className="space-y-4">
        {/* Delivery Address */}
        <div className="card">
          <h2 className="font-semibold mb-3">Delivery Address</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
              <input className="input" required value={addr.full_name}
                onChange={e => setAddr({...addr, full_name: e.target.value})} placeholder="Your full name" />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
              <input className="input" required type="tel" value={addr.phone}
                onChange={e => setAddr({...addr, phone: e.target.value})} placeholder="+91 98765 43210" />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Address Line 1</label>
              <input className="input" required value={addr.address_line1}
                onChange={e => setAddr({...addr, address_line1: e.target.value})} placeholder="House/Flat No, Street" />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Address Line 2 (optional)</label>
              <input className="input" value={addr.address_line2}
                onChange={e => setAddr({...addr, address_line2: e.target.value})} placeholder="Landmark, Area" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
              <input className="input" required value={addr.city}
                onChange={e => setAddr({...addr, city: e.target.value})} placeholder="Mumbai" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
              <input className="input" required value={addr.state}
                onChange={e => setAddr({...addr, state: e.target.value})} placeholder="Maharashtra" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Pincode</label>
              <input className="input" required maxLength={6} value={addr.pincode}
                onChange={e => setAddr({...addr, pincode: e.target.value})} placeholder="400001" />
            </div>
          </div>
        </div>

        {/* Payment */}
        <div className="card">
          <h2 className="font-semibold mb-1">Payment Details</h2>
          <SecurityBadge title="🔒 Payment Security" items={[
            { label: "AES-256-GCM Encryption", color: "blue" },
            { label: "Luhn Validation", color: "blue" },
            { label: "PCI DSS Tokenization", color: "green" },
            { label: "Raw card never stored", color: "green" },
            { label: "Isolation Forest ML", color: "purple" },
            { label: "3-Layer Fraud Detection", color: "purple" },
          ]} />
          <div className="space-y-3 mt-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Card Number</label>
              <input className="input font-mono" placeholder="4111 1111 1111 1111" required
                value={card.card_number} onChange={e => setCard({...card, card_number: e.target.value.replace(/\s/g,'')})} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="col-span-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">Expiry</label>
                <input className="input" placeholder="MM/YY" required
                  value={card.expiry} onChange={e => setCard({...card, expiry: e.target.value})} />
              </div>
              <div className="col-span-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">CVV</label>
                <input className="input" placeholder="123" maxLength={4} required
                  value={card.cvv} onChange={e => setCard({...card, cvv: e.target.value})} />
              </div>
              <div className="col-span-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">Brand</label>
                <select className="input" value={card.card_brand} onChange={e => setCard({...card, card_brand: e.target.value})}>
                  <option>Visa</option><option>Mastercard</option><option>Amex</option><option>RuPay</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Save details checkbox */}
        <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
          <input type="checkbox" checked={saveDetails} onChange={e => setSaveDetails(e.target.checked)}
            className="rounded border-gray-300" />
          Save address & card for next time (card stored AES-256-GCM encrypted)
        </label>

        <button type="submit" className="btn-primary w-full py-3 text-base" disabled={loading}>
          {loading ? 'Processing securely...' : `Pay ₹${total.toLocaleString()}`}
        </button>
      </form>
    </div>
  )
}
