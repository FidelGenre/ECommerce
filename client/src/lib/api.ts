import axios from 'axios'
import { emitForbidden } from '@/lib/events'

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
        if (err.response?.status === 401 && typeof window !== 'undefined') {
            localStorage.removeItem('token')
            localStorage.removeItem('user')
            window.location.href = '/login'
        }
        if (err.response?.status === 403) {
            const msg = err.response.data?.message || 'No tenés permisos para realizar esta acción.'
            emitForbidden(msg)
        }
        return Promise.reject(err)
    }
)

export default api
