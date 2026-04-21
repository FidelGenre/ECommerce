'use client'
import { createContext, useContext, useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import api from '@/lib/api'

interface AuthUser {
    userId: number
    username: string
    role: string
    token: string
    permissions?: string[]
}

interface AuthCtx {
    user: AuthUser | null
    login: (username: string, password: string) => Promise<void>
    logout: () => void
    loading: boolean
}

const Context = createContext<AuthCtx>({} as AuthCtx)

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<AuthUser | null>(null)
    const [loading, setLoading] = useState(true)
    const router = useRouter()
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

    useEffect(() => {
        const stored = localStorage.getItem('user')
        if (stored) setUser(JSON.parse(stored))
        setLoading(false)
    }, [])

    // Poll /api/auth/refresh every 30s to keep role/token in sync
    useEffect(() => {
        if (!user) return
        const refresh = async () => {
            try {
                const { data } = await api.get('/api/auth/refresh')
                localStorage.setItem('token', data.token)
                localStorage.setItem('user', JSON.stringify(data))
                setUser(data)
            } catch {
                // Silently ignore — user may have been deleted or logged out
            }
        }
        intervalRef.current = setInterval(refresh, 30_000)
        return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
    }, [user?.userId])

    const login = async (username: string, password: string) => {
        try {
            const { data } = await api.post('/api/auth/login', { username, password })
            localStorage.setItem('token', data.token)
            localStorage.setItem('user', JSON.stringify(data))
            setUser(data)
            router.push(data.role === 'ADMIN' ? '/admin' : '/')
        } catch (e: any) {
            const msg = e.response?.data || 'Error al iniciar sesión'
            throw new Error(typeof msg === 'string' ? msg : JSON.stringify(msg))
        }
    }

    const logout = () => {
        localStorage.removeItem('token')
        localStorage.removeItem('user')
        setUser(null)
        router.push('/login')
    }

    return <Context.Provider value={{ user, login, logout, loading }}>{children}</Context.Provider>
}

export const useAuth = () => useContext(Context)
