import axios from 'axios'

// In dev: Vite proxy handles /api → localhost:8000
// In prod (Vercel): backend is at /_/backend, so /api → /_/backend/api
const isProd = import.meta.env.PROD
const BASE = isProd ? '/_/backend' : ''

const api = axios.create({
  baseURL: `${BASE}/api`,
  timeout: 30000,
})

api.interceptors.request.use(cfg => {
  const token = localStorage.getItem('token')
  if (token) cfg.headers.Authorization = `Bearer ${token}`
  return cfg
})

api.interceptors.response.use(
  r => r,
  async err => {
    const url = err.config?.url || ''
    const isAuthRequest = url.includes('/auth/login') ||
                          url.includes('/auth/register') ||
                          url.includes('/auth/verify-otp')

    if (err.response?.status === 401 && !isAuthRequest) {
      const token = localStorage.getItem('token')
      if (token && !err.config._retried) {
        err.config._retried = true
        try {
          const { data } = await axios.post(`${BASE}/api/auth/refresh`, {}, {
            headers: { Authorization: `Bearer ${token}` }
          })
          localStorage.setItem('token', data.access_token)
          err.config.headers.Authorization = `Bearer ${data.access_token}`
          return api.request(err.config)
        } catch {
          localStorage.removeItem('token')
          localStorage.removeItem('user')
          if (window.location.pathname !== '/login') window.location.href = '/login'
        }
      } else if (!isAuthRequest && window.location.pathname !== '/login') {
        localStorage.removeItem('token')
        localStorage.removeItem('user')
        window.location.href = '/login'
      }
    }
    return Promise.reject(err)
  }
)

export default api
