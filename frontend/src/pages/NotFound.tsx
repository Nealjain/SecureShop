import { Link } from 'react-router-dom'
import { useAuth } from '../AuthContext'

export default function NotFound() {
  const { user } = useAuth()
  return (
    <div className="min-h-[80vh] flex items-center justify-center">
      <div className="text-center">
        <div className="text-8xl font-black text-gray-200 mb-4">404</div>
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Page not found</h1>
        <p className="text-gray-500 mb-6">The page you're looking for doesn't exist.</p>
        <div className="flex gap-3 justify-center">
          <Link to={user ? '/shop' : '/'} className="btn-primary">Go Home</Link>
          <Link to="/login" className="btn-secondary">Login</Link>
        </div>
      </div>
    </div>
  )
}
