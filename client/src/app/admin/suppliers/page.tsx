'use client'
import { useEffect, useState } from 'react'
import api from '@/lib/api'
import { Supplier, Category, AccountMovement } from '@/types'
import { Plus, X, Search, ChevronLeft, ChevronRight, History, ArrowDownRight, ArrowUpRight } from 'lucide-react'

const FIELD_LABELS: Record<string, string> = {
    name: 'Nombre',
    legalName: 'Razón Social',
    taxId: 'CUIT / RUT',
    alias: 'Alias',
    phone: 'Teléfono',
    email: 'Email',
    address: 'Dirección',
}

export default function SuppliersPage() {
    const [data, setData] = useState<Supplier[]>([])
    const [total, setTotal] = useState(0)
    const [page, setPage] = useState(0)
    const [q, setQ] = useState('')
    const [loading, setLoading] = useState(true)

    // Edit Modal
    const [showModal, setShowModal] = useState(false)
    const [editing, setEditing] = useState<Supplier | null>(null)
    const [categories, setCategories] = useState<Category[]>([])
    const blankForm = { name: '', legalName: '', taxId: '', alias: '', phone: '', email: '', address: '', categoryId: '' }
    const [form, setForm] = useState(blankForm)
    const [saving, setSaving] = useState(false)
    const [newCategoryName, setNewCategoryName] = useState('')

    // Account Modal
    const [accountModal, setAccountModal] = useState<Supplier | null>(null)
    const [movements, setMovements] = useState<AccountMovement[]>([])
    const [accLoading, setAccLoading] = useState(false)
    const [accForm, setAccForm] = useState({ amount: '', description: '', type: 'PAYMENT' })

    const load = async () => {
        setLoading(true)
        const r = await api.get(`/api/admin/suppliers?page=${page}&size=15${q ? '&q=' + q : ''}`)
        setData(r.data.content); setTotal(r.data.totalElements); setLoading(false)
    }
    useEffect(() => { load() }, [page, q])
    useEffect(() => { api.get('/api/admin/categories?type=SUPPLIER').then(r => setCategories(r.data)) }, [])

    const openNew = () => { setEditing(null); setForm(blankForm); setNewCategoryName(''); setShowModal(true) }
    const openEdit = (s: Supplier) => { setEditing(s); setForm({ name: s.name, legalName: s.legalName ?? '', taxId: s.taxId ?? '', alias: s.alias ?? '', phone: s.phone ?? '', email: s.email ?? '', address: s.address ?? '', categoryId: s.category?.id ? String(s.category.id) : '' }); setNewCategoryName(''); setShowModal(true) }

    const openAccount = async (s: Supplier) => {
        setAccountModal(s)
        setAccLoading(true)
        setAccForm({ amount: '', description: '', type: 'PAYMENT' })
        try {
            const r = await api.get(`/api/admin/suppliers/${s.id}/movements`)
            setMovements(r.data)
        } finally { setAccLoading(false) }
    }

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault(); setSaving(true)
        try {
            let categoryId: number | null = form.categoryId && form.categoryId !== '__new__' ? Number(form.categoryId) : null
            // Auto-create new category if user typed one
            if (form.categoryId === '__new__' && newCategoryName.trim()) {
                const res = await api.post('/api/admin/categories', { name: newCategoryName.trim(), type: 'SUPPLIER' })
                categoryId = res.data.id
                setCategories(prev => [...prev, res.data])
                setNewCategoryName('')
            }
            const payload = { ...form, category: categoryId ? { id: categoryId } : null }
            if (editing) await api.put(`/api/admin/suppliers/${editing.id}`, payload)
            else await api.post('/api/admin/suppliers', payload)
            setShowModal(false); load()
        } finally { setSaving(false) }
    }

    const handleAddMovement = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!accountModal || !accForm.amount) return
        setSaving(true)
        try {
            const amt = Number(accForm.amount) * (accForm.type === 'PAYMENT' ? -1 : 1)
            await api.patch(`/api/admin/suppliers/${accountModal.id}/balance`, {
                amount: amt,
                description: accForm.description || (accForm.type === 'PAYMENT' ? 'Pago registrado' : 'Cargo manual')
            })
            setAccForm({ amount: '', description: '', type: 'PAYMENT' })
            const r = await api.get(`/api/admin/suppliers/${accountModal.id}/movements`)
            setMovements(r.data)
            load() // Reload to update accountBalance in background
        } finally { setSaving(false) }
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div><h1 className="text-2xl font-bold text-espresso">Proveedores</h1><p className="text-primary-500 text-sm">{total} proveedores</p></div>
                <button onClick={openNew} className="btn-primary flex items-center gap-2"><Plus className="w-4 h-4" />Agregar proveedor</button>
            </div>
            <div className="card p-0 overflow-hidden">
                <div className="p-4 border-b border-muted">
                    <div className="relative max-w-xs">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary-400" />
                        <input className="input pl-9" placeholder="Buscar…" value={q} onChange={e => setQ(e.target.value)} />
                    </div>
                </div>
                {loading ? <div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-primary-700 border-t-transparent rounded-full animate-spin" /></div> : (
                    <div className="table-wrapper rounded-none border-0">
                        <table className="data-table">
                            <thead><tr><th>Nombre</th><th>Alias</th><th>Email</th><th>Teléfono</th><th>Categoría</th><th>Saldo C/C</th><th>Acciones</th></tr></thead>
                            <tbody>
                                {data.map(s => (
                                    <tr key={s.id}>
                                        <td className="font-medium">{s.name}</td>
                                        <td className="text-primary-400">{s.alias ?? '—'}</td>
                                        <td className="text-primary-500">{s.email ?? '—'}</td>
                                        <td className="text-primary-500">{s.phone ?? '—'}</td>
                                        <td>{s.category?.name ?? <span className="text-primary-300">—</span>}</td>
                                        <td className={Number(s.accountBalance) > 0 ? 'text-red-600 font-semibold' : (Number(s.accountBalance) < 0 ? 'text-emerald-600 font-semibold' : 'text-primary-500 font-semibold')}>
                                            ${Math.abs(Number(s.accountBalance)).toLocaleString('es-AR')} {Number(s.accountBalance) > 0 ? '(Debe)' : Number(s.accountBalance) < 0 ? '(A favor)' : ''}
                                        </td>
                                        <td className="space-x-1 flex items-center">
                                            <button onClick={() => openAccount(s)} className="btn-ghost py-1 px-2 text-xs flex items-center gap-1" title="Cuenta Corriente">
                                                <History className="w-3.5 h-3.5" /> Cuenta
                                            </button>
                                            <button onClick={() => openEdit(s)} className="btn-ghost py-1 px-2 text-xs">Editar</button>
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
                        <button onClick={() => setPage(p => p + 1)} className="btn-ghost p-1.5"><ChevronRight className="w-4 h-4" /></button>
                    </div>
                </div>
            </div>

            {/* Edit Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
                    <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl">
                        <div className="flex items-center justify-between p-6 border-b border-muted">
                            <h2 className="text-lg font-bold text-espresso">{editing ? 'Editar' : 'Nuevo'} Proveedor</h2>
                            <button onClick={() => setShowModal(false)} className="btn-ghost p-1.5"><X className="w-5 h-5" /></button>
                        </div>
                        <form onSubmit={handleSave} className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                {(['name', 'legalName', 'taxId', 'alias', 'phone', 'email', 'address'] as const).map(k => (
                                    <div key={k}>
                                        <label className="block text-sm font-medium text-primary-700 mb-1">{FIELD_LABELS[k] ?? k}</label>
                                        <input className="input" value={(form as any)[k]} onChange={e => setForm({ ...form, [k]: e.target.value })} required={k === 'name'} />
                                    </div>
                                ))}
                                <div>
                                    <label className="block text-sm font-medium text-primary-700 mb-1">Categoría</label>
                                    <select className="select" value={form.categoryId} onChange={e => { setForm({ ...form, categoryId: e.target.value }); if (e.target.value !== '__new__') setNewCategoryName('') }}>
                                        <option value="">Sin categoría</option>
                                        {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                        <option value="__new__">+ Nueva categoría…</option>
                                    </select>
                                    {form.categoryId === '__new__' && (
                                        <input autoFocus className="input mt-2" placeholder="Nombre de la nueva categoría" value={newCategoryName} onChange={e => setNewCategoryName(e.target.value)} required />
                                    )}
                                </div>
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
                                <h2 className="text-lg font-bold text-espresso">Cuenta Corriente - {accountModal.name} {accountModal.alias ? `(${accountModal.alias})` : ''}</h2>
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
                                        <option value="PAYMENT">Pagado al proveedor</option>
                                        <option value="CHARGE">Deuda adquirida</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-primary-700 mb-1">Monto $</label>
                                    <input type="number" step="0.01" min="0" required className="input text-sm py-1.5 w-32" value={accForm.amount} onChange={e => setAccForm({ ...accForm, amount: e.target.value })} placeholder="0.00" />
                                </div>
                                <div className="flex-1">
                                    <label className="block text-xs font-medium text-primary-700 mb-1">Concepto</label>
                                    <input type="text" className="input text-sm py-1.5" value={accForm.description} onChange={e => setAccForm({ ...accForm, description: e.target.value })} placeholder="Ej. Pago parcial" />
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
                                                        {m.movementType === 'CHARGE' ? <ArrowDownRight className="w-4 h-4 text-red-500" /> : <ArrowUpRight className="w-4 h-4 text-emerald-500" />}
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
        </div>
    )
}
