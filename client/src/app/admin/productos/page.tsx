'use client'
import { useEffect, useState } from 'react'
import api from '@/lib/api'
import { Item, Category, Supplier } from '@/types'
import {
    Plus, X, Search, Eye, EyeOff, Edit, Trash2,
    Package, ImageOff, ChevronLeft, ChevronRight,
    Tag, Boxes, ExternalLink, Filter, QrCode, Printer
} from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'

const FMT = (n: number) => `$${Number(n ?? 0).toLocaleString('es-AR')}`

const FIELD_LABELS: Record<string, string> = {
    price: 'Precio de venta',
    cost: 'Costo',
    stock: 'Stock actual',
    minStock: 'Stock mínimo',
}

function ProductCard({ item, onEdit, onToggle, onDelete, onQr, selected, onSelect }: {
    item: Item
    onEdit: () => void
    onToggle: () => void
    onDelete: () => void
    onQr: () => void
    selected: boolean
    onSelect: () => void
}) {
    const stockBad = item.stock <= item.minStock
    return (
        <div className={`card p-0 overflow-hidden flex flex-col transition-shadow hover:shadow-lg ${!item.visible ? 'opacity-60' : ''}`}>
            {/* Image */}
            <div className="relative h-44 bg-primary-50 flex items-center justify-center overflow-hidden">
                {/* Selection Checkbox */}
                <div className="absolute top-2 left-2 z-10">
                    <input
                        type="checkbox"
                        checked={selected}
                        onChange={onSelect}
                        className="w-5 h-5 rounded accent-primary-700 cursor-pointer shadow-sm border-white"
                    />
                </div>

                {item.imageUrl ? (
                    <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                ) : (
                    <div className="flex flex-col items-center gap-2 text-primary-300">
                        <ImageOff className="w-10 h-10" />
                        <span className="text-xs">Sin imagen</span>
                    </div>
                )}
                {/* Badges */}
                <div className="absolute top-2 right-2 flex flex-col gap-1 items-end">
                    <span className={item.visible ? 'badge-green' : 'badge-red'}>
                        {item.visible ? 'Visible' : 'Oculto'}
                    </span>
                    {stockBad && (
                        <span className="badge-red">⚠ Stock bajo</span>
                    )}
                </div>
                {item.category && (
                    <div className="absolute bottom-2 left-2">
                        <span className="badge-brown text-xs">{item.category.name}</span>
                    </div>
                )}
            </div>

            {/* Info */}
            <div className="p-4 flex-1 flex flex-col gap-2">
                <h3 className="font-semibold text-espresso leading-tight line-clamp-2">{item.name}</h3>
                {item.description && (
                    <p className="text-xs text-primary-500 line-clamp-2">{item.description}</p>
                )}
                <div className="flex items-center justify-between mt-auto pt-2">
                    <div>
                        <p className="text-lg font-bold text-espresso">{FMT(item.price)}</p>
                        <p className="text-xs text-primary-400">Costo: {FMT(item.cost)}</p>
                    </div>
                    <div className="text-right">
                        <p className={`text-lg font-bold ${stockBad ? 'text-red-600' : 'text-emerald-600'}`}>{item.stock}</p>
                        <p className="text-xs text-primary-400">en stock</p>
                    </div>
                </div>
            </div>

            {/* Actions */}
            <div className="border-t border-muted p-2 flex items-center justify-between gap-1">
                <button onClick={onEdit} className="btn-ghost flex items-center gap-1.5 text-xs px-3 py-1.5 flex-1 justify-center">
                    <Edit className="w-3.5 h-3.5" /> Editar
                </button>
                <button onClick={onToggle} className="btn-ghost p-1.5" title={item.visible ? 'Ocultar' : 'Mostrar'}>
                    {item.visible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
                <button onClick={onQr} className="btn-ghost p-1.5" title="Ver QR">
                    <QrCode className="w-4 h-4" />
                </button>
                <button onClick={onDelete} className="text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg p-1.5 transition-colors" title="Eliminar">
                    <Trash2 className="w-4 h-4" />
                </button>
            </div>
        </div>
    )
}

export default function ProductosAdminPage() {
    const [data, setData] = useState<Item[]>([])
    const [total, setTotal] = useState(0)
    const [page, setPage] = useState(0)
    const [loading, setLoading] = useState(true)
    const [q, setQ] = useState('')
    const [catFilter, setCatFilter] = useState('')
    const [visFilter, setVisFilter] = useState('')
    const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid')
    const [showModal, setShowModal] = useState(false)
    const [editing, setEditing] = useState<Item | null>(null)
    const [categories, setCategories] = useState<Category[]>([])
    const [suppliers, setSuppliers] = useState<Supplier[]>([])
    const blank = { name: '', description: '', price: '', cost: '', stock: '0', minStock: '5', imageUrl: '', barcode: '', categoryId: '', supplierId: '', visible: true, unit: '', unitSize: '', purchaseUnit: '', purchaseConversion: '1', components: [] as any[] }
    const [form, setForm] = useState(blank as any)
    const [saving, setSaving] = useState(false)
    const [deleting, setDeleting] = useState(false)
    const [qrItem, setQrItem] = useState<Item | null>(null)
    const [showLabels, setShowLabels] = useState(false)

    // Selection
    const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())

    const toggleSelect = (id: number) => setSelectedIds(prev => {
        const next = new Set(prev)
        next.has(id) ? next.delete(id) : next.add(id)
        return next
    })
    const toggleAll = () => setSelectedIds(prev => prev.size === displayed.length ? new Set() : new Set(displayed.map(i => i.id)))

    const load = async () => {
        setLoading(true)
        try {
            let url = `/api/admin/items?page=${page}&size=24`
            if (q) url += `&q=${q}`
            if (catFilter) url += `&category=${catFilter}`
            const r = await api.get(url)
            let items = r.data.content as Item[]
            if (visFilter === 'visible') items = items.filter(i => i.visible)
            if (visFilter === 'hidden') items = items.filter(i => !i.visible)
            setData(items)
            setTotal(r.data.totalElements)
        } finally { setLoading(false) }
    }

    useEffect(() => { load() }, [page, q, catFilter])
    useEffect(() => {
        Promise.all([
            api.get('/api/admin/categories?type=PRODUCT'),
            api.get('/api/admin/suppliers?size=100'),
        ]).then(([c, s]) => { setCategories(c.data); setSuppliers(s.data.content) })
    }, [])

    const [newCategoryName, setNewCategoryName] = useState('')

    const openNew = () => { setEditing(null); setForm({ ...blank, visible: true, components: [] }); setNewCategoryName(''); setShowModal(true) }
    const openEdit = (item: Item) => {
        setEditing(item)
        setForm({
            name: item.name,
            description: item.description ?? '',
            price: String(item.price),
            cost: String(item.cost),
            stock: String(item.stock),
            minStock: String(item.minStock),
            imageUrl: item.imageUrl ?? '',
            barcode: item.barcode ?? '',
            categoryId: item.category?.id ? String(item.category.id) : '',
            supplierId: item.supplier?.id ? String(item.supplier.id) : '',
            visible: item.visible,
            unit: item.unit ?? '',
            unitSize: item.unitSize ? String(item.unitSize) : '',
            purchaseUnit: item.purchaseUnit ?? '',
            purchaseConversion: item.purchaseConversion ? String(item.purchaseConversion) : '1',
            components: item.components?.map(c => ({ componentItemId: String(c.componentItem.id), quantity: String(c.quantity) })) ?? []
        })
        setNewCategoryName('')
        setShowModal(true)
    }

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault(); setSaving(true)
        try {
            let categoryId = form.categoryId ? Number(form.categoryId) : null
            // Auto-create new category if user typed one
            if (form.categoryId === '__new__' && newCategoryName.trim()) {
                const res = await api.post('/api/admin/categories', { name: newCategoryName.trim(), type: 'PRODUCT' })
                categoryId = res.data.id
                setCategories(prev => [...prev, res.data])
                setNewCategoryName('')
            }
            const payload = {
                ...form,
                price: Number(form.price),
                cost: Number(form.cost),
                stock: Number(form.stock),
                minStock: Number(form.minStock),
                categoryId,
                supplierId: form.supplierId ? Number(form.supplierId) : null,
                unit: form.unit || null,
                unitSize: form.unitSize ? Number(form.unitSize) : null,
                purchaseUnit: form.purchaseUnit || null,
                purchaseConversion: form.purchaseConversion ? Number(form.purchaseConversion) : null,
                components: form.components.map((c: any) => ({ componentItemId: Number(c.componentItemId), quantity: Number(c.quantity) }))
            }
            if (editing) await api.put(`/api/admin/items/${editing.id}`, payload)
            else await api.post('/api/admin/items', payload)
            setShowModal(false); load()
        } finally { setSaving(false) }
    }

    const handleDelete = async (ids: number[]) => {
        if (!confirm(`¿Eliminar ${ids.length === 1 ? 'este producto' : `estos ${ids.length} productos`}? Esta acción no se puede deshacer.`)) return
        setDeleting(true)
        const errors: string[] = []
        for (const id of ids) {
            try { await api.delete(`/api/admin/items/${id}`) }
            catch (e: any) {
                const name = data.find(i => i.id === id)?.name ?? id
                errors.push(`${name}: ${e.response?.data ?? 'Error'}`)
            }
        }
        setDeleting(false)
        setSelectedIds(new Set())
        if (errors.length) alert(errors.join('\n'))
        load()
    }

    const toggleVisibility = async (item: Item) => {
        await api.patch(`/api/admin/items/${item.id}/visibility`); load()
    }

    const handleBatchVisibility = async (ids: number[], makeVisible: boolean) => {
        setSaving(true)
        const errors: string[] = []
        for (const id of ids) {
            const item = data.find(i => i.id === id)
            if (item && item.visible !== makeVisible) {
                try { await api.patch(`/api/admin/items/${id}/visibility`) }
                catch (e: any) { errors.push(`${item.name || id}: ${e.response?.data ?? 'Error'}`) }
            }
        }
        setSaving(false)
        setSelectedIds(new Set())
        if (errors.length) alert(errors.join('\n'))
        load()
    }

    const displayed = visFilter
        ? data.filter(i => visFilter === 'visible' ? i.visible : !i.visible)
        : data

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-espresso">Gestión de Productos</h1>
                    <p className="text-primary-500 text-sm">{total} productos en total</p>
                </div>
                <div className="flex items-center gap-3">
                    <button onClick={() => setShowLabels(true)} className="btn-secondary flex items-center gap-2 text-sm">
                        <Printer className="w-4 h-4" /> Imprimir etiquetas
                    </button>
                    <a href="/" target="_blank" className="btn-ghost flex items-center gap-2 text-sm">
                        <ExternalLink className="w-4 h-4" /> Ver tienda
                    </a>
                    <button onClick={openNew} className="btn-primary flex items-center gap-2">
                        <Plus className="w-4 h-4" /> Nuevo producto
                    </button>
                </div>
            </div>

            {/* Filters */}
            <div className="card p-4">
                <div className="flex flex-wrap items-center gap-3">
                    <div className="relative flex-1 min-w-[180px]">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary-400" />
                        <input
                            className="input pl-9 text-sm"
                            placeholder="Buscar por nombre…"
                            value={q}
                            onChange={e => { setQ(e.target.value); setPage(0) }}
                        />
                    </div>
                    <select
                        className="select text-sm min-w-[160px]"
                        value={catFilter}
                        onChange={e => { setCatFilter(e.target.value); setPage(0) }}
                    >
                        <option value="">Todas las categorías</option>
                        {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                    <select
                        className="select text-sm"
                        value={visFilter}
                        onChange={e => setVisFilter(e.target.value)}
                    >
                        <option value="">Todos</option>
                        <option value="visible">Visibles</option>
                        <option value="hidden">Ocultos</option>
                    </select>
                    {/* View toggle */}
                    <div className="flex border border-muted rounded-lg overflow-hidden ml-auto">
                        <button
                            onClick={() => setViewMode('grid')}
                            className={`px-3 py-2 text-sm ${viewMode === 'grid' ? 'bg-primary-700 text-white' : 'bg-white text-primary-500 hover:bg-primary-50'}`}
                        >
                            ⊞ Cuadrícula
                        </button>
                        <button
                            onClick={() => setViewMode('table')}
                            className={`px-3 py-2 text-sm ${viewMode === 'table' ? 'bg-primary-700 text-white' : 'bg-white text-primary-500 hover:bg-primary-50'}`}
                        >
                            ☰ Lista
                        </button>
                    </div>
                </div>
                {(q || catFilter || visFilter) && (
                    <div className="flex items-center mt-3">
                        <button onClick={() => { setQ(''); setCatFilter(''); setVisFilter(''); setPage(0) }} className="text-xs text-primary-500 hover:text-espresso flex items-center gap-1">
                            <X className="w-3 h-3" /> Limpiar filtros
                        </button>
                    </div>
                )}
            </div>

            {/* Content */}
            {loading ? (
                <div className="flex justify-center py-20">
                    <div className="w-10 h-10 border-4 border-primary-700 border-t-transparent rounded-full animate-spin" />
                </div>
            ) : displayed.length === 0 ? (
                <div className="card flex flex-col items-center justify-center py-20 text-center">
                    <Package className="w-14 h-14 text-primary-300 mb-4" />
                    <p className="font-semibold text-espresso text-lg">Sin productos</p>
                    <p className="text-primary-400 text-sm mt-1">Agregá tu primer producto con el botón de arriba</p>
                    <button onClick={openNew} className="btn-primary mt-6 flex items-center gap-2">
                        <Plus className="w-4 h-4" /> Agregar producto
                    </button>
                </div>
            ) : viewMode === 'grid' ? (
                <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {displayed.map(item => (
                        <ProductCard
                            key={item.id}
                            item={item}
                            onEdit={() => openEdit(item)}
                            onToggle={() => toggleVisibility(item)}
                            onDelete={() => handleDelete([item.id])}
                            onQr={() => setQrItem(item)}
                            selected={selectedIds.has(item.id)}
                            onSelect={() => toggleSelect(item.id)}
                        />
                    ))}
                </div>
            ) : (
                <div className="card p-0 overflow-hidden">
                    <div className="table-wrapper rounded-none border-0">
                        <table className="data-table">
                            <thead><tr>
                                <th>
                                    <input
                                        type="checkbox"
                                        className="w-4 h-4 rounded accent-primary-700 cursor-pointer"
                                        checked={displayed.length > 0 && selectedIds.size === displayed.length}
                                        onChange={toggleAll}
                                    />
                                </th>
                                <th>Imagen</th>
                                <th>Nombre</th>
                                <th>Precio</th>
                                <th>Costo</th>
                                <th>Stock</th>
                                <th>Categoría</th>
                                <th>Visible</th>
                                <th>Acciones</th>
                            </tr></thead>
                            <tbody>
                                {displayed.map(item => (
                                    <tr key={item.id} className={!item.visible ? 'opacity-60' : ''}>
                                        <td>
                                            <input
                                                type="checkbox"
                                                className="w-4 h-4 rounded accent-primary-700 cursor-pointer"
                                                checked={selectedIds.has(item.id)}
                                                onChange={() => toggleSelect(item.id)}
                                            />
                                        </td>
                                        <td>
                                            <div className="w-10 h-10 rounded-lg overflow-hidden bg-primary-50 flex items-center justify-center">
                                                {item.imageUrl
                                                    ? <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                                                    : <ImageOff className="w-4 h-4 text-primary-300" />
                                                }
                                            </div>
                                        </td>
                                        <td className="font-medium">
                                            {item.name}
                                            {item.description && <p className="text-xs text-primary-400 font-normal truncate max-w-[200px]">{item.description}</p>}
                                        </td>
                                        <td className="font-semibold">{FMT(item.price)}</td>
                                        <td className="text-primary-500">{FMT(item.cost)}</td>
                                        <td>
                                            <span className={`font-bold ${item.stock <= item.minStock ? 'text-red-600' : 'text-emerald-600'}`}>
                                                {item.stock}
                                            </span>
                                            {item.stock <= item.minStock && <span className="text-red-500 text-xs ml-1">⚠</span>}
                                        </td>
                                        <td className="text-primary-400 text-sm">{item.category?.name ?? '—'}</td>
                                        <td>
                                            <span className={item.visible ? 'badge-green' : 'badge-red'}>
                                                {item.visible ? 'Visible' : 'Oculto'}
                                            </span>
                                        </td>
                                        <td>
                                            <div className="flex items-center gap-1">
                                                <button onClick={() => openEdit(item)} className="btn-ghost p-1.5" title="Editar">
                                                    <Edit className="w-3.5 h-3.5" />
                                                </button>
                                                <button onClick={() => toggleVisibility(item)} className="btn-ghost p-1.5" title={item.visible ? 'Ocultar' : 'Mostrar'}>
                                                    {item.visible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                                </button>
                                                <button onClick={() => handleDelete([item.id])} className="text-red-500 hover:text-red-700 p-1.5 rounded hover:bg-red-50 transition-colors" title="Eliminar">
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Floating Action Bar for Selection */}
            {selectedIds.size > 0 && (
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-white shadow-xl border border-primary-100 rounded-full px-4 md:px-6 py-3 flex items-center gap-3 md:gap-4 z-40 animate-in slide-in-from-bottom-5 max-w-[95%] overflow-x-auto flex-nowrap whitespace-nowrap hide-scrollbar">
                    <span className="font-bold text-espresso text-sm bg-primary-50 px-3 py-1 rounded-full">{selectedIds.size} seleccionados</span>
                    <div className="w-px h-6 bg-muted"></div>
                    <button onClick={() => handleBatchVisibility(Array.from(selectedIds), true)} className="btn-ghost text-sm flex items-center gap-2">
                        <Eye className="w-4 h-4" /> Mostrar
                    </button>
                    <button onClick={() => handleBatchVisibility(Array.from(selectedIds), false)} className="btn-ghost text-sm flex items-center gap-2">
                        <EyeOff className="w-4 h-4" /> Ocultar
                    </button>
                    <div className="w-px h-6 bg-muted"></div>
                    <button onClick={() => handleDelete(Array.from(selectedIds))} className="text-sm font-semibold text-red-600 hover:text-red-700 hover:bg-red-50 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-2">
                        <Trash2 className="w-4 h-4" /> Eliminar
                    </button>
                    <button onClick={() => setSelectedIds(new Set())} className="ml-2 btn-ghost p-1.5 rounded-full" title="Cancelar selección">
                        <X className="w-4 h-4" />
                    </button>
                </div>
            )}

            {/* Pagination */}
            {total > 24 && (
                <div className="flex items-center justify-between">
                    <p className="text-sm text-primary-400">Página {page + 1}</p>
                    <div className="flex gap-2">
                        <button disabled={page === 0} onClick={() => setPage(p => p - 1)} className="btn-ghost p-1.5 disabled:opacity-30">
                            <ChevronLeft className="w-4 h-4" />
                        </button>
                        <button disabled={(page + 1) * 24 >= total} onClick={() => setPage(p => p + 1)} className="btn-ghost p-1.5 disabled:opacity-30">
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            )}

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
                        <div className="flex items-center justify-between p-6 border-b border-muted sticky top-0 bg-white z-10">
                            <h2 className="text-lg font-bold text-espresso">
                                {editing ? 'Editar producto' : 'Nuevo producto'}
                            </h2>
                            <button onClick={() => setShowModal(false)} className="btn-ghost p-1.5">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleSave} className="p-6 space-y-5">
                            {/* Image preview */}
                            {form.imageUrl && (
                                <div className="w-full h-48 rounded-xl overflow-hidden bg-primary-50">
                                    <img
                                        src={form.imageUrl}
                                        alt="Preview"
                                        className="w-full h-full object-cover"
                                        onError={e => (e.currentTarget.style.display = 'none')}
                                    />
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-4">
                                <div className="col-span-2">
                                    <label className="block text-sm font-medium text-primary-700 mb-1">Nombre *</label>
                                    <input className="input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required placeholder="Ej: Colombian Huila Geisha" />
                                </div>

                                <div className="col-span-2">
                                    <label className="block text-sm font-medium text-primary-700 mb-1">Descripción</label>
                                    <textarea className="input" rows={3} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Descripción del producto para la tienda…" />
                                </div>

                                <div className="col-span-2">
                                    <label className="block text-sm font-medium text-primary-700 mb-1">URL de imagen</label>
                                    <input type="url" className="input" value={form.imageUrl} onChange={e => setForm({ ...form, imageUrl: e.target.value })} placeholder="https://…" />
                                    <p className="text-xs text-primary-400 mt-1">Pegá una URL de imagen. El preview se actualiza automáticamente.</p>
                                </div>

                                {/* Prices */}
                                <div>
                                    <label className="block text-sm font-medium text-primary-700 mb-1">Precio de venta *</label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-primary-400 font-medium">$</span>
                                        <input type="number" min="0" step="0.01" className="input pl-7" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} required />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-primary-700 mb-1">Costo</label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-primary-400 font-medium">$</span>
                                        <input type="number" min="0" step="0.01" className="input pl-7" value={form.cost} onChange={e => setForm({ ...form, cost: e.target.value })} />
                                    </div>
                                </div>
                                {form.price && form.cost && Number(form.cost) > 0 && (
                                    <div className="col-span-2 p-3 bg-emerald-50 rounded-xl">
                                        <p className="text-sm text-emerald-700">
                                            <strong>Margen:</strong> {Math.round((1 - Number(form.cost) / Number(form.price)) * 100)}%
                                            {' · '}
                                            <strong>Ganancia:</strong> {FMT(Number(form.price) - Number(form.cost))} por unidad
                                        </p>
                                    </div>
                                )}

                                {/* Stock */}
                                <div>
                                    <label className="block text-sm font-medium text-primary-700 mb-1">Stock actual</label>
                                    <input type="number" step="any" min="0" className="input" value={form.stock} onChange={e => setForm({ ...form, stock: e.target.value })} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-primary-700 mb-1">Stock mínimo</label>
                                    <input type="number" step="any" min="0" className="input" value={form.minStock} onChange={e => setForm({ ...form, minStock: e.target.value })} />
                                    <p className="text-xs text-primary-400 mt-1">Alerta cuando baje de este valor</p>
                                </div>

                                {/* Units & Conversion */}
                                <div className="col-span-2 grid grid-cols-2 gap-4 p-4 bg-primary-50 rounded-xl border border-primary-100 mt-2">
                                    <div className="col-span-2">
                                        <h4 className="text-sm font-bold text-espresso mb-1">Unidades y Conversión</h4>
                                        <p className="text-xs text-primary-500 mb-3">Configura cómo se vende este producto y cómo lo compras al proveedor.</p>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-primary-700 mb-1">Unidad de Venta (ej. g, u)</label>
                                        <input className="input text-sm" value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })} placeholder="Ej: g" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-primary-700 mb-1">Tamaño (ej. 100 para 100g)</label>
                                        <input type="number" step="0.001" min="0" className="input text-sm" value={form.unitSize} onChange={e => setForm({ ...form, unitSize: e.target.value })} placeholder="100" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-primary-700 mb-1">Unidad de Compra (ej. kg, caja)</label>
                                        <input className="input text-sm" value={form.purchaseUnit} onChange={e => setForm({ ...form, purchaseUnit: e.target.value })} placeholder="Ej: kg" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-primary-700 mb-1">Factor de Conversión</label>
                                        <input type="number" step="0.001" min="0" className="input text-sm" value={form.purchaseConversion} onChange={e => setForm({ ...form, purchaseConversion: e.target.value })} placeholder="10" />
                                    </div>
                                    {form.unit && form.purchaseUnit && Number(form.purchaseConversion) > 0 && (
                                        <div className="col-span-2 mt-1">
                                            <p className="text-xs text-emerald-700 font-medium">💡 Cuando compres 1 {form.purchaseUnit}, ingresarán {form.purchaseConversion} unidades de {form.unitSize || 1} {form.unit} al stock.</p>
                                        </div>
                                    )}
                                </div>

                                {/* Category & Supplier */}
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
                                <div>
                                    <label className="block text-sm font-medium text-primary-700 mb-1">Proveedor</label>
                                    <select className="select" value={form.supplierId} onChange={e => setForm({ ...form, supplierId: e.target.value })}>
                                        <option value="">Sin proveedor</option>
                                        {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-primary-700 mb-1">Código de barras</label>
                                    <input className="input font-mono" value={form.barcode} onChange={e => setForm({ ...form, barcode: e.target.value })} placeholder="EAN-13, UPC…" />
                                </div>

                                {/* Visibility */}
                                <div className="col-span-2 flex items-center gap-3 p-3 bg-primary-50 rounded-xl">
                                    <input
                                        type="checkbox"
                                        id="visible-chk"
                                        checked={form.visible}
                                        onChange={e => setForm({ ...form, visible: e.target.checked })}
                                        className="w-4 h-4 rounded accent-primary-700"
                                    />
                                    <label htmlFor="visible-chk" className="text-sm font-medium text-primary-700 cursor-pointer">
                                        Visible en la tienda
                                        <span className="font-normal text-primary-500 ml-1">— Los clientes pueden ver y comprar este producto</span>
                                    </label>
                                </div>

                                {/* Recipe Section */}
                                <div className="col-span-2 border-t border-muted pt-4 mt-2">
                                    <div className="flex items-center justify-between mb-3">
                                        <h3 className="text-sm font-bold text-espresso uppercase tracking-wider">Receta / Insumos</h3>
                                        <button type="button" onClick={() => setForm({ ...form, components: [...form.components, { componentItemId: '', quantity: '1' }] })} className="text-primary-600 hover:text-primary-800 text-xs font-bold flex items-center gap-1">
                                            <Plus className="w-3 h-3" /> AGREGAR INSUMO
                                        </button>
                                    </div>
                                    <div className="space-y-2">
                                        {form.components.map((comp: any, i: number) => (
                                            <div key={i} className="flex gap-2 items-center">
                                                <select
                                                    className="select flex-1 text-sm py-1.5"
                                                    value={comp.componentItemId}
                                                    onChange={e => {
                                                        const n = [...form.components]; n[i].componentItemId = e.target.value; setForm({ ...form, components: n })
                                                    }}
                                                    required
                                                >
                                                    <option value="">Seleccionar insumo…</option>
                                                    {data.filter(it => editing ? it.id !== editing.id : true).map(it => (
                                                        <option key={it.id} value={it.id}>{it.name} (stock: {it.stock})</option>
                                                    ))}
                                                </select>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs text-primary-400">Cant:</span>
                                                    <input
                                                        type="number" step="any" min="0.001"
                                                        className="input w-20 py-1 text-center"
                                                        value={comp.quantity}
                                                        onChange={e => {
                                                            const n = [...form.components]; n[i].quantity = e.target.value; setForm({ ...form, components: n })
                                                        }}
                                                        required
                                                    />
                                                </div>
                                                <button type="button" onClick={() => setForm({ ...form, components: form.components.filter((_: any, idx: number) => idx !== i) })} className="text-red-500 hover:text-red-700 p-1">
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        ))}
                                        {form.components.length === 0 && <p className="text-xs text-primary-400 italic text-center py-2 bg-warm-50 rounded border border-dashed border-muted">No hay insumos vinculados a este producto.</p>}
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-3 pt-2 border-t border-muted">
                                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary flex-1">
                                    Cancelar
                                </button>
                                <button type="submit" className="btn-primary flex-1" disabled={saving}>
                                    {saving ? 'Guardando…' : editing ? 'Guardar cambios' : 'Crear producto'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* QR Modal */}
            {qrItem && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl p-6 text-center space-y-4">
                        <h2 className="text-lg font-bold text-espresso">{qrItem.name}</h2>
                        <div className="flex justify-center">
                            <QRCodeSVG
                                value={`PRODUCT:${qrItem.id}:${qrItem.barcode || qrItem.name}`}
                                size={200}
                                level="H"
                                includeMargin
                            />
                        </div>
                        <p className="text-sm text-primary-500">
                            {qrItem.barcode && <span className="font-mono">{qrItem.barcode}</span>}
                            {qrItem.barcode && ' · '}
                            {FMT(qrItem.price)}
                        </p>
                        <div className="flex gap-3">
                            <button onClick={() => setQrItem(null)} className="btn-secondary flex-1">Cerrar</button>
                            <button onClick={() => window.print()} className="btn-primary flex-1 flex items-center justify-center gap-1.5"><Printer className="w-4 h-4" />Imprimir</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Labels Modal */}
            {showLabels && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
                        <div className="flex items-center justify-between p-6 border-b border-muted">
                            <h2 className="text-lg font-bold text-espresso">Imprimir Etiquetas</h2>
                            <button onClick={() => setShowLabels(false)} className="btn-ghost p-1.5"><X className="w-5 h-5" /></button>
                        </div>
                        <div className="p-6">
                            <p className="text-sm text-primary-500 mb-4">Seleccioná los productos para generar etiquetas con QR:</p>
                            <div className="space-y-2 max-h-60 overflow-y-auto mb-4">
                                {data.filter(i => i.visible).map(item => (
                                    <label key={item.id} className="flex items-center gap-3 p-2 hover:bg-primary-50 rounded-lg cursor-pointer">
                                        <input type="checkbox" checked={selectedIds.has(item.id)}
                                            onChange={e => { const ns = new Set(selectedIds); e.target.checked ? ns.add(item.id) : ns.delete(item.id); setSelectedIds(ns) }}
                                            className="w-4 h-4 rounded accent-primary-700" />
                                        <span className="font-medium text-sm">{item.name}</span>
                                        <span className="text-xs text-primary-400 ml-auto">{FMT(item.price)}</span>
                                    </label>
                                ))}
                            </div>
                            {selectedIds.size > 0 && (
                                <div className="grid grid-cols-3 gap-4 p-4 border border-muted rounded-xl print:border-none" id="labels-container">
                                    {data.filter(i => selectedIds.has(i.id)).map(item => (
                                        <div key={item.id} className="border border-muted rounded-lg p-3 text-center">
                                            <QRCodeSVG value={`PRODUCT:${item.id}:${item.barcode || item.name}`} size={80} level="M" />
                                            <p className="text-xs font-semibold mt-2 line-clamp-1">{item.name}</p>
                                            <p className="text-sm font-bold text-espresso">{FMT(item.price)}</p>
                                            {item.barcode && <p className="text-[10px] text-primary-400 font-mono">{item.barcode}</p>}
                                        </div>
                                    ))}
                                </div>
                            )}
                            <div className="flex gap-3 mt-4">
                                <button onClick={() => setShowLabels(false)} className="btn-secondary flex-1">Cancelar</button>
                                <button onClick={() => window.print()} disabled={selectedIds.size === 0}
                                    className="btn-primary flex-1 flex items-center justify-center gap-1.5 disabled:opacity-40">
                                    <Printer className="w-4 h-4" />Imprimir ({selectedIds.size})
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
