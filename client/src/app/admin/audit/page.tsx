'use client'
import { useEffect, useState, useCallback } from 'react'
import api from '@/lib/api'
import { StockMovement, Item } from '@/types'
import { ChevronLeft, ChevronRight, Search, X, Plus } from 'lucide-react'

const TYPE_LABEL: Record<string, string> = { IN: 'Entrada', OUT: 'Salida', ADJUSTMENT: 'Ajuste' }
const typeColor: Record<string, string> = { IN: 'badge-green', OUT: 'badge-red', ADJUSTMENT: 'badge-yellow' }

const REASON_TYPES = ['Merma', 'Pérdida', 'Rotura', 'Entrada manual', 'Corrección de inventario', 'Otro']

export default function AuditPage() {
    const [data, setData] = useState<StockMovement[]>([])
    const [total, setTotal] = useState(0)
    const [page, setPage] = useState(0)
    const [loading, setLoading] = useState(true)

    // Filters
    const [q, setQ] = useState('')
    const [fromDate, setFromDate] = useState('')
    const [toDate, setToDate] = useState('')
    const [typeFilter, setTypeFilter] = useState('')

    // Manual entry modal
    const [showModal, setShowModal] = useState(false)
    const [items, setItems] = useState<Item[]>([])
    const [adjForm, setAdjForm] = useState({ itemId: '', movementType: 'ADJUSTMENT', quantity: '', reasonType: 'Corrección de inventario', reasonDetail: '' })
    const [saving, setSaving] = useState(false)

    const buildUrl = useCallback(() => {
        const params = new URLSearchParams({ page: String(page), size: '20' })
        if (q) params.set('itemName', q)
        if (typeFilter) params.set('type', typeFilter)
        if (fromDate) params.set('from', fromDate + 'T00:00:00')
        if (toDate) params.set('to', toDate + 'T23:59:59')
        return `/api/admin/stock/movements?${params}`
    }, [page, q, fromDate, toDate, typeFilter])

    const load = useCallback(async () => {
        setLoading(true)
        try {
            const r = await api.get(buildUrl())
            setData(r.data.content); setTotal(r.data.totalElements)
        } finally { setLoading(false) }
    }, [buildUrl])

    useEffect(() => { load() }, [load])

    const resetFilters = () => { setQ(''); setFromDate(''); setToDate(''); setTypeFilter(''); setPage(0) }
    const hasFilters = q || fromDate || toDate || typeFilter

    const openModal = async () => {
        if (items.length === 0) {
            const r = await api.get('/api/admin/items', { params: { size: 500 } })
            setItems(r.data?.content ?? [])
        }
        setAdjForm({ itemId: '', movementType: 'ADJUSTMENT', quantity: '', reasonType: 'Corrección de inventario', reasonDetail: '' })
        setShowModal(true)
    }

    const handleManualEntry = async (e: React.FormEvent) => {
        e.preventDefault(); setSaving(true)
        try {
            const reason = adjForm.reasonDetail ? `${adjForm.reasonType}: ${adjForm.reasonDetail}` : adjForm.reasonType
            // Use the existing /adjust endpoint for manual stock changes
            await api.post('/api/admin/stock/adjust', {
                itemId: Number(adjForm.itemId),
                quantity: Number(adjForm.quantity),
                reason
            })
            setShowModal(false); load()
        } finally { setSaving(false) }
    }

    const refLabel = (m: StockMovement) => {
        if (!m.referenceType) return null
        if (m.referenceType === 'SALE') return <span className="text-xs text-primary-500">Venta #{m.referenceId}</span>
        if (m.referenceType === 'PURCHASE') return <span className="text-xs text-primary-500">Compra #{m.referenceId}</span>
        return <span className="text-xs text-primary-300">Manual</span>
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-espresso">Auditoría de Stock</h1>
                    <p className="text-primary-500 text-sm">{total} movimientos registrados</p>
                </div>
                <button onClick={openModal} className="btn-primary flex items-center gap-2">
                    <Plus className="w-4 h-4" /> Nuevo movimiento manual
                </button>
            </div>

            {/* Filters */}
            <div className="card p-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary-400" />
                        <input
                            className="input pl-9 w-full"
                            placeholder="Buscar producto..."
                            value={q}
                            onChange={e => { setQ(e.target.value); setPage(0) }}
                        />
                    </div>
                    <select className="select" value={typeFilter} onChange={e => { setTypeFilter(e.target.value); setPage(0) }}>
                        <option value="">Todos los tipos</option>
                        <option value="IN">Entrada</option>
                        <option value="OUT">Salida</option>
                        <option value="ADJUSTMENT">Ajuste</option>
                    </select>
                    <input type="date" className="input" value={fromDate} onChange={e => { setFromDate(e.target.value); setPage(0) }} placeholder="Desde" />
                    <input type="date" className="input" value={toDate} onChange={e => { setToDate(e.target.value); setPage(0) }} placeholder="Hasta" />
                </div>
                {hasFilters && (
                    <button onClick={resetFilters} className="mt-2 text-xs text-primary-500 hover:text-espresso flex items-center gap-1">
                        <X className="w-3 h-3" /> Limpiar filtros
                    </button>
                )}
            </div>

            <div className="card p-0 overflow-hidden">
                {loading ? <div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-primary-700 border-t-transparent rounded-full animate-spin" /></div> : (
                    <table className="data-table">
                        <thead><tr>
                            <th>#</th><th>Ítem</th><th>Tipo</th><th>Cantidad</th><th>Motivo</th><th>Usuario</th><th>Referencia</th><th>Fecha</th>
                        </tr></thead>
                        <tbody>{data.length === 0 ? (
                            <tr><td colSpan={8} className="text-center text-primary-400 py-10">No se encontraron movimientos</td></tr>
                        ) : data.map(m => (
                            <tr key={m.id}>
                                <td className="font-mono text-primary-400">{m.id}</td>
                                <td className="font-medium">{m.item?.name ?? '—'}</td>
                                <td><span className={typeColor[m.movementType] ?? 'badge-brown'}>{TYPE_LABEL[m.movementType] ?? m.movementType}</span></td>
                                <td className="font-semibold">{m.quantity > 0 ? '+' : ''}{m.quantity}</td>
                                <td className="text-primary-500">{m.reason ?? '—'}</td>
                                <td>{m.createdBy ? <span className="text-primary-600 font-medium">{m.createdBy.username ?? m.createdBy.email}</span> : <span className="text-primary-300">Sistema</span>}</td>
                                <td>{refLabel(m) ?? <span className="text-primary-300">—</span>}</td>
                                <td className="text-primary-400 text-xs">{new Date(m.createdAt).toLocaleString('es-AR')}</td>
                            </tr>
                        ))}</tbody>
                    </table>
                )}
                <div className="flex items-center justify-between px-4 py-3 border-t border-muted">
                    <p className="text-xs text-primary-400">Página {page + 1} — {total} total</p>
                    <div className="flex gap-2">
                        <button disabled={page === 0} onClick={() => setPage(p => p - 1)} className="btn-ghost p-1.5 disabled:opacity-30"><ChevronLeft className="w-4 h-4" /></button>
                        <button disabled={data.length < 20} onClick={() => setPage(p => p + 1)} className="btn-ghost p-1.5 disabled:opacity-30"><ChevronRight className="w-4 h-4" /></button>
                    </div>
                </div>
            </div>

            {/* Manual Entry Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
                        <div className="flex items-center justify-between p-6 border-b border-muted">
                            <h2 className="text-lg font-bold text-espresso">Nuevo movimiento manual</h2>
                            <button onClick={() => setShowModal(false)} className="btn-ghost p-1.5"><X className="w-5 h-5" /></button>
                        </div>
                        <form onSubmit={handleManualEntry} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-primary-700 mb-1">Producto</label>
                                <select className="select" value={adjForm.itemId} onChange={e => setAdjForm({ ...adjForm, itemId: e.target.value })} required>
                                    <option value="">Seleccionar producto</option>
                                    {items.map(it => <option key={it.id} value={it.id}>{it.name} (stock actual: {it.stock})</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-primary-700 mb-1">Cantidad</label>
                                <input type="number" step="any" className="input" placeholder="+10.5 para entrada, -3.2 para salida" value={adjForm.quantity} onChange={e => setAdjForm({ ...adjForm, quantity: e.target.value })} required />
                                <p className="text-xs text-primary-400 mt-1">Positivo = entrada · Negativo = salida</p>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-primary-700 mb-1">Tipo de movimiento</label>
                                <select className="select" value={adjForm.reasonType} onChange={e => setAdjForm({ ...adjForm, reasonType: e.target.value })}>
                                    {REASON_TYPES.map(r => <option key={r} value={r}>{r}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-primary-700 mb-1">Detalle <span className="text-primary-400 font-normal">(opcional)</span></label>
                                <input className="input" placeholder="Ej: mercadería dañada en tránsito" value={adjForm.reasonDetail} onChange={e => setAdjForm({ ...adjForm, reasonDetail: e.target.value })} />
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary flex-1">Cancelar</button>
                                <button type="submit" className="btn-primary flex-1" disabled={saving}>{saving ? 'Guardando…' : 'Registrar'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}
