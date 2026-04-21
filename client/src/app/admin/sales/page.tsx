'use client'
import React, { useEffect, useState, useCallback } from 'react'
import api from '@/lib/api'
import { SaleOrder, OperationStatus, Customer, PaymentMethod, Item } from '@/types'
import { Plus, X, Search, FileSpreadsheet, Download, ChevronLeft, ChevronRight, ChevronUp, ChevronDown, Trash2, Printer, Eye } from 'lucide-react'
import * as XLSX from 'xlsx'
import { QRCodeSVG } from 'qrcode.react'
import { SavedFilters } from '@/components/SavedFilters'

const FMT = (n: number) => `$${Number(n ?? 0).toLocaleString('es-AR')}`

type SortField = 'id' | 'total' | 'createdAt' | 'paymentMethod' | 'customer' | 'createdBy' | 'status'
type SortDir = 'asc' | 'desc'

export default function SalesPage() {
    const [data, setData] = useState<SaleOrder[]>([])
    const [total, setTotal] = useState(0)
    const [page, setPage] = useState(0)
    const [loading, setLoading] = useState(true)
    const [showModal, setShowModal] = useState(false)

    // Filters
    const [q, setQ] = useState('')

    // Ticket printing
    const [ticketModal, setTicketModal] = useState<SaleOrder | null>(null)
    const [fromDate, setFromDate] = useState('')
    const [toDate, setToDate] = useState('')
    const [statusFilter, setStatusFilter] = useState('')
    const [buyerFilter, setBuyerFilter] = useState('')
    const [vendedorFilter, setVendedorFilter] = useState('')
    const [orderCategoryFilter, setOrderCategoryFilter] = useState('')

    // Sort
    const [sortField, setSortField] = useState<SortField>('createdAt')
    const [sortDir, setSortDir] = useState<SortDir>('desc')

    // Reference data
    const [statuses, setStatuses] = useState<OperationStatus[]>([])
    const [customers, setCustomers] = useState<Customer[]>([])
    const [users, setUsers] = useState<any[]>([])
    const [payments, setPayments] = useState<PaymentMethod[]>([])
    const [items, setItems] = useState<Item[]>([])
    const [categories, setCategories] = useState<any[]>([])

    // New order form
    const [form, setForm] = useState({ customerId: '', statusId: '', paymentMethodId: '', notes: '', pointsUsed: '0' })
    const [lines, setLines] = useState<{ itemId: string; quantity: string; unitPrice: string }[]>([
        { itemId: '', quantity: '1', unitPrice: '' }
    ])
    const [saving, setSaving] = useState(false)

    // Expandable rows
    const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set())
    const toggleRow = (id: number) => setExpandedRows(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s })

    // Category filter for item selector
    const [categoryFilter, setCategoryFilter] = useState<string>('')

    const buildUrl = useCallback(() => {
        const params = new URLSearchParams({ page: String(page), size: '15' })
        if (fromDate) params.set('from', fromDate + 'T00:00:00')
        if (toDate) params.set('to', toDate + 'T23:59:59')
        if (statusFilter) params.set('status', statusFilter)
        if (buyerFilter) params.set('buyer', buyerFilter)
        if (vendedorFilter) params.set('seller', vendedorFilter)
        if (orderCategoryFilter) params.set('category', orderCategoryFilter)
        if (q) params.set('q', q)
        if (sortField) params.set('sort', sortField)
        if (sortDir) params.set('dir', sortDir.toUpperCase())
        return `/api/admin/sales?${params}`
    }, [page, fromDate, toDate, statusFilter, buyerFilter, vendedorFilter, orderCategoryFilter, q, sortField, sortDir])

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
            api.get('/api/admin/settings/statuses?type=SALE'),
            api.get('/api/admin/customers?size=500&active=true&all=true'),
            api.get('/api/admin/settings/payment-methods'),
            api.get('/api/admin/items?size=200'),
            api.get('/api/admin/categories?type=PRODUCT'),
            api.get('/api/admin/users?size=500&active=true'),
        ]).then(([s, c, pm, it, cats, u]) => {
            setStatuses(s.data);
            setCustomers(c.data?.content || []);
            setPayments(pm.data);
            setItems(it.data.content)
            setCategories(cats.data)
            setUsers(u.data?.content || [])
        }).catch(err => console.error('Error loading sales reference data:', err))
    }, [])

    const resetFilters = () => {
        setFromDate(''); setToDate(''); setStatusFilter(''); setBuyerFilter(''); setVendedorFilter(''); setOrderCategoryFilter(''); setQ(''); setPage(0)
    }

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
            Comprador: o.customer ? `${o.customer.firstName} ${o.customer.lastName ?? ''}` : (o.createdBy?.username ?? o.createdBy?.email ?? 'Sin usuario'),
            Estado: o.status?.name ?? '',
            Pago: o.paymentMethod?.name ?? '',
            Total: o.total,
            Fecha: new Date(o.createdAt).toLocaleDateString('es-AR'),
        }))
        const csv = [Object.keys(rows[0]).join(','), ...rows.map(r => Object.values(r).join(','))].join('\n')
        const a = document.createElement('a'); a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv)
        a.download = `ventas_${new Date().toISOString().slice(0, 10)}.csv`; a.click()
    }

    const exportExcel = () => {
        const rows = sortedData.map(o => ({
            ID: o.id,
            Comprador: o.customer ? `${o.customer.firstName} ${o.customer.lastName ?? ''}` : (o.createdBy?.username ?? o.createdBy?.email ?? 'Sin usuario'),
            Estado: o.status?.name ?? '',
            'Forma de Pago': o.paymentMethod?.name ?? '',
            Total: Number(o.total),
            Fecha: new Date(o.createdAt).toLocaleDateString('es-AR'),
        }))
        const ws = XLSX.utils.json_to_sheet(rows)
        const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'Ventas')
        XLSX.writeFile(wb, `ventas_${new Date().toISOString().slice(0, 10)}.xlsx`)
    }

    const addLine = () => setLines(l => [...l, { itemId: '', quantity: '1', unitPrice: '' }])
    const removeLine = (i: number) => setLines(l => l.filter((_, j) => j !== i))
    const updateLine = (i: number, k: string, v: string) => {
        const next = [...lines]
        if (k === 'itemId') {
            const item = items.find(it => it.id === Number(v))
            let qty = next[i].quantity
            if (item && Number(qty) > Number(item.stock)) {
                qty = String(item.stock)
            }
            next[i] = { ...next[i], [k]: v, quantity: qty, unitPrice: item ? String(item.price) : next[i].unitPrice }
        } else if (k === 'quantity') {
            const currentItemId = next[i].itemId;
            const item = items.find(it => it.id === Number(currentItemId));
            if (item) {
                const maxStock = Number(item.stock) || 0;
                let desiredQty = Number(v);
                if (desiredQty > maxStock) desiredQty = maxStock;
                if (desiredQty < 0) desiredQty = 0;
                next[i] = { ...next[i], [k]: String(desiredQty) }
            } else {
                next[i] = { ...next[i], [k]: v }
            }
        } else { next[i] = { ...next[i], [k]: v } }
        setLines(next)
    }

    const updateStatus = async (id: number, statusId: string) => {
        try {
            await api.patch(`/api/admin/sales/${id}/status?statusId=${statusId}`)
            load()
        } catch (error) {
            console.error(error)
        }
    }

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault(); setSaving(true)
        try {
            await api.post('/api/admin/sales', {
                customerId: form.customerId ? Number(form.customerId) : null,
                statusId: form.statusId ? Number(form.statusId) : null,
                paymentMethodId: form.paymentMethodId ? Number(form.paymentMethodId) : null,
                notes: form.notes,
                pointsUsed: form.pointsUsed ? Number(form.pointsUsed) : 0,
                lines: lines.map(l => ({ itemId: Number(l.itemId), quantity: Number(l.quantity), unitPrice: Number(l.unitPrice) })),
            })
            setShowModal(false); load()
        } finally { setSaving(false) }
    }

    const STATUS_COLORS: any = {
        Completed: 'badge-green', Pending: 'badge-yellow', Cancelled: 'badge-red', Reserved: 'badge-blue'
    }
    const STATUS_LABELS: Record<string, string> = {
        // English → Spanish
        Completed: 'Completado', Pending: 'Pendiente', Cancelled: 'Cancelado', Reserved: 'Reservado',
        PENDING: 'Pendiente', COMPLETED: 'Completado', CANCELLED: 'Cancelado', RESERVED: 'Reservado',
        Approved: 'Aprobado', APPROVED: 'Aprobado',
        // Spanish self-mapping so label always resolves
        Completado: 'Completado', Pendiente: 'Pendiente', Cancelado: 'Cancelado',
        Aprobado: 'Aprobado', Reservado: 'Reservado',
    }

    const HIDE_NORM = new Set(['Aprobado', 'Reservado'])

    // Deduplicate by normalized label, but always keep Pendiente
    const seenLabels = new Set<string>()
    const uniqueStatuses = statuses.filter(s => {
        const label = STATUS_LABELS[s.name] || s.name
        if (HIDE_NORM.has(label)) return false
        if (seenLabels.has(label)) return false
        seenLabels.add(label)
        return true
    })

    const hasFilters = !!fromDate || !!toDate || !!statusFilter || !!buyerFilter || !!vendedorFilter || !!orderCategoryFilter || !!q

    const currentFilters = { fromDate, toDate, statusFilter, buyerFilter, vendedorFilter, orderCategoryFilter, q }
    const handleLoadFilters = (f: Record<string, any>) => {
        setFromDate(f.fromDate || '')
        setToDate(f.toDate || '')
        setStatusFilter(f.statusFilter || '')
        setBuyerFilter(f.buyerFilter || '')
        setVendedorFilter(f.vendedorFilter || '')
        setOrderCategoryFilter(f.orderCategoryFilter || '')
        setQ(f.q || '')
        setPage(0)
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-espresso">Ventas</h1>
                    <p className="text-primary-500 text-sm">{total} órdenes en total</p>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={exportCSV} className="btn-secondary flex items-center gap-1.5 text-sm py-1.5 px-3">
                        <Download className="w-4 h-4" /> CSV
                    </button>
                    <button onClick={exportExcel} className="btn-secondary flex items-center gap-1.5 text-sm py-1.5 px-3">
                        <FileSpreadsheet className="w-4 h-4" /> Excel
                    </button>
                    <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-2">
                        <Plus className="w-4 h-4" /> Nueva venta
                    </button>
                </div>
            </div>

            {/* Filter bar */}
            <div className="card p-4">
                <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
                    <div className="relative col-span-2 md:col-span-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary-400" />
                        <input className="input pl-9 text-sm" placeholder="Buscar…" value={q} onChange={e => setQ(e.target.value)} />
                    </div>
                    <input type="date" className="input text-sm" value={fromDate} onChange={e => { setFromDate(e.target.value); setPage(0) }} />
                    <input type="date" className="input text-sm" value={toDate} onChange={e => { setToDate(e.target.value); setPage(0) }} />
                    <select className="select text-sm" value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(0) }}>
                        <option value="">Todos los estados</option>
                        {uniqueStatuses.map(s => <option key={s.id} value={s.id}>{STATUS_LABELS[s.name] || s.name}</option>)}
                    </select>
                    <select className="select text-sm" value={buyerFilter} onChange={e => { setBuyerFilter(e.target.value); setPage(0) }}>
                        <option value="">Todos los compradores</option>
                        <option value="-1">Sin asignar (-)</option>
                        {customers.map(c => <option key={`c-${c.id}`} value={c.id}>{c.firstName} {c.lastName ?? ''}</option>)}
                    </select>
                    <select className="select text-sm" value={vendedorFilter} onChange={e => { setVendedorFilter(e.target.value); setPage(0) }}>
                        <option value="">Todos los vendedores</option>
                        <option value="-1">Sin asignar (-)</option>
                        {users.filter(u => u.role === 'ADMIN').map(u => <option key={u.id} value={u.id}>{u.username}</option>)}
                    </select>
                    <select className="select text-sm" value={orderCategoryFilter} onChange={e => { setOrderCategoryFilter(e.target.value); setPage(0) }}>
                        <option value="">Todas las categorías</option>
                        {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                </div>
                <div className="flex items-center justify-between mt-3">
                    <SavedFilters storageKey="sales_filters" currentFilters={currentFilters} onLoadFilters={handleLoadFilters} />
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
                                <th className="cursor-pointer select-none" onClick={() => toggleSort('customer')}>Comprador <SortIcon field="customer" /></th>
                                <th className="cursor-pointer select-none" onClick={() => toggleSort('createdBy')}>Vendedor <SortIcon field="createdBy" /></th>
                                <th className="cursor-pointer select-none" onClick={() => toggleSort('status')}>Estado <SortIcon field="status" /></th>
                                <th className="cursor-pointer select-none" onClick={() => toggleSort('paymentMethod')}>Pago <SortIcon field="paymentMethod" /></th>
                                <th className="cursor-pointer select-none" onClick={() => toggleSort('total')}>Total <SortIcon field="total" /></th>
                                <th className="cursor-pointer select-none" onClick={() => toggleSort('createdAt')}>Fecha <SortIcon field="createdAt" /></th>
                                <th>Acciones</th>
                            </tr></thead>
                            <tbody>
                                {sortedData.length === 0 ? (
                                    <tr><td colSpan={8} className="text-center text-primary-400 py-10">No se encontraron resultados</td></tr>
                                ) : sortedData.map(o => {
                                    const isExpanded = expandedRows.has(o.id)
                                    const byCategory = (o.lines ?? []).reduce((acc: Record<string, any[]>, line: any) => {
                                        const cat = line.item?.category?.name ?? 'Sin Categoría'
                                        if (!acc[cat]) acc[cat] = []
                                        acc[cat].push(line); return acc
                                    }, {})
                                    return (<React.Fragment key={o.id}>
                                        <tr className={isExpanded ? 'bg-primary-50' : ''}>
                                            <td><button onClick={() => toggleRow(o.id)} className="btn-ghost p-0.5">
                                                {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                                            </button></td>
                                            <td className="font-mono text-primary-400">#{o.id}</td>
                                            <td>{o.customer ? `${o.customer.firstName} ${o.customer.lastName ?? ''}` : (o.createdBy?.username ?? o.createdBy?.email ?? <span className="text-primary-300">Sin usuario</span>)}</td>
                                            <td>{o.createdBy ? <span className="text-primary-600">{o.createdBy.username ?? o.createdBy.email}</span> : <span className="text-primary-300">Web</span>}</td>
                                            <td>
                                                {(() => {
                                                    const s_ = o.status;
                                                    const isPending = !s_ || s_?.name === 'Pendiente' || s_?.name === 'Pending' || s_?.name === 'PENDING';
                                                    const isLocked = !isPending;
                                                    return (
                                                        <select
                                                            className={`input py-1 px-2 text-xs font-semibold w-auto ${isLocked ? 'bg-primary-50 text-primary-500 border-transparent cursor-not-allowed' : 'cursor-pointer'}`}
                                                            value={s_?.id || ''}
                                                            onChange={(e) => updateStatus(o.id, e.target.value)}
                                                            disabled={isLocked}
                                                        >
                                                            {s_ && !uniqueStatuses.find(us => us.id === s_.id) && (
                                                                <option value={s_.id}>{STATUS_LABELS[s_.name] || s_.name}</option>
                                                            )}
                                                            <option value="" disabled>{!s_ ? 'Pendiente' : '—'}</option>
                                                            {uniqueStatuses.map(s => (
                                                                <option key={s.id} value={s.id}>{STATUS_LABELS[s.name] || s.name}</option>
                                                            ))}
                                                        </select>
                                                    );
                                                })()}
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
                                                                        <span className="text-primary-400">Precio u.: <b>{FMT(line.unitPrice ?? 0)}</b></span>
                                                                        <span className="text-primary-400">Subtotal: <b>{FMT((line.quantity ?? 0) * (line.unitPrice ?? 0))}</b></span>
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

            {/* New Sale Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
                        <div className="flex items-center justify-between p-6 border-b border-muted">
                            <h2 className="text-lg font-bold text-espresso">Nueva Venta</h2>
                            <button onClick={() => setShowModal(false)} className="btn-ghost p-1.5"><X className="w-5 h-5" /></button>
                        </div>
                        <form onSubmit={handleCreate} className="p-6 space-y-4">
                            {(() => {
                                const selectedCustomer = customers.find(c => String(c.id) === form.customerId)
                                const selectedCustomerPoints = selectedCustomer?.loyaltyPoints ?? 0
                                const linesTotal = lines.reduce((acc, l) => acc + (Number(l.quantity || 0) * Number(l.unitPrice || 0)), 0)
                                const starsUsed = Math.min(5, Math.floor(Number(form.pointsUsed || 0) / 100))
                                const discount = linesTotal * (starsUsed / 100)
                                const finalTotal = Math.max(0, linesTotal - discount)
                                return (
                                    <>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium text-primary-700 mb-1">Comprador</label>
                                                <select className="select" value={form.customerId} onChange={e => setForm({ ...form, customerId: e.target.value, pointsUsed: '0' })}>
                                                    <option value="">Consumidor Final / Sin usuario</option>
                                                    {customers.map(c => <option key={c.id} value={c.id}>{c.firstName} {c.lastName ?? ''}</option>)}
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-primary-700 mb-1">Estado</label>
                                                <select className="select" value={form.statusId} onChange={e => setForm({ ...form, statusId: e.target.value })} required>
                                                    <option value="">Seleccione estado</option>
                                                    {uniqueStatuses.map(s => <option key={s.id} value={s.id}>{STATUS_LABELS[s.name] || s.name}</option>)}
                                                </select>
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
                                                <input className="input" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-primary-700 mb-1">Descuento Fidelización</label>
                                                {form.customerId ? (
                                                    selectedCustomerPoints >= 100 ? (
                                                        <div className="flex flex-col gap-1">
                                                            <select className="select" value={form.pointsUsed} onChange={e => setForm({ ...form, pointsUsed: e.target.value })}>
                                                                <option value="0">No usar puntos</option>
                                                                {Array.from({ length: Math.min(5, Math.floor(selectedCustomerPoints / 100)) }).map((_, i) => (
                                                                    <option key={i + 1} value={(i + 1) * 100}>{i + 1} Estrella{i > 0 ? 's' : ''} ({(i + 1) * 100} pts = {i + 1}%)</option>
                                                                ))}
                                                            </select>
                                                            <p className="text-xs text-primary-500">Puntos disponibles: {selectedCustomerPoints}</p>
                                                        </div>
                                                    ) : (
                                                        <p className="text-sm text-primary-400 p-2 bg-warm-50 rounded border border-muted">No hay suficientes puntos (Mínimo 100pts)</p>
                                                    )
                                                ) : <p className="text-sm text-primary-400 p-2 bg-warm-50 rounded border border-muted">Seleccione un Comprador primero</p>}
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
                                            <div className="space-y-2">
                                                {lines.map((line, i) => (
                                                    <div key={i} className="flex gap-2 items-center">
                                                        <select className="select flex-1" value={line.itemId} onChange={e => updateLine(i, 'itemId', e.target.value)} required>
                                                            <option value="">Seleccionar producto</option>
                                                            {items.filter(it => !categoryFilter || (it as any).category?.name === categoryFilter).map(it => <option key={it.id} value={it.id}>{it.name} (stock: {it.stock})</option>)}
                                                        </select>
                                                        <input type="number" step="any" min="0" max={items.find(it => it.id === Number(line.itemId))?.stock} placeholder="Cant." className="input w-20 text-center" value={line.quantity} onChange={e => updateLine(i, 'quantity', e.target.value)} required />
                                                        <input type="number" min="0" placeholder="Precio" className="input w-28" value={line.unitPrice} onChange={e => updateLine(i, 'unitPrice', e.target.value)} required />
                                                        {lines.length > 1 && <button type="button" onClick={() => removeLine(i)} className="text-red-500 hover:text-red-700"><Trash2 className="w-4 h-4" /></button>}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                        <div className="flex justify-between items-center bg-warm-50 p-4 rounded-xl border border-muted">
                                            <span className="font-medium text-primary-700">Total Venta:</span>
                                            <div className="text-right">
                                                {discount > 0 && <p className="text-xs text-emerald-600 line-through mb-0.5">${linesTotal.toLocaleString('es-AR')}</p>}
                                                <p className="text-xl font-bold text-espresso">${finalTotal.toLocaleString('es-AR')}</p>
                                            </div>
                                        </div>
                                        <div className="flex gap-3 pt-2">
                                            <button type="button" onClick={() => setShowModal(false)} className="btn-secondary flex-1">Cancelar</button>
                                            <button type="submit" className="btn-primary flex-1" disabled={saving || finalTotal < 0}>{saving ? 'Guardando…' : 'Crear Venta'}</button>
                                        </div>
                                    </>
                                )
                            })()}
                        </form>
                    </div>
                </div>
            )}

            {/* Print Ticket Modal */}
            {ticketModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4 print:bg-white print:p-0">
                    <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl print:shadow-none print:w-auto print:mx-auto max-h-[90vh] flex flex-col">
                        <div className="flex items-center justify-between p-6 border-b border-muted print:hidden">
                            <h2 className="text-lg font-bold text-espresso">Detalle de Venta</h2>
                            <button onClick={() => setTicketModal(null)} className="btn-ghost p-1.5"><X className="w-5 h-5" /></button>
                        </div>
                        <div className="p-6 flex-1 overflow-y-auto">
                            {/* The Ticket */}
                            <div className="font-mono text-sm space-y-4 max-w-xs mx-auto text-black">
                                <div className="text-center pb-4 border-b border-dashed border-gray-400">
                                    <h2 className="font-bold text-xl uppercase tracking-widest">COFFEE BEANS</h2>
                                    <p className="text-xs mt-1">Av. Falsa 123, CABA</p>
                                    <p className="text-xs">CUIT: 30-12345678-9</p>
                                    <div className="mt-3 text-left space-y-0.5 text-xs">
                                        <div className="flex justify-between"><span>Ticket No:</span><span>{String(ticketModal.id).padStart(8, '0')}</span></div>
                                        <div className="flex justify-between"><span>Fecha:</span><span>{new Date(ticketModal.createdAt).toLocaleString('es-AR')}</span></div>
                                        <div className="flex justify-between">
                                            <span>Comprador:</span>
                                            <span className="truncate max-w-[150px] text-right">
                                                {ticketModal.customer ? `${ticketModal.customer.firstName} ${ticketModal.customer.lastName ?? ''}` : 'Consumidor Final'}
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
                                                        <span className="text-[10px] text-gray-500">${Number(l.unitPrice).toLocaleString('es-AR')} c/u</span>
                                                    </td>
                                                    <td className="text-right py-1 align-bottom">
                                                        ${(Number(l.quantity) * Number(l.unitPrice)).toLocaleString('es-AR')}
                                                    </td>
                                                </tr>
                                            ))}
                                            {(ticketModal.pointsUsed ?? 0) > 0 && (
                                                <tr>
                                                    <td className="py-1 pt-3 font-semibold text-emerald-600">
                                                        Descto. Puntos ({Math.floor(Number(ticketModal.pointsUsed) / 100)}% / {ticketModal.pointsUsed} pts)
                                                    </td>
                                                    <td className="text-right py-1 pt-3 font-semibold text-emerald-600 align-bottom">
                                                        {(() => {
                                                            const linesT = ticketModal.lines.reduce((acc: number, l: any) => acc + (Number(l.quantity) * Number(l.unitPrice)), 0);
                                                            const desc = linesT * (Math.floor(Number(ticketModal.pointsUsed) / 100) / 100);
                                                            return `-$${desc.toLocaleString('es-AR')}`;
                                                        })()}
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>

                                <div className="space-y-1 pb-4 border-b border-dashed border-gray-400">
                                    <div className="flex justify-between items-center text-lg font-bold">
                                        <span>TOTAL</span>
                                        <span>${Number(ticketModal.total).toLocaleString('es-AR')}</span>
                                    </div>
                                    <div className="flex justify-between text-xs">
                                        <span>Paga con:</span>
                                        <span>{ticketModal.paymentMethod?.name ?? '—'}</span>
                                    </div>
                                </div>

                                <div className="text-center pt-2 text-xs flex flex-col items-center gap-3">
                                    <p>¡Gracias por su compra!</p>
                                    <QRCodeSVG value={`https://coffeebeans.com/verify/${ticketModal.id}`} size={80} level="L" />
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
                                .fixed.inset-0.bg-black\\/50 { position: absolute; left: 0; top: 0; background: white; }
                                /* Hide extra print elements */
                                .fixed.inset-0.bg-black\\/50 { padding: 0 !important; }
                            }
                        `}} />
                    </div>
                </div>
            )}
        </div>
    )
}
