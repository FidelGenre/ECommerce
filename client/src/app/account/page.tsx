'use client'
import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth'
import api from '@/lib/api'
import { SaleOrder } from '@/types'
import {
    User, Mail, Star, Package, RefreshCw, LogOut, ShoppingBag,
    Edit2, Check, X, Lock, Eye, EyeOff, Phone, MapPin, CreditCard, Clock, AlertTriangle
} from 'lucide-react'
import Link from 'next/link'

const FMT = (n: number) => `$${Number(n ?? 0).toLocaleString('es-AR')}`

const STATUS_COLORS: Record<string, string> = {
    Completado: 'badge-green',
    Pendiente: 'badge-yellow',
    Cancelado: 'badge-red',
    Reservado: 'badge-blue',
}

function OrderCountdown({ until }: { until?: string }) {
    const [text, setText] = useState<string | null>(null)
    const [urgent, setUrgent] = useState(false)

    useEffect(() => {
        if (!until) return
        const update = () => {
            const ms = new Date(until).getTime() - Date.now()
            if (ms <= 0) { setText('Reserva vencida'); setUrgent(false); return }
            const totalMinutes = Math.floor(ms / 60000)
            const hours = Math.floor(totalMinutes / 60)
            const minutes = totalMinutes % 60
            setUrgent(totalMinutes < 30)
            if (hours > 0) setText(`${hours}h ${minutes}m para pagar`)
            else setText(`${minutes} min para pagar`)
        }
        update()
        const id = setInterval(update, 30000)
        return () => clearInterval(id)
    }, [until])

    if (!text) return null
    return (
        <div className={`mt-2 flex items-center gap-1.5 text-xs font-medium rounded-lg px-2.5 py-1.5 ${
            urgent ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-700'
        }`}>
            {urgent ? <AlertTriangle className="w-3.5 h-3.5 shrink-0" /> : <Clock className="w-3.5 h-3.5 shrink-0" />}
            {text}
        </div>
    )
}

