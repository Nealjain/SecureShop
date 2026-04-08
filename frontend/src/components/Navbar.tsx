import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ShieldCheck, LogOut, LayoutDashboard, ShoppingCart, User, ShoppingBag, Menu, X } from 'lucide-react'
import { useAuth } from '../AuthContext'
import { getCart, subscribeCart } from '../store'
import api from '../api'

export default function Navbar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [cartCount, setCartCount] = useState(() => getCart().reduce((s, i) => s + i.qty, 0))

  useEffect(() => {
    const unsub = subscribeCart(() => {
      setCartCount(getCart().reduce((s, i) => s + i.qty, 0))
    })
    return () => { unsub() }
  }, [])

  async function handleLogout() {
    try { await api.post('/auth/logout') } catch {}
    logout()
    navigate('/login')
    setOpen(false)
  }

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 flex items-center justify-between h-16">
        <Link to="/" className="flex items-center gap-2 font-bold text-xl text-blue-600" onClick={() => setOpen(false)}>
          <ShieldCheck className="text-blue-600" />
          <span>SecureShop</span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-4">
          {user ? (
            <>
              <Link to="/shop" className="text-gray-600 hover:text-blue-600 text-sm font-medium flex items-center gap-1"><ShoppingBag size={14}/><span>Store</span></Link>
              <Link to="/orders" className="text-gray-600 hover:text-blue-600 text-sm font-medium flex items-center gap-1"><LayoutDashboard size={14}/><span>Orders</span></Link>
              {user.role === 'admin' && (
                <Link to="/admin" className="text-gray-600 hover:text-blue-600 text-sm font-medium flex items-center gap-1"><ShieldCheck size={14}/><span>Admin</span></Link>
              )}
              <Link to="/cart" className="relative text-gray-600 hover:text-blue-600">
                <ShoppingCart size={20} />
                {cartCount > 0 && (
                  <span className="absolute -top-2 -right-2 bg-blue-600 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">{cartCount}</span>
                )}
              </Link>
              <Link to="/profile" className="bg-gray-100 p-2 rounded-full text-gray-500 hover:bg-blue-50 hover:text-blue-600"><User size={16}/></Link>
              <span className="text-sm font-medium text-gray-700">{user.name}</span>
              <button onClick={handleLogout} className="btn-secondary text-sm py-1.5 px-3 flex items-center gap-1"><LogOut size={14}/> Logout</button>
            </>
          ) : (
            <>
              <Link to="/login" className="btn-secondary text-sm py-1 px-3">Login</Link>
              <Link to="/register" className="btn-primary text-sm py-1 px-3">Register</Link>
            </>
          )}
        </div>

        {/* Mobile right */}
        <div className="flex md:hidden items-center gap-3">
          {user && (
            <Link to="/cart" className="relative text-gray-600">
              <ShoppingCart size={20} />
              {cartCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-blue-600 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">{cartCount}</span>
              )}
            </Link>
          )}
          <button onClick={() => setOpen(!open)} className="text-gray-600 p-1">
            {open ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="md:hidden bg-white border-t border-gray-100 px-4 py-3 flex flex-col gap-3">
          {user ? (
            <>
              <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
                <User size={16} className="text-gray-500" />
                <span className="text-sm font-medium text-gray-700">{user.name}</span>
              </div>
              <Link to="/shop" onClick={() => setOpen(false)} className="flex items-center gap-2 text-gray-700 py-1"><ShoppingBag size={16}/>Store</Link>
              <Link to="/orders" onClick={() => setOpen(false)} className="flex items-center gap-2 text-gray-700 py-1"><LayoutDashboard size={16}/>Orders</Link>
              <Link to="/profile" onClick={() => setOpen(false)} className="flex items-center gap-2 text-gray-700 py-1"><User size={16}/>Profile</Link>
              {user.role === 'admin' && (
                <Link to="/admin" onClick={() => setOpen(false)} className="flex items-center gap-2 text-gray-700 py-1"><ShieldCheck size={16}/>Admin</Link>
              )}
              <button onClick={handleLogout} className="flex items-center gap-2 text-red-600 py-1 mt-1"><LogOut size={16}/>Logout</button>
            </>
          ) : (
            <>
              <Link to="/login" onClick={() => setOpen(false)} className="btn-secondary text-sm text-center">Login</Link>
              <Link to="/register" onClick={() => setOpen(false)} className="btn-primary text-sm text-center">Register</Link>
            </>
          )}
        </div>
      )}
    </nav>
  )
}
