import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api'
import SecurityBadge from '../components/SecurityBadge'

interface Order {
  id: string; total: number; status: string; card_last4: string
  created_at: string; integrity_status: string; fraud_result: any; items: any[]
}

export default function Orders() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    api.get('/orders')
      .then(r => setOrders(r.data))
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="text-center py-20 text-gray-400 animate-pulse">Loading orders...</div>
  if (error) return (
    <div className="text-center py-20">
      <div className="text-5xl mb-4">⚠️</div>
      <h2 className="text-lg font-semibold text-gray-700 mb-2">Could not load orders</h2>
      <button onClick={() => window.location.reload()} className="btn-secondary mt-2">Retry</button>
    </div>
  )

  if (orders.length === 0) return (
    <div className="text-center py-20">
      <div className="text-6xl mb-4">📦</div>
      <h2 className="text-xl font-semibold text-gray-700 mb-2">No orders yet</h2>
      <button onClick={() => navigate('/shop')} className="btn-primary mt-2">Start Shopping</button>
    </div>
  )

  return (
    <div>
      <h1 className="text-2xl font-bold mb-2">My Orders</h1>
      <SecurityBadge title="🔒 Order Security" items={[
        { label: "SHA-256 Integrity Hash", color: "blue" },
        { label: "Composite Record Hash", color: "blue" },
        { label: "Tamper Detection on Read", color: "green" },
        { label: "PCI DSS Tokenization", color: "green" },
        { label: "Isolation Forest Fraud ML", color: "purple" },
      ]} />
      <div className="space-y-4 mt-4">
        {orders.map(o => (
          <div key={o.id} className="card hover:shadow-md transition-shadow cursor-pointer"
            onClick={() => navigate(`/orders/${o.id}`)}>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900">Order #{o.id.slice(-8)}</p>
                <p className="text-sm text-gray-500">{o.created_at ? new Date(o.created_at).toLocaleString() : '—'}</p>
                <p className="text-xs text-gray-400 mt-0.5">{o.items?.length || 0} item(s) · Card ****{o.card_last4}</p>
              </div>
              <div className="text-right">
                <p className="text-xl font-bold text-blue-600">₹{o.total?.toLocaleString()}</p>
                <div className="flex gap-2 mt-1 justify-end flex-wrap">
                  <span className={o.status === 'confirmed' ? 'badge-green' : o.status === 'flagged' ? 'badge-red' : 'badge-yellow'}>
                    {o.status}
                  </span>
                  <span className={o.integrity_status === 'ok' ? 'badge-green' : 'badge-red'} title="SHA-256 record hash">
                    {o.integrity_status === 'ok' ? '✓ Hash OK' : '⚠ Tampered'}
                  </span>
                </div>
              </div>
            </div>
            {o.fraud_result && (
              <div className="mt-2 pt-2 border-t flex gap-4 text-xs text-gray-500 flex-wrap">
                <span>Risk: <strong className={`capitalize ${o.fraud_result.risk_level === 'low' ? 'text-green-600' : o.fraud_result.risk_level === 'medium' ? 'text-yellow-600' : 'text-red-600'}`}>{o.fraud_result.risk_level}</strong></span>
                <span>ML Score: <strong>{o.fraud_result.ml_risk_score}</strong></span>
                <span>Combined: <strong>{o.fraud_result.combined_risk_score}</strong></span>
                {o.fraud_result.flags?.length > 0 && <span className="text-red-500">{o.fraud_result.flags.length} flag(s)</span>}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
