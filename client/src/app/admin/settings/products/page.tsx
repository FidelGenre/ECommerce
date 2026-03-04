'use client'
import { useEffect, useState } from 'react'
import api from '@/lib/api'
import { Item, Category, Supplier } from '@/types'
import { Plus, X, Search, Eye, EyeOff, Edit } from 'lucide-react'

const FMT = (n: number) => `$${Number(n ?? 0).toLocaleString('es-AR')}`

const FIELD_LABELS: Record<string, string> = {
    price: 'Precio de venta',
    cost: 'Costo',
    stock: 'Stock',
    minStock: 'Stock mínimo',
}

export default function ProductsSettingsPage() {
    const [data, setData] = useState<Item[]>([])
    const [loading, setLoading] = useState(true)
    const [q, setQ] = useState('')
    const [showModal, setShowModal] = useState(false)
    const [editing, setEditing] = useState<Item | null>(null)
    const [categories, setCategories] = useState<Category[]>([])
    const [suppliers, setSuppliers] = useState<Supplier[]>([])
    const blank = { name: '', description: '', price: '', cost: '', stock: '0', minStock: '5', imageUrl: '', barcode: '', categoryId: '', supplierId: '', visible: true }
    const [form, setForm] = useState(blank as any)
    const [saving, setSaving] = useState(false)

    const load = async () => {
        setLoading(true)
        const r = await api.get(`/api/admin/items?size=200${q ? '&q=' + q : ''}`)
        setData(r.data.content); setLoading(false)
    }
    useEffect(() => { load() }, [q])
    useEffect(() => {
        Promise.all([api.get('/api/admin/categories'), api.get('/api/admin/suppliers?size=100')])
            .then(([c, s]) => { setCategories(c.data); setSuppliers(s.data.content) })
    }, [])

    const openNew = () => { setEditing(null); setForm({ ...blank, visible: true }); setShowModal(true) }
    const openEdit = (item: Item) => {
        setEditing(item)
        setForm({ name: item.name, description: item.description ?? '', price: String(item.price), cost: String(item.cost), stock: String(item.stock), minStock: String(item.minStock), imageUrl: item.imageUrl ?? '', barcode: item.barcode ?? '', categoryId: item.category?.id ? String(item.category.id) : '', supplierId: item.supplier?.id ? String(item.supplier.id) : '', visible: item.visible })
        setShowModal(true)
    }
    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault(); setSaving(true)
        const payload = { ...form, price: Number(form.price), cost: Number(form.cost), stock: Number(form.stock), minStock: Number(form.minStock), categoryId: form.categoryId ? Number(form.categoryId) : null, supplierId: form.supplierId ? Number(form.supplierId) : null }
        try {
            if (editing) await api.put(`/api/admin/items/${editing.id}`, payload)
            else await api.post('/api/admin/items', payload)
            setShowModal(false); load()
        } finally { setSaving(false) }
    }
    const toggleVisibility = async (item: Item) => {
        await api.patch(`/api/admin/items/${item.id}/visibility`); load()
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div><h1 className="text-2xl font-bold text-espresso">Productos</h1><p className="text-primary-500 text-sm">{data.length} productos</p></div>
                <button onClick={openNew} className="btn-primary flex items-center gap-2"><Plus className="w-4 h-4" />Agregar producto</button>
            </div>
            <div className="relative max-w-xs">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary-400" />
                <input className="input pl-9" placeholder="Buscar productos…" value={q} onChange={e => setQ(e.target.value)} />
            </div>
            <div className="card p-0 overflow-hidden">
                {loading ? <div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-primary-700 border-t-transparent rounded-full animate-spin" /></div> : (
                    <div className="table-wrapper rounded-none border-0">
                        <table className="data-table">
                            <thead><tr><th>ID</th><th>Nombre</th><th>Precio</th><th>Costo</th><th>Stock</th><th>Categoría</th><th>Visible</th><th>Acciones</th></tr></thead>
                            <tbody>
                                {data.map(item => (
                                    <tr key={item.id}>
                                        <td className="font-mono text-primary-400">{item.id}</td>
                                        <td className="font-medium">{item.name}</td>
                                        <td>{FMT(item.price)}</td>
                                        <td className="text-primary-500">{FMT(item.cost)}</td>
                                        <td className={item.stock <= item.minStock ? 'text-red-600 font-bold' : 'font-medium'}>{item.stock}</td>
                                        <td className="text-primary-400">{item.category?.name ?? '—'}</td>
                                        <td><span className={item.visible ? 'badge-green' : 'badge-red'}>{item.visible ? 'Visible' : 'Oculto'}</span></td>
                                        <td className="space-x-1">
                                            <button onClick={() => openEdit(item)} className="btn-ghost p-1.5"><Edit className="w-3.5 h-3.5" /></button>
                                            <button onClick={() => toggleVisibility(item)} className="btn-ghost p-1.5">{item.visible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}</button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {showModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
                        <div className="flex items-center justify-between p-6 border-b border-muted">
                            <h2 className="text-lg font-bold text-espresso">{editing ? 'Editar' : 'Nuevo'} Producto</h2>
                            <button onClick={() => setShowModal(false)} className="btn-ghost p-1.5"><X className="w-5 h-5" /></button>
                        </div>
                        <form onSubmit={handleSave} className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="col-span-2">
                                    <label className="block text-sm font-medium text-primary-700 mb-1">Nombre *</label>
                                    <input className="input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
                                </div>
                                <div className="col-span-2">
                                    <label className="block text-sm font-medium text-primary-700 mb-1">Descripción</label>
                                    <textarea className="input" rows={2} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
                                </div>
                                {(['price', 'cost', 'stock', 'minStock'] as const).map(k => (
                                    <div key={k}>
                                        <label className="block text-sm font-medium text-primary-700 mb-1">{FIELD_LABELS[k]}</label>
                                        <input type="number" min="0" className="input" value={form[k]} onChange={e => setForm({ ...form, [k]: e.target.value })} required />
                                    </div>
                                ))}
                                <div>
                                    <label className="block text-sm font-medium text-primary-700 mb-1">Categoría</label>
                                    <select className="select" value={form.categoryId} onChange={e => setForm({ ...form, categoryId: e.target.value })}>
                                        <option value="">Sin categoría</option>
                                        {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-primary-700 mb-1">Proveedor</label>
                                    <select className="select" value={form.supplierId} onChange={e => setForm({ ...form, supplierId: e.target.value })}>
                                        <option value="">Sin proveedor</option>
                                        {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-primary-700 mb-1">URL de imagen</label>
                                    <input type="url" className="input" value={form.imageUrl} onChange={e => setForm({ ...form, imageUrl: e.target.value })} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-primary-700 mb-1">Código de barras</label>
                                    <input className="input" value={form.barcode} onChange={e => setForm({ ...form, barcode: e.target.value })} />
                                </div>
                                <div className="flex items-center gap-3 col-span-2">
                                    <input type="checkbox" id="visible" checked={form.visible} onChange={e => setForm({ ...form, visible: e.target.checked })} className="w-4 h-4 rounded accent-primary-700" />
                                    <label htmlFor="visible" className="text-sm font-medium text-primary-700">Visible en la tienda</label>
                                </div>
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary flex-1">Cancelar</button>
                                <button type="submit" className="btn-primary flex-1" disabled={saving}>{saving ? 'Guardando…' : 'Guardar producto'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}
