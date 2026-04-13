import { useEffect, useState, useMemo } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { CheckCircle, AlertTriangle, Plus, ShoppingCart, Search } from 'lucide-react'
import api from '../api'
import { getCart, saveCart } from '../store'
import SecurityBadge from '../components/SecurityBadge'

interface Product {
  id: string; name: string; price: number; category: string
  description: string; stock: number; image: string; integrity_status: string
}

const CATEGORY_LABELS: Record<string, string> = {
  'Electronics': 'Electronics', 'Accessories': 'Accessories', 'Bags': 'Bags',
  'Beauty': 'Beauty', 'Home & Living': 'Home', 'Jewelry': 'Jewelry',
  'Kids': 'Kids', "Men's Fashion": "Men's", 'Shoes': 'Shoes',
  "Women's Fashion": "Women's", 'Storage': 'Storage'
}

function ProductImage({ src, category, name }: { src: string; category: string; name: string }) {
  const [failed, setFailed] = useState(false)
  const label = CATEGORY_LABELS[category] || category
  if (!src || failed) return (
    <div className="w-full h-full flex items-center justify-center bg-gray-100 text-gray-400 text-sm font-medium">{label}</div>
  )
  return <img src={src} alt={name} className="w-full h-full object-cover group-hover:scale-105 transition-transform"
    onError={() => setFailed(true)} loading="lazy" />
}

export default function Home() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [added, setAdded] = useState<string | null>(null)
  const [toast, setToast] = useState('')
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState('All')
  const navigate = useNavigate()
  const location = useLocation()

  // Only show unauthorized banner if user was redirected here, clear it after 4s
  const [showUnauth, setShowUnauth] = useState(
    () => new URLSearchParams(location.search).get('reason') === 'unauthorized'
  )
  useEffect(() => {
    if (showUnauth) {
      const t = setTimeout(() => setShowUnauth(false), 4000)
      return () => clearTimeout(t)
    }
  }, [showUnauth])

  useEffect(() => {
    api.get('/products')
      .then(r => setProducts(r.data))
      .catch(e => console.error('Fetch error:', e))
      .finally(() => setLoading(false))
  }, [])

  const categories = useMemo(() => {
    const cats = Array.from(new Set(products.map(p => p.category))).sort()
    return ['All', ...cats]
  }, [products])

  const filtered = useMemo(() => {
    return products.filter(p => {
      const matchCat = activeCategory === 'All' || p.category === activeCategory
      const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase())
      return matchCat && matchSearch
    })
  }, [products, activeCategory, search])

  function addToCart(p: Product) {
    const cart = getCart()
    const existing = cart.find(i => i.product_id === p.id)
    if (existing) { existing.qty += 1 } else {
      cart.push({ product_id: p.id, name: p.name, price: p.price, qty: 1, image: p.image })
    }
    saveCart(cart)
    setAdded(p.id)
    setToast(`"${p.name.slice(0, 30)}${p.name.length > 30 ? '…' : ''}" added to cart`)
    setTimeout(() => setAdded(null), 1500)
    setTimeout(() => setToast(''), 2500)
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="text-gray-400 text-lg animate-pulse">Loading catalog...</div>
    </div>
  )

  return (
    <div className="space-y-4">
      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-sm px-4 py-2 rounded-full shadow-lg z-50 whitespace-nowrap">
          {toast}
        </div>
      )}

      {/* Unauthorized notice — auto-dismisses */}
      {showUnauth && (
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 rounded-lg p-3 text-sm">
          ⚠ You don't have permission to access that page.
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Store</h1>
          <p className="text-gray-500 text-xs mt-0.5">SHA-256 verified · AES-256-GCM decrypted</p>
        </div>
        <button onClick={() => navigate('/cart')} className="btn-primary flex items-center gap-2">
          <ShoppingCart size={16} /> Cart
        </button>
      </div>

      <SecurityBadge title="🔒 Data Proof" items={[
        { label: "SHA-256 Verified", color: "blue" },
        { label: "AES-256 Decrypted", color: "blue" },
        { label: "TLS 1.3 Transit", color: "orange" },
        { label: "RBAC enforced", color: "purple" },
      ]} />

      {/* Search + Category filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input className="input pl-9 text-sm" placeholder="Search products..."
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>
      <div className="flex gap-2 flex-wrap">
        {categories.map(cat => (
          <button key={cat} onClick={() => setActiveCategory(cat)}
            className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${
              activeCategory === cat
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}>
            {cat}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {filtered.map(p => (
          <div key={p.id} className="card hover:shadow-xl transition-all duration-300 border border-transparent hover:border-blue-100 group p-4">
            <div className="h-44 overflow-hidden rounded-lg bg-gray-50 flex items-center justify-center mb-3">
              <ProductImage src={p.image} category={p.category} name={p.name} />
            </div>
            <div className="flex items-start justify-between mb-1 gap-2">
              <h3 className="font-semibold text-gray-900 leading-tight line-clamp-2 flex-1" title={p.name}>{p.name}</h3>
              <span className={`flex-shrink-0 flex items-center gap-1 text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${p.integrity_status === 'ok' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                {p.integrity_status === 'ok' ? <CheckCircle size={9} /> : <AlertTriangle size={9} />}
                {p.integrity_status === 'ok' ? 'OK' : '!'}
              </span>
            </div>
            <p className="text-gray-400 text-xs mb-3 line-clamp-1">{p.description}</p>
            <div className="flex items-center justify-between">
              <span className="text-xl font-bold text-gray-900 whitespace-nowrap">₹{p.price.toLocaleString()}</span>
              <button
                onClick={() => addToCart(p)}
                disabled={p.stock === 0}
                className={`py-1.5 px-3 rounded-lg font-semibold text-sm flex items-center gap-1.5 transition-all ${
                  added === p.id ? 'bg-green-600 text-white' : 'bg-blue-600 text-white hover:bg-blue-700 active:scale-95'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {added === p.id ? <CheckCircle size={13} /> : <Plus size={13} />}
                {added === p.id ? 'Added!' : p.stock === 0 ? 'Out of Stock' : 'Add to Cart'}
              </button>
            </div>
            <div className="flex items-center justify-between mt-2">
              <span className={`text-[10px] font-bold ${p.stock < 10 ? 'text-orange-500' : 'text-gray-300'}`}>
                {p.stock} in stock
              </span>
              <span className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded uppercase font-bold">{p.category}</span>
            </div>
          </div>
        ))}
      </div>

      {filtered.length === 0 && !loading && (
        <div className="text-center py-16 text-gray-400">
          No products found. <button className="text-blue-600 underline" onClick={() => { setSearch(''); setActiveCategory('All') }}>Clear filters</button>
        </div>
      )}
    </div>
  )
}
