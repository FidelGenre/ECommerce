'use client'
import { useEffect, useState } from 'react'
import api from '@/lib/api'
import { Customer, AccountMovement } from '@/types'
import { Plus, X, ChevronLeft, ChevronRight, ChevronUp, ChevronDown, Search, History, ArrowDownRight, ArrowUpRight, Star, Trash2 } from 'lucide-react'

const FIELD_LABELS: Record<string, string> = {
    firstName: 'Nombre',
    lastName: 'Apellido',
    email: 'Email',
    phone: 'Teléfono',
    address: 'Dirección',
    taxId: 'CUIT / RUT',
}

export default function CustomersPage() {
    const [data, setData] = useState<Customer[]>([])
    const [total, setTotal] = useState(0)
    const [page, setPage] = useState(0)
    const [q, setQ] = useState('')
    const [loading, setLoading] = useState(true)

    // Sort
    const [sortField, setSortField] = useState('firstName')
    const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')

    // Edit Modal
    const [showModal, setShowModal] = useState(false)
    const [editing, setEditing] = useState<Customer | null>(null)
    const [form, setForm] = useState({ firstName: '', lastName: '', email: '', phone: '', address: '', taxId: '', notes: '' })
    const [saving, setSaving] = useState(false)

    // Selection
    const [selected, setSelected] = useState<Set<number>>(new Set())
    const [deleting, setDeleting] = useState(false)

    const toggleSelect = (id: number) => setSelected(prev => {
        const next = new Set(prev)
        next.has(id) ? next.delete(id) : next.add(id)
        return next
    })
    const toggleAll = () => setSelected(prev => prev.size === data.length ? new Set() : new Set(data.map(c => c.id)))

    // Points Modal
    const [pointsModal, setPointsModal] = useState<Customer | null>(null)
    const [pointsAdj, setPointsAdj] = useState('')

    // Account Modal
    const [accountModal, setAccountModal] = useState<Customer | null>(null)
    const [movements, setMovements] = useState<AccountMovement[]>([])
    const [accLoading, setAccLoading] = useState(false)
    const [accForm, setAccForm] = useState({ amount: '', description: '', type: 'PAYMENT' })

    const load = async () => {
        setLoading(true)
        const r = await api.get(`/api/admin/customers?page=${page}&size=15${q ? '&q=' + q : ''}&sort=${sortField}&dir=${sortDir.toUpperCase()}`)
        setData(r.data.content); setTotal(r.data.totalElements); setLoading(false)
    }
    useEffect(() => { load() }, [page, q, sortField, sortDir])

    const toggleSort = (field: string) => {
        setPage(0)
        if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
        else { setSortField(field); setSortDir('asc') }
    }
    const SortIcon = ({ field }: { field: string }) => (
        <span className="inline-flex items-center ml-1">
            {sortField === field && sortDir === 'asc' ? <ChevronUp className="w-3 h-3" /> : sortField === field && sortDir === 'desc' ? <ChevronDown className="w-3 h-3" /> : <span className="opacity-30">↕</span>}
        </span>
    )

    const openNew = () => { setEditing(null); setForm({ firstName: '', lastName: '', email: '', phone: '', address: '', taxId: '', notes: '' }); setShowModal(true) }
    const openEdit = (c: Customer) => { setEditing(c); setForm({ firstName: c.firstName, lastName: c.lastName ?? '', email: c.email ?? '', phone: c.phone ?? '', address: c.address ?? '', taxId: c.taxId ?? '', notes: c.notes ?? '' }); setShowModal(true) }

    const openAccount = async (c: Customer) => {
        setAccountModal(c)
        setAccLoading(true)
        setAccForm({ amount: '', description: '', type: 'PAYMENT' })
        try {
            const r = await api.get(`/api/admin/customers/${c.id}/movements`)
            setMovements(r.data)
        } finally { setAccLoading(false) }
    }

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault(); setSaving(true)
        try {
            if (editing) await api.put(`/api/admin/customers/${editing.id}`, form)
            else await api.post('/api/admin/customers', form)
            setShowModal(false); load()
        } finally { setSaving(false) }
    }

    const handleDelete = async (ids: number[]) => {
        if (!confirm(`¿Eliminar ${ids.length === 1 ? 'este cliente' : `estos ${ids.length} clientes`}?`)) return
        setDeleting(true)
        const errors: string[] = []
        for (const id of ids) {
            try { await api.delete(`/api/admin/customers/${id}`) }
            catch (e: any) {
                const name = data.find(c => c.id === id)?.firstName ?? id
                errors.push(`${name}: ${e.response?.data ?? 'Error'}`)
            }
        }
        setDeleting(false)
        setSelected(new Set())
        if (errors.length) alert(errors.join('\n'))
        load()
    }

    const handleAddMovement = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!accountModal || !accForm.amount) return
        setSaving(true)
        try {
            const amt = Number(accForm.amount) * (accForm.type === 'PAYMENT' ? -1 : 1)
            await api.patch(`/api/admin/customers/${accountModal.id}/balance`, {
                amount: amt,
                description: accForm.description || (accForm.type === 'PAYMENT' ? 'Cobro registrado' : 'Cargo manual')
            })
            setAccForm({ amount: '', description: '', type: 'PAYMENT' })
            const r = await api.get(`/api/admin/customers/${accountModal.id}/movements`)
            setMovements(r.data)
            load() // Reload to update accountBalance in background
        } finally { setSaving(false) }
    }

    const handleAdjustPoints = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!pointsModal || !pointsAdj) return
        setSaving(true)
        try {
            await api.patch(`/api/admin/customers/${pointsModal.id}/loyalty`, { points: Number(pointsAdj) })
            setPointsModal(null)
            setPointsAdj('')
            load()
        } finally { setSaving(false) }
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div><h1 className="text-2xl font-bold text-espresso">Clientes</h1><p className="text-primary-500 text-sm">{total} clientes</p></div>
                <div className="flex items-center gap-2">
                    {selected.size > 0 && (
                        <button onClick={() => handleDelete([...selected])} disabled={deleting}
                            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-100 text-red-700 hover:bg-red-200 text-sm font-medium transition-colors disabled:opacity-50">
                            <Trash2 className="w-4 h-4" />{deleting ? 'Eliminando…' : `Eliminar ${selected.size} seleccionados`}
                        </button>
                    )}
                    <button onClick={openNew} className="btn-primary flex items-center gap-2"><Plus className="w-4 h-4" />Agregar cliente</button>
                </div>
            </div>
            <div className="card p-0 overflow-hidden">
                <div className="p-4 border-b border-muted">
                    <div className="relative max-w-xs flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary-400" />
                        <input className="input pl-9" placeholder="Buscar…" value={q} onChange={e => setQ(e.target.value)} />
                    </div>
                    {q && (
                        <button onClick={() => setQ('')} className="text-xs text-primary-500 hover:text-red-600 flex items-center gap-1 transition-colors bg-white px-2 py-1 rounded border border-transparent hover:border-red-200">
                            <X className="w-3 h-3" /> Limpiar filtros
                        </button>
                    )}
                </div>
                {loading ? <div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-primary-700 border-t-transparent rounded-full animate-spin" /></div> : (
                    <div className="table-wrapper rounded-none border-0">
                        <table className="data-table">
                            <thead><tr><th className="w-8 pl-4"><input type="checkbox" checked={selected.size === data.length && data.length > 0} onChange={toggleAll} className="w-4 h-4 rounded accent-primary-700" /></th><th className="cursor-pointer select-none" onClick={() => toggleSort('firstName')}>Nombre <SortIcon field="firstName" /></th><th className="cursor-pointer select-none" onClick={() => toggleSort('email')}>Email <SortIcon field="email" /></th><th className="cursor-pointer select-none" onClick={() => toggleSort('phone')}>Teléfono <SortIcon field="phone" /></th><th className="cursor-pointer select-none" onClick={() => toggleSort('accountBalance')}>Saldo C/C <SortIcon field="accountBalance" /></th><th className="cursor-pointer select-none" onClick={() => toggleSort('loyaltyPoints')}>Puntos <SortIcon field="loyaltyPoints" /></th><th>Acciones</th></tr></thead>
                            <tbody>
                                {data.map(c => (
                                    <tr key={c.id} className={selected.has(c.id) ? 'bg-red-50' : ''}>
                                        <td className="pl-4"><input type="checkbox" checked={selected.has(c.id)} onChange={() => toggleSelect(c.id)} className="w-4 h-4 rounded accent-primary-700" /></td>
                                        <td className="font-medium">{c.firstName} {c.lastName}</td>
                                        <td className="text-primary-500">{c.email ?? '—'}</td>
                                        <td className="text-primary-500">{c.phone ?? '—'}</td>
                                        <td className={Number(c.accountBalance) > 0 ? 'text-red-600 font-semibold' : (Number(c.accountBalance) < 0 ? 'text-emerald-600 font-semibold' : 'text-primary-500 font-semibold')}>
                                            ${Math.abs(Number(c.accountBalance)).toLocaleString('es-AR')} {Number(c.accountBalance) > 0 ? '(Debe)' : Number(c.accountBalance) < 0 ? '(A favor)' : ''}
                                        </td>
                                        <td>
                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-50 text-amber-700 rounded-full text-xs font-semibold">
                                                <Star className="w-3 h-3 fill-amber-700" /> {c.loyaltyPoints ?? 0}
                                            </span>
                                        </td>
                                        <td className="space-x-1 flex items-center">
                                            <button onClick={() => openAccount(c)} className="btn-ghost py-1 px-2 text-xs flex items-center gap-1" title="Cuenta Corriente">
                                                <History className="w-3.5 h-3.5" /> Cuenta
                                            </button>
                                            <button onClick={() => { setPointsModal(c); setPointsAdj('') }} className="btn-ghost py-1 px-2 text-xs flex items-center gap-1 text-amber-600 hover:text-amber-800" title="Ajustar Puntos">
                                                <Star className="w-3.5 h-3.5" /> Puntos
                                            </button>
                                            <button onClick={() => openEdit(c)} className="btn-ghost py-1 px-2 text-xs">Editar</button>
                                            <button onClick={() => handleDelete([c.id])} className="text-red-500 hover:text-red-700 text-xs px-2 py-1">Eliminar</button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
                <div className="flex items-center justify-between px-4 py-3 border-t border-muted">
                    <p className="text-xs text-primary-400">Página {page + 1}</p>
                    <div className="flex gap-2">
                        <button disabled={page === 0} onClick={() => setPage(p => p - 1)} className="btn-ghost p-1.5 disabled:opacity-30"><ChevronLeft className="w-4 h-4" /></button>
                        <button disabled={(page + 1) * 15 >= total} onClick={() => setPage(p => p + 1)} className="btn-ghost p-1.5 disabled:opacity-30"><ChevronRight className="w-4 h-4" /></button>
                    </div>
                </div>
            </div>

            {/* Editing Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
                    <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl">
                        <div className="flex items-center justify-between p-6 border-b border-muted">
                            <h2 className="text-lg font-bold text-espresso">{editing ? 'Editar' : 'Nuevo'} Cliente</h2>
                            <button onClick={() => setShowModal(false)} className="btn-ghost p-1.5"><X className="w-5 h-5" /></button>
                        </div>
                        <form onSubmit={handleSave} className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                {(['firstName', 'lastName', 'email', 'phone', 'address', 'taxId'] as const).map(k => (
                                    <div key={k}>
                                        <label className="block text-sm font-medium text-primary-700 mb-1">{FIELD_LABELS[k] ?? k}</label>
                                        <input className="input" value={(form as any)[k]} onChange={e => setForm({ ...form, [k]: e.target.value })} required={k === 'firstName'} />
                                    </div>
                                ))}
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-primary-700 mb-1">Notas</label>
                                <textarea className="input" rows={2} value={form.notes} onChange={e = maxLength={40}> setForm({ ...form, notes: e.target.value })} />
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary flex-1">Cancelar</button>
                                <button type="submit" className="btn-primary flex-1" disabled={saving}>{saving ? 'Guardando…' : 'Guardar'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Account Modal */}
            {accountModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
                    <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl">
                        <div className="flex items-center justify-between p-6 border-b border-muted">
                            <div>
                                <h2 className="text-lg font-bold text-espresso">Cuenta Corriente - {accountModal.firstName} {accountModal.lastName}</h2>
                                <p className="text-sm text-primary-500">Saldo actual: <span className={Number(accountModal.accountBalance) > 0 ? 'text-red-600 font-bold' : (Number(accountModal.accountBalance) < 0 ? 'text-emerald-600 font-bold' : 'font-bold')}>${Math.abs(Number(accountModal.accountBalance)).toLocaleString('es-AR')} {Number(accountModal.accountBalance) > 0 ? '(Debe)' : Number(accountModal.accountBalance) < 0 ? '(A favor)' : ''}</span></p>
                            </div>
                            <button onClick={() => setAccountModal(null)} className="btn-ghost p-1.5"><X className="w-5 h-5" /></button>
                        </div>

                        <div className="p-6 flex-1 overflow-y-auto bg-warm-50 space-y-4">
                            {/* Form to add movement */}
                            <form onSubmit={handleAddMovement} className="card p-4 flex gap-3 items-end">
                                <div>
                                    <label className="block text-xs font-medium text-primary-700 mb-1">Tipo</label>
                                    <select className="select text-sm py-1.5" value={accForm.type} onChange={e => setAccForm({ ...accForm, type: e.target.value as any })}>
                                        <option value="PAYMENT">Ingreso (Cobro)</option>
                                        <option value="CHARGE">Egreso (Deuda)</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-primary-700 mb-1">Monto $</label>
                                    <input type="number" step="0.01" min="0" required className="input text-sm py-1.5 w-32" value={accForm.amount} onChange={e => setAccForm({ ...accForm, amount: e.target.value })} placeholder="0.00" />
                                </div>
                                <div className="flex-1">
                                    <label className="block text-xs font-medium text-primary-700 mb-1">Concepto</label>
                                    <input type="text" className="input text-sm py-1.5" value={accForm.description} onChange={e = maxLength={100}> setAccForm({ ...accForm, description: e.target.value })} placeholder="Ej. Pago en efectivo" />
                                </div>
                                <button type="submit" disabled={saving || !accForm.amount} className="btn-primary py-1.5 px-4 text-sm whitespace-nowrap">
                                    {saving ? '...' : 'Registrar'}
                                </button>
                            </form>

                            {/* Movements Ledger */}
                            <div className="card p-0 overflow-hidden">
                                {accLoading ? <div className="p-8 text-center text-primary-400">Cargando...</div> : (
                                    <table className="data-table">
                                        <thead>
                                            <tr>
                                                <th>Fecha</th>
                                                <th>Concepto</th>
                                                <th className="text-right">Monto</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {movements.length === 0 ? (
                                                <tr><td colSpan={3} className="text-center py-6 text-primary-400 text-sm">Sin movimientos</td></tr>
                                            ) : movements.map(m => (
                                                <tr key={m.id}>
                                                    <td className="text-xs text-primary-500 w-32">{new Date(m.createdAt).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' })}</td>
                                                    <td className="font-medium text-sm flex items-center gap-2">
                                                        {m.movementType === 'CHARGE' ? <ArrowUpRight className="w-4 h-4 text-red-500" /> : <ArrowDownRight className="w-4 h-4 text-emerald-500" />}
                                                        {m.description || (m.movementType === 'CHARGE' ? 'Cargo' : 'Pago')}
                                                    </td>
                                                    <td className={`text-right font-semibold text-sm ${m.movementType === 'CHARGE' ? 'text-red-600' : 'text-emerald-600'}`}>
                                                        {m.movementType === 'CHARGE' ? '+' : '-'}${Math.abs(m.amount).toLocaleString('es-AR')}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Points Modal */}
            {pointsModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[70] p-4">
                    <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl">
                        <div className="flex items-center justify-between p-6 border-b border-muted">
                            <div>
                                <h2 className="text-lg font-bold text-espresso">Puntos de {pointsModal.firstName}</h2>
                                <p className="text-sm text-primary-500">Actuales: {pointsModal.loyaltyPoints ?? 0}</p>
                            </div>
                            <button onClick={() => setPointsModal(null)} className="btn-ghost p-1.5"><X className="w-5 h-5" /></button>
                        </div>
                        <form onSubmit={handleAdjustPoints} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-primary-700 mb-1">Ajustar Puntos (+ ó -)</label>
                                <input type="number" className="input" placeholder="Ej: 100 o -50" value={pointsAdj} onChange={e => setPointsAdj(e.target.value)} required />
                                <p className="text-xs text-primary-500 mt-1">Usar un número negativo restará puntos.</p>
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button type="button" onClick={() => setPointsModal(null)} className="btn-secondary flex-1">Cancelar</button>
                                <button type="submit" className="btn-primary flex-1" disabled={saving}>{saving ? 'Guardando…' : 'Aplicar'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}
