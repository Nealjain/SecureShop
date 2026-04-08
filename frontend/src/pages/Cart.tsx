import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Trash2 } from 'lucide-react'
import { getCart, saveCart } from '../store'

export default function Cart() {
  const [cart, setCart] = useState(getCart())
  const navigate = useNavigate()

  function update(product_id: string, qty: number) {
    const updated = qty <= 0
      ? cart.filter(i => i.product_id !== product_id)
      : cart.map(i => i.product_id === product_id ? { ...i, qty } : i)
    saveCart(updated)
    setCart(updated)
  }

  const total = cart.reduce((s, i) => s + i.price * i.qty, 0)

  if (cart.length === 0) return (
    <div className="text-center py-20">
      <div className="text-6xl mb-4">🛒</div>
      <h2 className="text-xl font-semibold text-gray-700 mb-2">Your cart is empty</h2>
      <Link to="/shop" className="btn-primary mt-2 inline-block">Browse Products</Link>
    </div>
  )

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Shopping Cart</h1>
        <Link to="/shop" className="text-sm text-blue-600 hover:underline">← Continue Shopping</Link>
      </div>
      <div className="space-y-3 mb-6">
        {cart.map(item => (
          <div key={item.product_id} className="card flex items-center gap-3 p-4">
            <img src={item.image} alt={item.name} className="w-16 h-16 object-cover rounded-md flex-shrink-0 bg-gray-100" />
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm truncate" title={item.name}>{item.name}</p>
              <p className="text-blue-600 font-semibold text-sm">₹{item.price.toLocaleString()}</p>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={() => update(item.product_id, item.qty - 1)}
                className="w-7 h-7 rounded-full bg-gray-100 hover:bg-gray-200 font-bold text-sm flex items-center justify-center">−</button>
              <span className="w-7 text-center font-medium text-sm">{item.qty}</span>
              <button onClick={() => update(item.product_id, item.qty + 1)}
                className="w-7 h-7 rounded-full bg-gray-100 hover:bg-gray-200 font-bold text-sm flex items-center justify-center">+</button>
            </div>
            <p className="font-semibold text-sm w-20 text-right whitespace-nowrap">₹{(item.price * item.qty).toLocaleString()}</p>
            <button onClick={() => update(item.product_id, 0)} className="text-red-400 hover:text-red-600 ml-1 flex-shrink-0" title="Remove item">
              <Trash2 size={15} />
            </button>
          </div>
        ))}
      </div>
      <div className="card">
        <div className="flex justify-between items-center mb-4">
          <span className="text-lg font-semibold">Total</span>
          <span className="text-2xl font-bold text-blue-600 whitespace-nowrap">₹{total.toLocaleString()}</span>
        </div>
        <button onClick={() => navigate('/checkout')} className="btn-primary w-full text-base py-3">
          Proceed to Checkout →
        </button>
      </div>
    </div>
  )
}
