'use client'
import { useEffect, useState } from 'react'
import api from '@/lib/api'
import { toast } from '@/lib/toast'
import { CashRegister, CashMovement } from '@/types'
import { Banknote, Lock, Unlock, Plus, X, TrendingUp, TrendingDown, FileSpreadsheet, Calendar, AlertCircle, ChevronLeft, ChevronRight, ChevronUp, ChevronDown, Trash2, Search, Eye } from 'lucide-react'
import * as XLSX from 'xlsx'
import { useAuth } from '@/lib/auth'

const FMT = (n: number) => `$${Number(n ?? 0).toLocaleString('es-AR')}`

export default function CashPage() {
    const { canWrite } = useAuth()
    const [register, setRegister] = useState<CashRegister | null>(null)
    const [movements, setMovements] = useState<CashMovement[]>([])
    const [summary, setSummary] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [showOpen, setShowOpen] = useState(false)
    const [showMove, setShowMove] = useState(false)
    const [openAmt, setOpenAmt] = useState('0')
    const [closeAmt, setCloseAmt] = useState('')
    const [showClose, setShowClose] = useState(false)
    const [moveForm, setMoveForm] = useState({ id: 0, movementType: 'INCOME', amount: '', description: '' })
    const [saving, setSaving] = useState(false)
    const [showConfirmModal, setShowConfirmModal] = useState(false)
    const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null)
    const [closeDiscrepancy, setCloseDiscrepancy] = useState<any>(null)
    const [closeDiscrepancyReason, setCloseDiscrepancyReason] = useState('')
    const [openDiscrepancy, setOpenDiscrepancy] = useState<any>(null)
    const [openDiscrepancyReason, setOpenDiscrepancyReason] = useState('')
    const [detailModal, setDetailModal] = useState<{ register: CashRegister; movements: CashMovement[]; summary: any } | null>(null)
    const [loadingDetail, setLoadingDetail] = useState(false)

    // Movement filters
    const [movFilter, setMovFilter] = useState<'all' | 'INCOME' | 'EXPENSE'>('all')
    const [movSearch, setMovSearch] = useState('')
    const [movFrom, setMovFrom] = useState('')
    const [movTo, setMovTo] = useState('')
    const [history, setHistory] = useState<CashRegister[]>([])
    const [fromDate, setFromDate] = useState('')
    const [toDate, setToDate] = useState('')
    const [historyPage, setHistoryPage] = useState(0)
    const [historyTotal, setHistoryTotal] = useState(0)
    const [historySort, setHistorySort] = useState('openedAt')
    const [historyDir, setHistoryDir] = useState<'asc' | 'desc'>('desc')

    const loadHistory = async () => {
        let url = `/api/admin/cash?page=${historyPage}&size=10&sort=${historySort}&dir=${historyDir.toUpperCase()}`
        const params = new URLSearchParams()
        if (fromDate) params.set('from', fromDate + 'T00:00:00')
        if (toDate) params.set('to', toDate + 'T23:59:59')
        if (params.toString()) url += '&' + params.toString()
        try {
            const r = await api.get(url)
            setHistory(r.data.content)
            setHistoryTotal(r.data.totalElements)
        } catch (e) { }
    }

    const load = async () => {
        setLoading(true)
        try {
            const r = await api.get('/api/admin/cash/current')
            if (r.status === 204) {
                setRegister(null); setMovements([]); setSummary(null)
            } else {
                setRegister(r.data)
                try {
                    const [mv, sm] = await Promise.all([
                        api.get(`/api/admin/cash/${r.data.id}/movements`),
                        api.get(`/api/admin/cash/${r.data.id}/summary`),
                    ])
                    setMovements(mv.data); setSummary(sm.data)
                } catch {
                    // Movements failed but register is still open
                    setMovements([]); setSummary(null)
                }
            }
        } catch {
            setRegister(null)
        }
        setLoading(false)
        loadHistory()
    }
    useEffect(() => { load() }, [])
    useEffect(() => { loadHistory() }, [fromDate, toDate, historyPage, historySort, historyDir])

    const toggleHistorySort = (field: string) => {
        setHistoryPage(0)
        if (historySort === field) setHistoryDir(d => d === 'asc' ? 'desc' : 'asc')
        else { setHistorySort(field); setHistoryDir('desc') }
    }
    const HistorySortIcon = ({ field }: { field: string }) => (
        <span className="inline-flex items-center ml-1">
            {historySort === field && historyDir === 'asc' ? <ChevronUp className="w-3 h-3" /> : historySort === field && historyDir === 'desc' ? <ChevronDown className="w-3 h-3" /> : <span className="opacity-30">↕</span>}
        </span>
    )

    const openRegister = async () => {
        if (!canWrite) { toast.error('No puedes hacer esto en rol Consulta'); return; }
        setSaving(true)
        try {
            await api.post('/api/admin/cash/open', {
                amount: Number(openAmt),
                openingDiscrepancyReason: openDiscrepancyReason || undefined
            })
            setShowOpen(false); setOpenDiscrepancy(null); setOpenDiscrepancyReason(''); load()
            toast.success('Caja abierta')
        } catch (err: any) {
            const data = err.response?.data
            if (data?.error === 'Discrepancia en apertura de caja') {
                setOpenDiscrepancy(data)
            } else {
                toast.error(data?.message || 'No se pudo abrir la caja')
            }
        } finally { setSaving(false) }
    }
    const closeRegister = async () => {
        if (!canWrite) { toast.error('No puedes hacer esto en rol Consulta'); return; }
        if (!register) return; setSaving(true)
        try {
            await api.post(`/api/admin/cash/${register.id}/close`, {
                amount: Number(closeAmt),
                discrepancyReason: closeDiscrepancyReason || undefined
            })
            setShowClose(false); setCloseDiscrepancy(null); setCloseDiscrepancyReason(''); load()
            toast.success('Caja cerrada')
        } catch (err: any) {
            const data = err.response?.data
            if (data?.error === 'Discrepancia en el cierre de caja') {
                setCloseDiscrepancy(data)
            } else {
                toast.error(data?.message || 'No se pudo cerrar la caja')
            }
        } finally { setSaving(false) }
    }
    const handleFormSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        if (!register) return
        setShowConfirmModal(true)
    }

    const processMovement = async () => {
        if (!canWrite) { toast.error('No puedes hacer esto en rol Consulta'); return; }
        if (!register) return
        setSaving(true)
        try {
            await api.post(`/api/admin/cash/${register.id}/movements`, {
                movementType: moveForm.movementType,
                amount: Number(moveForm.amount),
                description: moveForm.description,
            })
            toast.success('Movimiento agregado')
            setShowMove(false); setShowConfirmModal(false); setMoveForm({ id: 0, movementType: 'INCOME', amount: '', description: '' }); load();
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Error al procesar el movimiento')
        } finally {
            setSaving(false)
        }
    }

    const deleteMovement = async (id: number) => {
        if (!canWrite) { toast.error('No puedes hacer esto en rol Consulta'); return; }
        setSaving(true)
        try {
            await api.delete(`/api/admin/cash/movements/${id}`)
            toast.success('Movimiento eliminado')
        } catch (err: any) {
            toast.error(err.response?.data || 'No se pudo eliminar el movimiento')
        } finally {
            setSaving(false); setDeleteConfirmId(null); load()
        }
    }

    const openEditMove = (m: any) => {
        if (!canWrite) { toast.error('No puedes hacer esto en rol Consulta'); return; }
        setMoveForm({
            id: m.id,
            movementType: m.movementType,
            amount: String(m.amount),
            description: m.description || ''
        })
        // editing removed — kept for TS compatibility
        setShowMove(true)
    }

    const openDetail = async (h: CashRegister) => {
        setLoadingDetail(true)
        try {
            const mvRes = await api.get(`/api/admin/cash/${h.id}/movements`)
            let smData = null
            try {
                const smRes = await api.get(`/api/admin/cash/${h.id}/summary`)
                smData = smRes.data
            } catch { }
            setDetailModal({ register: h, movements: mvRes.data, summary: smData })
        } catch (e: any) {
            toast.error('No se pudo cargar el detalle: ' + (e?.response?.data || e?.message || 'error'))
        } finally {
            setLoadingDetail(false)
        }
    }

    const exportCash = () => {
        if (!register || !summary) return
        const rows = [
            { Concepto: 'Apertura', Monto: register.openingAmount, Hora: new Date(register.openedAt).toLocaleString() },
            ...movements.map(m => ({
                Concepto: m.movementType === 'INCOME' ? 'Ingreso' : 'Egreso',
                Monto: m.movementType === 'INCOME' ? m.amount : -m.amount,
                Descripción: m.description || '',
                Hora: new Date(m.createdAt).toLocaleTimeString(),
            })),
            { Concepto: '', Monto: '', Hora: '' },
            { Concepto: 'Total Ingresos', Monto: summary.income },
            { Concepto: 'Total Egresos', Monto: summary.expense },
            { Concepto: 'Neto', Monto: summary.net },
            ...(register.closingAmount != null ? [{ Concepto: 'Cierre declarado', Monto: register.closingAmount },
            { Concepto: 'Diferencia', Monto: register.closingAmount - (register.openingAmount + summary.net) }] : []),
        ]
        const ws = XLSX.utils.json_to_sheet(rows)
        const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'Arqueo de Caja')
        XLSX.writeFile(wb, `caja_${new Date().toISOString().slice(0, 10)}.xlsx`)
    }

    return (
        <div className="space-y-6">

            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-espresso">Caja</h1>
                    <p className="text-primary-500 text-sm">{register ? 'Sesión abierta' : 'Sin sesión activa'}</p>
                </div>
                {!register
                    ? (<button onClick={() => { if (!canWrite) { toast.error('No puedes hacer esto en rol Consulta'); return; } setShowOpen(true) }} className="btn-primary flex items-center gap-2"><Unlock className="w-4 h-4" />Abrir caja</button>)
                    : (
                        <div className="flex gap-3">
                            <button onClick={exportCash} className="btn-secondary flex items-center gap-2"><FileSpreadsheet className="w-4 h-4" />Exportar</button>
                            <button onClick={() => { if (!canWrite) { toast.error('No puedes hacer esto en rol Consulta'); return; } setMoveForm({ id: 0, movementType: 'INCOME', amount: '', description: '' }); setShowMove(true) }} className="btn-secondary flex items-center gap-2"><Plus className="w-4 h-4" />Agregar movimiento</button>
                            <button onClick={() => { if (!canWrite) { toast.error('No puedes hacer esto en rol Consulta'); return; } setShowClose(true) }} className="btn-danger flex items-center gap-2"><Lock className="w-4 h-4" />Cerrar caja</button>
                        </div>
                    )
                }
            </div>

            {loading ? (
                <div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-primary-700 border-t-transparent rounded-full animate-spin" /></div>
            ) : register ? (
                <>
                    {summary && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            <div className="card text-center">
                                <p className="text-xs text-primary-500 uppercase font-semibold mb-1">Apertura</p>
                                <p className="text-2xl font-bold text-espresso">{FMT(register.openingAmount)}</p>
                            </div>
                            <div className="card text-center bg-emerald-50">
                                <p className="text-xs text-emerald-600 uppercase font-semibold mb-1">Ingresos</p>
                                <p className="text-2xl font-bold text-emerald-700">{FMT(summary.income)}</p>
                                {summary.salesByPayment && Object.keys(summary.salesByPayment).length > 0 && (
                                    <div className="mt-2 pt-2 border-t border-emerald-200/50 text-xs text-emerald-700/80 text-left space-y-0.5 max-h-24 overflow-y-auto">
                                        {Object.entries(summary.salesByPayment).map(([method, amount]: any) => (
                                            <div key={method} className="flex justify-between">
                                                <span className="truncate mr-2">{method}</span>
                                                <span className="font-medium whitespace-nowrap">{FMT(amount)}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <div className="card text-center bg-red-50">
                                <p className="text-xs text-red-600 uppercase font-semibold mb-1">Egresos</p>
                                <p className="text-2xl font-bold text-red-700">{FMT(summary.expense)}</p>
                                {summary.purchasesByPayment && Object.keys(summary.purchasesByPayment).length > 0 && (
                                    <div className="mt-2 pt-2 border-t border-red-200/50 text-xs text-red-700/80 text-left space-y-0.5 max-h-24 overflow-y-auto">
                                        {Object.entries(summary.purchasesByPayment).map(([method, amount]: any) => (
                                            <div key={method} className="flex justify-between">
                                                <span className="truncate mr-2">{method}</span>
                                                <span className="font-medium whitespace-nowrap">{FMT(amount)}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <div className="card text-center bg-blue-50">
                                <p className="text-xs text-blue-600 uppercase font-semibold mb-1">Total</p>
                                <p className="text-2xl font-bold text-blue-700">{FMT(register.openingAmount + summary.income - summary.expense)}</p>
                            </div>
                        </div>
                    )}

                    <div className="card p-0 overflow-hidden">
                        <div className="px-6 py-4 border-b border-muted flex flex-col sm:flex-row sm:items-center gap-3">
                            <h2 className="font-semibold text-espresso shrink-0">Movimientos</h2>
                            <div className="flex flex-wrap items-center gap-2 sm:ml-auto">
                                {/* Tipo */}
                                <div className="flex rounded-lg border border-muted overflow-hidden text-xs">
                                    {(['all', 'INCOME', 'EXPENSE'] as const).map(v => (
                                        <button key={v} onClick={() => setMovFilter(v)}
                                            className={`px-2.5 py-1.5 font-medium transition-colors ${movFilter === v ? 'bg-espresso text-white' : 'bg-white text-primary-500 hover:bg-primary-50'}`}>
                                            {v === 'all' ? 'Todos' : v === 'INCOME' ? 'Ingresos' : 'Egresos'}
                                        </button>
                                    ))}
                                </div>
                                {/* Hora desde */}
                                <input type="time" value={movFrom} onChange={e => setMovFrom(e.target.value)}
                                    className="input !py-1 !px-2 text-xs !w-auto" title="Hora desde" />
                                <span className="text-primary-400 text-xs">—</span>
                                <input type="time" value={movTo} onChange={e => setMovTo(e.target.value)}
                                    className="input !py-1 !px-2 text-xs !w-auto" title="Hora hasta" />
                                {/* Búsqueda */}
                                <div className="relative">
                                    <Search className="w-3.5 h-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-primary-400" />
                                    <input type="text" placeholder="Buscar descripción…" value={movSearch}
                                        onChange={e => setMovSearch(e.target.value)}
                                        className="input !py-1 !pl-7 !pr-2 text-xs !w-40" />
                                </div>
                                {(movFilter !== 'all' || movFrom || movTo || movSearch) && (
                                    <button onClick={() => { setMovFilter('all'); setMovFrom(''); setMovTo(''); setMovSearch('') }}
                                        className="text-xs text-primary-400 hover:text-espresso flex items-center gap-1">
                                        <X className="w-3 h-3" /> Limpiar
                                    </button>
                                )}
                            </div>
                        </div>
                        <div className="table-wrapper rounded-none border-0">
                            <table className="data-table">
                                <thead><tr><th>Tipo</th><th>Monto</th><th>Descripción</th><th>Hora</th><th className="text-right">Acción</th></tr></thead>
                                <tbody>
                                    {(() => {
                                        const filtered = movements.filter(m => {
                                            if (movFilter !== 'all' && m.movementType !== movFilter) return false
                                            if (movSearch && !m.description?.toLowerCase().includes(movSearch.toLowerCase())) return false
                                            if (movFrom || movTo) {
                                                const hhmm = new Date(m.createdAt).toTimeString().slice(0, 5)
                                                if (movFrom && hhmm < movFrom) return false
                                                if (movTo && hhmm > movTo) return false
                                            }
                                            return true
                                        })
                                        if (filtered.length === 0) return <tr><td colSpan={5} className="text-center text-primary-400 py-8">{movements.length === 0 ? 'Sin movimientos aún' : 'Sin resultados para los filtros aplicados'}</td></tr>
                                        return filtered.map(m => (
                                            <tr key={m.id}>
                                                <td>
                                                    <span className={m.movementType === 'INCOME' ? 'badge-green' : 'badge-red'}>
                                                        {m.movementType === 'INCOME' ? <TrendingUp className="w-3 h-3 inline mr-1" /> : <TrendingDown className="w-3 h-3 inline mr-1" />}
                                                        {m.movementType === 'INCOME' ? 'Ingreso' : 'Egreso'}
                                                    </span>
                                                </td>
                                                <td className="font-semibold">{FMT(m.amount)}</td>
                                                <td className="text-primary-500">{m.description ?? '—'}</td>
                                                <td className="text-primary-400 text-xs">{new Date(m.createdAt).toLocaleTimeString()}</td>
                                                <td className="text-right">
                                                    <div className="flex items-center justify-end gap-1">
                                                        {m.isManual && (
                                                            <button onClick={() => { if (!canWrite) { toast.error('No puedes hacer esto en rol Consulta'); return; } setDeleteConfirmId(m.id) }} className="btn-ghost p-1 hover:bg-red-50 text-red-400 hover:text-red-600" title="Eliminar movimiento manual"><Trash2 className="w-3.5 h-3.5" /></button>
                                                        )}
                                                        {!m.isManual && (
                                                            <span className="text-xs text-primary-300 px-1">Sistema</span>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    })()}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            ) : (
                <div className="card flex flex-col items-center justify-center py-20 text-center">
                    <Banknote className="w-12 h-12 text-primary-300 mb-4" />
                    <p className="text-espresso font-semibold">No hay caja abierta</p>
                    <p className="text-primary-400 text-sm mt-1">Abrí una nueva sesión para registrar movimientos</p>
                </div>
            )}

            {/* History Section */}
            <div className="pt-6 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <h2 className="text-xl font-bold text-espresso">Historial de Cajas</h2>
                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <Calendar className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-primary-400" />
                            <input type="date" className="input pl-9 text-sm" value={fromDate} onChange={e => setFromDate(e.target.value)} title="Desde" />
                        </div>
                        <div className="relative">
                            <Calendar className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-primary-400" />
                            <input type="date" className="input pl-9 text-sm" value={toDate} onChange={e => setToDate(e.target.value)} title="Hasta" />
                        </div>
                    </div>
                </div>

                <div className="card p-0 overflow-hidden">
                    <div className="table-wrapper rounded-none border-0 max-h-[400px] overflow-y-auto">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th className="cursor-pointer select-none" onClick={() => toggleHistorySort('openedAt')}>Apertura <HistorySortIcon field="openedAt" /></th>
                                    <th className="cursor-pointer select-none" onClick={() => toggleHistorySort('closedAt')}>Cierre <HistorySortIcon field="closedAt" /></th>
                                    <th className="cursor-pointer select-none" onClick={() => toggleHistorySort('openingAmount')}>Fondo Inicial ($) <HistorySortIcon field="openingAmount" /></th>
                                    <th className="cursor-pointer select-none" onClick={() => toggleHistorySort('closingAmount')}>Cierre Declarado ($) <HistorySortIcon field="closingAmount" /></th>
                                    <th>Medios de Pago</th>
                                    <th>Notas / Discrepancias</th>
                                </tr>
                            </thead>
                            <tbody>
                                {history.length === 0 ? (
                                    <tr><td colSpan={6} className="text-center text-primary-400 py-8">No hay registros en este rango</td></tr>
                                ) : history.map(h => (
                                    <tr key={h.id} onClick={() => openDetail(h)} className={`cursor-pointer hover:bg-caramel/5 transition-colors ${h.closedAt ? '' : 'bg-primary-50'}`}>
                                        <td className="text-sm min-w-[140px]">
                                            <div className="flex items-center gap-1.5">
                                                <Eye className="w-3.5 h-3.5 text-primary-300 shrink-0" />
                                                <span>{new Date(h.openedAt).toLocaleString('es-AR')}</span>
                                            </div>
                                            {h.openingDiscrepancyReason && (
                                                <div className="mt-1 text-xs text-amber-700 bg-amber-50 rounded px-1.5 py-0.5 border border-amber-200">
                                                    ⚠ Apertura con diferencia: {h.openingDiscrepancyReason}
                                                </div>
                                            )}
                                        </td>
                                        <td className="text-sm min-w-[140px]">{h.closedAt ? new Date(h.closedAt).toLocaleString('es-AR') : <span className="text-primary-500 font-semibold">Actual / Abierta</span>}</td>
                                        <td className="font-medium text-sm">{FMT(h.openingAmount ?? 0)}</td>
                                        <td className="font-semibold text-sm">
                                            {h.closingAmount != null ? FMT(h.closingAmount) : '—'}
                                            {h.discrepancyReason && (
                                                <div className="mt-1 text-xs text-red-700 bg-red-50 rounded px-1.5 py-0.5 border border-red-200 font-normal">
                                                    ⚠ Cierre con diferencia: {h.discrepancyReason}
                                                </div>
                                            )}
                                        </td>
                                        <td className="text-xs">
                                            {h.paymentTotals && Object.keys(h.paymentTotals).length > 0 ? (
                                                <div className="flex flex-col gap-0.5">
                                                    {Object.entries(h.paymentTotals).map(([method, amount]) => (
                                                        <div key={method} className="flex justify-between gap-4 border-b border-primary-100 last:border-0 pb-0.5 mb-0.5">
                                                            <span className="text-primary-500 font-semibold">{method}</span>
                                                            <span className={amount >= 0 ? 'text-emerald-700 font-medium' : 'text-red-600 font-medium'}>{FMT(amount)}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <span className="text-primary-300">Sin mov. integrados</span>
                                            )}
                                        </td>
                                        <td className="text-primary-500 text-sm max-w-[200px] truncate" title={h.notes}>{h.notes ?? '—'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Pagination */}
                {historyTotal > 10 && (
                    <div className="flex items-center justify-between mt-4">
                        <p className="text-sm text-primary-400">Página {historyPage + 1}</p>
                        <div className="flex gap-2">
                            <button disabled={historyPage === 0} onClick={() => setHistoryPage(p => p - 1)} className="btn-ghost p-1.5 disabled:opacity-30">
                                <ChevronLeft className="w-4 h-4" />
                            </button>
                            <button disabled={(historyPage + 1) * 10 >= historyTotal} onClick={() => setHistoryPage(p => p + 1)} className="btn-ghost p-1.5 disabled:opacity-30">
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Modal Abrir */}
            {showOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl p-6 space-y-4">
                        <h2 className="text-lg font-bold text-espresso">Abrir Caja</h2>
                        <div>
                            <label className="block text-sm font-medium text-primary-700 mb-1">Monto de apertura</label>
                            <input type="number" className="input" value={openAmt} onChange={e => { setOpenAmt(e.target.value); setOpenDiscrepancy(null); setOpenDiscrepancyReason('') }} />
                        </div>
                        {openDiscrepancy && (
                            <div className="bg-amber-50 border border-amber-300 rounded-xl p-4 space-y-3">
                                <div className="flex items-start gap-2">
                                    <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                                    <div>
                                        <p className="text-sm font-semibold text-amber-800">Discrepancia detectada</p>
                                        <p className="text-xs text-amber-700 mt-1">El cierre anterior fue <strong>{FMT(openDiscrepancy.lastClosing)}</strong> y estás abriendo con <strong>{FMT(openDiscrepancy.provided)}</strong>. {openDiscrepancy.difference < 0 ? <>Falta <strong className="text-red-700">{FMT(Math.abs(openDiscrepancy.difference))}</strong></> : <>Sobran <strong className="text-emerald-700">{FMT(openDiscrepancy.difference)}</strong></>}.</p>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-amber-800 mb-1">Motivo de la diferencia <span className="text-red-500">*</span></label>
                                    <textarea className="input text-sm resize-none" rows={2} placeholder="Ej: Se retiró efectivo al cierre anterior..." value={openDiscrepancyReason} onChange={e => setOpenDiscrepancyReason(e.target.value)} />
                                </div>
                            </div>
                        )}
                        <div className="flex gap-3">
                            <button onClick={() => { setShowOpen(false); setOpenDiscrepancy(null); setOpenDiscrepancyReason('') }} className="btn-secondary flex-1">Cancelar</button>
                            <button onClick={openRegister} className="btn-primary flex-1" disabled={saving || (!!openDiscrepancy && !openDiscrepancyReason.trim())}>{saving ? 'Abriendo…' : 'Abrir'}</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Cerrar */}
            {showClose && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl p-6 space-y-4">
                        <h2 className="text-lg font-bold text-espresso">Cerrar Caja</h2>
                        {summary && (
                            <div className="bg-primary-50 rounded-xl p-3 text-xs space-y-1 text-primary-600">
                                <div className="flex justify-between"><span>Apertura:</span><span className="font-medium">{FMT(register?.openingAmount ?? 0)}</span></div>
                                <div className="flex justify-between text-emerald-700"><span>Ingresos:</span><span className="font-medium">+{FMT(summary.income)}</span></div>
                                <div className="flex justify-between text-red-600"><span>Egresos:</span><span className="font-medium">-{FMT(summary.expense)}</span></div>
                                <div className="flex justify-between font-bold text-espresso border-t border-primary-200 pt-1 mt-1"><span>Balance esperado:</span><span>{FMT((register?.openingAmount ?? 0) + summary.income - summary.expense)}</span></div>
                            </div>
                        )}
                        <div>
                            <label className="block text-sm font-medium text-primary-700 mb-1">Monto declarado (efectivo contado)</label>
                            <input type="number" className="input" value={closeAmt} onChange={e => { setCloseAmt(e.target.value); setCloseDiscrepancy(null); setCloseDiscrepancyReason('') }} />
                        </div>
                        {closeDiscrepancy && (
                            <div className="bg-red-50 border border-red-300 rounded-xl p-4 space-y-3">
                                <div className="flex items-start gap-2">
                                    <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                                    <div>
                                        <p className="text-sm font-semibold text-red-800">Discrepancia detectada</p>
                                        <p className="text-xs text-red-700 mt-1">Balance esperado: <strong>{FMT(closeDiscrepancy.expected)}</strong>. Declarado: <strong>{FMT(closeDiscrepancy.provided)}</strong>. {closeDiscrepancy.difference < 0 ? <>Falta <strong>{FMT(Math.abs(closeDiscrepancy.difference))}</strong> en caja</> : <>Sobran <strong>{FMT(closeDiscrepancy.difference)}</strong> en caja</>}.</p>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-red-800 mb-1">Motivo de la diferencia <span className="text-red-500">*</span></label>
                                    <textarea className="input text-sm resize-none border-red-300 focus:ring-red-400" rows={2} placeholder="Ej: Falta de cambio, error de cobro..." value={closeDiscrepancyReason} onChange={e => setCloseDiscrepancyReason(e.target.value)} />
                                </div>
                            </div>
                        )}
                        <div className="flex gap-3">
                            <button onClick={() => { setShowClose(false); setCloseDiscrepancy(null); setCloseDiscrepancyReason('') }} className="btn-secondary flex-1">Cancelar</button>
                            <button onClick={closeRegister} className="btn-danger flex-1" disabled={saving || (!!closeDiscrepancy && !closeDiscrepancyReason.trim())}>{saving ? 'Cerrando…' : 'Cerrar'}</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Movimiento */}
            {showMove && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl">
                        <div className="flex items-center justify-between p-6 border-b border-muted">
                            <h2 className="text-lg font-bold text-espresso">Agregar Movimiento</h2>
                            <button onClick={() => setShowMove(false)} className="btn-ghost p-1.5"><X className="w-5 h-5" /></button>
                        </div>
                        <form onSubmit={handleFormSubmit} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-primary-700 mb-1">Tipo</label>
                                <select className="select" value={moveForm.movementType} onChange={e => setMoveForm({ ...moveForm, movementType: e.target.value })}>
                                    <option value="INCOME">Ingreso</option>
                                    <option value="EXPENSE">Egreso</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-primary-700 mb-1">Monto</label>
                                <input type="number" className="input" value={moveForm.amount} onChange={e => setMoveForm({ ...moveForm, amount: e.target.value })} required />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-primary-700 mb-1">Descripción</label>
                                <input className="input" maxLength={100} value={moveForm.description} onChange={e => setMoveForm({ ...moveForm, description: e.target.value })} />
                            </div>
                            <div className="flex gap-3">
                                <button type="button" onClick={() => setShowMove(false)} className="btn-secondary flex-1">Cancelar</button>
                                <button type="submit" className="btn-primary flex-1" disabled={saving}>{saving ? 'Guardando…' : 'Agregar'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal Eliminar Movimiento */}
            {deleteConfirmId !== null && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[60] p-4 text-center">
                    <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl p-6 py-8">
                        <Trash2 className="w-12 h-12 text-red-500 mx-auto mb-4" />
                        <h2 className="text-xl font-bold text-espresso mb-2">¿Eliminar movimiento?</h2>
                        <p className="text-sm text-primary-500 mb-6">Esta acción no se puede deshacer.</p>
                        <div className="flex gap-3">
                            <button onClick={() => setDeleteConfirmId(null)} className="btn-secondary flex-1">Cancelar</button>
                            <button onClick={() => deleteMovement(deleteConfirmId)} className="btn-danger flex-1" disabled={saving}>{saving ? 'Eliminando…' : 'Eliminar'}</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Confirmación Custom */}
            {showConfirmModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[60] p-4 text-center">
                    <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl p-6 py-8">
                        <AlertCircle className="w-16 h-16 text-amber-500 mx-auto mb-4" />
                        <h2 className="text-xl font-bold text-espresso mb-2">¿Estás seguro?</h2>
                        <p className="text-sm text-primary-500 mb-6">Esta acción modificará los saldos de la caja actual.</p>
                        <div className="flex gap-3">
                            <button onClick={() => setShowConfirmModal(false)} className="btn-secondary flex-1">Cancelar</button>
                            <button onClick={processMovement} className="btn-primary flex-1" disabled={saving}>{saving ? 'Procesando…' : 'Sí, continuar'}</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Detalle de Sesión */}
            {detailModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-start justify-center z-[60] p-4 overflow-y-auto">
                    <div className="bg-white rounded-2xl w-full max-w-3xl shadow-2xl my-8">
                        {/* Header */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-primary-100">
                            <div>
                                <h2 className="text-lg font-bold text-espresso">Detalle de Sesión de Caja</h2>
                                <p className="text-xs text-primary-400 mt-0.5">
                                    Apertura: {new Date(detailModal.register.openedAt).toLocaleString('es-AR')}
                                    {detailModal.register.closedAt && <> · Cierre: {new Date(detailModal.register.closedAt).toLocaleString('es-AR')}</>}
                                </p>
                            </div>
                            <button onClick={() => setDetailModal(null)} className="p-2 hover:bg-primary-100 rounded-lg text-primary-400 hover:text-primary-700 transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-6 space-y-6">
                            {/* Alertas de discrepancia */}
                            {detailModal.register.openingDiscrepancyReason && (
                                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                                    <p className="text-sm font-semibold text-amber-800 mb-1">⚠ Apertura con diferencia</p>
                                    <p className="text-sm text-amber-700">{detailModal.register.openingDiscrepancyReason}</p>
                                </div>
                            )}
                            {detailModal.register.discrepancyReason && (
                                <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                                    <p className="text-sm font-semibold text-red-800 mb-1">⚠ Cierre con diferencia</p>
                                    <p className="text-sm text-red-700">{detailModal.register.discrepancyReason}</p>
                                </div>
                            )}

                            {/* Resumen de saldos */}
                            {detailModal.summary && (
                                <div>
                                    <h3 className="text-sm font-semibold text-primary-600 uppercase tracking-wider mb-3">Resumen</h3>
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                        <div className="bg-primary-50 rounded-xl p-3 text-center">
                                            <p className="text-xs text-primary-400 mb-1">Fondo Inicial</p>
                                            <p className="font-bold text-espresso">{FMT(detailModal.register.openingAmount ?? 0)}</p>
                                        </div>
                                        <div className="bg-emerald-50 rounded-xl p-3 text-center">
                                            <p className="text-xs text-emerald-600 mb-1">Ingresos</p>
                                            <p className="font-bold text-emerald-700">{FMT(detailModal.summary.totalIncome ?? 0)}</p>
                                        </div>
                                        <div className="bg-red-50 rounded-xl p-3 text-center">
                                            <p className="text-xs text-red-500 mb-1">Egresos</p>
                                            <p className="font-bold text-red-600">{FMT(detailModal.summary.totalExpense ?? 0)}</p>
                                        </div>
                                        <div className="bg-caramel/10 rounded-xl p-3 text-center">
                                            <p className="text-xs text-caramel mb-1">Saldo Esperado</p>
                                            <p className="font-bold text-espresso">{FMT((detailModal.register.openingAmount ?? 0) + (detailModal.summary.totalIncome ?? 0) - (detailModal.summary.totalExpense ?? 0))}</p>
                                        </div>
                                    </div>
                                    {detailModal.register.closingAmount != null && (
                                        <div className={`mt-3 rounded-xl p-3 flex items-center justify-between ${Math.abs(detailModal.register.closingAmount - ((detailModal.register.openingAmount ?? 0) + (detailModal.summary.totalIncome ?? 0) - (detailModal.summary.totalExpense ?? 0))) < 0.01 ? 'bg-emerald-50 border border-emerald-200' : 'bg-red-50 border border-red-200'}`}>
                                            <span className="text-sm font-medium text-primary-700">Cierre declarado</span>
                                            <span className="font-bold text-espresso">{FMT(detailModal.register.closingAmount)}</span>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Movimientos */}
                            <div>
                                <h3 className="text-sm font-semibold text-primary-600 uppercase tracking-wider mb-3">Movimientos ({detailModal.movements.length})</h3>
                                {detailModal.movements.length === 0 ? (
                                    <p className="text-sm text-primary-400 text-center py-6">Sin movimientos registrados</p>
                                ) : (
                                    <div className="overflow-x-auto">
                                        <table className="admin-table w-full text-sm">
                                            <thead>
                                                <tr>
                                                    <th>Tipo</th>
                                                    <th>Monto</th>
                                                    <th>Descripción</th>
                                                    <th>Usuario</th>
                                                    <th>Hora</th>
                                                    <th>Origen</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {detailModal.movements.map((m: CashMovement) => (
                                                    <tr key={m.id}>
                                                        <td>
                                                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${m.movementType === 'INCOME' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'}`}>
                                                                {m.movementType === 'INCOME' ? '↑ Ingreso' : '↓ Egreso'}
                                                            </span>
                                                        </td>
                                                        <td className={`font-semibold ${m.movementType === 'INCOME' ? 'text-emerald-700' : 'text-red-600'}`}>
                                                            {m.movementType === 'INCOME' ? '+' : '-'}{FMT(m.amount)}
                                                        </td>
                                                        <td className="text-primary-600 max-w-[180px] truncate" title={m.description}>{m.description ?? '—'}</td>
                                                        <td className="text-primary-500">{m.createdBy?.firstName ? `${m.createdBy.firstName} ${m.createdBy.lastName ?? ''}`.trim() : (m.createdBy?.username ?? '—')}</td>
                                                        <td className="text-primary-400 whitespace-nowrap">{m.createdAt ? new Date(m.createdAt).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }) : '—'}</td>
                                                        <td>
                                                            {m.isManual
                                                                ? <span className="text-xs bg-primary-100 text-primary-600 rounded px-1.5 py-0.5">Manual</span>
                                                                : <span className="text-xs bg-blue-100 text-blue-600 rounded px-1.5 py-0.5">Sistema</span>
                                                            }
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="px-6 pb-6">
                            <button onClick={() => setDetailModal(null)} className="btn-secondary w-full">Cerrar</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
