'use client'
import { useEffect, useState } from 'react'
import api from '@/lib/api'
import { PaymentMethod } from '@/types'
import { Plus, X, Edit, Trash2 } from 'lucide-react'

export default function PaymentsSettingsPage() {
    const [data, setData] = useState<PaymentMethod[]>([])
    const [loading, setLoading] = useState(true)
    const [showModal, setShowModal] = useState(false)
    const [editing, setEditing] = useState<PaymentMethod | null>(null)
    const [form, setForm] = useState({ name: '', description: '' })
    const [saving, setSaving] = useState(false)

    // Selection
    const [selected, setSelected] = useState<Set<number>>(new Set())
    const [deleting, setDeleting] = useState(false)

    const toggleSelect = (id: number) => setSelected(prev => {
        const next = new Set(prev)
        next.has(id) ? next.delete(id) : next.add(id)
        return next
    })
    const toggleAll = () => setSelected(prev => prev.size === data.length ? new Set() : new Set(data.map(p => p.id)))

    const load = async () => { setLoading(true); const r = await api.get('/api/admin/settings/payment-methods'); setData(r.data); setLoading(false) }
    useEffect(() => { load() }, [])

    const openNew = () => { setEditing(null); setForm({ name: '', description: '' }); setShowModal(true) }
    const openEdit = (p: PaymentMethod) => { setEditing(p); setForm({ name: p.name, description: p.description ?? '' }); setShowModal(true) }
    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault(); setSaving(true)
        try { if (editing) await api.put(`/api/admin/settings/payment-methods/${editing.id}`, form); else await api.post('/api/admin/settings/payment-methods', form); setShowModal(false); load() } finally { setSaving(false) }
    }
    const handleDelete = async (ids: number[]) => {
        if (!confirm(`¿Eliminar ${ids.length === 1 ? 'esta forma' : `estas ${ids.length} formas`} de pago?`)) return
        setDeleting(true)
        const errors: string[] = []
        for (const id of ids) {
            try { await api.delete(`/api/admin/settings/payment-methods/${id}`) }
            catch (e: any) {
                const name = data.find(p => p.id === id)?.name ?? id
                errors.push(`${name}: ${e.response?.data ?? 'Error'}`)
            }
        }
        setDeleting(false)
        setSelected(new Set())
        if (errors.length) alert(errors.join('\n'))
        load()
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-espresso">Formas de Pago</h1>
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
            <div className="card p-0 overflow-hidden">
                {loading ? <div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-primary-700 border-t-transparent rounded-full animate-spin" /></div> : (
                    <table className="data-table"><thead><tr><th className="w-8 pl-4"><input type="checkbox" checked={selected.size === data.length && data.length > 0} onChange={toggleAll} className="w-4 h-4 rounded accent-primary-700" /></th><th>Nombre</th><th>Descripción</th><th>Creador</th><th></th></tr></thead>
                        <tbody>{data.map(p => (
                            <tr key={p.id} className={selected.has(p.id) ? 'bg-red-50' : ''}>
                                <td className="pl-4"><input type="checkbox" checked={selected.has(p.id)} onChange={() => toggleSelect(p.id)} className="w-4 h-4 rounded accent-primary-700" /></td>
                                <td className="font-medium">{p.name}</td><td className="text-primary-500">{p.description ?? '—'}</td>
                                <td>{p.createdBy ? <span className="text-primary-600 font-medium">{p.createdBy.username ?? p.createdBy.email}</span> : <span className="text-primary-300">Sistema</span>}</td>
                                <td className="space-x-1"><button onClick={() => openEdit(p)} className="btn-ghost p-1.5"><Edit className="w-3.5 h-3.5" /></button><button onClick={() => handleDelete([p.id])} className="text-red-500 hover:text-red-700 p-1.5"><Trash2 className="w-3.5 h-3.5" /></button></td></tr>
                        ))}</tbody></table>
                )}
            </div>
            {showModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl">
                        <div className="flex items-center justify-between p-6 border-b border-muted"><h2 className="text-lg font-bold text-espresso">{editing ? 'Editar' : 'Nueva'} Forma de Pago</h2><button onClick={() => setShowModal(false)} className="btn-ghost p-1.5"><X className="w-5 h-5" /></button></div>
                        <form onSubmit={handleSave} className="p-6 space-y-4">
                            <div><label className="block text-sm font-medium text-primary-700 mb-1">Nombre</label><input className="input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required /></div>
                            <div><label className="block text-sm font-medium text-primary-700 mb-1">Descripción</label><input className="input" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
                            <div className="flex gap-3"><button type="button" onClick={() => setShowModal(false)} className="btn-secondary flex-1">Cancelar</button><button type="submit" className="btn-primary flex-1" disabled={saving}>{saving ? 'Guardando…' : 'Guardar'}</button></div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}
