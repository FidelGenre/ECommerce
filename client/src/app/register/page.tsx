'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth'
import { Coffee, Lock, User, Mail, Eye, EyeOff } from 'lucide-react'
import Link from 'next/link'
import api from '@/lib/api'

export default function RegisterPage() {
    const { login } = useAuth()
    const router = useRouter()
    const [username, setUsername] = useState('')
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [confirm, setConfirm] = useState('')
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)
    const [showPwd, setShowPwd] = useState(false)
    const [showConfirm, setShowConfirm] = useState(false)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')
        if (password !== confirm) { setError('Las contraseñas no coinciden'); return }
        if (password.length < 6) { setError('La contraseña debe tener al menos 6 caracteres'); return }
        setLoading(true)
        try {
            await api.post('/api/auth/register', { username, email, password })
            await login(username, password)
            router.push('/')
        } catch (err: any) {
            const msg = err?.response?.data ?? 'Error al registrarse'
            setError(typeof msg === 'string' ? msg : 'El usuario ya existe')
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
                    <p className="text-primary-500 mt-1">Crear una cuenta</p>
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
                                    placeholder="mi_usuario"
                                    value={username}
                                    onChange={e => setUsername(e.target.value)}
                                    required
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-primary-700 mb-1">Email</label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary-400" />
                                <input
                                    type="email"
                                    className="input pl-10"
                                    placeholder="nombre@email.com"
                                    value={email}
                                    onChange={e => setEmail(e.target.value)}
                                    required
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-primary-700 mb-1">Contraseña</label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary-400" />
                                <input
                                    type={showPwd ? 'text' : 'password'}
                                    className="input pl-10 pr-10"
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    required
                                />
                                <button type="button" onClick={() => setShowPwd(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-primary-400 hover:text-primary-600">
                                    {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-primary-700 mb-1">Confirmar contraseña</label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary-400" />
                                <input
                                    type={showConfirm ? 'text' : 'password'}
                                    className="input pl-10 pr-10"
                                    placeholder="••••••••"
                                    value={confirm}
                                    onChange={e => setConfirm(e.target.value)}
                                    required
                                />
                                <button type="button" onClick={() => setShowConfirm(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-primary-400 hover:text-primary-600">
                                    {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                        </div>

                        {error && (
                            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-red-700 text-sm">
                                {error}
                            </div>
                        )}

                        <button type="submit" className="btn-primary w-full py-3 text-base" disabled={loading}>
                            {loading ? 'Registrando...' : 'Crear cuenta'}
                        </button>
                    </form>

                    <div className="mt-5 pt-5 border-t border-muted text-center space-y-2">
                        <p className="text-primary-500 text-sm">
                            ¿Ya tenés cuenta?{' '}
                            <Link href="/login" className="text-primary-700 font-semibold hover:text-espresso transition-colors">
                                Iniciar sesión
                            </Link>
                        </p>
                        <Link href="/" className="text-primary-400 hover:text-primary-600 text-sm transition-colors block">
                            ← Volver al inicio
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    )
}
