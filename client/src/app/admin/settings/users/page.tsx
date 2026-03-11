'use client'
import { useEffect, useState, useMemo } from 'react'
import api from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { Plus, X, Edit, ToggleLeft, ToggleRight, Search, Filter, Trash2, Eye, EyeOff } from 'lucide-react'

interface UserRow {
    id: number;
    username: string;
    email: string;
    role: string;
    active: boolean;
    createdAt: string;
    firstName?: string;
    lastName?: string;
    phone?: string;
    accountBalance?: number;
    loyaltyPoints?: number;
}

export default function UsersSettingsPage() {
    const { user: authUser, logout } = useAuth()
    const [data, setData] = useState<UserRow[]>([])
    const [loading, setLoading] = useState(true)
    const [showModal, setShowModal] = useState(false)
    const [editing, setEditing] = useState<UserRow | null>(null)
    const [form, setForm] = useState({ username: '', email: '', password: '', role: 'CLIENTE' })
    const [saving, setSaving] = useState(false)
    // Selection
    const [selected, setSelected] = useState<Set<number>>(new Set())
    const [deleting, setDeleting] = useState("")
    const [showPwd, setShowPwd] = useState(false)

    const toggleSelect = (id: number) => setSelected(prev => {
        const next = new Set(prev)
        next.has(id) ? next.delete(id) : next.add(id)
        return next
    })
    const toggleAll = () => setSelected(prev => prev.size === data.length ? new Set() : new Set(data.map(u => u.id)))

    // Filters
    const [search, setSearch] = useState('')
    const [roleFilter, setRoleFilter] = useState('ALL')
    const [activeFilter, setActiveFilter] = useState('ALL')

    const load = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({ size: '100' })
            if (search) params.append('search', search)
            if (roleFilter !== 'ALL') params.append('role', roleFilter)
            if (activeFilter !== 'ALL') params.append('active', activeFilter === '1' ? 'true' : 'false')

            const r = await api.get(`/api/admin/users?${params.toString()}`)
            setData(r.data.content);
        } finally {
            setLoading(false)
        }
    }

    // Auto trigger load on filter change with debounce
    useEffect(() => {
        const timeout = setTimeout(load, 300)
        return () => clearTimeout(timeout)
    }, [search, roleFilter, activeFilter])

    const openNew = () => { setEditing(null); setForm({ username: '', email: '', password: '', role: 'CLIENTE' }); setShowModal(true) }
    const openEdit = (u: UserRow) => { setEditing(u); setForm({ username: u.username, email: u.email, password: '', role: u.role }); setShowModal(true) }
    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault(); setSaving(true)
        try {
            if (editing) await api.put(`/api/admin/users/${editing.id}`, form)
            else await api.post('/api/admin/users', form)
            setShowModal(false);
            load()
        } finally { setSaving(false) }
    }
    const toggle = async (id: number) => { await api.patch(`/api/admin/users/${id}/toggle`); load() }
    const handleDelete = async (ids: number[]) => {
        if (!confirm(`¿Eliminar permanentemente ${ids.length === 1 ? 'este usuario' : `estos ${ids.length} usuarios`}?`)) return
        setDeleting("bulk")
        const errors: string[] = []
        let ownDeleted = false
        for (const id of ids) {
            try {
                await api.delete(`/api/admin/users/${id}`)
                if (id === authUser?.userId) ownDeleted = true
            } catch (error: any) {
                const username = data.find(u => u.id === id)?.username ?? id
                if (error.response?.status === 403) {
                    errors.push(`${username}: No podés eliminar a otro administrador.`)
                } else {
                    const msg = error.response?.data?.message || (typeof error.response?.data === 'string' ? error.response.data : 'Error desconocido')
                    errors.push(`${username}: ${msg}`)
                }
            }
        }
        setDeleting("")
        setSelected(new Set())
        if (errors.length) alert(errors.join('\n'))
        if (ownDeleted) { logout(); return }
        load()
    }

    const formatCurrency = (n: number) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(n)
    const formatDate = (d: string) => new Date(d).toLocaleDateString('es-AR')

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-espresso">Usuarios</h1>
                <div className="flex items-center gap-2">
                    {selected.size > 0 && (
                        <button onClick={() => handleDelete([...selected])} disabled={deleting !== ""}
                            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-100 text-red-700 hover:bg-red-200 text-sm font-medium transition-colors disabled:opacity-50">
                            <Trash2 className="w-4 h-4" />{deleting ? 'Eliminando…' : `Eliminar ${selected.size} seleccionados`}
                        </button>
                    )}
                    <button onClick={openNew} className="btn-primary flex items-center gap-2"><Plus className="w-4 h-4" />Agregar usuario</button>
                </div>
            </div>

            {/* Filters */}
            <div className="card py-3 px-4 flex flex-wrap items-center gap-4 border border-muted bg-warm-50/50 shadow-sm">
                <div className="relative flex-1 min-w-[200px]">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-primary-400" />
                    <input
                        className="input pl-9 text-sm py-2"
                        placeholder="Buscar por usuario o email..."
                        value={search} onChange={e => setSearch(e.target.value)}
                    />
                </div>
                <div className="flex items-center gap-2">
                    <Filter className="w-4 h-4 text-primary-400" />
                    <select className="input py-2 text-sm w-auto cursor-pointer font-medium" value={roleFilter} onChange={e => setRoleFilter(e.target.value)}>
                        <option value="ALL">Todos los roles</option>
                        <option value="CLIENTE">Cliente</option>
                        <option value="ADMIN">Admin</option>
                        <option value="NONE">Sin rol</option>
                    </select>
                </div>
                <select className="input py-2 text-sm w-auto cursor-pointer font-medium" value={activeFilter} onChange={e => setActiveFilter(e.target.value)}>
                    <option value="ALL">Todos los estados</option>
                    <option value="1">Solo activos</option>
                    <option value="0">Solo inactivos</option>
                </select>
                {(search || roleFilter !== 'ALL' || activeFilter !== 'ALL') && (
                    <button onClick={() => { setSearch(''); setRoleFilter('ALL'); setActiveFilter('ALL') }} className="text-xs text-primary-500 hover:text-red-600 flex items-center gap-1 transition-colors bg-white px-2 py-1 rounded border border-transparent hover:border-red-200">
                        <X className="w-3 h-3" /> Limpiar filtros
                    </button>
                )}
            </div>

            <div className="card p-0 overflow-hidden shadow-sm border border-muted">
                {loading ? <div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-primary-700 border-t-transparent rounded-full animate-spin" /></div> : (
                    <div className="overflow-x-auto">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th className="w-8 pl-4"><input type="checkbox" checked={selected.size === data.length && data.length > 0} onChange={toggleAll} className="w-4 h-4 rounded accent-primary-700" /></th>
                                    <th>Usuario</th>
                                    <th>Email</th>
                                    <th>Rol</th>
                                    <th>Creado el</th>
                                    <th className="text-right">Balance</th>
                                    <th className="text-right">Fidelización</th>
                                    <th>Estado</th>
                                    <th className="text-right">Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.map(u => (
                                    <tr key={u.id} className={selected.has(u.id) ? 'bg-red-50' : ''}>
                                        <td className="pl-4"><input type="checkbox" checked={selected.has(u.id)} onChange={() => toggleSelect(u.id)} className="w-4 h-4 rounded accent-primary-700" /></td>
                                        <td>
                                            <p className="font-semibold text-espresso">{u.username}</p>
                                            {(u.firstName || u.lastName) && (
                                                <p className="text-xs text-primary-500">{[u.firstName, u.lastName].filter(Boolean).join(' ')}</p>
                                            )}
                                        </td>
                                        <td className="text-primary-600 text-sm font-medium">{u.email}</td>
                                        <td><span className={u.role === 'ADMIN' ? 'badge-blue' : u.role === 'NONE' ? 'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500' : 'badge-brown'}>{{ ADMIN: 'Admin', CLIENTE: 'Cliente', CUSTOMER: 'Cliente', SUPPLIER: 'Proveedor', CASHIER: 'Cajero', NONE: 'Sin rol' }[u.role] ?? u.role}</span></td>
                                        <td className="text-sm text-primary-500 font-medium">{formatDate(u.createdAt)}</td>
                                        <td className="text-right font-semibold text-espresso">{u.accountBalance !== undefined ? formatCurrency(u.accountBalance) : '—'}</td>
                                        <td className="text-right font-medium text-amber-600">{u.loyaltyPoints ? u.loyaltyPoints + ' pts' : <span className="text-primary-300 font-normal">Sin puntos</span>}</td>
                                        <td>
                                            <button onClick={() => toggle(u.id)} className="text-primary-500 hover:text-primary-700 transition-colors">
                                                {u.active ? <ToggleRight className="w-6 h-6 text-emerald-600" /> : <ToggleLeft className="w-6 h-6 text-red-400" />}
                                            </button>
                                        </td>
                                        <td>
                                            <div className="flex justify-end gap-1">
                                                <button onClick={() => openEdit(u)} title="Editar login" className="btn-ghost p-1.5 hover:bg-primary-50 hover:text-primary-700 text-primary-400">
                                                    <Edit className="w-4 h-4" />
                                                </button>
                                                {u.username !== 'admin' && (
                                                    <button onClick={() => handleDelete([u.id])} title="Eliminar definitivamente" disabled={deleting !== ""} className="btn-ghost p-1.5 hover:bg-red-50 hover:text-red-600 text-primary-400">
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {data.length === 0 && (
                                    <tr>
                                        <td colSpan={9} className="text-center py-8 text-primary-400">No se encontraron usuarios</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Modal de Usuario */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl">
                        <div className="flex items-center justify-between p-5 border-b border-muted">
                            <h2 className="text-lg font-bold text-espresso">{editing ? 'Editar Login' : 'Nuevo Usuario'}</h2>
                            <button onClick={() => setShowModal(false)} className="btn-ghost p-1.5 hover:bg-red-50 hover:text-red-500"><X className="w-5 h-5" /></button>
                        </div>
                        <form onSubmit={handleSave} className="p-5 space-y-4">
                            {!editing && (
                                <div className="bg-primary-50 p-3 rounded-lg border border-primary-100 mb-2">
                                    <p className="text-xs text-primary-700 leading-relaxed font-medium">Al crear un usuario con rol "Cliente", se generará automáticamente su perfil en el CRM.</p>
                                </div>
                            )}
                            <div>
                                <label className="block text-xs font-semibold text-primary-700 mb-1">Usuario</label>
                                <input className="input" value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} required />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-primary-700 mb-1">Email</label>
                                <input type="email" className="input" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-primary-700 mb-1">Contraseña {editing && <span className="text-primary-400 font-normal">(dejar vacío para no cambiar)</span>}</label>
                                <div className="relative">
                                    <input type={showPwd ? 'text' : 'password'} className="input pr-10" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} {...(!editing && { required: true })} />
                                    <button type="button" onClick={() => setShowPwd(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-primary-400 hover:text-primary-600">
                                        {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-primary-700 mb-1">Rol</label>
                                <select className="select" value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}>
                                    <option value="NONE">Sin rol</option>
                                    <option value="CLIENTE">Cliente</option>
                                    <option value="ADMIN">Administrador</option>
                                </select>
                            </div>
                            <div className="flex gap-2 pt-2">
                                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary flex-1 py-2 text-sm shadow-sm">Cancelar</button>
                                <button type="submit" className="btn-primary flex-1 py-2 text-sm shadow-sm" disabled={saving}>{saving ? 'Guardando…' : 'Guardar'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}