function OrderCard({ order }: { order: SaleOrder }) {
    const isPending = order.status?.name === 'Pendiente' || order.status?.name === 'Reservado'
    return (
        <div className={`border rounded-xl p-4 transition-colors ${
            isPending ? 'border-amber-200 bg-amber-50/30 hover:border-amber-400' : 'border-muted hover:border-caramel'
        }`}>
            <div className="flex items-start justify-between mb-2">
                <div>
                    <p className="font-semibold text-espresso text-sm">Orden #{order.id}</p>
                    <p className="text-xs text-primary-400">{new Date(order.createdAt).toLocaleDateString('es-AR', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                </div>
                <div className="text-right">
                    <p className="font-bold text-espresso">{FMT(order.total)}</p>
                    {order.status && (
                        <span className={`mt-1 inline-block ${STATUS_COLORS[order.status.name] ?? 'badge-brown'}`}>
                            {order.status.name}
                        </span>
                    )}
                </div>
            </div>
            {order.lines?.length > 0 && (
                <ul className="text-xs text-primary-500 space-y-0.5 border-t border-muted pt-2">
                    {order.lines.map(line => (
                        <li key={line.id} className="flex justify-between">
                            <span>{line.item?.name} × {line.quantity}</span>
                            <span>{FMT((line.unitPrice ?? 0) * line.quantity)}</span>
                        </li>
                    ))}
                </ul>
            )}
            {order.mpPaymentId && (
                <div className="mt-2 pt-2 border-t border-muted flex items-center justify-between">
                    <span className="text-xs text-primary-400">Comprobante MP</span>
                    <span className="text-xs font-mono font-semibold text-primary-600">#{order.mpPaymentId}</span>
                </div>
            )}
            {isPending && (
                <OrderCountdown until={order.reservedUntil} />
            )}
            {isPending && order.mpInitPoint && (
                <div className="mt-3">
                    <a
                        href={order.mpInitPoint}
                        className="btn-primary w-full flex items-center justify-center gap-2 py-2 text-sm"
                    >
                        <CreditCard className="w-4 h-4" /> Completar pago
                    </a>
                </div>
            )}
        </div>
    )
}

type CustomerProfile = {
    firstName?: string
    lastName?: string
    email?: string
    phone?: string
    address?: string
    taxId?: string
    loyaltyPoints?: number
}

export default function AccountPage() {
    const { user, logout, loading: authLoading } = useAuth()
    const router = useRouter()
    const [orders, setOrders] = useState<SaleOrder[]>([])
    const [loadingOrders, setLoadingOrders] = useState(false)
    const [fromDate, setFromDate] = useState('')
    const [toDate, setToDate] = useState('')

    // Profile
    const [profile, setProfile] = useState<CustomerProfile>({})
    const [editMode, setEditMode] = useState(false)
    const [editForm, setEditForm] = useState<CustomerProfile & { password?: string; confirmPassword?: string }>({})
    const [showPass, setShowPass] = useState(false)
    const [saving, setSaving] = useState(false)
    const [saveMsg, setSaveMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)
    const [deleting, setDeleting] = useState(false)
    const [confirmDelete, setConfirmDelete] = useState(false)

    const filteredOrders = useMemo(() => {
        let r = [...orders].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        if (fromDate) r = r.filter(o => new Date(o.createdAt).getTime() >= new Date(fromDate + 'T00:00:00').getTime())
        if (toDate) r = r.filter(o => new Date(o.createdAt).getTime() <= new Date(toDate + 'T23:59:59').getTime())
        return r
    }, [orders, fromDate, toDate])

    useEffect(() => { if (!authLoading && !user) router.replace('/login') }, [user, authLoading, router])

    const loadProfile = async () => {
        try {
            const r = await api.get('/api/auth/me')
            setProfile(r.data)
        } catch { /* ignore */ }
    }

    const loadOrders = async () => {
        if (!user) return
        setLoadingOrders(true)
        try {
            const r = await api.get(`/api/admin/sales/my/${user.userId}`)
            setOrders(r.data)
        } catch { setOrders([]) } finally { setLoadingOrders(false) }
    }

    useEffect(() => {
        if (user) { loadProfile(); loadOrders() }
    }, [user])

    const openEdit = () => {
        setEditForm({
            firstName: profile.firstName ?? '',
            lastName: profile.lastName ?? '',
            email: profile.email ?? '',
            phone: profile.phone ?? '',
            address: profile.address ?? '',
            taxId: profile.taxId ?? '',
            password: '', confirmPassword: '',
        })
        setSaveMsg(null)
        setEditMode(true)
    }

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault()
        if (editForm.password && editForm.password !== editForm.confirmPassword) {
            setSaveMsg({ type: 'err', text: 'Las contraseñas no coinciden.' }); return
        }
        setSaving(true); setSaveMsg(null)
        try {
            const body: Record<string, string> = {}
            if (editForm.firstName) body.firstName = editForm.firstName
            if (editForm.lastName !== undefined) body.lastName = editForm.lastName
            if (editForm.email) body.email = editForm.email
            if (editForm.phone !== undefined) body.phone = editForm.phone
            if (editForm.address !== undefined) body.address = editForm.address
            if (editForm.taxId !== undefined) body.taxId = editForm.taxId
            if (editForm.password) body.password = editForm.password
            const r = await api.patch('/api/auth/me', body)
            setProfile(r.data)
            setSaveMsg({ type: 'ok', text: '¡Datos actualizados correctamente!' })
            setEditMode(false)
        } catch {
            setSaveMsg({ type: 'err', text: 'No se pudo guardar. Intentá de nuevo.' })
        } finally { setSaving(false) }
    }

    const handleDeleteAccount = async () => {
        setDeleting(true)
        try {
            await api.delete('/api/auth/me')
            logout()
        } catch (error: any) {
            setSaveMsg({ type: 'err', text: error.response?.data || 'Error al eliminar cuenta.' })
            setDeleting(false)
        }
    }

    if (authLoading || !user) return (
        <div className="min-h-screen bg-surface flex items-center justify-center">
            <div className="w-10 h-10 border-4 border-primary-700 border-t-transparent rounded-full animate-spin" />
        </div>
    )

    const fullName = [profile.firstName, profile.lastName].filter(Boolean).join(' ') || user.username

    return (
        <div className="min-h-screen bg-surface">
            {/* Header */}
            <header className="bg-primary-600 text-white px-6 py-4 flex items-center justify-between shadow-lg">
                <Link href="/" className="text-primary-300 hover:text-caramel transition-colors text-sm">← Volver a la Tienda</Link>
                <button onClick={logout} className="flex items-center gap-2 text-red-400 hover:text-red-300 text-sm transition-colors">
                    <LogOut className="w-4 h-4" /> Cerrar Sesión
                </button>
            </header>

            <main className="max-w-6xl mx-auto px-4 py-10">
                <h1 className="text-2xl font-bold text-espresso mb-8">Mi Cuenta</h1>

                <div className="grid grid-cols-1 lg:grid-cols-[400px_1fr] gap-6 items-start">

                    {/* ── LEFT: Profile ── */}
                    <div className="card space-y-5">

                        {/* Avatar + name */}
                        <div className="flex items-center gap-4 pb-4 border-b border-muted">
                            <div className="w-14 h-14 rounded-full bg-primary-700 flex items-center justify-center shrink-0">
                                <span className="text-white text-xl font-bold">{fullName[0]?.toUpperCase()}</span>
                            </div>
                            <div>
                                <p className="font-bold text-espresso text-lg leading-tight">{fullName}</p>
                                <span className="badge-brown capitalize text-xs">{user.role.toLowerCase() === 'admin' ? 'Administrador' : 'Cliente'}</span>
                            </div>
                            {!editMode && (
                                <button onClick={openEdit} className="btn-ghost text-xs flex items-center gap-1.5 py-1.5 ml-auto">
                                    <Edit2 className="w-3.5 h-3.5" /> Editar
                                </button>
                            )}
                        </div>

                        {/* Loyalty points */}
                        <div className="flex items-center justify-between bg-amber-50 rounded-xl px-4 py-3">
                            <span className="text-sm text-amber-700 flex items-center gap-2">
                                <Star className="w-4 h-4 fill-amber-400 text-amber-400" /> Puntos de Fidelización
                            </span>
                            <span className="text-xl font-bold text-amber-700">{profile.loyaltyPoints ?? 0}</span>
                        </div>

                        {!editMode ? (
                            /* ── Read view ── */
                            <dl className="space-y-3">
                                {[
                                    { icon: User, label: 'Usuario', value: user.username },
                                    { icon: Mail, label: 'Email', value: profile.email || '—' },
                                    { icon: Phone, label: 'Teléfono', value: profile.phone || '—' },
                                    { icon: MapPin, label: 'Dirección', value: profile.address || '—' },
                                    { icon: CreditCard, label: 'DNI / CUIT', value: profile.taxId || '—' },
                                ].map(({ icon: Icon, label, value }) => (
                                    <div key={label} className="flex items-start justify-between gap-4">
                                        <dt className="text-sm text-primary-500 flex items-center gap-2 shrink-0 pt-0.5">
                                            <Icon className="w-3.5 h-3.5" />{label}
                                        </dt>
                                        <dd className="text-sm font-medium text-espresso text-right break-all">{value}</dd>
                                    </div>
                                ))}
                            </dl>
                        ) : (
                            /* ── Edit form ── */
                            <form onSubmit={handleSave} className="space-y-3">
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs font-medium text-primary-700 mb-1">Nombre</label>
                                        <input className="input text-sm" value={editForm.firstName ?? ''} onChange={e => setEditForm(f => ({ ...f, firstName: e.target.value }))} />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-primary-700 mb-1">Apellido</label>
                                        <input className="input text-sm" value={editForm.lastName ?? ''} onChange={e => setEditForm(f => ({ ...f, lastName: e.target.value }))} />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-primary-700 mb-1"><Mail className="w-3 h-3 inline mr-1" />Email</label>
                                    <input type="email" className="input text-sm" value={editForm.email ?? ''} onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))} />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-primary-700 mb-1"><Phone className="w-3 h-3 inline mr-1" />Teléfono</label>
                                    <input className="input text-sm" value={editForm.phone ?? ''} onChange={e => setEditForm(f => ({ ...f, phone: e.target.value }))} />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-primary-700 mb-1"><MapPin className="w-3 h-3 inline mr-1" />Dirección</label>
                                    <input className="input text-sm" value={editForm.address ?? ''} onChange={e => setEditForm(f => ({ ...f, address: e.target.value }))} />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-primary-700 mb-1"><CreditCard className="w-3 h-3 inline mr-1" />DNI / CUIT</label>
                                    <input className="input text-sm" value={editForm.taxId ?? ''} onChange={e => setEditForm(f => ({ ...f, taxId: e.target.value }))} />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-primary-700 mb-1"><Lock className="w-3 h-3 inline mr-1" />Nueva contraseña</label>
                                    <div className="relative">
                                        <input type={showPass ? 'text' : 'password'} className="input text-sm pr-9" placeholder="Dejar en blanco para no cambiar"
                                            value={editForm.password ?? ''} onChange={e => setEditForm(f => ({ ...f, password: e.target.value }))} />
                                        <button type="button" onClick={() => setShowPass(s => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-primary-400">
                                            {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                        </button>
                                    </div>
                                </div>
                                {editForm.password && (
                                    <div>
                                        <label className="block text-xs font-medium text-primary-700 mb-1">Confirmar contraseña</label>
                                        <input type={showPass ? 'text' : 'password'} className="input text-sm"
                                            value={editForm.confirmPassword ?? ''} onChange={e => setEditForm(f => ({ ...f, confirmPassword: e.target.value }))} />
                                    </div>
                                )}

                                {saveMsg && (
                                    <p className={`text-xs font-medium rounded-lg py-2 px-3 ${saveMsg.type === 'ok' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
                                        {saveMsg.text}
                                    </p>
                                )}
                                <div className="flex gap-2 pt-1">
                                    <button type="submit" disabled={saving} className="btn-primary flex-1 flex items-center justify-center gap-1.5 text-sm py-2">
                                        <Check className="w-4 h-4" /> {saving ? 'Guardando…' : 'Guardar'}
                                    </button>
                                    <button type="button" onClick={() => { setEditMode(false); setSaveMsg(null) }} className="btn-secondary px-4 py-2">
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                            </form>
                        )}

                        {saveMsg && !editMode && (
                            <p className={`text-xs font-medium rounded-lg py-2 px-3 ${saveMsg.type === 'ok' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
                                {saveMsg.text}
                            </p>
                        )}

                        {!editMode && user?.role.toLowerCase() !== 'admin' && (
                            <div className="pt-6 mt-4 border-t border-red-100">
                                {!confirmDelete ? (
                                    <button
                                        onClick={() => setConfirmDelete(true)}
                                        className="text-xs text-red-500 hover:text-red-700 font-medium w-full text-left flex items-center gap-1.5 transition-colors"
                                    >
                                        <LogOut className="w-3.5 h-3.5" /> Eliminar mi cuenta
                                    </button>
                                ) : (
                                    <div className="bg-red-50 p-3 rounded-xl border border-red-100">
                                        <p className="text-xs text-red-800 font-medium mb-3 leading-relaxed">
                                            ¿Estás seguro/a? Esta acción no se puede deshacer y se eliminarán tus datos de acceso.
                                        </p>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={handleDeleteAccount}
                                                disabled={deleting}
                                                className="btn-primary bg-red-600 hover:bg-red-700 px-3 py-2 text-xs flex-1 shadow-sm"
                                            >
                                                {deleting ? 'Eliminando...' : 'Sí, eliminar'}
                                            </button>
                                            <button
                                                onClick={() => setConfirmDelete(false)}
                                                disabled={deleting}
                                                className="btn-secondary px-3 py-2 text-xs bg-white text-gray-700 flex-1 hover:bg-gray-50 border-gray-200"
                                            >
                                                Cancelar
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* ── RIGHT: Orders ── */}
                    <div className="card flex flex-col">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-base font-semibold text-espresso flex items-center gap-2">
                                <Package className="w-4 h-4 text-primary-500" /> Mis Órdenes
                            </h2>
                            <button onClick={loadOrders} className="btn-ghost text-xs flex items-center gap-1.5 py-1.5">
                                <RefreshCw className="w-3.5 h-3.5" />Actualizar
                            </button>
                        </div>

                        {/* Date filters */}
                        <div className="flex items-center gap-3 mb-4 text-sm bg-warm-50 p-2 rounded-lg border border-muted flex-wrap">
                            <div className="flex items-center gap-2">
                                <label className="text-primary-600 font-medium text-xs">Desde:</label>
                                <input type="date" className="input py-1 px-2 text-xs w-auto bg-white" value={fromDate} onChange={e => setFromDate(e.target.value)} />
                            </div>
                            <div className="flex items-center gap-2">
                                <label className="text-primary-600 font-medium text-xs">Hasta:</label>
                                <input type="date" className="input py-1 px-2 text-xs w-auto bg-white" value={toDate} onChange={e => setToDate(e.target.value)} />
                            </div>
                            {(fromDate || toDate) && (
                                <button onClick={() => { setFromDate(''); setToDate('') }} className="text-primary-500 hover:text-primary-700 text-xs">Limpiar</button>
                            )}
                        </div>

                        {/* Scrollable orders */}
                        <div className="overflow-y-auto max-h-[520px] pr-1 space-y-3">
                            {loadingOrders ? (
                                <div className="flex justify-center py-10">
                                    <div className="w-8 h-8 border-4 border-primary-700 border-t-transparent rounded-full animate-spin" />
                                </div>
                            ) : filteredOrders.length === 0 ? (
                                <div className="text-center py-10">
                                    <ShoppingBag className="w-10 h-10 text-primary-200 mx-auto mb-3" />
                                    <p className="text-primary-500 text-sm">No hay órdenes registradas.</p>
                                    <Link href="/" className="text-primary-700 hover:text-primary-900 text-sm font-medium mt-2 inline-block underline underline-offset-2">
                                        Empezar a comprar →
                                    </Link>
                                </div>
                            ) : filteredOrders.map(order => (
                                <OrderCard key={order.id} order={order} />
                            ))}
                        </div>
                    </div>

                </div>
            </main>
        </div>
    )
}
