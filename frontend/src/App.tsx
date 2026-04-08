import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import { useAuth } from './AuthContext'
import Navbar from './components/Navbar'
import Login from './pages/Login'
import Register from './pages/Register'
import OTPVerify from './pages/OTPVerify'
import Home from './pages/Home'
import Cart from './pages/Cart'
import Checkout from './pages/Checkout'
import Orders from './pages/Orders'
import OrderDetail from './pages/OrderDetail'
import Admin from './pages/Admin'
import Profile from './pages/Profile'
import ForgotPassword from './pages/ForgotPassword'
import NotFound from './pages/NotFound'
import Landing from './pages/Landing'

const PAGE_TITLES: Record<string, string> = {
  '/': 'SecureShop — CCS Project',
  '/login': 'Sign In — SecureShop',
  '/register': 'Register — SecureShop',
  '/shop': 'Store — SecureShop',
  '/cart': 'Cart — SecureShop',
  '/checkout': 'Checkout — SecureShop',
  '/orders': 'My Orders — SecureShop',
  '/profile': 'Profile — SecureShop',
  '/admin': 'Admin Dashboard — SecureShop',
  '/forgot-password': 'Reset Password — SecureShop',
}

function PageTitle() {
  const { pathname } = useLocation()
  useEffect(() => {
    const base = pathname.startsWith('/orders/') ? 'Order Detail — SecureShop' : PAGE_TITLES[pathname]
    document.title = base || 'SecureShop'
  }, [pathname])
  return null
}

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const location = useLocation()
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />
  return <>{children}</>
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const location = useLocation()
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />
  if (user.role !== 'admin') return <Navigate to="/shop?reason=unauthorized" replace />
  return <>{children}</>
}

// Redirect logged-in users away from auth pages
function PublicOnlyRoute({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  if (user) return <Navigate to="/shop" replace />
  return <>{children}</>
}

export default function App() {
  return (
    <div className="min-h-screen bg-gray-50">
      <PageTitle />
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 py-6">
        <Routes>
          {/* Public */}
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<PublicOnlyRoute><Login /></PublicOnlyRoute>} />
          <Route path="/register" element={<PublicOnlyRoute><Register /></PublicOnlyRoute>} />
          <Route path="/verify-otp" element={<OTPVerify />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />

          {/* Protected */}
          <Route path="/shop" element={<PrivateRoute><Home /></PrivateRoute>} />
          <Route path="/cart" element={<PrivateRoute><Cart /></PrivateRoute>} />
          <Route path="/checkout" element={<PrivateRoute><Checkout /></PrivateRoute>} />
          <Route path="/orders" element={<PrivateRoute><Orders /></PrivateRoute>} />
          <Route path="/orders/:id" element={<PrivateRoute><OrderDetail /></PrivateRoute>} />
          <Route path="/profile" element={<PrivateRoute><Profile /></PrivateRoute>} />

          {/* Dashboard alias */}
          <Route path="/dashboard" element={<PrivateRoute><Navigate to="/shop" replace /></PrivateRoute>} />

          {/* Admin */}
          <Route path="/admin" element={<AdminRoute><Admin /></AdminRoute>} />

          {/* 404 */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
    </div>
  )
}
