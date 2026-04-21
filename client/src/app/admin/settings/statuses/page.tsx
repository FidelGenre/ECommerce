'use client'
import { useEffect, useState } from 'react'
import api from '@/lib/api'
import { OperationStatus } from '@/types'
import { X, Trash2, Search } from 'lucide-react'
import { SavedFilters } from '@/components/SavedFilters'

export default function StatusesSettingsPage() {
    const [data, setData] = useState<OperationStatus[]>([])
    const [loading, setLoading] = useState(true)


    // Filters
    const [fromDate, setFromDate] = useState('')
    const [toDate, setToDate] = useState('')
    const [searchQ, setSearchQ] = useState('')

    const hasFilters = !!fromDate || !!toDate || !!searchQ
    const currentFilters = { fromDate, toDate, searchQ }
    const handleLoadFilters = (f: Record<string, any>) => {
        setFromDate(f.fromDate || '')
        setToDate(f.toDate || '')
        setSearchQ(f.searchQ || '')
    }

    const resetFilters = () => {
        setFromDate('')
        setToDate('')
        setSearchQ('')
    }

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

    const SALE_STATUS_HIDDEN = ['Reservado', 'Reserved']
    const filteredSalesStatuses = data.filter(s => s.type === 'SALE' && !SALE_STATUS_HIDDEN.includes(s.name))
    const purchaseStatuses = data.filter(s => s.type === 'PURCHASE')

    const StatusTable = ({ title, statuses, isSale, fromDate, toDate, searchQ }: { title: string; statuses: OperationStatus[]; isSale: boolean; fromDate: string; toDate: string; searchQ: string }) => {
        const [usage, setUsage] = useState<{ [key: number]: number[] }>({})

        useEffect(() => {
            statuses.forEach(async (s) => {
                try {
                    const params = new URLSearchParams()
                    if (fromDate) params.set('from', fromDate + 'T00:00:00')
                    if (toDate) params.set('to', toDate + 'T23:59:59')
                    if (searchQ) params.set('search', searchQ)
                    
                    let url = `/api/admin/settings/statuses/${s.id}/usage`
                    if (params.toString()) url += '?' + params.toString()
                    
                    const r = await api.get(url)
                    setUsage(prev => ({ ...prev, [s.id]: r.data.ids || [] }))
                } catch (e) {
                    console.error("Error fetching usage for status", s.id, e)
                }
            })
        }, [statuses, fromDate, toDate, searchQ])

        // Normalize name: map English → Spanish
        const NORMALIZE: Record<string, string> = {
            completed: 'Completado', completado: 'Completado',
            pending: 'Pendiente', pendiente: 'Pendiente',
            cancelled: 'Cancelado', cancelado: 'Cancelado',
            approved: 'Aprobado', aprobado: 'Aprobado',
        }
        const normName = (s: OperationStatus) => NORMALIZE[s.name.toLowerCase()] ?? s.name

        // Merge statuses with same normalized name → combine all IDs
        const mergedStatuses: { status: OperationStatus; allIds: number[] }[] = []
        statuses.forEach(s => {
            const key = normName(s)
            const existing = mergedStatuses.find(m => normName(m.status) === key)
            const ids = usage[s.id] || []
            if (existing) {
                existing.allIds = [...new Set([...existing.allIds, ...ids])]
            } else {
                mergedStatuses.push({ status: s, allIds: [...ids] })
            }
        })

        return (
            <div className="space-y-4">
                <h2 className="text-lg font-bold text-espresso flex items-center gap-2 px-1">
                    <div className={`w-2 h-2 rounded-full ${isSale ? 'bg-emerald-500' : 'bg-blue-500'}`} />
                    {title}
                </h2>

                {mergedStatuses.map(({ status: s, allIds }) => {
                    const sortedIds = [...allIds].sort((a, b) => b - a)
                    return (
                        <div key={s.id} className="card p-0 overflow-hidden shadow-sm border border-muted">
                            {/* Status header */}
                            <div className="flex items-center justify-between px-5 py-3 bg-primary-50 border-b border-muted">
                                <div className="flex items-center gap-2">
                                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: s.color || (isSale ? '#10b981' : '#3b82f6') }} />
                                    <span className="font-bold text-espresso">{normName(s)}</span>
                                    <span className="text-[10px] font-bold text-primary-400 bg-white px-2 py-0.5 rounded border border-primary-100">
                                        {sortedIds.length} ops.
                                    </span>
                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${s.type === 'SALE' ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-blue-600'}`}>
                                        {s.type === 'SALE' ? 'Ingreso' : 'Egreso'}
                                    </span>
                                </div>
                                <div className="flex gap-1">
                                    {sortedIds.length === 0 && (
                                        <button onClick={() => handleDelete([s.id])} title="Eliminar etiqueta" className="btn-ghost p-1.5 hover:bg-red-50 hover:text-red-500 text-primary-400 transition-colors">
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Operations list */}
                            {sortedIds.length === 0 ? (
                                <div className="px-5 py-3 text-[11px] text-primary-300 italic">Sin operaciones vinculadas</div>
                            ) : (
                                <div className="divide-y divide-muted max-h-48 overflow-y-auto custom-scrollbar">
                                    {sortedIds.map(id => (
                                        <div key={id} className="flex items-center gap-2 px-5 py-2.5">
                                            <span className="font-mono text-xs bg-espresso text-white px-2 py-0.5 rounded font-bold">#{id}</span>
                                            <span className="text-[10px] font-bold text-primary-400 uppercase tracking-tighter">
                                                ID {isSale ? 'VENTA' : 'COMPRA'}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )
                })}

                {statuses.length === 0 && (
                    <div className="card p-8 text-center text-primary-400 text-sm">No hay estados configurados</div>
                )}
            </div>
        )
    }

    return (
        <div className="space-y-10">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-espresso">Estados de Operación</h1>
                    <p className="text-sm text-primary-400 font-medium">Vista de etiquetas para el seguimiento de transacciones.</p>
                </div>
            </div>
            
            {/* Filter bar */}
            <div className="card p-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary-400" />
                        <input className="input pl-9 w-full text-sm" placeholder="Buscar por ID, cliente, proveedor o producto..." value={searchQ} onChange={e => { setSearchQ(e.target.value) }} />
                    </div>
                    <div>
                        <div className="relative flex items-center gap-2">
                           <span className="text-sm text-primary-500 font-medium whitespace-nowrap">Desde:</span>
                           <input type="date" className="input text-sm w-full" value={fromDate} onChange={e => { setFromDate(e.target.value) }} />
                        </div>
                    </div>
                    <div>
                        <div className="relative flex items-center gap-2">
                           <span className="text-sm text-primary-500 font-medium whitespace-nowrap">Hasta:</span>
                           <input type="date" className="input text-sm w-full" value={toDate} onChange={e => { setToDate(e.target.value) }} />
                        </div>
                    </div>
                </div>
                <div className="flex items-center justify-between mt-3">
                    <SavedFilters storageKey="status_usage_filters" currentFilters={currentFilters} onLoadFilters={handleLoadFilters} />
                    {hasFilters && (
                        <button onClick={resetFilters} className="text-xs text-primary-500 hover:text-red-600 flex items-center gap-1 transition-colors bg-white px-2 py-1 rounded border border-transparent hover:border-red-200">
                            <X className="w-3 h-3" /> Limpiar filtros
                        </button>
                    )}
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-primary-700 border-t-transparent rounded-full animate-spin" /></div>
            ) : (
                <>
                    <StatusTable title="Ventas (Ingresos)" statuses={filteredSalesStatuses} isSale={true} fromDate={fromDate} toDate={toDate} searchQ={searchQ} />
                    <StatusTable title="Compras (Egresos)" statuses={purchaseStatuses} isSale={false} fromDate={fromDate} toDate={toDate} searchQ={searchQ} />
                </>
            )}


        </div>
    )
}
