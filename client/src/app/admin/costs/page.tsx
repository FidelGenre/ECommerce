'use client'
import { useEffect, useState, useCallback } from 'react'
import api from '@/lib/api'
import { Plus, X, Pencil, Trash2, Download, ChevronLeft, ChevronRight, CheckCircle, Circle } from 'lucide-react'
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

    // Filters
    const [fromDate, setFromDate] = useState('')
    const [toDate, setToDate] = useState('')
    const [categoryFilter, setCategoryFilter] = useState('')

    // Modal
    const [showModal, setShowModal] = useState(false)
    const [editItem, setEditItem] = useState<InternalCost | null>(null)
    const [form, setForm] = useState(emptyForm)
    const [saving, setSaving] = useState(false)
    const [deleteId, setDeleteId] = useState<number | null>(null)

    const buildUrl = useCallback(() => {
        const params = new URLSearchParams({ page: String(page), size: '15' })
        if (fromDate) params.set('from', fromDate)
        if (toDate) params.set('to', toDate)
        if (categoryFilter) params.set('category', categoryFilter)
        return `/api/admin/costs?${params}`
    }, [page, fromDate, toDate, categoryFilter])

    const load = useCallback(async () => {
        setLoading(true)
        try {
            const r = await api.get(buildUrl())
            setData(r.data.content); setTotal(r.data.totalElements)
        } finally { setLoading(false) }
    }, [buildUrl])

    useEffect(() => { load() }, [load])

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
        await api.delete(`/api/admin/costs/${deleteId}`)
        setDeleteId(null); load()
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
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    <input type="date" className="input text-sm" value={fromDate} onChange={e => { setFromDate(e.target.value); setPage(0) }} />
                    <input type="date" className="input text-sm" value={toDate} onChange={e => { setToDate(e.target.value); setPage(0) }} />
                    <select className="select text-sm" value={categoryFilter} onChange={e => { setCategoryFilter(e.target.value); setPage(0) }}>
                        <option value="">Todas las categorías</option>
                        {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                </div>
                {(fromDate || toDate || categoryFilter) && (
                    <button onClick={() => { setFromDate(''); setToDate(''); setCategoryFilter(''); setPage(0) }}
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
                                <th>Descripción</th>
                                <th>Categoría</th>
                                <th className="text-right">Monto</th>
                                <th>Estado</th>
                                <th>Fecha</th>
                                <th>Registrado por</th>
                                <th>Acciones</th>
                            </tr></thead>
                            <tbody>
                                {data.length === 0 ? (
                                    <tr><td colSpan={7} className="text-center text-primary-400 py-10">No hay costos registrados</td></tr>
                                ) : data.map(c => (
                                    <tr key={c.id} className={c.paid ? 'opacity-60' : ''}>
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
                                                <button onClick={() => openEdit(c)} className="btn-ghost py-1 px-2 text-xs">
                                                    <Pencil className="w-3.5 h-3.5" />
                                                </button>
                                                <button onClick={() => setDeleteId(c.id)} className="btn-ghost py-1 px-2 text-xs text-red-500 hover:text-red-700">
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
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
                        <button onClick={() => setPage(p => p + 1)} className="btn-ghost p-1.5"><ChevronRight className="w-4 h-4" /></button>
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
                                <input className="input" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} required />
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
                        <h2 className="font-bold text-espresso">¿Eliminar este costo?</h2>
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
