'use client'
import { useEffect, useState } from 'react'
import api from '@/lib/api'
import { CashRegister, CashMovement } from '@/types'
import { Banknote, Lock, Unlock, Plus, X, TrendingUp, TrendingDown, FileSpreadsheet, Calendar, AlertCircle, ChevronLeft, ChevronRight, ChevronUp, ChevronDown } from 'lucide-react'
import * as XLSX from 'xlsx'

const FMT = (n: number) => `$${Number(n ?? 0).toLocaleString('es-AR')}`

export default function CashPage() {
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
    const [editingMove, setEditingMove] = useState(false)
    const [showConfirmModal, setShowConfirmModal] = useState(false)
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
        setSaving(true)
        await api.post('/api/admin/cash/open', { amount: Number(openAmt) })
        setShowOpen(false); load(); setSaving(false)
    }
    const closeRegister = async () => {
        if (!register) return; setSaving(true)
        await api.post(`/api/admin/cash/${register.id}/close`, { amount: Number(closeAmt) })
        setShowClose(false); load(); setSaving(false)
    }
    const handleFormSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        if (!register) return
        setShowConfirmModal(true)
    }

    const processMovement = async () => {
        if (!register) return
        setSaving(true)
        try {
            if (editingMove && moveForm.id) {
                await api.put(`/api/admin/cash/movements/${moveForm.id}`, {
                    movementType: moveForm.movementType,
                    amount: Number(moveForm.amount),
                    description: moveForm.description,
                })
            } else {
                await api.post(`/api/admin/cash/${register.id}/movements`, {
                    movementType: moveForm.movementType,
                    amount: Number(moveForm.amount),
                    description: moveForm.description,
                })
            }
            setShowMove(false); setEditingMove(false); setShowConfirmModal(false); setMoveForm({ id: 0, movementType: 'INCOME', amount: '', description: '' }); load();
        } finally {
            setSaving(false)
        }
    }

    const openEditMove = (m: CashMovement) => {
        setMoveForm({
            id: m.id,
            movementType: m.movementType,
            amount: String(m.amount),
            description: m.description || ''
        })
        setEditingMove(true)
        setShowMove(true)
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
                    ? <button onClick={() => setShowOpen(true)} className="btn-primary flex items-center gap-2"><Unlock className="w-4 h-4" />Abrir caja</button>
                    : (
                        <div className="flex gap-3">
                            <button onClick={exportCash} className="btn-secondary flex items-center gap-2"><FileSpreadsheet className="w-4 h-4" />Exportar</button>
                            <button onClick={() => { setEditingMove(false); setMoveForm({ id: 0, movementType: 'INCOME', amount: '', description: '' }); setShowMove(true) }} className="btn-secondary flex items-center gap-2"><Plus className="w-4 h-4" />Agregar movimiento</button>
                            <button onClick={() => setShowClose(true)} className="btn-danger flex items-center gap-2"><Lock className="w-4 h-4" />Cerrar caja</button>
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
                        <div className="px-6 py-4 border-b border-muted">
                            <h2 className="font-semibold text-espresso">Movimientos</h2>
                        </div>
                        <div className="table-wrapper rounded-none border-0">
                            <table className="data-table">
                                <thead><tr><th>Tipo</th><th>Monto</th><th>Descripción</th><th>Hora</th><th className="text-right">Acción</th></tr></thead>
                                <tbody>
                                    {movements.length === 0
                                        ? <tr><td colSpan={5} className="text-center text-primary-400 py-8">Sin movimientos aún</td></tr>
                                        : movements.map(m => (
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
                                                    <button onClick={() => openEditMove(m)} className="btn-ghost p-1 tooltip-left hover:bg-primary-50 hover:text-primary-600">
                                                        Editar
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    }
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
                                    <th>Notas</th>
                                </tr>
                            </thead>
                            <tbody>
                                {history.length === 0 ? (
                                    <tr><td colSpan={5} className="text-center text-primary-400 py-8">No hay registros en este rango</td></tr>
                                ) : history.map(h => (
                                    <tr key={h.id} className={h.closedAt ? '' : 'bg-primary-50'}>
                                        <td className="text-sm min-w-[140px]">{new Date(h.openedAt).toLocaleString('es-AR')}</td>
                                        <td className="text-sm min-w-[140px]">{h.closedAt ? new Date(h.closedAt).toLocaleString('es-AR') : <span className="text-primary-500 font-semibold">Actual / Abierta</span>}</td>
                                        <td className="font-medium text-sm">{FMT(h.openingAmount ?? 0)}</td>
                                        <td className="font-semibold text-sm">{h.closingAmount != null ? FMT(h.closingAmount) : '—'}</td>
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
                            <input type="number" className="input" value={openAmt} onChange={e => setOpenAmt(e.target.value)} />
                        </div>
                        <div className="flex gap-3">
                            <button onClick={() => setShowOpen(false)} className="btn-secondary flex-1">Cancelar</button>
                            <button onClick={openRegister} className="btn-primary flex-1" disabled={saving}>{saving ? 'Abriendo…' : 'Abrir'}</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Cerrar */}
            {showClose && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl p-6 space-y-4">
                        <h2 className="text-lg font-bold text-espresso">Cerrar Caja</h2>
                        <div>
                            <label className="block text-sm font-medium text-primary-700 mb-1">Monto de cierre (efectivo contado)</label>
                            <input type="number" className="input" value={closeAmt} onChange={e => setCloseAmt(e.target.value)} />
                        </div>
                        <div className="flex gap-3">
                            <button onClick={() => setShowClose(false)} className="btn-secondary flex-1">Cancelar</button>
                            <button onClick={closeRegister} className="btn-danger flex-1" disabled={saving}>{saving ? 'Cerrando…' : 'Cerrar'}</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Movimiento */}
            {showMove && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl">
                        <div className="flex items-center justify-between p-6 border-b border-muted">
                            <h2 className="text-lg font-bold text-espresso">{editingMove ? 'Editar Movimiento' : 'Agregar Movimiento'}</h2>
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
        </div>
    )
}
