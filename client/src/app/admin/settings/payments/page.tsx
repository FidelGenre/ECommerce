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

    const load = async () => { setLoading(true); const r = await api.get('/api/admin/settings/payment-methods'); setData(r.data); setLoading(false) }
    useEffect(() => { load() }, [])

    const openNew = () => { setEditing(null); setForm({ name: '', description: '' }); setShowModal(true) }
    const openEdit = (p: PaymentMethod) => { setEditing(p); setForm({ name: p.name, description: p.description ?? '' }); setShowModal(true) }
    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault(); setSaving(true)
        try { if (editing) await api.put(`/api/admin/settings/payment-methods/${editing.id}`, form); else await api.post('/api/admin/settings/payment-methods', form); setShowModal(false); load() } finally { setSaving(false) }
    }
    const handleDelete = async (id: number) => { if (!confirm('¿Eliminar forma de pago?')) return; await api.delete(`/api/admin/settings/payment-methods/${id}`); load() }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-espresso">Formas de Pago</h1>
                <button onClick={openNew} className="btn-primary flex items-center gap-2"><Plus className="w-4 h-4" />Agregar</button>
            </div>
            <div className="card p-0 overflow-hidden">
                {loading ? <div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-primary-700 border-t-transparent rounded-full animate-spin" /></div> : (
                    <table className="data-table"><thead><tr><th>Nombre</th><th>Descripción</th><th>Creador</th><th></th></tr></thead>
                        <tbody>{data.map(p => (
                            <tr key={p.id}><td className="font-medium">{p.name}</td><td className="text-primary-500">{p.description ?? '—'}</td>
                                <td>{p.createdBy ? <span className="text-primary-600 font-medium">{p.createdBy.username ?? p.createdBy.email}</span> : <span className="text-primary-300">Sistema</span>}</td>
                                <td className="space-x-1"><button onClick={() => openEdit(p)} className="btn-ghost p-1.5"><Edit className="w-3.5 h-3.5" /></button><button onClick={() => handleDelete(p.id)} className="text-red-500 hover:text-red-700 p-1.5"><Trash2 className="w-3.5 h-3.5" /></button></td></tr>
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
