'use client'
import { useEffect, useState } from 'react'
import api from '@/lib/api'
import { Plus, X, Edit, ToggleLeft, ToggleRight } from 'lucide-react'

interface UserRow { id: number; username: string; email: string; role: string; active: boolean; createdAt: string }

export default function UsersSettingsPage() {
    const [data, setData] = useState<UserRow[]>([])
    const [loading, setLoading] = useState(true)
    const [showModal, setShowModal] = useState(false)
    const [editing, setEditing] = useState<UserRow | null>(null)
    const [form, setForm] = useState({ username: '', email: '', password: '', role: 'CUSTOMER' })
    const [saving, setSaving] = useState(false)

    const load = async () => { setLoading(true); const r = await api.get('/api/admin/users?size=100'); setData(r.data.content); setLoading(false) }
    useEffect(() => { load() }, [])

    const openNew = () => { setEditing(null); setForm({ username: '', email: '', password: '', role: 'CUSTOMER' }); setShowModal(true) }
    const openEdit = (u: UserRow) => { setEditing(u); setForm({ username: u.username, email: u.email, password: '', role: u.role }); setShowModal(true) }
    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault(); setSaving(true)
        try { if (editing) await api.put(`/api/admin/users/${editing.id}`, form); else await api.post('/api/admin/users', form); setShowModal(false); load() } finally { setSaving(false) }
    }
    const toggle = async (id: number) => { await api.patch(`/api/admin/users/${id}/toggle`); load() }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-espresso">Usuarios</h1>
                <button onClick={openNew} className="btn-primary flex items-center gap-2"><Plus className="w-4 h-4" />Agregar usuario</button>
            </div>
            <div className="card p-0 overflow-hidden">
                {loading ? <div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-primary-700 border-t-transparent rounded-full animate-spin" /></div> : (
                    <table className="data-table"><thead><tr><th>Usuario</th><th>Email</th><th>Rol</th><th>Activo</th><th></th></tr></thead>
                        <tbody>{data.map(u => (
                            <tr key={u.id}><td className="font-medium">{u.username}</td><td className="text-primary-500">{u.email}</td>
                                <td><span className={u.role === 'ADMIN' ? 'badge-blue' : 'badge-brown'}>{u.role}</span></td>
                                <td><button onClick={() => toggle(u.id)} className="text-primary-500 hover:text-primary-700">{u.active ? <ToggleRight className="w-5 h-5 text-emerald-600" /> : <ToggleLeft className="w-5 h-5 text-red-400" />}</button></td>
                                <td><button onClick={() => openEdit(u)} className="btn-ghost p-1.5"><Edit className="w-3.5 h-3.5" /></button></td></tr>
                        ))}</tbody></table>
                )}
            </div>
            {showModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl">
                        <div className="flex items-center justify-between p-6 border-b border-muted"><h2 className="text-lg font-bold text-espresso">{editing ? 'Editar' : 'Nuevo'} Usuario</h2><button onClick={() => setShowModal(false)} className="btn-ghost p-1.5"><X className="w-5 h-5" /></button></div>
                        <form onSubmit={handleSave} className="p-6 space-y-4">
                            <div><label className="block text-sm font-medium text-primary-700 mb-1">Usuario</label><input className="input" value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} required /></div>
                            <div><label className="block text-sm font-medium text-primary-700 mb-1">Email</label><input type="email" className="input" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required /></div>
                            <div><label className="block text-sm font-medium text-primary-700 mb-1">Contraseña {editing && '(dejar vacío para no cambiar)'}</label><input type="password" className="input" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} {...(!editing && { required: true })} /></div>
                            <div><label className="block text-sm font-medium text-primary-700 mb-1">Rol</label><select className="select" value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}><option value="CUSTOMER">Cliente</option><option value="ADMIN">Admin</option></select></div>
                            <div className="flex gap-3"><button type="button" onClick={() => setShowModal(false)} className="btn-secondary flex-1">Cancelar</button><button type="submit" className="btn-primary flex-1" disabled={saving}>{saving ? 'Guardando…' : 'Guardar'}</button></div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}
