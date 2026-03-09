'use client'
import { useEffect, useState } from 'react'
import api from '@/lib/api'
import { Item } from '@/types'
import { AlertTriangle, RotateCcw, Plus, X, Search, Download, FileSpreadsheet, ChevronUp, ChevronDown, Printer } from 'lucide-react'
import * as XLSX from 'xlsx'
import { QRCodeSVG } from 'qrcode.react'

type StockStatus = 'all' | 'ok' | 'low' | 'critical' | 'out'
type SortField = 'name' | 'stock' | 'category'
type SortDir = 'asc' | 'desc'

export default function InventoryPage() {
    const [items, setItems] = useState<Item[]>([])
    const [loading, setLoading] = useState(true)
    const [loadError, setLoadError] = useState<string | null>(null)
    const [modal, setModal] = useState<Item | null>(null)
    const [adjQty, setAdjQty] = useState('')
    const [adjReasonType, setAdjReasonType] = useState('Merma')
    const [adjReasonDetail, setAdjReasonDetail] = useState('')
    const [saving, setSaving] = useState(false)

    // Label printing modal
    const [labelModal, setLabelModal] = useState<Item | null>(null)

    // Filters
    const [q, setQ] = useState('')
    const [stockStatusFilter, setStockStatusFilter] = useState<StockStatus>('all')
    const [categoryFilter, setCategoryFilter] = useState('all')
    const [supplierFilter, setSupplierFilter] = useState('all')

    const [categories, setCategories] = useState<{ id: number, name: string }[]>([])
    const [suppliers, setSuppliers] = useState<{ id: number, name: string }[]>([])

    // Sort
    const [sortField, setSortField] = useState<SortField>('name')
    const [sortDir, setSortDir] = useState<SortDir>('asc')

    const load = async () => {
        setLoading(true)
        setLoadError(null)
        try {
            const r = await api.get('/api/admin/items', { params: { page: 0, size: 500 } })
            setItems(r.data?.content ?? [])
        } catch (e: any) {
            console.error('Failed to load inventory', e)
            setItems([])
            const status = e.response?.status
            if (status === 403) {
                setLoadError('No tenés permiso para ver el inventario. Cerrá sesión y volvé a iniciar sesión con el usuario admin (rol ADMIN).')
            } else if (status === 401) {
                setLoadError('Sesión expirada o no iniciada. Iniciá sesión como administrador.')
            } else {
                setLoadError('No se pudieron cargar los productos. Revisá que el servidor esté en marcha e intentá de nuevo.')
            }
        } finally {
            setLoading(false)
        }
    }

    const loadOptions = async () => {
        const [catRes, supRes] = await Promise.all([
            api.get('/api/admin/categories?type=PRODUCT'),
            api.get('/api/admin/suppliers?size=100')
        ]);
        setCategories(catRes.data);
        setSuppliers(supRes.data.content || supRes.data);
    }

    useEffect(() => {
        load()
        loadOptions()
    }, [])

    const stockStatus = (item: Item) => {
        if (item.stock <= 0) return { label: 'Sin stock', cls: 'badge-red', key: 'out' }
        if (item.stock <= item.minStock) return { label: 'Crítico', cls: 'badge-yellow', key: 'critical' }
        if (item.stock <= item.minStock * 1.5) return { label: 'Bajo', cls: 'badge-brown', key: 'low' }
        return { label: 'OK', cls: 'badge-green', key: 'ok' }
    }

    const toggleSort = (field: SortField) => {
        if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
        else { setSortField(field); setSortDir('asc') }
    }

    const SortIcon = ({ field }: { field: SortField }) => (
        <span className="inline-flex ml-1">
            {sortField === field && sortDir === 'asc' ? <ChevronUp className="w-3 h-3" /> : sortField === field ? <ChevronDown className="w-3 h-3" /> : <span className="opacity-30">↕</span>}
        </span>
    )

    const filtered = items
        .filter(i => !q || i.name.toLowerCase().includes(q.toLowerCase()))
        .filter(i => stockStatusFilter === 'all' || stockStatus(i).key === stockStatusFilter)
        .filter(i => categoryFilter === 'all' || String(i.category?.id) === categoryFilter)
        .filter(i => supplierFilter === 'all' || String(i.supplier?.id) === supplierFilter)
        .sort((a, b) => {
            let av: any, bv: any
            if (sortField === 'name') { av = a.name; bv = b.name }
            else if (sortField === 'stock') { av = a.stock; bv = b.stock }
            else { av = a.category?.name ?? ''; bv = b.category?.name ?? '' }
            if (av < bv) return sortDir === 'asc' ? -1 : 1
            if (av > bv) return sortDir === 'asc' ? 1 : -1
            return 0
        })

    const exportExcel = () => {
        const rows = filtered.map(item => ({
            ID: item.id,
            Producto: item.name,
            Stock: item.stock,
            'Stock Mínimo': item.minStock,
            Categoría: item.category?.name ?? '—',
            Proveedor: item.supplier?.name ?? '—',
            Estado: stockStatus(item).label,
            Precio: item.price,
            Costo: item.cost,
        }))
        const ws = XLSX.utils.json_to_sheet(rows)
        const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'Inventario')
        XLSX.writeFile(wb, `inventario_${new Date().toISOString().slice(0, 10)}.xlsx`)
    }

    const exportCSV = () => {
        const rows = filtered.map(item => ({
            ID: item.id, Producto: item.name, Stock: item.stock, 'Stock Mínimo': item.minStock,
            Categoría: item.category?.name ?? '—', Estado: stockStatus(item).label,
        }))
        const csv = [Object.keys(rows[0]).join(','), ...rows.map(r => Object.values(r).join(','))].join('\n')
        const a = document.createElement('a'); a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv)
        a.download = `inventario_${new Date().toISOString().slice(0, 10)}.csv`; a.click()
    }

    const handleAdjust = async (e: React.FormEvent) => {
        e.preventDefault(); setSaving(true)
        try {
            const reason = adjReasonDetail ? `${adjReasonType}: ${adjReasonDetail}` : adjReasonType
            await api.post('/api/admin/stock/adjust', { itemId: modal!.id, quantity: Number(adjQty), reason })
            setModal(null); setAdjQty(''); setAdjReasonType('Merma'); setAdjReasonDetail(''); load()
        } finally { setSaving(false) }
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-espresso">Inventario</h1>
                    <p className="text-primary-500 text-sm">{filtered.length} de {items.length} productos</p>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={exportCSV} className="btn-secondary flex items-center gap-1.5 text-sm py-1.5 px-3"><Download className="w-4 h-4" /> CSV</button>
                    <button onClick={exportExcel} className="btn-secondary flex items-center gap-1.5 text-sm py-1.5 px-3"><FileSpreadsheet className="w-4 h-4" /> Excel</button>
                    <button onClick={load} className="btn-secondary flex items-center gap-2 text-sm"><RotateCcw className="w-4 h-4" /> Actualizar</button>
                </div>
            </div>

            {/* Load error */}
            {loadError && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                    <div>
                        <p className="font-semibold text-red-800 text-sm">Error al cargar el inventario</p>
                        <p className="text-red-600 text-sm mt-0.5">{loadError}</p>
                        <button onClick={() => load()} className="mt-2 text-sm font-medium text-red-700 hover:underline">Reintentar</button>
                    </div>
                </div>
            )}

            {/* Low stock alert */}
            {items.filter(i => i.stock <= i.minStock).length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                        <p className="font-semibold text-amber-800 text-sm">Alertas de stock</p>
                        <p className="text-amber-600 text-xs mt-0.5">
                            {items.filter(i => i.stock <= i.minStock).map(i => i.name).join(', ')} — bajo el mínimo
                        </p>
                    </div>
                </div>
            )}

            {/* Filters */}
            <div className="card p-4">
                <div className="flex flex-wrap gap-3">
                    <div className="relative flex-1 min-w-[180px]">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary-400" />
                        <input className="input pl-9 text-sm" placeholder="Buscar producto…" value={q} onChange={e => setQ(e.target.value)} />
                    </div>
                    <select className="select text-sm w-48" value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}>
                        <option value="all">Todas las Categorías</option>
                        {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                    <select className="select text-sm w-48" value={supplierFilter} onChange={e => setSupplierFilter(e.target.value)}>
                        <option value="all">Todos los Proveedores</option>
                        {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                    <select className="select text-sm w-40" value={stockStatusFilter} onChange={e => setStockStatusFilter(e.target.value as StockStatus)}>
                        <option value="all">Todos los estados</option>
                        <option value="ok">OK</option>
                        <option value="low">Bajo</option>
                        <option value="critical">Crítico</option>
                        <option value="out">Sin stock</option>
                    </select>
                </div>
            </div>

            <div className="card p-0 overflow-hidden">
                {loading ? (
                    <div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-primary-700 border-t-transparent rounded-full animate-spin" /></div>
                ) : (
                    <div className="table-wrapper rounded-none border-0">
                        <table className="data-table">
                            <thead><tr>
                                <th>ID</th>
                                <th className="cursor-pointer select-none" onClick={() => toggleSort('name')}>Producto <SortIcon field="name" /></th>
                                <th className="cursor-pointer select-none" onClick={() => toggleSort('stock')}>Stock <SortIcon field="stock" /></th>
                                <th>Mín.</th>
                                <th className="cursor-pointer select-none" onClick={() => toggleSort('category')}>Categoría <SortIcon field="category" /></th>
                                <th>Proveedor</th>
                                <th>Estado</th>
                                <th>Acciones</th>
                            </tr></thead>
                            <tbody>
                                {filtered.length === 0 ? (
                                    <tr><td colSpan={8} className="text-center text-primary-400 py-10">Sin resultados</td></tr>
                                ) : filtered.map(item => {
                                    const st = stockStatus(item)
                                    return (
                                        <tr key={item.id}>
                                            <td className="text-primary-400 font-mono">{item.id}</td>
                                            <td className="font-medium">{item.name}</td>
                                            <td className="font-bold text-espresso">{item.stock}</td>
                                            <td className="text-primary-500">{item.minStock}</td>
                                            <td className="text-primary-400">{item.category?.name ?? '—'}</td>
                                            <td className="text-primary-400">{item.supplier?.name ?? '—'}</td>
                                            <td><span className={st.cls}>{st.label}</span></td>
                                            <td className="space-x-1">
                                                <button onClick={() => setModal(item)} className="btn-ghost py-1 px-2 text-xs">
                                                    <Plus className="w-3.5 h-3.5 inline mr-1" />Ajustar
                                                </button>
                                                <button onClick={() => setLabelModal(item)} className="btn-ghost py-1 px-2 text-xs" title="Imprimir Etiqueta">
                                                    <Printer className="w-3.5 h-3.5 inline" />
                                                </button>
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {modal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl">
                        <div className="flex items-center justify-between p-6 border-b border-muted">
                            <div>
                                <h2 className="text-lg font-bold text-espresso">Ajuste de Stock</h2>
                                <p className="text-primary-400 text-sm">{modal.name} — actual: {modal.stock}</p>
                            </div>
                            <button onClick={() => setModal(null)} className="btn-ghost p-1.5"><X className="w-5 h-5" /></button>
                        </div>
                        <form onSubmit={handleAdjust} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-primary-700 mb-1">Cantidad</label>
                                <input type="number" step="any" className="input" placeholder="+2.5 ó -0.5" value={adjQty} onChange={e => setAdjQty(e.target.value)} required />
                                <p className="text-xs text-primary-400 mt-1">Positivo = entrada, negativo = salida</p>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-primary-700 mb-1">Tipo de Ajuste</label>
                                <select className="select" value={adjReasonType} onChange={e => setAdjReasonType(e.target.value)} required>
                                    <option value="Merma">Merma</option>
                                    <option value="Pérdida">Pérdida</option>
                                    <option value="Rotura">Rotura</option>
                                    <option value="Entrada manual">Entrada manual</option>
                                    <option value="Corrección de inventario">Corrección de inventario</option>
                                    <option value="Otro">Otro</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-primary-700 mb-1">Detalle del motivo <span className="text-primary-400 font-normal">(opcional)</span></label>
                                <input className="input" placeholder="Ej: se rompió al trasladar" value={adjReasonDetail} onChange={e => setAdjReasonDetail(e.target.value)} />
                            </div>
                            <div className="flex gap-3">
                                <button type="button" onClick={() => setModal(null)} className="btn-secondary flex-1">Cancelar</button>
                                <button type="submit" className="btn-primary flex-1" disabled={saving}>{saving ? 'Guardando…' : 'Aplicar'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Print Label Modal */}
            {labelModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4 print:bg-white print:p-0">
                    <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl print:shadow-none print:w-auto print:mx-auto">
                        <div className="flex items-center justify-between p-6 border-b border-muted print:hidden">
                            <h2 className="text-lg font-bold text-espresso">Imprimir Etiqueta</h2>
                            <button onClick={() => setLabelModal(null)} className="btn-ghost p-1.5"><X className="w-5 h-5" /></button>
                        </div>
                        <div className="p-6 flex flex-col items-center">
                            {/* The label itself */}
                            <div className="border-2 border-dashed border-primary-300 p-6 rounded-xl flex flex-col items-center gap-3 w-64 print:border-solid print:border-black print:rounded-none">
                                <h3 className="font-bold text-lg text-center leading-tight truncate w-full">{labelModal.name}</h3>
                                <p className="text-xs text-primary-500">{labelModal.category?.name}</p>
                                <QRCodeSVG value={`PROD:${labelModal.id}`} size={120} level="M" />
                                <div className="mt-2 text-xl font-black text-espresso">
                                    ${Number(labelModal.price).toLocaleString('es-AR')}
                                </div>
                                <p className="text-[10px] text-primary-400 font-mono mt-1">ID: {String(labelModal.id).padStart(6, '0')}</p>
                            </div>
                        </div>
                        <div className="p-6 pt-0 flex gap-3 print:hidden">
                            <button onClick={() => setLabelModal(null)} className="btn-secondary flex-1">Cerrar</button>
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
                            }
                        `}} />
                    </div>
                </div>
            )}
        </div>
    )
}
