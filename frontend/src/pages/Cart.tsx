import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
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
      <button onClick={() => navigate('/')} className="btn-primary mt-2">Browse Products</button>
    </div>
  )

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Shopping Cart</h1>
      <div className="space-y-3 mb-6">
        {cart.map(item => (
          <div key={item.product_id} className="card flex items-center gap-4">
            <span className="text-3xl">{item.image}</span>
            <div className="flex-1">
              <p className="font-medium">{item.name}</p>
              <p className="text-blue-600 font-semibold">₹{item.price.toLocaleString()}</p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => update(item.product_id, item.qty - 1)}
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 font-bold">−</button>
              <span className="w-8 text-center font-medium">{item.qty}</span>
              <button onClick={() => update(item.product_id, item.qty + 1)}
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 font-bold">+</button>
            </div>
            <p className="font-semibold w-24 text-right">₹{(item.price * item.qty).toLocaleString()}</p>
          </div>
        ))}
      </div>
      <div className="card">
        <div className="flex justify-between items-center mb-4">
          <span className="text-lg font-semibold">Total</span>
          <span className="text-2xl font-bold text-blue-600">₹{total.toLocaleString()}</span>
        </div>
        <button onClick={() => navigate('/checkout')} className="btn-primary w-full text-base py-3">
          Proceed to Checkout →
        </button>
      </div>
    </div>
  )
}
