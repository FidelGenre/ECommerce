'use client'
import { createContext, useContext, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import api from '@/lib/api'

interface AuthUser {
    userId: number
    username: string
    role: 'ADMIN' | 'CUSTOMER'
    token: string
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

    useEffect(() => {
        const stored = localStorage.getItem('user')
        if (stored) setUser(JSON.parse(stored))
        setLoading(false)
    }, [])

    const login = async (username: string, password: string) => {
        const { data } = await api.post('/api/auth/login', { username, password })
        localStorage.setItem('token', data.token)
        localStorage.setItem('user', JSON.stringify(data))
        setUser(data)
        router.push(data.role === 'ADMIN' ? '/admin' : '/')
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
