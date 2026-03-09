'use client'
import { useEffect, useState } from 'react'
import api from '@/lib/api'
import { Plus, X, Edit2, Trash2, Tag } from 'lucide-react'

type SupplierCategory = { id: number; name: string; description?: string; type: string }

export default function SupplierCategoriesPage() {
    const [cats, setCats] = useState<SupplierCategory[]>([])
    const [form, setForm] = useState<Partial<SupplierCategory>>({ type: 'SUPPLIER' })
    const [editing, setEditing] = useState<number | null>(null)
    const [open, setOpen] = useState(false)
    const [saving, setSaving] = useState(false)
    const [msg, setMsg] = useState<string | null>(null)
    const [search, setSearch] = useState('')

    // Selection
    const [selected, setSelected] = useState<Set<number>>(new Set())
    const [deleting, setDeleting] = useState(false)

    const toggleSelect = (id: number) => setSelected(prev => {
        const next = new Set(prev)
        next.has(id) ? next.delete(id) : next.add(id)
        return next
    })
    const toggleAll = () => setSelected(prev => prev.size === filteredCats.length ? new Set() : new Set(filteredCats.map(c => c.id)))

    const load = async () => {
        const r = await api.get('/api/admin/categories?type=SUPPLIER')
        setCats(r.data)
    }

    useEffect(() => { load() }, [])

    const openNew = () => { setForm({ type: 'SUPPLIER', name: '', description: '' }); setEditing(null); setOpen(true); setMsg(null) }
    const openEdit = (c: SupplierCategory) => { setForm({ ...c }); setEditing(c.id); setOpen(true); setMsg(null) }
    const close = () => { setOpen(false); setMsg(null) }

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!form.name?.trim()) { setMsg('El nombre es requerido'); return }
        setSaving(true)
        try {
            if (editing) await api.put(`/api/admin/categories/${editing}`, { ...form, type: 'SUPPLIER' })
            else await api.post('/api/admin/categories', { ...form, type: 'SUPPLIER' })
            await load(); close()
        } catch { setMsg('No se pudo guardar.') } finally { setSaving(false) }
    }

    const handleDelete = async (ids: number[]) => {
        if (!confirm(`¿Eliminar ${ids.length === 1 ? 'esta categoría' : `estas ${ids.length} categorías`} de proveedor?`)) return
        setDeleting(true)
        const errors: string[] = []
        for (const id of ids) {
            try { await api.delete(`/api/admin/categories/${id}`) }
            catch (e: any) {
                const name = cats.find(c => c.id === id)?.name ?? id
                errors.push(`${name}: ${e.response?.data ?? 'Error'}`)
            }
        }
        setDeleting(false)
        setSelected(new Set())
        if (errors.length) alert(errors.join('\n'))
        load()
    }

    const filteredCats = cats.filter(c =>
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        (c.description || '').toLowerCase().includes(search.toLowerCase())
    )

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-espresso">Categorías de Proveedores</h1>
                <div className="flex items-center gap-2">
                    {selected.size > 0 && (
                        <button onClick={() => handleDelete([...selected])} disabled={deleting}
                            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-100 text-red-700 hover:bg-red-200 text-sm font-medium transition-colors disabled:opacity-50">
                            <Trash2 className="w-4 h-4" />{deleting ? 'Eliminando…' : `Eliminar ${selected.size} seleccionados`}
                        </button>
                    )}
                    <button onClick={openNew} className="btn-primary flex items-center gap-2">
                        <Plus className="w-4 h-4" /> Nueva Categoría
                    </button>
                </div>
            </div>

            {/* Filters */}
            <div className="card py-3 px-4 border border-muted bg-warm-50/50 shadow-sm">
                <div className="relative max-w-sm">
                    <input
                        className="input pl-9 text-sm py-2"
                        placeholder="Buscar por nombre o descripción..."
                        value={search} onChange={e => setSearch(e.target.value)}
                    />
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-primary-400">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                    </div>
                </div>
            </div>

            <div className="card">
                {cats.length === 0 ? (
                    <div className="text-center py-12 text-primary-400">
                        <Tag className="w-10 h-10 mx-auto mb-2 opacity-40" />
                        <p>No hay categorías de proveedores.</p>
                    </div>
                ) : (
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-muted text-left text-primary-500">
                                <th className="pb-3 w-8 pl-4"><input type="checkbox" checked={selected.size === filteredCats.length && filteredCats.length > 0} onChange={toggleAll} className="w-4 h-4 rounded accent-primary-700" /></th>
                                <th className="pb-3 font-semibold">Nombre</th>
                                <th className="pb-3 font-semibold">Descripción</th>
                                <th className="pb-3 font-semibold w-24">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-muted">
                            {filteredCats.map(c => (
                                <tr key={c.id} className={`hover:bg-warm-50 ${selected.has(c.id) ? 'bg-red-50' : ''}`}>
                                    <td className="py-3 pl-4"><input type="checkbox" checked={selected.has(c.id)} onChange={() => toggleSelect(c.id)} className="w-4 h-4 rounded accent-primary-700" /></td>
                                    <td className="py-3 font-medium text-espresso">{c.name}</td>
                                    <td className="py-3 text-primary-500">{c.description || '—'}</td>
                                    <td className="py-3">
                                        <div className="flex items-center gap-2">
                                            <button onClick={() => openEdit(c)} className="w-8 h-8 rounded-lg bg-primary-100 hover:bg-primary-200 flex items-center justify-center text-primary-700 transition-colors">
                                                <Edit2 className="w-3.5 h-3.5" />
                                            </button>
                                            <button onClick={() => handleDelete([c.id])} className="w-8 h-8 rounded-lg bg-red-50 hover:bg-red-100 flex items-center justify-center text-red-500 transition-colors">
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Modal */}
            {open && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
                        <div className="flex items-center justify-between mb-5">
                            <h2 className="text-lg font-bold text-espresso">{editing ? 'Editar' : 'Nueva'} Categoría de Proveedor</h2>
                            <button onClick={close} className="w-8 h-8 bg-primary-100 hover:bg-primary-200 rounded-full flex items-center justify-center">
                                <X className="w-4 h-4 text-primary-600" />
                            </button>
                        </div>
                        <form onSubmit={handleSave} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-primary-700 mb-1">Nombre *</label>
                                <input className="input" value={form.name ?? ''} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-primary-700 mb-1">Descripción</label>
                                <textarea className="input min-h-[80px]" value={form.description ?? ''} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
                            </div>
                            {msg && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{msg}</p>}
                            <div className="flex gap-3 pt-1">
                                <button type="submit" disabled={saving} className="btn-primary flex-1">{saving ? 'Guardando…' : 'Guardar'}</button>
                                <button type="button" onClick={close} className="btn-secondary px-5">Cancelar</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}
