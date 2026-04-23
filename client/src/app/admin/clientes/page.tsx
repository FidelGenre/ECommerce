'use client'
import { useEffect, useState, useMemo } from 'react'
import api from '@/lib/api'
import { Customer, SaleOrder, AccountMovement } from '@/types'
import {
    Plus, X, Search, Edit, Trash2, Eye, EyeOff,
    User, Phone, Mail, MapPin, Fingerprint,
    History, Banknote, Star, ChevronLeft, ChevronRight,
    FileText, CheckCircle2, AlertCircle, Clock
} from 'lucide-react'

const FMT_CUR = (n: number) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(n)
const FMT_DATE = (d: string) => new Date(d).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })

export default function ClientesPage() {
    const [data, setData] = useState<Customer[]>([])
    const [loading, setLoading] = useState(true)
    const [total, setTotal] = useState(0)
    const [page, setPage] = useState(0)
    const [q, setQ] = useState('')

    const [sortCol, setSortCol] = useState<string>('')
    const [sortAsc, setSortAsc] = useState(true)

    const sortedData = useMemo(() => {
        let copy = [...data]
        if (!sortCol) return copy
        copy.sort((a: any, b: any) => {
            let valA, valB;
            if (sortCol === 'name') {
                valA = `${a.firstName} ${a.lastName || ''}`.toLowerCase()
                valB = `${b.firstName} ${b.lastName || ''}`.toLowerCase()
            } else if (sortCol === 'contact') {
                valA = a.phone || ''
                valB = b.phone || ''
            } else if (sortCol === 'taxId') {
                valA = a.taxId || ''
                valB = b.taxId || ''
            } else if (sortCol === 'balance') {
                valA = a.accountBalance || 0
                valB = b.accountBalance || 0
            } else if (sortCol === 'points') {
                valA = a.loyaltyPoints || 0
                valB = b.loyaltyPoints || 0
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

    // Detail Modal
    const [showModal, setShowModal] = useState(false)
    const [editing, setEditing] = useState<Customer | null>(null)
    const [activeTab, setActiveTab] = useState<'profile' | 'account' | 'loyalty' | 'sales'>('profile')
    const [history, setHistory] = useState<SaleOrder[]>([])
    const [movements, setMovements] = useState<AccountMovement[]>([])
    const [loadingDetail, setLoadingDetail] = useState(false)

    // Form
    const blank = { firstName: '', lastName: '', email: '', phone: '', address: '', taxId: '', documentType: 'DNI', notes: '' }
    const [form, setForm] = useState(blank)
    const [saving, setSaving] = useState(false)
    const [deleting, setDeleting] = useState(false)

    const formatDoc = (val: string, type: string) => {
        let raw = val.replace(/\D/g, '')
        if (type !== 'CUIT' && type !== 'CUIL') return raw.slice(0, 15)
        raw = raw.slice(0, 11)
        if (raw.length <= 2) return raw
        if (raw.length <= 10) return `${raw.slice(0, 2)}-${raw.slice(2)}`
        return `${raw.slice(0, 2)}-${raw.slice(2, 10)}-${raw.slice(10)}`
    }

    const load = async () => {
        setLoading(true)
        try {
            const url = `/api/admin/customers?page=${page}&size=20${q ? `&q=${q}` : ''}`
            const r = await api.get(url)
            setData(r.data.content)
            setTotal(r.data.totalElements)
        } finally { setLoading(false) }
    }

    useEffect(() => { load() }, [page, q])

    const openNew = () => {
        setEditing(null)
        setForm(blank)
        setActiveTab('profile')
        setShowModal(true)
    }

    const openDetail = async (c: Customer) => {
        setEditing(c)
        setForm({
            firstName: c.firstName,
            lastName: c.lastName || '',
            email: c.email || '',
            phone: c.phone || '',
            address: c.address || '',
            taxId: c.taxId || '',
            documentType: c.documentType || 'DNI',
            notes: c.notes || ''
        })
        setActiveTab('profile')
        setShowModal(true)
        loadDetail(c.id)
    }

    const loadDetail = async (id: number) => {
        setLoadingDetail(true)
        try {
            const [s, m] = await Promise.all([
                api.get(`/api/admin/customers/${id}/sales`),
                api.get(`/api/admin/customers/${id}/movements`)
            ])
            setHistory(s.data)
            setMovements(m.data)
        } finally { setLoadingDetail(false) }
    }

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault()
        setSaving(true)
        try {
            if (editing) await api.put(`/api/admin/customers/${editing.id}`, form)
            else await api.post('/api/admin/customers', form)
            setShowModal(false)
            load()
        } finally { setSaving(false) }
    }

    const handleDelete = async (id: number) => {
        if (!confirm('¿Eliminar este cliente?')) return
        setDeleting(true)
        try {
            await api.delete(`/api/admin/customers/${id}`)
            load()
        } catch (err: any) {
            alert(err.response?.data || 'Error al eliminar')
        } finally { setDeleting(false) }
    }

    const adjustBalance = async (amount: number, description: string) => {
        if (!editing) return
        try {
            await api.patch(`/api/admin/customers/${editing.id}/balance`, { amount, description })
            loadDetail(editing.id)
            const updated = await api.get(`/api/admin/customers/${editing.id}`)
            setEditing(updated.data)
            load()
        } catch (e) { alert('Error al ajustar saldo') }
    }

    const adjustPoints = async (points: number) => {
        if (!editing) return
        try {
            await api.patch(`/api/admin/customers/${editing.id}/loyalty`, { points })
            const updated = await api.get(`/api/admin/customers/${editing.id}`)
            setEditing(updated.data)
            load()
        } catch (e) { alert('Error al ajustar puntos') }
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-espresso">Gestión de Clientes</h1>
                    <p className="text-primary-500 text-sm">{total} clientes registrados</p>
                </div>
                <button onClick={openNew} className="btn-primary flex items-center gap-2">
                    <Plus className="w-4 h-4" /> Nuevo cliente
                </button>
            </div>

            {/* Search */}
            <div className="card p-4">
                <div className="relative max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary-400" />
                    <input
                        className="input pl-9 text-sm"
                        placeholder="Buscar por nombre, apellido o email..."
                        value={q}
                        onChange={e => { setQ(e.target.value); setPage(0) }}
                    />
                </div>
            </div>

            {/* List */}
            <div className="card p-0 overflow-hidden shadow-sm border border-muted">
                {loading ? (
                    <div className="flex justify-center py-20">
                        <div className="w-10 h-10 border-4 border-primary-700 border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th className="cursor-pointer hover:bg-primary-50 select-none" onClick={() => handleSort('name')}>Nombre Completo {sortCol === 'name' ? (sortAsc ? '↑' : '↓') : ''}</th>
                                    <th className="cursor-pointer hover:bg-primary-50 select-none" onClick={() => handleSort('contact')}>Contacto {sortCol === 'contact' ? (sortAsc ? '↑' : '↓') : ''}</th>
                                    <th className="cursor-pointer hover:bg-primary-50 select-none" onClick={() => handleSort('taxId')}>DNI / CUIT {sortCol === 'taxId' ? (sortAsc ? '↑' : '↓') : ''}</th>
                                    <th className="text-right cursor-pointer hover:bg-primary-50 select-none" onClick={() => handleSort('balance')}>Saldo {sortCol === 'balance' ? (sortAsc ? '↑' : '↓') : ''}</th>
                                    <th className="text-right cursor-pointer hover:bg-primary-50 select-none" onClick={() => handleSort('points')}>Puntos {sortCol === 'points' ? (sortAsc ? '↑' : '↓') : ''}</th>
                                    <th className="text-right">Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {sortedData.map(c => (
                                    <tr key={c.id}>
                                        <td>
                                            <div className="flex items-center gap-3">
                                                <div className="w-9 h-9 bg-primary-100 rounded-full flex items-center justify-center text-primary-700 font-bold">
                                                    {c.firstName[0]}{c.lastName?.[0] || ''}
                                                </div>
                                                <div>
                                                    <p className="font-semibold text-espresso">{c.firstName} {c.lastName}</p>
                                                    <p className="text-xs text-primary-400">{c.email || 'Sin email'}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td>
                                            <p className="text-sm font-medium">{c.phone || '—'}</p>
                                            <p className="text-xs text-primary-400 truncate max-w-[150px]">{c.address || '—'}</p>
                                        </td>
                                        <td className="text-sm font-mono">{c.taxId || '—'}</td>
                                        <td className={`text-right font-bold ${c.accountBalance < 0 ? 'text-red-600' : c.accountBalance > 0 ? 'text-emerald-600' : 'text-espresso'}`}>
                                            {FMT_CUR(c.accountBalance)}
                                        </td>
                                        <td className="text-right font-medium text-amber-600">
                                            {c.loyaltyPoints} pts
                                        </td>
                                        <td>
                                            <div className="flex justify-end gap-1">
                                                <button onClick={() => openDetail(c)} className="btn-ghost p-2 text-primary-500 hover:text-primary-700" title="Ver detalle">
                                                    <Eye className="w-4 h-4" />
                                                </button>
                                                <button onClick={() => handleDelete(c.id)} className="btn-ghost p-2 text-red-500 hover:text-red-700" title="Eliminar">
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {data.length === 0 && (
                                    <tr>
                                        <td colSpan={6} className="text-center py-20 text-primary-400">
                                            No se encontraron clientes
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Pagination */}
            {total > 20 && (
                <div className="flex items-center justify-between">
                    <p className="text-sm text-primary-400">Página {page + 1}</p>
                    <div className="flex gap-2">
                        <button disabled={page === 0} onClick={() => setPage(p => p - 1)} className="btn-ghost p-1.5 disabled:opacity-30">
                            <ChevronLeft className="w-4 h-4" />
                        </button>
                        <button disabled={(page + 1) * 20 >= total} onClick={() => setPage(p => p + 1)} className="btn-ghost p-1.5 disabled:opacity-30">
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            )}

            {/* Detail Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col">
                        <div className="flex items-center justify-between p-6 border-b border-muted shrink-0">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-caramel rounded-2xl flex items-center justify-center text-espresso font-bold text-xl shadow-inner">
                                    {editing ? (editing.firstName[0] + (editing.lastName?.[0] || '')) : <Plus className="w-6 h-6" />}
                                </div>
                                <div>
                                    <h2 className="text-lg font-bold text-espresso">
                                        {editing ? `${editing.firstName} ${editing.lastName || ''}` : 'Nuevo Cliente'}
                                    </h2>
                                    {editing && <p className="text-xs text-primary-500 uppercase tracking-widest font-semibold mt-0.5">ID: {editing.id}</p>}
                                </div>
                            </div>
                            <button onClick={() => setShowModal(false)} className="btn-ghost p-2 rounded-full hover:bg-red-50 hover:text-red-500">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {editing && (
                            <div className="flex border-b border-muted bg-primary-50/30 overflow-x-auto shrink-0 no-scrollbar">
                                {[
                                    { id: 'profile', icon: User, label: 'Perfil' },
                                    { id: 'account', icon: Banknote, label: 'Cuenta Corriente' },
                                    { id: 'loyalty', icon: Star, label: 'Fidelización' }
                                ].map(tab => (
                                    <button
                                        key={tab.id}
                                        onClick={() => setActiveTab(tab.id as any)}
                                        className={`flex items-center gap-2 px-6 py-4 text-sm font-semibold transition-all border-b-2 whitespace-nowrap ${activeTab === tab.id
                                            ? 'border-primary-700 text-primary-700 bg-white'
                                            : 'border-transparent text-primary-400 hover:text-primary-600 hover:bg-primary-50'
                                            }`}
                                    >
                                        <tab.icon className="w-4 h-4" /> {tab.label}
                                    </button>
                                ))}
                            </div>
                        )}

                        <div className="flex-1 overflow-y-auto p-6 bg-white custom-scroll">
                            {activeTab === 'profile' && (
                                <form onSubmit={handleSave} className="space-y-6 max-w-2xl mx-auto">
                                    <div className="grid grid-cols-2 gap-5">
                                        <div className="space-y-1.5">
                                            <label className="block text-xs font-bold text-primary-700 uppercase tracking-tight">Nombre *</label>
                                            <div className="relative">
                                                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary-400" />
                                                <input className="input pl-10" maxLength={40} value={form.firstName} onChange={e => setForm({ ...form, firstName: e.target.value })} required placeholder="Ej: Juan" />
                                            </div>
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="block text-xs font-bold text-primary-700 uppercase tracking-tight">Apellido</label>
                                            <input className="input" maxLength={40} value={form.lastName} onChange={e => setForm({ ...form, lastName: e.target.value })} placeholder="Ej: Pérez" />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="block text-xs font-bold text-primary-700 uppercase tracking-tight">Email</label>
                                            <div className="relative">
                                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary-400" />
                                                <input type="email" className="input pl-10" maxLength={50} value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="juan@correo.com" />
                                            </div>
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="block text-xs font-bold text-primary-700 uppercase tracking-tight">Teléfono</label>
                                            <div className="relative">
                                                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary-400" />
                                                <input className="input pl-10" maxLength={20} value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="+54 221 ..." />
                                            </div>
                                        </div>
                                        <div className="space-y-1.5 col-span-2 sm:col-span-1">
                                            <label className="block text-xs font-bold text-primary-700 uppercase tracking-tight">Documento</label>
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
                                                <div className="relative flex-1">
                                                    <Fingerprint className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary-400" />
                                                    <input className="input pl-10 font-mono" maxLength={20} value={form.taxId} onChange={e => setForm({ ...form, taxId: formatDoc(e.target.value, form.documentType) })} placeholder={form.documentType === 'DNI' ? '12345678' : '20-XXXXXXXX-X'} />
                                                </div>
                                            </div>
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="block text-xs font-bold text-primary-700 uppercase tracking-tight">Dirección</label>
                                            <div className="relative">
                                                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary-400" />
                                                <input className="input pl-10" maxLength={50} value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} placeholder="Calle 123, Ciudad" />
                                            </div>
                                        </div>
                                        <div className="col-span-2 space-y-1.5">
                                            <label className="block text-xs font-bold text-primary-700 uppercase tracking-tight">Notas / Observaciones</label>
                                            <textarea className="input min-h-[100px]" maxLength={40} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Preferencias, alergias, referencias comerciales..." />
                                        </div>
                                    </div>
                                    <div className="flex gap-3 pt-4 border-t border-muted">
                                        <button type="button" onClick={() => setShowModal(false)} className="btn-ghost flex-1">Cancelar</button>
                                        <button type="submit" disabled={saving} className="btn-primary flex-1 shadow-md active:scale-95 transition-transform">
                                            {saving ? 'Guardando...' : editing ? 'Actualizar Datos' : 'Registrar Cliente'}
                                        </button>
                                    </div>
                                </form>
                            )}

                            {activeTab === 'account' && editing && (
                                <div className="space-y-6">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="card bg-primary-50 border-primary-200 p-5 shadow-inner">
                                            <p className="text-xs font-bold text-primary-600 uppercase tracking-widest mb-1">Saldo Actual</p>
                                            <p className={`text-3xl font-black ${editing.accountBalance < 0 ? 'text-red-600' : 'text-emerald-700'}`}>
                                                {FMT_CUR(editing.accountBalance)}
                                            </p>
                                        </div>
                                        <div className="card border-dashed p-4 flex flex-col justify-center">
                                            <p className="text-xs font-bold text-primary-400 uppercase tracking-widest mb-2">Acción Rápida</p>
                                            <div className="flex gap-2">
                                                <button onClick={() => {
                                                    const amt = prompt('Monto a cargar (aumenta el saldo):')
                                                    if (amt) adjustBalance(Math.abs(parseFloat(amt)), 'Ajuste manual')
                                                }} className="btn-primary py-1.5 text-xs flex-1">Cargar Saldo</button>
                                                <button onClick={() => {
                                                    const amt = prompt('Monto del pago (disminuye el saldo):')
                                                    if (amt) adjustBalance(-Math.abs(parseFloat(amt)), 'Cobro de cuenta corriente')
                                                }} className="btn-secondary py-1.5 text-xs flex-1">Registrar Pago</button>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-3">
                                        <h3 className="text-sm font-bold text-espresso uppercase tracking-wider flex items-center gap-2">
                                            <History className="w-4 h-4" /> Historial de Movimientos
                                        </h3>
                                        <div className="border border-muted rounded-xl overflow-hidden shadow-sm">
                                            <table className="data-table text-sm">
                                                <thead className="bg-primary-50/50">
                                                    <tr>
                                                        <th>Fecha</th>
                                                        <th>Descripción</th>
                                                        <th className="text-right">Monto</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {movements.map(m => (
                                                        <tr key={m.id}>
                                                            <td className="text-primary-500 font-medium">{FMT_DATE(m.createdAt)}</td>
                                                            <td className="font-semibold text-espresso">{m.description}</td>
                                                            <td className={`text-right font-bold ${m.movementType === 'CHARGE' ? 'text-emerald-600' : 'text-red-500'}`}>
                                                                {m.movementType === 'CHARGE' ? '+' : '-'}{FMT_CUR(Math.abs(m.amount))}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                    {movements.length === 0 && (
                                                        <tr>
                                                            <td colSpan={3} className="text-center py-10 text-primary-400 italic">Sin movimientos registrados</td>
                                                        </tr>
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'loyalty' && editing && (
                                <div className="space-y-6 max-w-lg mx-auto py-4">
                                    <div className="text-center space-y-2">
                                        <div className="w-24 h-24 bg-amber-50 rounded-full flex items-center justify-center text-amber-500 mx-auto border-4 border-amber-100 shadow-xl">
                                            <Star className="w-12 h-12 fill-current" />
                                        </div>
                                        <h3 className="text-3xl font-black text-espresso">{editing.loyaltyPoints}</h3>
                                        <p className="text-sm font-bold text-amber-600 uppercase tracking-widest">Puntos de Fidelización</p>
                                    </div>

                                    <div className="card p-6 border-amber-100 bg-amber-50/20 space-y-4 shadow-sm">
                                        <p className="text-sm text-primary-600 text-center font-medium italic">¿Querés ajustar los puntos manualmente?</p>
                                        <div className="flex gap-3">
                                            <button onClick={() => {
                                                const p = prompt('Puntos a sumar:')
                                                if (p) adjustPoints(parseInt(p))
                                            }} className="btn-primary bg-amber-600 border-amber-700 hover:bg-amber-700 flex-1 flex flex-col items-center py-3">
                                                <Plus className="w-5 h-5 mb-1" />
                                                <span className="text-xs uppercase font-bold">Sumar</span>
                                            </button>
                                            <button onClick={() => {
                                                const p = prompt('Puntos a restar:')
                                                if (p) adjustPoints(-parseInt(p))
                                            }} className="btn-secondary border-amber-200 text-amber-700 hover:bg-amber-100 flex-1 flex flex-col items-center py-3">
                                                <Trash2 className="w-5 h-5 mb-1" />
                                                <span className="text-xs uppercase font-bold">Restar</span>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
