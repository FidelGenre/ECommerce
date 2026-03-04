'use client'
import { useEffect, useState } from 'react'
import api from '@/lib/api'
import { Category } from '@/types'
import { Plus, X, Edit, Trash2 } from 'lucide-react'

export default function CategoriesPage() {
    const [data, setData] = useState<Category[]>([])
    const [loading, setLoading] = useState(true)
    const [showModal, setShowModal] = useState(false)
    const [editing, setEditing] = useState<Category | null>(null)
    const [form, setForm] = useState({ name: '', description: '', type: 'PRODUCT' })
    const [saving, setSaving] = useState(false)

    const load = async () => { setLoading(true); const r = await api.get('/api/admin/categories'); setData(r.data); setLoading(false) }
    useEffect(() => { load() }, [])

    const openNew = () => { setEditing(null); setForm({ name: '', description: '', type: 'PRODUCT' }); setShowModal(true) }
    const openEdit = (c: Category) => { setEditing(c); setForm({ name: c.name, description: c.description ?? '', type: c.type }); setShowModal(true) }
    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault(); setSaving(true)
        try {
            if (editing) await api.put(`/api/admin/categories/${editing.id}`, form)
            else await api.post('/api/admin/categories', form)
            setShowModal(false); load()
        } finally { setSaving(false) }
    }
    const handleDelete = async (id: number) => { if (!confirm('¿Eliminar categoría?')) return; await api.delete(`/api/admin/categories/${id}`); load() }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-espresso">Categorías</h1>
                <button onClick={openNew} className="btn-primary flex items-center gap-2"><Plus className="w-4 h-4" />Agregar</button>
            </div>
            <div className="card p-0 overflow-hidden">
                {loading ? <div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-primary-700 border-t-transparent rounded-full animate-spin" /></div> : (
                    <table className="data-table"><thead><tr><th>Nombre</th><th>Tipo</th><th>Descripción</th><th></th></tr></thead>
                        <tbody>{data.map(c => (
                            <tr key={c.id}><td className="font-medium">{c.name}</td><td><span className="badge-brown">{c.type}</span></td><td className="text-primary-500">{c.description ?? '—'}</td>
                                <td className="space-x-1"><button onClick={() => openEdit(c)} className="btn-ghost p-1.5"><Edit className="w-3.5 h-3.5" /></button><button onClick={() => handleDelete(c.id)} className="text-red-500 hover:text-red-700 p-1.5"><Trash2 className="w-3.5 h-3.5" /></button></td></tr>
                        ))}</tbody></table>
                )}
            </div>
            {showModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl">
                        <div className="flex items-center justify-between p-6 border-b border-muted"><h2 className="text-lg font-bold text-espresso">{editing ? 'Editar' : 'Nueva'} Categoría</h2><button onClick={() => setShowModal(false)} className="btn-ghost p-1.5"><X className="w-5 h-5" /></button></div>
                        <form onSubmit={handleSave} className="p-6 space-y-4">
                            <div><label className="block text-sm font-medium text-primary-700 mb-1">Nombre</label><input className="input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required /></div>
                            <div><label className="block text-sm font-medium text-primary-700 mb-1">Tipo</label><select className="select" value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}><option value="PRODUCT">Producto</option><option value="SUPPLIER">Proveedor</option></select></div>
                            <div><label className="block text-sm font-medium text-primary-700 mb-1">Descripción</label><input className="input" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
                            <div className="flex gap-3"><button type="button" onClick={() => setShowModal(false)} className="btn-secondary flex-1">Cancelar</button><button type="submit" className="btn-primary flex-1" disabled={saving}>{saving ? 'Guardando…' : 'Guardar'}</button></div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}
