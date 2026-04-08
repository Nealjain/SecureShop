import { useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { ShoppingBag, CheckCircle, AlertTriangle, Plus, ShoppingCart } from 'lucide-react'
import api from '../api'
import { getCart, saveCart } from '../store'
import SecurityBadge from '../components/SecurityBadge'

interface Product {
  id: string; name: string; price: number; category: string
  description: string; stock: number; image: string; integrity_status: string
}

const CATEGORY_EMOJI: Record<string, string> = {
  'Electronics': '📱', 'Accessories': '👜', 'Bags': '👝', 'Beauty': '💄',
  'Home & Living': '🏠', 'Jewelry': '💍', 'Kids': '🧸', "Men's Fashion": '👔',
  'Shoes': '👟', "Women's Fashion": '👗', 'Storage': '💾'
}

function ProductImage({ src, category, name }: { src: string; category: string; name: string }) {
  const [failed, setFailed] = useState(false)
  const emoji = CATEGORY_EMOJI[category] || '📦'
  if (!src || failed) return <div className="text-6xl">{emoji}</div>
  return <img src={src} alt={name} className="w-full h-full object-cover group-hover:scale-105 transition-transform"
    onError={() => setFailed(true)} loading="lazy" />
}

export default function Home() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [added, setAdded] = useState<string | null>(null)
  const [toast, setToast] = useState('')
  const navigate = useNavigate()
  const location = useLocation()
  const unauthorized = new URLSearchParams(location.search).get('reason') === 'unauthorized'

  useEffect(() => {
    api.get('/products')
      .then(r => setProducts(r.data))
      .catch(e => console.error("Fetch error:", e))
      .finally(() => setLoading(false))
  }, [])

  function addToCart(p: Product) {
    const cart = getCart()
    const existing = cart.find(i => i.product_id === p.id)
    if (existing) {
      existing.qty += 1
    } else {
      cart.push({ product_id: p.id, name: p.name, price: p.price, qty: 1, image: p.image })
    }
    saveCart(cart)
    setAdded(p.id)
    setToast(`"${p.name}" added to cart`)
    setTimeout(() => setAdded(null), 1500)
    setTimeout(() => setToast(''), 2500)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-400 text-lg animate-pulse">Loading zero-trust catalog...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-sm px-4 py-2 rounded-full shadow-lg z-50 flex items-center gap-2">
          <CheckCircle size={14} className="text-green-400" /> {toast}
        </div>
      )}
      {/* Unauthorized notice */}
      {unauthorized && (
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 rounded-lg p-3 text-sm">
          ⚠ You don't have permission to access that page.
        </div>
      )}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <ShoppingBag className="text-blue-600" size={32} />
            <span>Secure Marketplace</span>
          </h1>
          <p className="text-gray-500 text-sm mt-1">Verified data integrity with application-level hashing.</p>
        </div>
        <button onClick={() => navigate('/cart')} className="btn-primary flex items-center gap-2 shadow-lg hover:shadow-blue-200 transition-all">
          <ShoppingCart size={18} /> My Cart
        </button>
      </div>

      <SecurityBadge title="🔒 Data Proof" items={[
        { label: "SHA-256 Verified", color: "blue" },
        { label: "AES-256 Decrypted", color: "blue" },
        { label: "TLS 1.3 Transit", color: "orange" },
        { label: "RBAC enforced", color: "purple" },
      ]} />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
        {products.map(p => (
          <div key={p.id} className="card hover:shadow-xl transition-all duration-300 border border-transparent hover:border-blue-100 group">
            <div className="h-48 overflow-hidden rounded-t-lg bg-gray-50 flex items-center justify-center mb-4">
              <ProductImage src={p.image} category={p.category} name={p.name} />
            </div>
            <div className="px-1">
              <div className="flex items-start justify-between mb-2">
                <h3 className="font-bold text-lg text-gray-900 leading-tight truncate">{p.name}</h3>
                <span className={`flex items-center gap-1 text-[10px] uppercase tracking-wider font-extrabold px-2 py-1 rounded-full ${p.integrity_status === 'ok' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                  {p.integrity_status === 'ok' ? <CheckCircle size={10} /> : <AlertTriangle size={10} />}
                  {p.integrity_status === 'ok' ? 'Verified' : 'Tampered'}
                </span>
              </div>
              <p className="text-gray-500 text-xs mb-4 line-clamp-2 min-h-[2rem]">{p.description}</p>
              <div className="flex items-center justify-between mb-4">
                <span className="text-2xl font-bold text-gray-900">₹{p.price.toLocaleString()}</span>
                <span className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded uppercase font-bold">{p.category}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className={`text-[10px] font-bold ${p.stock < 10 ? 'text-orange-500' : 'text-gray-400'}`}>
                  {p.stock} IN STOCK
                </span>
                <button 
                  onClick={() => addToCart(p)} 
                  disabled={p.stock === 0}
                  className={`py-2 px-4 rounded-lg font-bold text-sm flex items-center gap-2 transition-all ${
                    added === p.id 
                    ? 'bg-green-600 text-white' 
                    : 'bg-blue-600 text-white hover:bg-blue-700 active:scale-95'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {added === p.id ? <CheckCircle size={14} /> : <Plus size={14} />}
                  {added === p.id ? 'Added' : p.stock === 0 ? 'Out' : 'Collect'}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
      {products.length === 0 && (
        <div className="text-center py-20 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
          <p className="text-gray-400">Initialize catalog to see products.</p>
        </div>
      )}
    </div>
  )
}
