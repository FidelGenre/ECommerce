'use client'
import { useEffect, useState, useMemo } from 'react'
import api from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { Plus, X, Edit, ToggleLeft, ToggleRight, Search, Filter, Trash2, Eye, EyeOff, ShieldCheck, Users as UsersIcon, CheckSquare, Square } from 'lucide-react'

interface Role {
    code: string;
    name: string;
    permissions: string[];
}

const ALL_PERMISSIONS = [
    { id: 'VIEW_DASHBOARD', label: 'Ver Dashboard' },
    { id: 'MANAGE_SALES', label: 'Ventas y Checkout' },
    { id: 'MANAGE_PURCHASES', label: 'Compras y Proveedores' },
    { id: 'MANAGE_INVENTORY', label: 'Inventario y Productos' },
    { id: 'MANAGE_CASH', label: 'Caja y Transacciones' },
    { id: 'VIEW_REPORTS', label: 'Reportes y Métricas' },
    { id: 'MANAGE_CUSTOMERS', label: 'Clientes (CRM)' },
    { id: 'MANAGE_SUPPLIERS', label: 'Proveedores (ABM)' },
    { id: 'MANAGE_SETTINGS', label: 'Configuración y Roles' }
];

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
    address?: string;
    documentType?: string;
    taxId?: string;
    accountBalance?: number;
    loyaltyPoints?: number;
}

