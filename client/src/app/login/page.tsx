'use client'
import { useState } from 'react'
import { useAuth } from '@/lib/auth'
import { Coffee, Lock, User } from 'lucide-react'

export default function LoginPage() {
    const { login } = useAuth()
    const [username, setUsername] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError(''); setLoading(true)
        try {
            await login(username, password)
        } catch {
            setError('Invalid credentials. Try admin / admin123')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-surface flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                {/* Header */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-700 rounded-2xl shadow-lg mb-4">
                        <Coffee className="w-8 h-8 text-caramel" />
                    </div>
                    <h1 className="text-3xl font-bold text-espresso">Coffee Beans</h1>
                    <p className="text-primary-500 mt-1">Ingresá a tu cuenta</p>
                </div>

                {/* Card */}
                <div className="card">
                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div>
                            <label className="block text-sm font-medium text-primary-700 mb-1">Usuario</label>
                            <div className="relative">
                                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary-400" />
                                <input
                                    type="text"
                                    className="input pl-10"
                                    placeholder="admin"
                                    value={username}
                                    onChange={e => setUsername(e.target.value)}
                                    required
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-primary-700 mb-1">Contraseña</label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary-400" />
                                <input
                                    type="password"
                                    className="input pl-10"
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    required
                                />
                            </div>
                        </div>

                        {error && (
                            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-red-700 text-sm">
                                {error}
                            </div>
                        )}

                        <button type="submit" className="btn-primary w-full py-3 text-base" disabled={loading}>
                            {loading ? 'Ingresando...' : 'Iniciar sesión'}
                        </button>
                    </form>
                    <div className="mt-5 pt-5 border-t border-muted text-center space-y-2">
                        <p className="text-primary-500 text-sm">
                            ¿No tenés cuenta?{' '}
                            <a href="/register" className="text-primary-700 font-semibold hover:text-espresso transition-colors">
                                Registrarse
                            </a>
                        </p>
                        <a href="/" className="text-primary-400 hover:text-primary-600 text-sm transition-colors block">
                            ← Volver al inicio
                        </a>
                    </div>
                </div>

                <p className="text-center text-primary-400 text-xs mt-6">Por defecto: admin / admin123</p>
            </div>
        </div>
    )
}
