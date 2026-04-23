'use client'
import { useEffect, useState, useCallback } from 'react'
import api from '@/lib/api'
import { Plus, X, Pencil, Trash2, Download, ChevronLeft, ChevronRight, ChevronUp, ChevronDown, CheckCircle, Circle } from 'lucide-react'
import * as XLSX from 'xlsx'

const FMT = (n: number) => `$${Number(n ?? 0).toLocaleString('es-AR')}`

interface InternalCost {
    id: number; description: string; amount: number
    category: string; costDate: string; createdBy?: { username: string }
    paid: boolean; paidAt?: string
}

const CATEGORIES = ['Servicios', 'Gastos imprevistos', 'Mantenimiento', 'Utilities', 'Sueldos', 'Marketing', 'Otros']

const emptyForm = { description: '', amount: '', category: '', costDate: new Date().toISOString().slice(0, 10) }

export default function CostsPage() {
    const [data, setData] = useState<InternalCost[]>([])
    const [total, setTotal] = useState(0)
    const [page, setPage] = useState(0)
    const [loading, setLoading] = useState(true)

    // Sort
    const [sortField, setSortField] = useState('costDate')
    const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

    // Filters
    const [fromDate, setFromDate] = useState('')
    const [toDate, setToDate] = useState('')
    const [categoryFilter, setCategoryFilter] = useState('')
    const [searchText, setSearchText] = useState('')

    // Modal
    const [showModal, setShowModal] = useState(false)
    const [editItem, setEditItem] = useState<InternalCost | null>(null)
    const [form, setForm] = useState(emptyForm)
    const [saving, setSaving] = useState(false)
    const [deleteId, setDeleteId] = useState<number[] | null>(null)

    // Selection
    const [selected, setSelected] = useState<Set<number>>(new Set())
    const [deleting, setDeleting] = useState(false)

    const toggleSelect = (id: number) => setSelected(prev => {
        const next = new Set(prev)
        next.has(id) ? next.delete(id) : next.add(id)
        return next
    })
    const toggleAll = () => setSelected(prev => prev.size === data.length ? new Set() : new Set(data.map(c => c.id)))

    const buildUrl = useCallback(() => {
        const params = new URLSearchParams({ page: String(page), size: '15' })
        if (fromDate) params.set('from', fromDate)
        if (toDate) params.set('to', toDate)
        if (categoryFilter) params.set('category', categoryFilter)
        if (searchText) params.set('search', searchText)
        params.set('sort', sortField)
        params.set('dir', sortDir.toUpperCase())
        return `/api/admin/costs?${params}`
    }, [page, fromDate, toDate, categoryFilter, searchText, sortField, sortDir])

    const load = useCallback(async () => {
        setLoading(true)
        try {
            const r = await api.get(buildUrl())
            setData(r.data.content); setTotal(r.data.totalElements)
        } finally { setLoading(false) }
    }, [buildUrl])

    useEffect(() => { load() }, [load])

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

    const openCreate = () => { setEditItem(null); setForm(emptyForm); setShowModal(true) }
    const openEdit = (item: InternalCost) => {
        setEditItem(item)
        setForm({ description: item.description, amount: String(item.amount), category: item.category ?? '', costDate: item.costDate })
        setShowModal(true)
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault(); setSaving(true)
        try {
            const body = { ...form, amount: Number(form.amount) }
            if (editItem) await api.put(`/api/admin/costs/${editItem.id}`, body)
            else await api.post('/api/admin/costs', body)
            setShowModal(false); load()
        } finally { setSaving(false) }
    }

    const handleDelete = async () => {
        if (!deleteId) return
        setDeleting(true)
        const errors: string[] = []
        for (const id of deleteId) {
            try { await api.delete(`/api/admin/costs/${id}`) }
            catch (e: any) { errors.push(`Costo #${id}: ${e.response?.data ?? 'Error'}`) }
        }
        setDeleting(false)
        setDeleteId(null)
        setSelected(new Set())
        if (errors.length) alert(errors.join('\n'))
        load()
    }

    const togglePaid = async (c: InternalCost) => {
        await api.patch(`/api/admin/costs/${c.id}/mark-paid`, { paid: !c.paid })
        load()
    }

    const totalAmount = data.reduce((acc, c) => acc + Number(c.amount), 0)
    const totalPaid = data.filter(c => c.paid).reduce((acc, c) => acc + Number(c.amount), 0)
    const totalUnpaid = totalAmount - totalPaid

    const exportExcel = () => {
        const rows = data.map(c => ({
            ID: c.id,
            Descripción: c.description,
            Monto: Number(c.amount),
            Categoría: c.category ?? '—',
            Estado: c.paid ? 'Pagado' : 'Pendiente',
            Fecha: c.costDate,
            'Registrado por': c.createdBy?.username ?? '—',
        }))
        const ws = XLSX.utils.json_to_sheet(rows)
        const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'Costos internos')
        XLSX.writeFile(wb, `costos_internos_${new Date().toISOString().slice(0, 10)}.xlsx`)
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-espresso">Costos Internos</h1>
                    <p className="text-primary-500 text-sm">{total} registros · Total: {FMT(totalAmount)} · <span className="text-green-600">Pagado: {FMT(totalPaid)}</span> · <span className="text-red-600">Pendiente: {FMT(totalUnpaid)}</span></p>
                </div>
                <div className="flex items-center gap-2">
                    {selected.size > 0 && (
                        <button onClick={() => setDeleteId([...selected])} disabled={deleting}
                            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-100 text-red-700 hover:bg-red-200 text-sm font-medium transition-colors disabled:opacity-50">
                            <Trash2 className="w-4 h-4" />{deleting ? 'Eliminando…' : `Eliminar ${selected.size} seleccionados`}
                        </button>
                    )}
                    <button onClick={exportExcel} className="btn-secondary flex items-center gap-1.5 text-sm py-1.5 px-3">
                        <Download className="w-4 h-4" /> Excel
                    </button>
                    <button onClick={openCreate} className="btn-primary flex items-center gap-2">
                        <Plus className="w-4 h-4" /> Nuevo costo
                    </button>
                </div>
            </div>

            {/* Filters */}
            <div className="card p-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="relative md:col-span-1">
                        <input className="input pl-9 w-full text-sm" placeholder="Buscar descripción..." value={searchText}
                            onChange={e => { setSearchText(e.target.value); setPage(0) }} />
                        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                    </div>
                    <input type="date" className="input text-sm" value={fromDate} onChange={e => { setFromDate(e.target.value); setPage(0) }} />
                    <input type="date" className="input text-sm" value={toDate} onChange={e => { setToDate(e.target.value); setPage(0) }} />
                    <select className="select text-sm" value={categoryFilter} onChange={e => { setCategoryFilter(e.target.value); setPage(0) }}>
                        <option value="">Todas las categorías</option>
                        {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                </div>
                {(fromDate || toDate || categoryFilter || searchText) && (
                    <button onClick={() => { setFromDate(''); setToDate(''); setCategoryFilter(''); setSearchText(''); setPage(0) }}
                        className="mt-2 text-xs text-primary-500 hover:text-espresso flex items-center gap-1">
                        <X className="w-3 h-3" /> Limpiar filtros
                    </button>
                )}
            </div>

            <div className="card p-0 overflow-hidden">
                {loading ? (
                    <div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-primary-700 border-t-transparent rounded-full animate-spin" /></div>
                ) : (
                    <div className="table-wrapper rounded-none border-0">
                        <table className="data-table">
                            <thead><tr>
                                <th className="w-8 pl-4"><input type="checkbox" checked={selected.size === data.length && data.length > 0} onChange={toggleAll} className="w-4 h-4 rounded accent-primary-700" /></th>
                                <th className="cursor-pointer select-none" onClick={() => toggleSort('description')}>Descripción <SortIcon field="description" /></th>
                                <th className="cursor-pointer select-none" onClick={() => toggleSort('category')}>Categoría <SortIcon field="category" /></th>
                                <th className="text-right cursor-pointer select-none" onClick={() => toggleSort('amount')}>Monto <SortIcon field="amount" /></th>
                                <th className="cursor-pointer select-none" onClick={() => toggleSort('paid')}>Estado <SortIcon field="paid" /></th>
                                <th className="cursor-pointer select-none" onClick={() => toggleSort('costDate')}>Fecha <SortIcon field="costDate" /></th>
                                <th>Registrado por</th>
                                <th>Acciones</th>
                            </tr></thead>
                            <tbody>
                                {data.length === 0 ? (
                                    <tr><td colSpan={8} className="text-center text-primary-400 py-10">No hay costos registrados</td></tr>
                                ) : data.map(c => (
                                    <tr key={c.id} className={`${c.paid ? 'opacity-60' : ''} ${selected.has(c.id) ? 'bg-red-50' : ''}`}>
                                        <td className="pl-4"><input type="checkbox" checked={selected.has(c.id)} onChange={() => toggleSelect(c.id)} className="w-4 h-4 rounded accent-primary-700" /></td>
                                        <td className="font-medium">{c.description}</td>
                                        <td>
                                            {c.category ? <span className="badge-brown">{c.category}</span> : <span className="text-primary-300">—</span>}
                                        </td>
                                        <td className={`text-right font-semibold ${c.paid ? 'text-primary-400 line-through' : 'text-red-600'}`}>{FMT(c.amount)}</td>
                                        <td>
                                            {c.paid
                                                ? <span className="badge-green flex items-center gap-1 w-fit"><CheckCircle className="w-3 h-3" /> Pagado</span>
                                                : <span className="badge-yellow flex items-center gap-1 w-fit"><Circle className="w-3 h-3" /> Pendiente</span>
                                            }
                                        </td>
                                        <td className="text-primary-400 text-xs">{new Date(c.costDate + 'T00:00:00').toLocaleDateString('es-AR')}</td>
                                        <td className="text-primary-400 text-xs">{c.createdBy?.username ?? '—'}</td>
                                        <td>
                                            <div className="flex gap-1 items-center">
                                                <button
                                                    onClick={() => togglePaid(c)}
                                                    className={`py-1 px-2 rounded text-xs font-medium transition-colors ${c.paid ? 'bg-primary-100 text-primary-600 hover:bg-primary-200' : 'bg-green-100 text-green-700 hover:bg-green-200'}`}
                                                    title={c.paid ? 'Marcar como pendiente' : 'Marcar como pagado'}
                                                >
                                                    {c.paid ? 'Deshacer' : 'Pagar'}
                                                </button>
                                                {!c.paid && (
                                                    <button onClick={() => openEdit(c)} className="btn-ghost py-1 px-2 text-xs">
                                                        <Pencil className="w-3.5 h-3.5" />
                                                    </button>
                                                )}
                                                {!c.paid && (
                                                    <button onClick={() => setDeleteId([c.id])} className="btn-ghost py-1 px-2 text-xs text-red-500 hover:text-red-700">
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
                <div className="flex items-center justify-between px-4 py-3 border-t border-muted">
                    <p className="text-xs text-primary-400">Página {page + 1} · {total} registros</p>
                    <div className="flex gap-2">
                        <button disabled={page === 0} onClick={() => setPage(p => p - 1)} className="btn-ghost p-1.5 disabled:opacity-30"><ChevronLeft className="w-4 h-4" /></button>
                        <button disabled={(page + 1) * 15 >= total} onClick={() => setPage(p => p + 1)} className="btn-ghost p-1.5 disabled:opacity-30"><ChevronRight className="w-4 h-4" /></button>
                    </div>
                </div>
            </div>

            {/* Create/Edit Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
                        <div className="flex items-center justify-between p-6 border-b border-muted">
                            <h2 className="text-lg font-bold text-espresso">{editItem ? 'Editar costo' : 'Nuevo costo'}</h2>
                            <button onClick={() => setShowModal(false)} className="btn-ghost p-1.5"><X className="w-5 h-5" /></button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-primary-700 mb-1">Descripción</label>
                                <input className="input" maxLength={100} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} required />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-primary-700 mb-1">Monto</label>
                                    <input type="number" min="0" step="0.01" className="input" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} required />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-primary-700 mb-1">Fecha</label>
                                    <input type="date" className="input" value={form.costDate} onChange={e => setForm({ ...form, costDate: e.target.value })} required />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-primary-700 mb-1">Categoría</label>
                                <select className="select" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
                                    <option value="">Sin categoría</option>
                                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary flex-1">Cancelar</button>
                                <button type="submit" className="btn-primary flex-1" disabled={saving}>{saving ? 'Guardando…' : editItem ? 'Guardar cambios' : 'Crear'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Delete confirm */}
            {deleteId && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl p-6 space-y-4">
                        <h2 className="font-bold text-espresso">¿Eliminar {deleteId.length === 1 ? 'este costo' : `estos ${deleteId.length} costos`}?</h2>
                        <p className="text-primary-500 text-sm">Esta acción no se puede deshacer.</p>
                        <div className="flex gap-3">
                            <button onClick={() => setDeleteId(null)} className="btn-secondary flex-1">Cancelar</button>
                            <button onClick={handleDelete} className="flex-1 bg-red-600 hover:bg-red-700 text-white rounded-lg py-2 font-semibold text-sm transition-colors">Eliminar</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
