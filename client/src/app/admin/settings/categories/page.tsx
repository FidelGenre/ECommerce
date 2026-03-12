'use client'
import { useEffect, useState, useMemo } from 'react'
import api from '@/lib/api'
import { Category } from '@/types'
import { Plus, X, Edit, Trash2, Search, Filter } from 'lucide-react'

export default function CategoriesPage() {
    const [data, setData] = useState<Category[]>([])
    const [loading, setLoading] = useState(true)
    const [showModal, setShowModal] = useState(false)
    const [editing, setEditing] = useState<Category | null>(null)
    const [form, setForm] = useState({ name: '', description: '', type: 'PRODUCT' })
    const [saving, setSaving] = useState(false)

    // Selection
    const [selected, setSelected] = useState<Set<number>>(new Set())
    const [deleting, setDeleting] = useState(false)

    const toggleSelect = (id: number) => setSelected(prev => {
        const next = new Set(prev)
        next.has(id) ? next.delete(id) : next.add(id)
        return next
    })
    const toggleAll = () => setSelected(prev => prev.size === filteredData.length ? new Set() : new Set(filteredData.map(c => c.id)))

    const [search, setSearch] = useState('')

    const load = async () => { setLoading(true); const r = await api.get('/api/admin/categories?type=PRODUCT'); setData(r.data); setLoading(false) }
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
    const handleDelete = async (ids: number[]) => {
        if (!confirm(`¿Eliminar ${ids.length === 1 ? 'esta categoría' : `estas ${ids.length} categorías`}?`)) return
        setDeleting(true)
        const errors: string[] = []
        for (const id of ids) {
            try { await api.delete(`/api/admin/categories/${id}`) }
            catch (e: any) {
                const name = data.find(c => c.id === id)?.name ?? id
                errors.push(`${name}: ${e.response?.data ?? 'Error'}`)
            }
        }
        setDeleting(false)
        setSelected(new Set())
        if (errors.length) alert(errors.join('\n'))
        load()
    }

    const filteredData = useMemo(() => {
        return data.filter(c => {
            const matchesSearch = c.name.toLowerCase().includes(search.toLowerCase()) || (c.description || '').toLowerCase().includes(search.toLowerCase());
            return matchesSearch;
        });
    }, [data, search])

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-espresso">Categorías de Productos</h1>
                <div className="flex items-center gap-2">
                    {selected.size > 0 && (
                        <button onClick={() => handleDelete([...selected])} disabled={deleting}
                            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-100 text-red-700 hover:bg-red-200 text-sm font-medium transition-colors disabled:opacity-50">
                            <Trash2 className="w-4 h-4" />{deleting ? 'Eliminando…' : `Eliminar ${selected.size} seleccionados`}
                        </button>
                    )}
                    <button onClick={openNew} className="btn-primary flex items-center gap-2"><Plus className="w-4 h-4" />Agregar</button>
                </div>
            </div>

            {/* Filters */}
            <div className="card py-3 px-4 flex flex-wrap items-center gap-4 border border-muted bg-warm-50/50 shadow-sm">
                <div className="relative flex-1 min-w-[200px]">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-primary-400" />
                    <input
                        className="input pl-9 text-sm py-2"
                        placeholder="Buscar por nombre o descripción..."
                        value={search} onChange={e => setSearch(e.target.value)}
                    />
                </div>
            </div>

            <div className="card p-0 overflow-hidden shadow-sm border border-muted">
                {loading ? <div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-primary-700 border-t-transparent rounded-full animate-spin" /></div> : (
                    <table className="data-table"><thead><tr><th className="w-8 pl-4"><input type="checkbox" checked={selected.size === filteredData.length && filteredData.length > 0} onChange={toggleAll} className="w-4 h-4 rounded accent-primary-700" /></th><th>Nombre</th><th>Descripción</th><th></th></tr></thead>
                        <tbody>{filteredData.map(c => (
                            <tr key={c.id} className={selected.has(c.id) ? 'bg-red-50' : ''}>
                                <td className="pl-4"><input type="checkbox" checked={selected.has(c.id)} onChange={() => toggleSelect(c.id)} className="w-4 h-4 rounded accent-primary-700" /></td>
                                <td className="font-medium text-espresso">{c.name}</td><td className="text-primary-500">{c.description ?? '—'}</td>
                                <td>
                                    <div className="flex justify-end gap-1">
                                        <button onClick={() => openEdit(c)} className="btn-ghost p-1.5 hover:text-primary-700 hover:bg-primary-50 text-primary-400"><Edit className="w-4 h-4" /></button>
                                        <button onClick={() => handleDelete([c.id])} className="text-primary-400 hover:bg-red-50 hover:text-red-500 p-1.5 rounded-lg transition-colors"><Trash2 className="w-4 h-4" /></button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                            {filteredData.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="text-center py-8 text-primary-400 text-sm">No se encontraron categorías matching the search.</td>
                                </tr>
                            )}
                        </tbody></table>
                )}
            </div>
            {showModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl">
                        <div className="flex items-center justify-between p-5 border-b border-muted">
                            <h2 className="text-lg font-bold text-espresso">{editing ? 'Editar' : 'Nueva'} Categoría</h2>
                            <button onClick={() => setShowModal(false)} className="btn-ghost p-1.5 hover:bg-red-50 hover:text-red-500"><X className="w-5 h-5" /></button>
                        </div>
                        <form onSubmit={handleSave} className="p-5 space-y-4">
                            <div><label className="block text-xs font-semibold text-primary-700 mb-1">Nombre</label><input className="input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required /></div>
                            <div><label className="block text-xs font-semibold text-primary-700 mb-1">Descripción</label><input className="input" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
                            <div className="flex gap-2 pt-2"><button type="button" onClick={() => setShowModal(false)} className="btn-secondary flex-1 py-2 text-sm">Cancelar</button><button type="submit" className="btn-primary flex-1 py-2 text-sm" disabled={saving}>{saving ? 'Guardando…' : 'Guardar'}</button></div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}
