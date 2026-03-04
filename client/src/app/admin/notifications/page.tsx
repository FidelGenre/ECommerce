'use client'
import { useEffect, useState } from 'react'
import api from '@/lib/api'
import { Notification } from '@/types'
import { Bell, CheckCheck, Info, AlertTriangle } from 'lucide-react'

export default function NotificationsPage() {
    const [data, setData] = useState<Notification[]>([])
    const [loading, setLoading] = useState(true)
    const [showAll, setShowAll] = useState(false)

    const load = async () => {
        setLoading(true)
        const r = showAll
            ? await api.get('/api/admin/notifications/all')
            : await api.get('/api/admin/notifications')
        setData(r.data); setLoading(false)
    }
    useEffect(() => { load() }, [showAll])

    const markRead = async (id: number) => {
        await api.patch(`/api/admin/notifications/${id}/read`); load()
    }
    const markAllRead = async () => {
        await api.patch('/api/admin/notifications/read-all'); load()
    }

    const typeIcon = (type: string) => {
        if (type === 'WARNING') return <AlertTriangle className="w-4 h-4 text-amber-500" />
        if (type === 'ALERT') return <AlertTriangle className="w-4 h-4 text-red-500" />
        return <Info className="w-4 h-4 text-blue-500" />
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-espresso">Notificaciones</h1>
                    <p className="text-primary-500 text-sm">{data.filter(n => !n.isRead).length} sin leer</p>
                </div>
                <div className="flex gap-3">
                    <button onClick={() => setShowAll(!showAll)} className="btn-secondary text-sm">
                        {showAll ? 'Ver no leídas' : 'Ver todas'}
                    </button>
                    <button onClick={markAllRead} className="btn-ghost flex items-center gap-2 text-sm">
                        <CheckCheck className="w-4 h-4" />Marcar todas como leídas
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-primary-700 border-t-transparent rounded-full animate-spin" /></div>
            ) : data.length === 0 ? (
                <div className="card flex flex-col items-center justify-center py-20">
                    <Bell className="w-12 h-12 text-primary-300 mb-4" />
                    <p className="font-semibold text-espresso">Sin notificaciones</p>
                    <p className="text-primary-400 text-sm mt-1">¡Estás al día!</p>
                </div>
            ) : (
                <div className="space-y-2">
                    {data.map(n => (
                        <div key={n.id} className={`card flex items-start gap-4 transition-opacity ${n.isRead ? 'opacity-60' : ''}`}>
                            <div className="mt-0.5">{typeIcon(n.type)}</div>
                            <div className="flex-1">
                                <p className="text-sm text-espresso">{n.message}</p>
                                <p className="text-xs text-primary-400 mt-1">{new Date(n.createdAt).toLocaleString()}</p>
                            </div>
                            {!n.isRead && (
                                <button onClick={() => markRead(n.id)} className="text-xs text-primary-500 hover:text-primary-700 whitespace-nowrap">
                                    Marcar leída
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
