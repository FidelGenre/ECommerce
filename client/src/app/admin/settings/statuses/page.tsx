'use client'
import { useEffect, useState } from 'react'
import api from '@/lib/api'
import { OperationStatus } from '@/types'
import { Plus, X, Edit, Trash2 } from 'lucide-react'

export default function StatusesSettingsPage() {
    const [data, setData] = useState<OperationStatus[]>([])
    const [loading, setLoading] = useState(true)
    const [showModal, setShowModal] = useState(false)
    const [editing, setEditing] = useState<OperationStatus | null>(null)
    const [form, setForm] = useState({ name: '', type: 'SALE' })
    const [saving, setSaving] = useState(false)

    // Selection
    const [selected, setSelected] = useState<Set<number>>(new Set())
    const [deleting, setDeleting] = useState(false)

    const toggleSelect = (id: number) => setSelected(prev => {
        const next = new Set(prev)
        next.has(id) ? next.delete(id) : next.add(id)
        return next
    })
    const toggleAll = () => setSelected(prev => prev.size === data.length ? new Set() : new Set(data.map(s => s.id)))

    const load = async () => {
        setLoading(true)
        const r = await api.get('/api/admin/settings/statuses')
        // Sort by type (SALE first, then PURCHASE) and then by name
        const sorted = (r.data as OperationStatus[]).sort((a, b) => {
            if (a.type !== b.type) return a.type === 'SALE' ? -1 : 1
            return a.name.localeCompare(b.name)
        })
        setData(sorted)
        setLoading(false)
    }
    useEffect(() => { load() }, [])

    const openNew = () => { setEditing(null); setForm({ name: '', type: 'SALE' }); setShowModal(true) }
    const openEdit = (s: OperationStatus) => { setEditing(s); setForm({ name: s.name, type: s.type }); setShowModal(true) }
    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault(); setSaving(true)
        try {
            if (editing) await api.put(`/api/admin/settings/statuses/${editing.id}`, { ...form, color: '#6B3F1F' })
            else await api.post('/api/admin/settings/statuses', { ...form, color: '#6B3F1F' })
            setShowModal(false); load()
        } finally { setSaving(false) }
    }
    const handleDelete = async (ids: number[]) => {
        if (!confirm(`¿Eliminar ${ids.length === 1 ? 'este estado' : `estos ${ids.length} estados`}?`)) return
        setDeleting(true)
        const errors: string[] = []
        for (const id of ids) {
            try { await api.delete(`/api/admin/settings/statuses/${id}`) }
            catch (e: any) {
                const name = data.find(s => s.id === id)?.name ?? id
                errors.push(`${name}: ${e.response?.data ?? 'Error'}`)
            }
        }
        setDeleting(false)
        setSelected(new Set())
        if (errors.length) alert(errors.join('\n'))
        load()
    }

    const salesStatuses = data.filter(s => s.type === 'SALE')
    const purchaseStatuses = data.filter(s => s.type === 'PURCHASE')

    const StatusTable = ({ title, statuses, isSale }: { title: string; statuses: OperationStatus[]; isSale: boolean }) => {
        const [usageCount, setUsageCount] = useState<{ [key: number]: number }>({})

        useEffect(() => {
            statuses.forEach(async (s) => {
                try {
                    const r = await api.get(`/api/admin/settings/statuses/${s.id}/usage`)
                    setUsageCount(prev => ({ ...prev, [s.id]: (r.data.ids || []).length }))
                } catch (e) {
                    console.error("Error fetching usage for status", s.id, e)
                }
            })
        }, [statuses])

        return (
            <div className="space-y-4">
                <h2 className="text-lg font-bold text-espresso flex items-center gap-2 px-1">
                    <div className={`w-2 h-2 rounded-full ${isSale ? 'bg-emerald-500' : 'bg-blue-500'}`} />
                    {title}
                </h2>
                <div className="card p-0 overflow-hidden shadow-sm border border-muted">
                    <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th className="pl-6">Nombre del Estado</th>
                                    <th>Uso total</th>
                                    <th>Tipo</th>
                                    <th className="text-right pr-6">Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {statuses.map((s) => (
                                    <tr key={s.id}>
                                        <td className="pl-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <div className={`w-2.5 h-2.5 rounded-full`} style={{ backgroundColor: s.color || (isSale ? '#10b981' : '#3b82f6') }} />
                                                <span className="font-bold text-espresso">{s.name}</span>
                                            </div>
                                        </td>
                                        <td>
                                            <span className="text-xs font-mono bg-primary-50 text-primary-600 px-2 py-1 rounded border border-primary-100">
                                                {usageCount[s.id] || 0} operaciones
                                            </span>
                                        </td>
                                        <td>
                                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${s.type === 'SALE' ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-blue-600'}`}>
                                                {s.type === 'SALE' ? 'Ingreso' : 'Egreso'}
                                            </span>
                                        </td>
                                        <td className="pr-6">
                                            <div className="flex justify-end gap-1">
                                                <button onClick={() => openEdit(s)} title="Editar nombre de etiqueta" className="btn-ghost p-1.5 hover:bg-primary-50 hover:text-primary-700 text-primary-400 transition-colors">
                                                    <Edit className="w-4 h-4" />
                                                </button>
                                                {(usageCount[s.id] || 0) === 0 && (
                                                    <button onClick={() => handleDelete([s.id])} title="Eliminar etiqueta" className="btn-ghost p-1.5 hover:bg-red-50 hover:text-red-500 text-primary-400 transition-colors">
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {statuses.length === 0 && (
                                    <tr>
                                        <td colSpan={4} className="text-center py-12 text-primary-400">No hay estados configurados</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-10">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-espresso">Estados de Operación</h1>
                    <p className="text-sm text-primary-400 font-medium">Configuración de etiquetas para el seguimiento de transacciones.</p>
                </div>
                <button onClick={openNew} className="btn-primary flex items-center gap-2 py-2 px-4 shadow-sm active:scale-95 transition-transform">
                    <Plus className="w-4 h-4" /> Nueva etiqueta
                </button>
            </div>

            {loading ? (
                <div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-primary-700 border-t-transparent rounded-full animate-spin" /></div>
            ) : (
                <>
                    <StatusTable title="Ventas (Ingresos)" statuses={salesStatuses} isSale={true} />
                    <StatusTable title="Compras (Egresos)" statuses={purchaseStatuses} isSale={false} />
                </>
            )}

            {showModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl">
                        <div className="flex items-center justify-between p-6 border-b border-muted">
                            <div invention-id="modal-header">
                                <h2 className="text-lg font-bold text-espresso">Editar Estado de Venta</h2>
                                <p className="font-mono text-[10px] text-primary-400 font-bold uppercase mt-0.5">ID: #{editing?.id}</p>
                            </div>
                            <button onClick={() => setShowModal(false)} className="btn-ghost p-1.5 rounded-full hover:bg-red-50 hover:text-red-500 transition-colors"><X className="w-5 h-5" /></button>
                        </div>
                        <form onSubmit={handleSave} className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-primary-700 uppercase tracking-wider mb-1.5">Nuevo Nombre</label>
                                <select
                                    className="input focus:ring-primary-700 w-full"
                                    value={form.name}
                                    onChange={e => setForm({ ...form, name: e.target.value })}
                                    required
                                >
                                    <option value="Pendiente">Pendiente</option>
                                    <option value="Completado">Completado</option>
                                    <option value="Cancelado">Cancelado</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-primary-700 uppercase tracking-wider mb-1.5">Tipo (No editable)</label>
                                <div className="bg-primary-50 text-primary-700 px-3 py-2 rounded-lg text-sm font-semibold border border-primary-100 flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                    Venta (Ingreso)
                                </div>
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary flex-1">Cancelar</button>
                                <button type="submit" className="btn-primary flex-1 shadow-md active:scale-95 transition-transform" disabled={saving}>
                                    {saving ? 'Guardando…' : 'Guardar Cambios'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}
