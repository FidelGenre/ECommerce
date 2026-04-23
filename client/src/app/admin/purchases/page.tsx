'use client'
import React, { useEffect, useState, useCallback } from 'react'
import api from '@/lib/api'
import { PurchaseOrder, OperationStatus, Supplier, PaymentMethod, Item } from '@/types'
import { Plus, Search, ChevronLeft, ChevronRight, X, Trash2, Download, FileSpreadsheet, ChevronUp, ChevronDown, CheckCircle, XCircle, Printer } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import * as XLSX from 'xlsx'
import { SavedFilters } from '@/components/SavedFilters'

const FMT = (n: number) => `$${Number(n ?? 0).toLocaleString('es-AR')}`

type SortField = 'id' | 'total' | 'createdAt' | 'supplier' | 'createdBy' | 'status' | 'paymentMethod'
type SortDir = 'asc' | 'desc'

export default function PurchasesPage() {
    const [data, setData] = useState<PurchaseOrder[]>([])
    const [total, setTotal] = useState(0)
    const [page, setPage] = useState(0)
    const [loading, setLoading] = useState(true)
    const [showModal, setShowModal] = useState(false)
    const [ticketModal, setTicketModal] = useState<PurchaseOrder | null>(null)

    // Filters
    const [fromDate, setFromDate] = useState('')
    const [toDate, setToDate] = useState('')
    const [statusFilter, setStatusFilter] = useState('')
    const [supplierFilter, setSupplierFilter] = useState('')
    const [orderCategoryFilter, setOrderCategoryFilter] = useState('')
    const [searchQ, setSearchQ] = useState('')

    // Expanded rows for showing product lines detail
    const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set())
    const toggleRow = (id: number) => setExpandedRows(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s })

    // Sort
    const [sortField, setSortField] = useState<SortField>('createdAt')
    const [sortDir, setSortDir] = useState<SortDir>('desc')

    // Reference data
    const [statuses, setStatuses] = useState<OperationStatus[]>([])
    const [suppliers, setSuppliers] = useState<Supplier[]>([])
    const [payments, setPayments] = useState<PaymentMethod[]>([])
    const [items, setItems] = useState<Item[]>([])
    const [categories, setCategories] = useState<any[]>([])

    const [form, setForm] = useState({ supplierId: '', statusId: '', paymentMethodId: '', notes: '' })
    const [lines, setLines] = useState<{ itemId: string; quantity: string; unitCost: string }[]>([{ itemId: '', quantity: '1', unitCost: '' }])
    const [saving, setSaving] = useState(false)

    // Category filter for modal
    const [categoryFilter, setCategoryFilter] = useState('')
    const [supplierCategoryFilterModal, setSupplierCategoryFilterModal] = useState('')

    const buildUrl = useCallback(() => {
        const params = new URLSearchParams({ page: String(page), size: '15' })
        if (fromDate) params.set('from', fromDate + 'T00:00:00')
        if (toDate) params.set('to', toDate + 'T23:59:59')
        if (statusFilter) params.set('status', statusFilter)
        if (supplierFilter) params.set('supplier', supplierFilter)
        if (searchQ) params.set('q', searchQ)
        if (orderCategoryFilter) params.set('category', orderCategoryFilter)
        if (sortField) params.set('sort', sortField)
        if (sortDir) params.set('dir', sortDir.toUpperCase())
        return `/api/admin/purchases?${params}`
    }, [page, fromDate, toDate, statusFilter, supplierFilter, searchQ, orderCategoryFilter, sortField, sortDir])

    const load = useCallback(async () => {
        setLoading(true)
        try {
            const r = await api.get(buildUrl())
            setData(r.data.content); setTotal(r.data.totalElements)
        } finally { setLoading(false) }
    }, [buildUrl])

    useEffect(() => { load() }, [load])
    useEffect(() => {
        Promise.all([
            api.get('/api/admin/settings/statuses?type=PURCHASE'),
            api.get('/api/admin/suppliers?size=200'),
            api.get('/api/admin/settings/payment-methods'),
            api.get('/api/admin/items?size=200'),
            api.get('/api/admin/categories?type=PRODUCT'),
        ]).then(([s, sup, pm, it, cats]) => {
            setStatuses(s.data); setSuppliers(sup.data.content)
            setPayments(pm.data); setItems(it.data.content)
            setCategories(cats.data)
            // Auto-select COMPLETADO status for new purchases
            const completado = s.data.find((st: OperationStatus) =>
                st.name?.toUpperCase().includes('COMPLET') ||
                st.name?.toUpperCase().includes('COMPLETE')
            )
            if (completado) setForm(f => ({ ...f, statusId: String(completado.id) }))
        })
    }, [])

    const resetFilters = () => { setFromDate(''); setToDate(''); setStatusFilter(''); setSupplierFilter(''); setOrderCategoryFilter(''); setSearchQ(''); setPage(0) }

    const toggleSort = (field: SortField) => {
        setPage(0)
        if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
        else { setSortField(field); setSortDir('asc') }
    }

    const sortedData = [...data]

    const SortIcon = ({ field }: { field: SortField }) => (
        <span className="inline-flex items-center ml-1">
            {sortField === field && sortDir === 'asc' ? <ChevronUp className="w-3 h-3" /> : sortField === field && sortDir === 'desc' ? <ChevronDown className="w-3 h-3" /> : <span className="opacity-30">↕</span>}
        </span>
    )

    const exportCSV = () => {
        const rows = sortedData.map(o => ({
            ID: o.id,
            Proveedor: o.supplier?.name ?? '—',
            Creador: o.createdBy?.username ?? o.createdBy?.email ?? '—',
            Estado: o.status?.name ?? '',
            Pago: o.paymentMethod?.name ?? '',
            Total: o.total,
            Fecha: new Date(o.createdAt).toLocaleDateString('es-AR'),
        }))
        const csv = [Object.keys(rows[0]).join(','), ...rows.map(r => Object.values(r).join(','))].join('\n')
        const a = document.createElement('a'); a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv)
        a.download = `compras_${new Date().toISOString().slice(0, 10)}.csv`; a.click()
    }

    const exportExcel = () => {
        const rows = sortedData.map(o => ({
            ID: o.id,
            Proveedor: o.supplier?.name ?? '—',
            Creador: o.createdBy?.username ?? o.createdBy?.email ?? '—',
            Estado: o.status?.name ?? '',
            'Forma de Pago': o.paymentMethod?.name ?? '',
            Total: Number(o.total),
            Fecha: new Date(o.createdAt).toLocaleDateString('es-AR'),
        }))
        const ws = XLSX.utils.json_to_sheet(rows)
        const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'Compras')
        XLSX.writeFile(wb, `compras_${new Date().toISOString().slice(0, 10)}.xlsx`)
    }

    const addLine = () => setLines(l => [...l, { itemId: '', quantity: '1', unitCost: '' }])
    const removeLine = (i: number) => setLines(l => l.filter((_, j) => j !== i))
    const updateLine = (i: number, k: string, v: string) => setLines(l => { const n = [...l]; (n[i] as any)[k] = v; return n })

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault(); setSaving(true)
        try {
            await api.post('/api/admin/purchases', {
                supplierId: form.supplierId ? Number(form.supplierId) : null,
                statusId: form.statusId ? Number(form.statusId) : null,
                paymentMethodId: form.paymentMethodId ? Number(form.paymentMethodId) : null,
                notes: form.notes,
                lines: lines.map(l => ({ itemId: Number(l.itemId), quantity: Number(l.quantity), unitCost: Number(l.unitCost) })),
            })
            setShowModal(false); load()
        } finally { setSaving(false) }
    }

    const STATUS_COLORS: any = {
        Completed: 'badge-green', Pending: 'badge-yellow', Cancelled: 'badge-red', Approved: 'badge-blue'
    }
    const STATUS_LABELS: Record<string, string> = {
        Completed: 'Completado', Pending: 'Pendiente', Cancelled: 'Cancelado', Approved: 'Aprobado'
    }

    const HIDDEN_STATUSES = ['Aprobado', 'Approved']

    const uniqueStatuses = statuses.filter((s, index, self) =>
        index === self.findIndex((t) => (
            (STATUS_LABELS[t.name] || t.name) === (STATUS_LABELS[s.name] || s.name)
        ))
    ).filter(s => !HIDDEN_STATUSES.includes(s.name));


    const updateStatus = async (id: number, statusId: string) => {
        try {
            await api.patch(`/api/admin/purchases/${id}/status?statusId=${statusId}`)
            load()
        } catch (error) {
            console.error(error)
        }
    }

    const hasFilters = !!fromDate || !!toDate || !!statusFilter || !!supplierFilter || !!orderCategoryFilter || !!searchQ

    const currentFilters = { fromDate, toDate, statusFilter, supplierFilter, orderCategoryFilter }
    const handleLoadFilters = (f: Record<string, any>) => {
        setFromDate(f.fromDate || '')
        setToDate(f.toDate || '')
        setStatusFilter(f.statusFilter || '')
        setSupplierFilter(f.supplierFilter || '')
        setOrderCategoryFilter(f.orderCategoryFilter || '')
        setPage(0)
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-espresso">Compras</h1>
                    <p className="text-primary-500 text-sm">{total} órdenes en total</p>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={exportCSV} className="btn-secondary flex items-center gap-1.5 text-sm py-1.5 px-3"><Download className="w-4 h-4" /> CSV</button>
                    <button onClick={exportExcel} className="btn-secondary flex items-center gap-1.5 text-sm py-1.5 px-3"><FileSpreadsheet className="w-4 h-4" /> Excel</button>
                    <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-2"><Plus className="w-4 h-4" /> Nueva compra</button>
                </div>
            </div>

            {/* Filter bar */}
            <div className="card p-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="relative col-span-2 md:col-span-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary-400" />
                        <input className="input pl-9 w-full text-sm" placeholder="Buscar por proveedor, notas o producto..." value={searchQ} onChange={e => { setSearchQ(e.target.value); setPage(0) }} />
                    </div>
                    <input type="date" className="input text-sm" value={fromDate} onChange={e => { setFromDate(e.target.value); setPage(0) }} />
                    <input type="date" className="input text-sm" value={toDate} onChange={e => { setToDate(e.target.value); setPage(0) }} />
                    <select className="select text-sm" value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(0) }}>
                        <option value="">Todos los estados</option>
                        {uniqueStatuses.map(s => <option key={s.id} value={s.id}>{STATUS_LABELS[s.name] || s.name}</option>)}
                    </select>
                    <select className="select text-sm" value={supplierFilter} onChange={e => { setSupplierFilter(e.target.value); setPage(0) }}>
                        <option value="">Todos los proveedores</option>
                        {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                    <select className="select text-sm" value={orderCategoryFilter} onChange={e => { setOrderCategoryFilter(e.target.value); setPage(0) }}>
                        <option value="">Todas las categorías</option>
                        {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                </div>
                <div className="flex items-center justify-between mt-3">
                    <SavedFilters storageKey="purchases_filters" currentFilters={currentFilters} onLoadFilters={handleLoadFilters} />
                    {hasFilters && (
                        <button onClick={resetFilters} className="text-xs text-primary-500 hover:text-red-600 flex items-center gap-1 transition-colors bg-white px-2 py-1 rounded border border-transparent hover:border-red-200">
                            <X className="w-3 h-3" /> Limpiar filtros
                        </button>
                    )}
                </div>
            </div>

            <div className="card p-0 overflow-hidden">
                {loading ? (
                    <div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-primary-700 border-t-transparent rounded-full animate-spin" /></div>
                ) : (
                    <div className="table-wrapper rounded-none border-0">
                        <table className="data-table">
                            <thead><tr>
                                <th className="w-6"></th>
                                <th className="cursor-pointer select-none" onClick={() => toggleSort('id')}># <SortIcon field="id" /></th>
                                <th className="cursor-pointer select-none" onClick={() => toggleSort('supplier')}>Proveedor <SortIcon field="supplier" /></th><th className="cursor-pointer select-none" onClick={() => toggleSort('createdBy')}>Creador <SortIcon field="createdBy" /></th><th className="cursor-pointer select-none" onClick={() => toggleSort('status')}>Estado <SortIcon field="status" /></th><th className="cursor-pointer select-none" onClick={() => toggleSort('paymentMethod')}>Pago <SortIcon field="paymentMethod" /></th>
                                <th className="cursor-pointer select-none" onClick={() => toggleSort('total')}>Total <SortIcon field="total" /></th>
                                <th className="cursor-pointer select-none" onClick={() => toggleSort('createdAt')}>Fecha <SortIcon field="createdAt" /></th>
                                <th>Acciones</th>
                            </tr></thead>
                            <tbody>
                                {sortedData.length === 0 ? (
                                    <tr><td colSpan={7} className="text-center text-primary-400 py-10">No se encontraron resultados</td></tr>
                                ) : sortedData.map(o => {
                                    const isExpanded = expandedRows.has(o.id)
                                    const byCategory = (o.lines ?? []).reduce((acc: Record<string, typeof o.lines>, line) => {
                                        const cat = (line as any).item?.category?.name ?? 'Sin Categoría'
                                        if (!acc[cat]) acc[cat] = []
                                        acc[cat].push(line); return acc
                                    }, {})
                                    return (<React.Fragment key={o.id}>
                                        <tr className={isExpanded ? 'bg-primary-50' : ''}>
                                            <td><button onClick={() => toggleRow(o.id)} className="btn-ghost p-0.5">
                                                {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                                            </button></td>
                                            <td className="font-mono text-primary-400">#{o.id}</td>
                                            <td>{o.supplier?.name ?? <span className="text-primary-300">—</span>}</td>
                                            <td>{o.createdBy ? <span className="text-primary-600">{o.createdBy.username ?? o.createdBy.email}</span> : <span className="text-primary-300">—</span>}</td>
                                            <td>
                                                <select
                                                    className={`input py-1 px-2 text-xs font-semibold w-auto ${o.status?.name === 'Completado' || o.status?.name === 'Cancelado' ? 'bg-primary-50 text-primary-500 border-transparent cursor-not-allowed appearance-none' : 'cursor-pointer'}`}
                                                    value={o.status?.id || ''}
                                                    onChange={(e) => updateStatus(o.id, e.target.value)}
                                                    disabled={o.status?.name === 'Completado' || o.status?.name === 'Cancelado'}
                                                >
                                                    <option value="" disabled>—</option>
                                                    {uniqueStatuses.map(s => (
                                                        <option key={s.id} value={s.id}>{STATUS_LABELS[s.name] || s.name}</option>
                                                    ))}
                                                </select>
                                            </td>
                                            <td className="text-primary-500">{o.paymentMethod?.name ?? '—'}</td>
                                            <td className="font-semibold">{FMT(o.total)}</td>
                                            <td className="text-primary-400 text-xs">{new Date(o.createdAt).toLocaleDateString('es-AR')}</td>
                                            <td>
                                                <button onClick={() => setTicketModal(o)} className="btn-ghost py-1 px-2 text-xs flex items-center gap-1" title="Ver / Imprimir">
                                                    <Printer className="w-3.5 h-3.5" /> Ticket
                                                </button>
                                            </td>
                                        </tr>
                                        {isExpanded && (
                                            <tr key={`${o.id}-lines`} className="bg-primary-50">
                                                <td colSpan={9} className="px-6 py-3">
                                                    {Object.keys(byCategory).length === 0 ? (
                                                        <p className="text-xs text-primary-400">Sin líneas detalladas</p>
                                                    ) : Object.entries(byCategory).map(([cat, lines]) => (
                                                        <div key={cat} className="mb-2">
                                                            <p className="text-xs font-semibold text-primary-600 mb-1">{cat}</p>
                                                            <div className="space-y-0.5">
                                                                {(lines as any[]).map((line: any, i: number) => (
                                                                    <div key={i} className="flex gap-6 text-xs text-primary-700 bg-white rounded px-3 py-1.5">
                                                                        <span className="font-medium">{line.item?.name ?? '—'}</span>
                                                                        <span className="text-primary-400">Cant: <b>{line.quantity}</b></span>
                                                                        <span className="text-primary-400">Costo u.: <b>{FMT(line.unitCost ?? 0)}</b></span>
                                                                        <span className="text-primary-400">Subtotal: <b>{FMT((line.quantity ?? 0) * (line.unitCost ?? 0))}</b></span>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </td>
                                            </tr>
                                        )}
                                    </React.Fragment>)
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
                <div className="flex items-center justify-between px-4 py-3 border-t border-muted">
                    <p className="text-xs text-primary-400">Página {page + 1} · {total} resultados</p>
                    <div className="flex gap-2">
                        <button disabled={page === 0} onClick={() => setPage(p => p - 1)} className="btn-ghost p-1.5 disabled:opacity-30"><ChevronLeft className="w-4 h-4" /></button>
                        <button disabled={(page + 1) * 15 >= total} onClick={() => setPage(p => p + 1)} className="btn-ghost p-1.5 disabled:opacity-30"><ChevronRight className="w-4 h-4" /></button>
                    </div>
                </div>
            </div>

            {
                showModal && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
                            <div className="flex items-center justify-between p-6 border-b border-muted">
                                <h2 className="text-lg font-bold text-espresso">Nueva Compra</h2>
                                <button onClick={() => setShowModal(false)} className="btn-ghost p-1.5"><X className="w-5 h-5" /></button>
                            </div>
                            <form onSubmit={handleCreate} className="p-6 space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="col-span-2">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium text-primary-700 mb-1">Categoría Proveedor</label>
                                                <select className="select" value={supplierCategoryFilterModal} onChange={e => { setSupplierCategoryFilterModal(e.target.value); setForm({ ...form, supplierId: '' }) }}>
                                                    <option value="">Todas las categorías</option>
                                                    {[...new Set(suppliers.map(s => (s as any).category?.name).filter(Boolean))].sort().map((cat: string) => (
                                                        <option key={cat} value={cat}>{cat}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-primary-700 mb-1">Proveedor</label>
                                                <select className="select" value={form.supplierId} onChange={e => {
                                                    const newSupId = e.target.value;
                                                    setForm({ ...form, supplierId: newSupId });
                                                    // Clear items in lines that don't belong to the new supplier
                                                    if (newSupId) {
                                                        setLines(prev => prev.map(line => {
                                                            const it = items.find(x => x.id === Number(line.itemId));
                                                            if (it && it.supplier?.id !== Number(newSupId)) return { ...line, itemId: '' };
                                                            return line;
                                                        }));
                                                    }
                                                }} required>
                                                    <option value="">Seleccionar proveedor</option>
                                                    {suppliers.filter(s => !supplierCategoryFilterModal || (s as any).category?.name === supplierCategoryFilterModal).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                                </select>
                                            </div>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-primary-700 mb-1">Forma de Pago</label>
                                        <select className="select" value={form.paymentMethodId} onChange={e => setForm({ ...form, paymentMethodId: e.target.value })} required>
                                            <option value="">Seleccionar…</option>
                                            {payments.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-primary-700 mb-1">Notas</label>
                                        <input className="input" maxLength={40} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
                                    </div>
                                </div>
                                <div>
                                    <div className="flex items-center justify-between mb-2">
                                        <label className="text-sm font-medium text-primary-700">Productos</label>
                                        <button type="button" onClick={addLine} className="text-primary-600 hover:text-primary-800 text-sm flex items-center gap-1"><Plus className="w-3.5 h-3.5" />Agregar línea</button>
                                    </div>
                                    <div className="mb-2">
                                        <select className="select text-sm w-full" value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}>
                                            <option value="">Todas las categorías</option>
                                            {[...new Set(items.map(it => (it as any).category?.name).filter(Boolean))].sort().map((cat: string) => (
                                                <option key={cat} value={cat}>{cat}</option>
                                            ))}
                                        </select>
                                    </div>
                                    {lines.map((line, i) => (
                                        <div key={i} className="flex gap-2 items-center mb-2">
                                            <select className="select flex-1" value={line.itemId} onChange={e => updateLine(i, 'itemId', e.target.value)} required>
                                                <option value="">Seleccionar producto</option>
                                                {items.filter(it => {
                                                    const matchCat = !categoryFilter || (it as any).category?.name === categoryFilter;
                                                    const matchSup = !form.supplierId || it.supplier?.id === Number(form.supplierId);
                                                    return matchCat && matchSup;
                                                }).map(it => <option key={it.id} value={it.id}>{it.name}</option>)}
                                            </select>
                                            <input type="number" step="any" min="0.001" placeholder={items.find(x => x.id === Number(line.itemId))?.purchaseUnit ? `Cant. en ${items.find(x => x.id === Number(line.itemId))?.purchaseUnit}` : "Cant."} className="input w-32 text-center" value={line.quantity} onChange={e => updateLine(i, 'quantity', e.target.value)} title={items.find(x => x.id === Number(line.itemId))?.purchaseUnit ? `Cantidad en ${items.find(x => x.id === Number(line.itemId))?.purchaseUnit}` : "Cantidad"} required />
                                            <input type="number" min="0" placeholder="Costo total" className="input w-28" value={line.unitCost} onChange={e => updateLine(i, 'unitCost', e.target.value)} required />
                                            {lines.length > 1 && <button type="button" onClick={() => removeLine(i)} className="text-red-500 hover:text-red-700"><Trash2 className="w-4 h-4" /></button>}
                                        </div>
                                    ))}
                                </div>
                                <div className="flex gap-3 pt-2">
                                    <button type="button" onClick={() => setShowModal(false)} className="btn-secondary flex-1">Cancelar</button>
                                    <button type="submit" className="btn-primary flex-1" disabled={saving}>{saving ? 'Guardando…' : 'Crear Compra'}</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )
            }

            {
                ticketModal && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4 print:bg-white print:p-0">
                        <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl print:shadow-none print:w-auto print:mx-auto max-h-[90vh] flex flex-col">
                            <div className="flex items-center justify-between p-6 border-b border-muted print:hidden">
                                <h2 className="text-lg font-bold text-espresso">Detalle de Compra</h2>
                                <button onClick={() => setTicketModal(null)} className="btn-ghost p-1.5"><X className="w-5 h-5" /></button>
                            </div>
                            <div className="p-6 flex-1 overflow-y-auto">
                                <div className="font-mono text-sm space-y-4 max-w-xs mx-auto text-black">
                                    <div className="text-center pb-4 border-b border-dashed border-gray-400">
                                        <h2 className="font-bold text-xl uppercase tracking-widest">COFFEE BEANS</h2>
                                        <p className="text-xs mt-1">ORDEN DE COMPRA</p>
                                        <div className="mt-3 text-left space-y-0.5 text-xs">
                                            <div className="flex justify-between"><span>Orden No:</span><span>{String(ticketModal.id).padStart(8, '0')}</span></div>
                                            <div className="flex justify-between"><span>Fecha:</span><span>{new Date(ticketModal.createdAt).toLocaleString('es-AR')}</span></div>
                                            <div className="flex justify-between">
                                                <span>Proveedor:</span>
                                                <span className="truncate max-w-[150px] text-right">
                                                    {ticketModal.supplier?.name ?? '—'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="border-b border-dashed border-gray-400 pb-4">
                                        <table className="w-full text-xs">
                                            <thead>
                                                <tr className="border-b border-dashed border-gray-300">
                                                    <th className="text-left font-normal py-1">CANT DESCRIPCION</th>
                                                    <th className="text-right font-normal py-1">IMPORTE</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {ticketModal.lines.map((l: any, i: number) => (
                                                    <tr key={i}>
                                                        <td className="py-1">
                                                            {l.quantity}x {l.item?.name}
                                                            <br />
                                                            <span className="text-[10px] text-gray-500">${Number(l.unitCost).toLocaleString('es-AR')} c/u</span>
                                                        </td>
                                                        <td className="text-right py-1 align-bottom">
                                                            ${(Number(l.quantity) * Number(l.unitCost)).toLocaleString('es-AR')}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>

                                    <div className="space-y-1 pb-4 border-b border-dashed border-gray-400">
                                        <div className="flex justify-between items-center text-lg font-bold">
                                            <span>TOTAL</span>
                                            <span>${Number(ticketModal.total).toLocaleString('es-AR')}</span>
                                        </div>
                                        <div className="flex justify-between text-xs">
                                            <span>Pago:</span>
                                            <span>{ticketModal.paymentMethod?.name ?? '—'}</span>
                                        </div>
                                        <div className="flex justify-between text-xs">
                                            <span>Estado:</span>
                                            <span>{(ticketModal.status?.name && STATUS_LABELS[ticketModal.status.name]) || ticketModal.status?.name || '—'}</span>
                                        </div>
                                    </div>

                                    <div className="text-center pt-2 text-xs flex flex-col items-center gap-3">
                                        <p>Registro de Entrada de Mercadería</p>
                                        <QRCodeSVG value={`https://coffeebeans.com/purchases/${ticketModal.id}`} size={80} level="L" />
                                    </div>
                                </div>
                            </div>
                            <div className="p-6 border-t border-muted flex gap-3 print:hidden shrink-0 bg-white rounded-b-2xl">
                                <button onClick={() => setTicketModal(null)} className="btn-secondary flex-1">Cerrar</button>
                                <button onClick={() => window.print()} className="btn-primary flex-1 flex justify-center items-center gap-2">
                                    <Printer className="w-4 h-4" /> Imprimir
                                </button>
                            </div>
                            <style dangerouslySetInnerHTML={{
                                __html: `
                                @media print {
                                    body * { visibility: hidden; }
                                    .fixed.inset-0.bg-black\\/50, .fixed.inset-0.bg-black\\/50 * { visibility: visible; }
                                    .fixed.inset-0.bg-black\\/50 { position: absolute; left: 0; top: 0; background: white; width: 100%; }
                                    .fixed.inset-0.bg-black\\/50 { padding: 0 !important; }
                                }
                            `}} />
                        </div>
                    </div>
                )}
        </div>
    )
}
