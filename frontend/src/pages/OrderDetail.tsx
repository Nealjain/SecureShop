import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api from '../api'
import SecurityBadge from '../components/SecurityBadge'

export default function OrderDetail() {
  const { id } = useParams()
  const [order, setOrder] = useState<any>(null)
  const [verify, setVerify] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    Promise.all([
      api.get(`/orders/${id}`),
      api.get(`/orders/${id}/verify`)
    ]).then(([o, v]) => {
      setOrder(o.data)
      setVerify(v.data)
    }).finally(() => setLoading(false))
  }, [id])

  if (loading) return <div className="text-center py-20 text-gray-400">Loading...</div>
  if (!order) return <div className="text-center py-20 text-gray-400">Order not found</div>

  return (
    <div className="max-w-2xl mx-auto">
      <button onClick={() => navigate('/orders')} className="text-blue-600 hover:underline text-sm mb-4 block">← Back to Orders</button>
      <h1 className="text-2xl font-bold mb-4">Order Details</h1>

      <SecurityBadge title="🔒 Security Applied" items={[
        { label: "AES-256-GCM Card Encryption", color: "blue" },
        { label: "PCI DSS Tokenization", color: "blue" },
        { label: "SHA-256 Integrity Hash", color: "green" },
        { label: "Composite Record Hash", color: "green" },
        { label: "Isolation Forest ML", color: "purple" },
        { label: "Rule Engine (4 rules)", color: "purple" },
        { label: "IP + Device Fingerprint", color: "orange" },
      ]} />

      <div className="grid grid-cols-2 gap-4 mt-4 mb-4">
        <div className="card">
          <p className="text-xs text-gray-500 mb-1">Status</p>
          <span className={order.status === 'confirmed' ? 'badge-green' : 'badge-red'}>{order.status}</span>
        </div>
        <div className="card">
          <p className="text-xs text-gray-500 mb-1">Total</p>
          <p className="text-xl font-bold text-blue-600">₹{order.total?.toLocaleString()}</p>
        </div>
      </div>

      {/* Integrity Verification */}
      {verify && (
        <div className="card mb-4">
          <h2 className="font-semibold mb-3">🔐 Dual Integrity Verification</h2>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className={`p-3 rounded-lg ${verify.record_hash_valid ? 'bg-green-50' : 'bg-red-50'}`}>
              <p className="font-medium text-xs text-gray-600 mb-1">Composite Record Hash</p>
              <p className="text-xs text-gray-500 mb-1">SHA-256 of all document fields</p>
              <p className={`font-bold ${verify.record_hash_valid ? 'text-green-700' : 'text-red-700'}`}>
                {verify.record_hash_valid ? '✓ Valid — Not Tampered' : '✗ TAMPERED'}
              </p>
            </div>
            <div className={`p-3 rounded-lg ${verify.integrity_hash_valid ? 'bg-green-50' : 'bg-red-50'}`}>
              <p className="font-medium text-xs text-gray-600 mb-1">Order Integrity Hash</p>
              <p className="text-xs text-gray-500 mb-1">SHA-256 of canonical order JSON</p>
              <p className={`font-bold ${verify.integrity_hash_valid ? 'text-green-700' : 'text-red-700'}`}>
                {verify.integrity_hash_valid ? '✓ Valid — Not Tampered' : '✗ TAMPERED'}
              </p>
            </div>
          </div>
          <div className={`mt-3 p-2 rounded text-center font-bold text-sm ${verify.overall_status === 'VALID' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
            Overall: {verify.overall_status}
          </div>
        </div>
      )}

      {/* Fraud Detection */}
      {order.fraud_result && (
        <div className="card mb-4">
          <h2 className="font-semibold mb-3">🤖 Fraud Detection — 3-Layer Engine</h2>
          <div className="grid grid-cols-3 gap-3 text-sm mb-3">
            <div className="bg-gray-50 p-2 rounded text-center">
              <p className="text-gray-500 text-xs">Rule Engine</p>
              <p className="font-bold text-lg">{order.fraud_result.rule_risk_score}</p>
              <p className="text-xs text-gray-400">/ 100</p>
            </div>
            <div className="bg-gray-50 p-2 rounded text-center">
              <p className="text-gray-500 text-xs">Isolation Forest</p>
              <p className="font-bold text-lg">{order.fraud_result.ml_risk_score}</p>
              <p className="text-xs text-gray-400">ML score</p>
            </div>
            <div className="bg-gray-50 p-2 rounded text-center">
              <p className="text-gray-500 text-xs">Combined Risk</p>
              <p className={`font-bold text-lg ${order.fraud_result.combined_risk_score > 0.55 ? 'text-red-600' : order.fraud_result.combined_risk_score > 0.30 ? 'text-yellow-600' : 'text-green-600'}`}>
                {order.fraud_result.combined_risk_score}
              </p>
              <p className="text-xs text-gray-400">threshold: 0.55</p>
            </div>
          </div>
          <div className="text-xs text-gray-500 bg-gray-50 rounded p-2 mb-2">
            Formula: (Rule×0.40) + (Identity×0.20) + (ML×0.40) — Identity score: {order.fraud_result.identity_risk_score ?? 'N/A'}
          </div>
          {order.fraud_result.flags?.length > 0 && (
            <div className="bg-yellow-50 rounded-lg p-3">
              <p className="text-yellow-800 font-medium text-xs mb-1">Flags triggered:</p>
              {order.fraud_result.flags.map((f: string, i: number) => (
                <p key={i} className="text-yellow-800 text-xs">• {f}</p>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Items */}
      <div className="card mb-4">
        <h2 className="font-semibold mb-3">Items</h2>
        {order.items?.map((item: any, i: number) => (
          <div key={i} className="flex justify-between py-2 border-b last:border-0 text-sm">
            <span>{item.name} × {item.qty}</span>
            <span className="font-medium">₹{item.line_total?.toLocaleString()}</span>
          </div>
        ))}
      </div>

      {/* Security Details */}
      <div className="card bg-blue-50 border-blue-200">
        <h2 className="font-semibold mb-2 text-blue-800">🔒 Security Details</h2>
        <div className="text-xs text-blue-700 space-y-1">
          <p>Payment Token (PCI DSS): <code className="bg-blue-100 px-1 rounded">{order.payment_token}</code></p>
          <p>Card stored as: ****{order.card_last4} (raw number AES-256-GCM encrypted in vault)</p>
          <p className="break-all">SHA-256 Integrity Hash: <code className="bg-blue-100 px-1 rounded">{order.integrity_hash}</code></p>
        </div>
      </div>
    </div>
  )
}
