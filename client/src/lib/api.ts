import axios from 'axios'
import { emitForbidden, emitToast } from '@/lib/events'

const api = axios.create({
    baseURL: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8082',
    headers: { 'Content-Type': 'application/json' },
})

// Attach JWT token from localStorage on every request
api.interceptors.request.use((config) => {
    if (typeof window !== 'undefined') {
        const token = localStorage.getItem('token')
        if (token) config.headers.Authorization = `Bearer ${token}`
    }
    return config
})

// Redirect to login on 401
api.interceptors.response.use(
    (res) => res,
    (err) => {
        const isLoginRequest = err.config?.url?.includes('/api/auth/login')
        if (err.response?.status === 401 && typeof window !== 'undefined' && !isLoginRequest) {
            localStorage.removeItem('token')
            localStorage.removeItem('user')
            window.location.href = '/login'
        }
        if (err.response?.status === 403) {
            const msg = err.response.data?.message || 'No tenés permisos para realizar esta acción.'
            emitForbidden(msg)
        } else if (err.response?.status >= 500) {
            emitToast('Error del servidor. Intentá de nuevo.', 'error')
        }
        return Promise.reject(err)
    }
)

export default api