export default function UsersSettingsPage() {
    const { user: authUser, logout } = useAuth()
    const [activeTab, setActiveTab] = useState<'USERS' | 'ROLES'>('USERS')
    const [data, setData] = useState<UserRow[]>([])
    const [roles, setRoles] = useState<Role[]>([])
    const [loading, setLoading] = useState(true)
    const [showModal, setShowModal] = useState(false)
    const [editing, setEditing] = useState<UserRow | null>(null)
    const [form, setForm] = useState({
        username: '', email: '', password: '', role: 'CLIENTE',
        firstName: '', lastName: '', phone: '', address: '', documentType: 'DNI', taxId: '', loyaltyPoints: 0
    })
    const [saving, setSaving] = useState(false)
    // Roles State
    const [showRoleModal, setShowRoleModal] = useState(false);
    const [editingRole, setEditingRole] = useState<Role | null>(null);
    const [roleForm, setRoleForm] = useState<Role>({ code: '', name: '', permissions: [] });

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

    const [sortCol, setSortCol] = useState<string>('')
    const [sortAsc, setSortAsc] = useState(true)

    const sortedData = useMemo(() => {
        let copy = [...data]
        if (!sortCol) return copy
        copy.sort((a: any, b: any) => {
            let valA, valB;
            if (sortCol === 'username') {
                valA = a.username.toLowerCase()
                valB = b.username.toLowerCase()
            } else if (sortCol === 'email') {
                valA = a.email.toLowerCase()
                valB = b.email.toLowerCase()
            } else if (sortCol === 'role') {
                valA = a.role
                valB = b.role
            } else if (sortCol === 'createdAt') {
                valA = new Date(a.createdAt).getTime()
                valB = new Date(b.createdAt).getTime()
            } else if (sortCol === 'balance') {
                valA = a.accountBalance ?? 0
                valB = b.accountBalance ?? 0
            } else if (sortCol === 'loyalty') {
                valA = a.loyaltyPoints ?? 0
                valB = b.loyaltyPoints ?? 0
            }
            if (valA < valB) return sortAsc ? -1 : 1
            if (valA > valB) return sortAsc ? 1 : -1
            return 0
        })
        return copy
    }, [data, sortCol, sortAsc])

    const handleSort = (col: string) => {
        if (sortCol === col) setSortAsc(!sortAsc)
        else { setSortCol(col); setSortAsc(true) }
    }

    // Filters
    const [search, setSearch] = useState('')
    const [roleFilter, setRoleFilter] = useState('ALL')
    const [activeFilter, setActiveFilter] = useState('ALL')

    const load = async () => {
        setLoading(true);
        try {
            if (activeTab === 'USERS') {
                const params = new URLSearchParams({ size: '100' })
                if (search) params.append('search', search)
                if (roleFilter !== 'ALL') params.append('role', roleFilter)
                if (activeFilter !== 'ALL') params.append('active', activeFilter === '1' ? 'true' : 'false')

                const [usersRes, rolesRes] = await Promise.all([
                    api.get(`/api/admin/users?${params.toString()}`),
                    api.get('/api/admin/roles')
                ])
                setData(usersRes.data.content);
                setRoles(rolesRes.data);
            } else {
                const { data } = await api.get('/api/admin/roles');
                setRoles(data);
            }
        } finally {
            setLoading(false)
        }
    }

    // Auto trigger load on filter change with debounce
    useEffect(() => {
        const timeout = setTimeout(load, 300)
        return () => clearTimeout(timeout)
    }, [search, roleFilter, activeFilter, activeTab])


    const formatDoc = (val: string, type: string) => {
        let raw = val.replace(/\D/g, '')
        if (type !== 'CUIT' && type !== 'CUIL') return raw.slice(0, 15)
        raw = raw.slice(0, 11)
        if (raw.length <= 2) return raw
        if (raw.length <= 10) return `${raw.slice(0, 2)}-${raw.slice(2)}`
        return `${raw.slice(0, 2)}-${raw.slice(2, 10)}-${raw.slice(10)}`
    }

    const openNew = () => { setEditing(null); setForm({ username: '', email: '', password: '', role: 'CLIENTE', firstName: '', lastName: '', phone: '', address: '', taxId: '', documentType: 'DNI', loyaltyPoints: 0 }); setShowModal(true) }
    const openEdit = (u: UserRow) => { setEditing(u); setForm({ username: u.username, email: u.email, password: '', role: u.role, firstName: u.firstName || '', lastName: u.lastName || '', phone: u.phone || '', address: u.address || '', taxId: u.taxId || '', documentType: u.documentType || 'DNI', loyaltyPoints: u.loyaltyPoints || 0 }); setShowModal(true) }
    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault(); setSaving(true)
        try {
            if (editing) await api.put(`/api/admin/users/${editing.id}`, form)
            else await api.post('/api/admin/users', form)
            setShowModal(false);
            load()
        } finally { setSaving(false) }
    }

    const openNewRole = () => { setEditingRole(null); setRoleForm({ code: '', name: '', permissions: [] }); setShowRoleModal(true) }
    const openEditRole = (r: Role) => { setEditingRole(r); setRoleForm({ ...r }); setShowRoleModal(true) }
    const handleSaveRole = async (e: React.FormEvent) => {
        e.preventDefault(); setSaving(true)
        try {
            if (editingRole) await api.put(`/api/admin/roles/${editingRole.code}`, roleForm)
            else await api.post('/api/admin/roles', roleForm)
            setShowRoleModal(false);
            load()
        } catch (e: any) {
            alert(e.response?.data?.message || e.response?.data || 'Error al guardar el rol. Verifica que el código no exista ya.');
        } finally { setSaving(false) }
    }
    const handleDeleteRole = async (code: string) => {
        if (!confirm(`¿Eliminar permanentemente el rol ${code}?`)) return;
        try {
            await api.delete(`/api/admin/roles/${code}`);
            load();
        } catch (error: any) {
             alert(error.response?.data || error.response?.data?.message || 'Error al eliminar rol');
        }
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
                <h1 className="text-2xl font-bold text-espresso">Usuarios y Permisos</h1>
                <div className="flex items-center gap-2">
                    {activeTab === 'USERS' && selected.size > 0 && (
                        <button onClick={() => handleDelete([...selected])} disabled={deleting !== ""}
                            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-100 text-red-700 hover:bg-red-200 text-sm font-medium transition-colors disabled:opacity-50">
                            <Trash2 className="w-4 h-4" />{deleting ? 'Eliminando…' : `Eliminar ${selected.size} seleccionados`}
                        </button>
                    )}
                    {activeTab === 'USERS' && <button onClick={openNew} className="btn-primary flex items-center gap-2"><Plus className="w-4 h-4" />Agregar usuario</button>}
                    {activeTab === 'ROLES' && <button onClick={openNewRole} className="btn-primary flex items-center gap-2"><Plus className="w-4 h-4" />Nuevo Rol</button>}
                </div>
            </div>

            <div className="flex bg-white/50 border-b border-primary-100 rounded-t-xl overflow-hidden">
                <button 
                    onClick={() => setActiveTab('USERS')} 
                    className={`flex items-center gap-2 px-6 py-3 font-medium text-sm transition-colors ${activeTab === 'USERS' ? 'bg-primary-50 text-primary-700 border-b-2 border-primary-600' : 'text-primary-400 hover:bg-primary-50/50 hover:text-primary-600'}`}
                >
                    <UsersIcon className="w-4 h-4" /> Usuarios Activos
                </button>
                <button 
                    onClick={() => setActiveTab('ROLES')} 
                    className={`flex items-center gap-2 px-6 py-3 font-medium text-sm transition-colors ${activeTab === 'ROLES' ? 'bg-primary-50 text-primary-700 border-b-2 border-primary-600' : 'text-primary-400 hover:bg-primary-50/50 hover:text-primary-600'}`}
                >
                    <ShieldCheck className="w-4 h-4" /> Roles y Permisos (RBAC)
                </button>
            </div>

            {/* Filters */}
            {activeTab === 'USERS' && (
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
                        {roles.map(r => (
                            <option key={r.code} value={r.code}>{r.name}</option>
                        ))}
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
            )}

            <div className="card p-0 overflow-hidden shadow-sm border border-muted">
                {loading ? <div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-primary-700 border-t-transparent rounded-full animate-spin" /></div> : activeTab === 'USERS' ? (
                    <div className="overflow-x-auto">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th className="w-8 pl-4"><input type="checkbox" checked={selected.size === data.length && data.length > 0} onChange={toggleAll} className="w-4 h-4 rounded accent-primary-700" /></th>
                                    <th className="cursor-pointer hover:bg-primary-50 select-none" onClick={() => handleSort('username')}>Usuario {sortCol === 'username' ? (sortAsc ? '↑' : '↓') : ''}</th>
                                    <th className="cursor-pointer hover:bg-primary-50 select-none" onClick={() => handleSort('email')}>Email {sortCol === 'email' ? (sortAsc ? '↑' : '↓') : ''}</th>
                                    <th className="cursor-pointer hover:bg-primary-50 select-none" onClick={() => handleSort('role')}>Rol {sortCol === 'role' ? (sortAsc ? '↑' : '↓') : ''}</th>
                                    <th className="cursor-pointer hover:bg-primary-50 select-none" onClick={() => handleSort('createdAt')}>Creado el {sortCol === 'createdAt' ? (sortAsc ? '↑' : '↓') : ''}</th>
                                    <th className="text-right cursor-pointer hover:bg-primary-50 select-none" onClick={() => handleSort('balance')}>Balance {sortCol === 'balance' ? (sortAsc ? '↑' : '↓') : ''}</th>
                                    <th className="text-right cursor-pointer hover:bg-primary-50 select-none" onClick={() => handleSort('loyalty')}>Fidelización {sortCol === 'loyalty' ? (sortAsc ? '↑' : '↓') : ''}</th>
                                    <th>Estado</th>
                                    <th className="text-right">Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {sortedData.map(u => (
                                    <tr key={u.id} className={selected.has(u.id) ? 'bg-red-50' : ''}>
                                        <td className="pl-4"><input type="checkbox" checked={selected.has(u.id)} onChange={() => toggleSelect(u.id)} className="w-4 h-4 rounded accent-primary-700" /></td>
                                        <td>
                                            <p className="font-semibold text-espresso">{u.username}</p>
                                            {(u.firstName || u.lastName) && (
                                                <p className="text-xs text-primary-500">{[u.firstName, u.lastName].filter(Boolean).join(' ')}</p>
                                            )}
                                        </td>
                                        <td className="text-primary-600 text-sm font-medium">{u.email}</td>
                                        <td><span className={u.role === 'ADMIN' ? 'badge-blue' : u.role === 'NONE' ? 'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500' : 'badge-brown'}>{roles.find(r => r.code === u.role)?.name ?? u.role}</span></td>
                                        <td className="text-sm text-primary-500 font-medium">{formatDate(u.createdAt)}</td>
                                        <td className="text-right font-semibold text-espresso">{u.accountBalance !== undefined ? formatCurrency(u.accountBalance) : '—'}</td>
                                        <td className="text-right font-medium text-amber-600">{typeof u.loyaltyPoints === 'number' ? u.loyaltyPoints + ' pts' : <span className="text-primary-300 font-normal">Sin puntos</span>}</td>
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
                ) : (
                    <div className="overflow-x-auto">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Cód. de Sistema</th>
                                    <th>Nombre del Rol</th>
                                    <th>Permisos Configurados</th>
                                    <th className="text-right">Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {roles.map(r => (
                                    <tr key={r.code}>
                                        <td className="font-mono text-xs text-primary-500 font-semibold">{r.code}</td>
                                        <td className="font-semibold text-espresso">{r.name}</td>
                                        <td>
                                            <div className="flex flex-wrap gap-1">
                                                {r.permissions.length === 0 && <span className="text-xs text-primary-300">Ninguno</span>}
                                                {r.permissions.map(p => {
                                                    const permInfo = ALL_PERMISSIONS.find(ap => ap.id === p);
                                                    return (
                                                    <span key={p} className="inline-flex items-center gap-1 px-2 py-1 bg-primary-50 border border-primary-100 text-primary-700 rounded-md text-[10px] uppercase font-bold tracking-wider">
                                                        {permInfo ? permInfo.label : p.replace('MANAGE_', '').replace('VIEW_', '')}
                                                    </span>
                                                )})}
                                            </div>
                                        </td>
                                        <td>
                                            <div className="flex justify-end gap-1">
                                                <button onClick={() => openEditRole(r)} title="Editar permisos" className="btn-ghost px-2 py-1.5 hover:bg-primary-50 hover:text-primary-700 text-primary-500 font-medium text-xs flex items-center gap-1.5">
                                                    <Edit className="w-3.5 h-3.5" /> Editar
                                                </button>
                                                {r.code !== 'ADMIN' && r.code !== 'CLIENTE' && (
                                                    <button onClick={() => handleDeleteRole(r.code)} title="Eliminar rol" className="btn-ghost p-1.5 hover:bg-red-50 hover:text-red-600 text-primary-400">
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {roles.length === 0 && (
                                    <tr>
                                        <td colSpan={4} className="text-center py-12 px-4">
                                            <ShieldCheck className="w-12 h-12 text-primary-200 mx-auto mb-3" />
                                            <p className="text-primary-600 font-medium">No se encontraron roles de sistema</p>
                                            <p className="text-sm text-primary-400 mt-1">Crea nuevos roles para gestionar el nivel de acceso al panel de administración.</p>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Modal de Usuario */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
                    <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl my-auto">
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
                                <label className="block text-xs font-semibold text-primary-700 mb-1">Rol de Permisos</label>
                                <select className="select" value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}>
                                    <option value="NONE">Sin rol (Bloqueado)</option>
                                    {roles.length === 0 && <option value="CLIENTE">Cliente (Default)</option>}
                                    {roles.length === 0 && <option value="ADMIN">Admin (Default)</option>}
                                    {roles.map(r => (
                                        <option key={r.code} value={r.code}>{r.name} - {r.code}</option>
                                    ))}
                                </select>
                            </div>

                            <hr className="border-t border-muted my-4" />
                            <h3 className="text-sm font-bold text-espresso mb-2">Datos Personales (CRM)</h3>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-primary-700 mb-1">Nombre</label>
                                    <input className="input" value={form.firstName} onChange={e => setForm({ ...form, firstName: e.target.value })} />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-primary-700 mb-1">Apellido</label>
                                    <input className="input" value={form.lastName} onChange={e => setForm({ ...form, lastName: e.target.value })} />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-primary-700 mb-1">Teléfono</label>
                                    <input className="input" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
                                </div>
                                <div className="col-span-2 sm:col-span-1">
                                    <label className="block text-xs font-semibold text-primary-700 mb-1">Documento</label>
                                    <div className="flex gap-2">
                                        <select className="input w-24 shrink-0 px-2" value={form.documentType} onChange={e => {
                                            const newType = e.target.value
                                            setForm({ ...form, documentType: newType, taxId: formatDoc(form.taxId, newType) })
                                        }}>
                                            <option value="DNI">DNI</option>
                                            <option value="CUIT">CUIT</option>
                                            <option value="CUIL">CUIL</option>
                                            <option value="Pasaporte">PAS</option>
                                        </select>
                                        <input className="input font-mono flex-1" value={form.taxId} onChange={e => setForm({ ...form, taxId: formatDoc(e.target.value, form.documentType) })} placeholder={form.documentType === 'DNI' ? '12345678' : '20-XXXXXXXX-X'} />
                                    </div>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-primary-700 mb-1">Dirección</label>
                                    <input className="input" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-primary-700 mb-1">Puntos de Fidelización</label>
                                    <input type="number" className="input" min="0" value={form.loyaltyPoints} onChange={e => setForm({ ...form, loyaltyPoints: parseInt(e.target.value) || 0 })} />
                                </div>
                            </div>
                            <div className="flex gap-2 pt-4">
                                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary flex-1 py-2 text-sm shadow-sm">Cancelar</button>
                                <button type="submit" className="btn-primary flex-1 py-2 text-sm shadow-sm" disabled={saving}>{saving ? 'Guardando…' : 'Guardar'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal de Rol */}
            {showRoleModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
                    <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl my-auto">
                        <div className="flex items-center justify-between p-5 border-b border-muted">
                            <h2 className="text-lg font-bold text-espresso">{editingRole ? 'Editar Rol' : 'Nuevo Rol'}</h2>
                            <button onClick={() => setShowRoleModal(false)} className="btn-ghost p-1.5 hover:bg-red-50 hover:text-red-500"><X className="w-5 h-5" /></button>
                        </div>
                        <form onSubmit={handleSaveRole} className="p-5 space-y-4">
                            {!editingRole && (
                                <div>
                                    <label className="block text-xs font-semibold text-primary-700 mb-1">Código del Rol</label>
                                    <input className="input font-mono text-sm uppercase placeholder:normal-case" placeholder="Ej: VENDEDOR, SUPERVISOR" 
                                           value={roleForm.code} 
                                           onChange={e => setRoleForm({ ...roleForm, code: e.target.value.toUpperCase().replace(/[^A-Z_]/g, '') })} required />
                                </div>
                            )}
                            {editingRole && (
                                <div className="bg-primary-50 p-2.5 rounded border border-primary-100 flex items-center gap-2">
                                    <ShieldCheck className="w-5 h-5 text-primary-400" />
                                    <div>
                                        <p className="text-xs text-primary-500 font-semibold uppercase tracking-wider">MODIFICANDO ROL DEL SISTEMA</p>
                                        <p className="text-sm font-bold text-espresso">{roleForm.code}</p>
                                    </div>
                                </div>
                            )}
                            <div>
                                <label className="block text-xs font-semibold text-primary-700 mb-1">Nombre Display (Humano)</label>
                                <input className="input" placeholder="Ej: Vendedor de Sucursal" value={roleForm.name} onChange={e => setRoleForm({ ...roleForm, name: e.target.value })} required />
                            </div>

                            <hr className="border-t border-muted my-4" />
                            <h3 className="text-sm font-bold text-espresso mb-2">Permisos del Sistema</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-60 overflow-y-auto pl-1 pb-1 pr-3 custom-scrollbar">
                                {ALL_PERMISSIONS.map(p => {
                                    const isAdmin = roleForm.code === 'ADMIN';
                                    const isChecked = roleForm.permissions.includes(p.id);
                                    return (
                                    <label key={p.id} className={`flex items-start gap-2 p-2 rounded-lg border select-none transition-colors ${isAdmin ? (isChecked ? 'bg-gray-100 border-gray-300 text-gray-500 cursor-not-allowed' : 'bg-gray-50 border-gray-200 text-gray-400 cursor-not-allowed') : (isChecked ? 'bg-primary-50 border-primary-200 text-primary-800 cursor-pointer' : 'bg-white border-muted text-primary-600 hover:bg-gray-50 cursor-pointer')}`}>
                                        <div className="mt-0.5">
                                            {isChecked ? <CheckSquare className={`w-4 h-4 ${isAdmin ? 'text-gray-400' : 'text-emerald-600'}`} /> : <Square className="w-4 h-4 text-primary-300" />}
                                        </div>
                                        <span className="text-sm font-medium leading-tight">{p.label}</span>
                                        {/* Hidden checkbox for a11y */}
                                        <input type="checkbox" className="sr-only" 
                                            disabled={isAdmin}
                                            checked={isChecked}
                                            onChange={(e) => {
                                                const checked = e.target.checked;
                                                setRoleForm(prev => ({
                                                    ...prev,
                                                    permissions: checked ? [...prev.permissions, p.id] : prev.permissions.filter(x => x !== p.id)
                                                }))
                                            }}
                                        />
                                    </label>
                                )})}
                            </div>

                            <div className="flex gap-2 pt-4">
                                <button type="button" onClick={() => setShowRoleModal(false)} className="btn-secondary flex-1 py-2 text-sm shadow-sm">Cancelar</button>
                                <button type="submit" className="btn-primary flex-1 py-2 text-sm shadow-sm" disabled={saving}>{saving ? 'Guardando…' : 'Guardar'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}
