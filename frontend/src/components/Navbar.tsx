import { Link, useNavigate } from 'react-router-dom'
import { ShieldCheck, LogOut, LayoutDashboard, ShoppingCart, Info, User, ShoppingBag } from 'lucide-react'
import { useAuth } from '../AuthContext'
import { getCart } from '../store'
import api from '../api'

export default function Navbar() {
  const { user, logout } = useAuth()
  const cart = getCart()
  const navigate = useNavigate()

  async function handleLogout() {
    try { await api.post('/auth/logout') } catch {}
    logout()
    navigate('/login')
  }

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 flex items-center justify-between h-16">
        <Link to="/" className="flex items-center gap-2 font-bold text-xl text-blue-600">
          <ShieldCheck className="text-blue-600" />
          <span>SecureShop</span>
        </Link>

        <div className="flex items-center gap-4">
          {user ? (
            <>
              <Link to="/" className="text-gray-600 hover:text-blue-600 text-sm font-medium flex items-center gap-1"><ShoppingBag size={14}/><span>Store</span></Link>
              <Link to="/orders" className="text-gray-600 hover:text-blue-600 text-sm font-medium flex items-center gap-1"><LayoutDashboard size={14}/><span>Orders</span></Link>
              {user.role === 'admin' && (
                <Link to="/admin" className="text-gray-600 hover:text-blue-600 text-sm font-medium flex items-center gap-1"><ShieldCheck size={14}/><span>Admin</span></Link>
              )}
              <Link to="/cart" className="relative text-gray-600 hover:text-blue-600 text-xl">
                <ShoppingCart size={20} />
                {cart.length > 0 && (
                  <span className="absolute -top-2 -right-2 bg-blue-600 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                    {cart.reduce((s, i) => s + i.qty, 0)}
                  </span>
                )}
              </Link>
              <div className="flex items-center gap-2 ml-2">
                <Link to="/profile" className="bg-gray-100 p-2 rounded-full text-gray-500 hover:bg-blue-50 hover:text-blue-600" title="Profile"><User size={16}/></Link>
                <span className="text-sm font-medium text-gray-700">{user.name}</span>
                <button onClick={handleLogout} className="btn-secondary text-sm py-1.5 px-3 flex items-center gap-1"><LogOut size={14}/> Logout</button>
              </div>
            </>
          ) : (
            <>
              <Link to="/login" className="btn-secondary text-sm py-1 px-3">Login</Link>
              <Link to="/register" className="btn-primary text-sm py-1 px-3">Register</Link>
            </>
          )}
        </div>
      </div>
    </nav>
  )
}
