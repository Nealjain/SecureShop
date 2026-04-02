import { useEffect, useState } from 'react'
import api from '../api'
import SecurityBadge from '../components/SecurityBadge'

type Tab = 'stats' | 'users' | 'orders' | 'logs' | 'integrity'

function OrderCard({ order, onStatusChange }: { order: any; onStatusChange: (id: string, status: string) => void }) {
  const [expanded, setExpanded] = useState(false)
  const [detail, setDetail] = useState<any>(null)
  const [updating, setUpdating] = useState(false)

  async function loadDetail() {
    if (detail) { setExpanded(!expanded); return }
    try {
      const { data } = await api.get(`/admin/orders/${order.id}`)
      setDetail(data)
      setExpanded(true)
    } catch {}
  }

  async function updateStatus(status: string) {
    setUpdating(true)
    try {
      await api.patch(`/admin/orders/${order.id}/status`, { status })
      onStatusChange(order.id, status)
    } catch (e: any) {
      alert(e.response?.data?.detail || 'Failed')
    } finally { setUpdating(false) }
  }

  const riskColor = order.fraud_result?.risk_level === 'low' ? 'text-green-600'
    : order.fraud_result?.risk_level === 'medium' ? 'text-yellow-600' : 'text-red-600'

  return (
    <div className="card">
      {/* Header row */}
      <div className="flex items-start justify-between">
        <div>
          <p className="font-semibold">Order #{order.id?.slice(-8)}</p>
          <p className="text-xs text-gray-500">{order.timestamp ? new Date(order.timestamp).toLocaleString() : '—'}</p>
        </div>
        <div className="flex gap-2 flex-wrap justify-end items-center">
          <span className={order.status === 'confirmed' ? 'badge-green' : order.status === 'flagged' ? 'badge-red' : order.status === 'delivered' ? 'badge-blue' : 'badge-yellow'}>
            {order.status}
          </span>
          <span className={order.integrity_status === 'ok' ? 'badge-green' : 'badge-red'}>
            {order.integrity_status === 'ok' ? '✓ Hash' : '⚠ Tampered'}
          </span>
        </div>
      </div>

      {/* Summary row */}
      <div className="flex gap-4 text-xs text-gray-500 flex-wrap mt-2">
        <span className="font-semibold text-gray-800">₹{order.total?.toLocaleString()}</span>
        <span>Card: ****{order.card_last4}</span>
        <span>Risk: <strong className={`capitalize ${riskColor}`}>{order.fraud_result?.risk_level}</strong></span>
        <span>ML: {order.fraud_result?.ml_risk_score}</span>
        <span>Combined: {order.fraud_result?.combined_risk_score}</span>
      </div>

      {/* Fraud flags */}
      {order.fraud_result?.flags?.length > 0 && (
        <div className="mt-2 text-xs text-red-600 bg-red-50 rounded p-2">
          {order.fraud_result.flags.map((f: string, i: number) => <p key={i}>• {f}</p>)}
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-2 mt-3 flex-wrap">
        <button onClick={loadDetail} className="text-xs px-3 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 font-medium">
          {expanded ? '▲ Hide Details' : '▼ View Full Details'}
        </button>
        {order.status === 'flagged' && (
          <button onClick={() => updateStatus('confirmed')} disabled={updating}
            className="text-xs px-3 py-1.5 rounded-lg bg-green-600 hover:bg-green-700 text-white font-medium disabled:opacity-50">
            ✓ Confirm Order
          </button>
        )}
        {order.status === 'confirmed' && (
          <button onClick={() => updateStatus('shipped')} disabled={updating}
            className="text-xs px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium disabled:opacity-50">
            📦 Mark Shipped
          </button>
        )}
        {order.status === 'shipped' && (
          <button onClick={() => updateStatus('delivered')} disabled={updating}
            className="text-xs px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-medium disabled:opacity-50">
            ✅ Mark Delivered
          </button>
        )}
        {(order.status === 'confirmed' || order.status === 'flagged') && (
          <button onClick={() => updateStatus('cancelled')} disabled={updating}
            className="text-xs px-3 py-1.5 rounded-lg bg-red-100 hover:bg-red-200 text-red-700 font-medium disabled:opacity-50">
            ✕ Cancel
          </button>
        )}
      </div>

      {/* Expanded detail */}
      {expanded && detail && (
        <div className="mt-4 border-t pt-4 space-y-3">
          {/* Items */}
          <div>
            <p className="text-xs font-semibold text-gray-600 uppercase mb-2">Items Ordered</p>
            <div className="space-y-1">
              {detail.items?.map((item: any, i: number) => (
                <div key={i} className="flex justify-between text-sm bg-gray-50 rounded px-3 py-1.5">
                  <span>{item.name} × {item.qty}</span>
                  <span className="font-medium">₹{item.line_total?.toLocaleString()}</span>
                </div>
              ))}
              <div className="flex justify-between text-sm font-bold px-3 py-1">
                <span>Total</span>
                <span className="text-blue-600">₹{detail.total?.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Delivery address */}
          {detail.address && (
            <div>
              <p className="text-xs font-semibold text-gray-600 uppercase mb-2">Delivery Address</p>
              <div className="bg-gray-50 rounded p-3 text-sm">
                <p className="font-medium">{detail.address.full_name}</p>
                <p className="text-gray-600">{detail.address.phone}</p>
                <p className="text-gray-600">{detail.address.address_line1}{detail.address.address_line2 ? ', ' + detail.address.address_line2 : ''}</p>
                <p className="text-gray-600">{detail.address.city}, {detail.address.state} - {detail.address.pincode}</p>
              </div>
            </div>
          )}

          {/* Security info */}
          <div>
            <p className="text-xs font-semibold text-gray-600 uppercase mb-2">Security Details</p>
            <div className="bg-blue-50 rounded p-3 text-xs text-blue-700 space-y-1">
              <p>Payment Token (PCI DSS): <code className="bg-blue-100 px-1 rounded">{detail.payment_token}</code></p>
              <p>Card: ****{detail.card_last4} ({detail.card_brand}) — raw number AES-256-GCM encrypted in vault</p>
              <p>IP: {detail.ip_address || '—'}</p>
              <p className="break-all">Integrity Hash: {detail.integrity_hash}</p>
              <p>Record Hash: <span className={detail.integrity_status === 'ok' ? 'text-green-700 font-medium' : 'text-red-700 font-medium'}>{detail.integrity_status === 'ok' ? '✓ Valid' : '⚠ Tampered'}</span></p>
            </div>
          </div>

          {/* Fraud detail */}
          {detail.fraud_result && (
            <div>
              <p className="text-xs font-semibold text-gray-600 uppercase mb-2">Fraud Analysis</p>
              <div className="grid grid-cols-4 gap-2 text-xs mb-2">
                {[
                  ['Rule Score', detail.fraud_result.rule_risk_score],
                  ['Identity Score', detail.fraud_result.identity_risk_score],
                  ['ML Score', detail.fraud_result.ml_risk_score],
                  ['Combined', detail.fraud_result.combined_risk_score],
                ].map(([label, val]) => (
                  <div key={label as string} className="bg-gray-50 rounded p-2 text-center">
                    <p className="text-gray-500">{label}</p>
                    <p className="font-bold">{val ?? '—'}</p>
                  </div>
                ))}
              </div>
              {detail.fraud_result.flags?.length > 0 && (
                <div className="bg-yellow-50 rounded p-2 text-xs text-yellow-800">
                  {detail.fraud_result.flags.map((f: string, i: number) => <p key={i}>• {f}</p>)}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function Admin() {
  const [tab, setTab] = useState<Tab>('stats')
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  async function load(t: Tab) {
    setTab(t)
    setLoading(true)
    setData(null)
    try {
      const endpoints: Record<Tab, string> = {
        stats: '/admin/stats', users: '/admin/users', orders: '/admin/orders',
        logs: '/admin/audit-logs', integrity: '/admin/integrity-report'
      }
      const { data } = await api.get(endpoints[t])
      setData(data)
    } catch { setData({ error: 'Failed to load' }) }
    finally { setLoading(false) }
  }

  useEffect(() => { load('stats') }, [])

  const tabs: { key: Tab; label: string }[] = [
    { key: 'stats', label: '📊 Stats' },
    { key: 'users', label: '👥 Users' },
    { key: 'orders', label: '📦 Orders' },
    { key: 'logs', label: '📋 Audit Logs' },
    { key: 'integrity', label: '🔐 Integrity Report' },
  ]

  const riskColor = (r: string) => r === 'critical' || r === 'high' ? 'badge-red' : r === 'medium' ? 'badge-yellow' : 'badge-green'

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-2xl font-bold">Admin Dashboard</h1>
        <span className="badge-blue text-xs">RBAC: admin role required</span>
      </div>

      <SecurityBadge title="🔒 Admin Security" items={[
        { label: "JWT HS256 Auth", color: "blue" },
        { label: "RBAC: admin role", color: "blue" },
        { label: "SHA-256 Record Hash on all docs", color: "green" },
        { label: "Audit Log: every action", color: "green" },
        { label: "Session Timeout: 30 min", color: "orange" },
        { label: "Device Fingerprint Check", color: "purple" },
        { label: "Convex DB: tamper-evident", color: "purple" },
      ]} />

      <div className="flex gap-2 my-4 flex-wrap">
        {tabs.map(t => (
          <button key={t.key} onClick={() => load(t.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === t.key ? 'bg-blue-600 text-white' : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
            }`}>{t.label}</button>
        ))}
      </div>

      {loading && <div className="text-center py-10 text-gray-400">Loading...</div>}

      {!loading && data && (
        <>
          {/* ── STATS ── */}
          {tab === 'stats' && !Array.isArray(data) && (
            <div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
                {Object.entries(data).filter(([k]) => k !== 'error').map(([k, v]) => (
                  <div key={k} className="card text-center">
                    <p className="text-3xl font-bold text-blue-600">{String(v)}</p>
                    <p className="text-gray-500 text-sm capitalize mt-1">{k.replace(/_/g, ' ')}</p>
                  </div>
                ))}
              </div>
              <div className="card bg-gray-50">
                <p className="text-xs font-semibold text-gray-500 uppercase mb-3">Security Architecture</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  {[
                    { title: "Password Hashing", desc: "PBKDF2-HMAC-SHA256, 310,000 iterations, 16-byte salt (NIST SP 800-132)" },
                    { title: "Symmetric Encryption", desc: "AES-256-GCM — card data, OTP secrets. 12-byte random IV per encryption" },
                    { title: "Session Tokens", desc: "JWT HS256, 60 min expiry, 30 min inactivity timeout, device fingerprint binding" },
                    { title: "Multi-Factor Auth", desc: "TOTP RFC 6238 via pyotp, ±1 window clock drift, AES-encrypted secret storage" },
                    { title: "Fraud Detection", desc: "3-layer: Rule Engine (4 rules) + IP/Device check + Isolation Forest ML (8 features)" },
                    { title: "Tamper Detection", desc: "SHA-256 composite record hash on every document in all 6 collections" },
                    { title: "Payment Security", desc: "PCI DSS tokenization, Luhn validation, AES-256-GCM card encryption in vault" },
                    { title: "Rate Limiting", desc: "slowapi per-IP: login 5/min, register 3/min, products 100/min" },
                  ].map(item => (
                    <div key={item.title} className="bg-white rounded-lg p-3 border border-gray-200">
                      <p className="font-semibold text-gray-800 mb-0.5">{item.title}</p>
                      <p className="text-gray-500">{item.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── USERS ── */}
          {tab === 'users' && Array.isArray(data) && (
            <div className="space-y-3">
              {data.map((u: any) => (
                <div key={u.id} className="card">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{u.name}</p>
                      <p className="text-sm text-gray-500">{u.email}</p>
                      <p className="text-xs text-gray-400">
                        Last login: {u.last_login ? new Date(u.last_login).toLocaleString() : 'Never'} ·
                        Failed attempts: {u.failed_login_attempts}
                      </p>
                    </div>
                    <div className="flex gap-2 flex-wrap justify-end">
                      <span className={u.role === 'admin' ? 'badge-blue' : 'badge-green'}>{u.role}</span>
                      {u.mfa_enabled && <span className="badge-blue" title="TOTP RFC 6238">🔑 MFA</span>}
                      <span className={u.integrity_status === 'ok' ? 'badge-green' : 'badge-red'}
                        title="SHA-256 composite record hash">
                        {u.integrity_status === 'ok' ? '✓ Hash OK' : '⚠ Tampered'}
                      </span>
                    </div>
                  </div>
                  <div className="mt-2 text-xs text-gray-400 flex gap-3 flex-wrap">
                    <span>Password: PBKDF2-HMAC-SHA256</span>
                    <span>OTP: AES-256-GCM encrypted</span>
                    <span>Record: SHA-256 hash</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ── ORDERS ── */}
          {tab === 'orders' && Array.isArray(data) && (
            <div className="space-y-4">
              {data.map((o: any) => (
                <OrderCard key={o.id} order={o} onStatusChange={() => load('orders')} />
              ))}
            </div>
          )}

          {/* ── AUDIT LOGS ── */}
          {tab === 'logs' && Array.isArray(data) && (
            <div className="space-y-2">
              <p className="text-xs text-gray-500 mb-2">Every action logged with SHA-256 record hash — immutable audit trail</p>
              {data.map((l: any) => (
                <div key={l.id} className="card py-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className={riskColor(l.risk_level)}>{l.risk_level}</span>
                      <span className="font-mono text-sm font-medium">{l.action}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={l.integrity_status === 'ok' ? 'badge-green' : 'badge-red'} title="Log record hash">
                        {l.integrity_status === 'ok' ? '✓' : '⚠'}
                      </span>
                      <span className="text-xs text-gray-400">{new Date(l.timestamp).toLocaleString()}</span>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">{l.details}</p>
                  {l.ip && <p className="text-xs text-gray-400">IP: {l.ip}</p>}
                </div>
              ))}
            </div>
          )}

          {/* ── INTEGRITY REPORT ── */}
          {tab === 'integrity' && !Array.isArray(data) && data.overall_status && (
            <div>
              <div className={`card mb-4 text-center ${data.overall_status === 'CLEAN' ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                <p className="text-3xl mb-1">{data.overall_status === 'CLEAN' ? '✅' : '⚠️'}</p>
                <p className={`text-xl font-bold ${data.overall_status === 'CLEAN' ? 'text-green-700' : 'text-red-700'}`}>
                  {data.overall_status}
                </p>
                <p className="text-sm text-gray-600">{data.total_documents} documents scanned · {data.total_tampered} tampered</p>
                <p className="text-xs text-gray-500 mt-1">Algorithm: SHA-256 composite hash of all document fields</p>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {Object.entries(data.collections || {}).map(([name, info]: [string, any]) => (
                  <div key={name} className={`card ${info.status !== 'CLEAN' ? 'border-red-300 bg-red-50' : ''}`}>
                    <p className="font-medium capitalize">{name}</p>
                    <p className="text-sm text-gray-500">{info.total} documents</p>
                    <span className={info.status === 'CLEAN' ? 'badge-green' : 'badge-red'}>{info.status}</span>
                    {info.tampered > 0 && <p className="text-xs text-red-600 mt-1">{info.tampered} tampered IDs</p>}
                    {info.error && <p className="text-xs text-red-600 mt-1">{info.error}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
