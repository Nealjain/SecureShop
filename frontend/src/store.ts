interface CartItem { product_id: string; name: string; price: number; qty: number; image: string }
interface User { email: string; role: string; name: string }

type CartListener = () => void
const listeners = new Set<CartListener>()

export function subscribeCart(fn: CartListener) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

function notifyCart() { listeners.forEach(fn => fn()) }

export function getUser(): User | null {
  try { return JSON.parse(localStorage.getItem('user') || 'null') } catch { return null }
}
export function getToken(): string | null { return localStorage.getItem('token') }
export function setAuth(user: User, token: string) {
  localStorage.setItem('user', JSON.stringify(user))
  localStorage.setItem('token', token)
}
export function clearAuth() {
  localStorage.removeItem('user')
  localStorage.removeItem('token')
}
export function getCart(): CartItem[] {
  try { return JSON.parse(localStorage.getItem('cart') || '[]') } catch { return [] }
}
export function saveCart(cart: CartItem[]) {
  localStorage.setItem('cart', JSON.stringify(cart))
  notifyCart()
}
