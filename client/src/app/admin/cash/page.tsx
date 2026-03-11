'use client'
import { useEffect, useState } from 'react'
import api from '@/lib/api'
import { CashRegister, CashMovement } from '@/types'
import { Banknote, Lock, Unlock, Plus, X, TrendingUp, TrendingDown, FileSpreadsheet, Calendar, AlertCircle } from 'lucide-react'
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
    const [moveForm, setMoveForm] = useState({ movementType: 'INCOME', amount: '', description: '' })
    const [saving, setSaving] = useState(false)
    const [history, setHistory] = useState<CashRegister[]>([])
    const [fromDate, setFromDate] = useState('')
    const [toDate, setToDate] = useState('')

    const loadHistory = async () => {
        let url = '/api/admin/cash'
        const params = new URLSearchParams()
        if (fromDate) params.set('from', fromDate + 'T00:00:00')
        if (toDate) params.set('to', toDate + 'T23:59:59')
        if (params.toString()) url += '?' + params.toString()
        try {
            const r = await api.get(url)
            setHistory(r.data)
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
    useEffect(() => { loadHistory() }, [fromDate, toDate])

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
    const addMovement = async (e: React.FormEvent) => {
        e.preventDefault(); if (!register) return; setSaving(true)
        await api.post(`/api/admin/cash/${register.id}/movements`, {
            movementType: moveForm.movementType,
            amount: Number(moveForm.amount),
            description: moveForm.description,
        })
        setShowMove(false); setMoveForm({ movementType: 'INCOME', amount: '', description: '' }); load(); setSaving(false)
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
                            <button onClick={() => setShowMove(true)} className="btn-secondary flex items-center gap-2"><Plus className="w-4 h-4" />Agregar movimiento</button>
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
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                            <div className="card text-center">
                                <p className="text-xs text-primary-500 uppercase font-semibold mb-1">Apertura</p>
                                <p className="text-2xl font-bold text-espresso">{FMT(register.openingAmount)}</p>
                            </div>
                            <div className="card text-center bg-emerald-50">
                                <p className="text-xs text-emerald-600 uppercase font-semibold mb-1">Ingresos</p>
                                <p className="text-2xl font-bold text-emerald-700">{FMT(summary.income)}</p>
                            </div>
                            <div className="card text-center bg-red-50">
                                <p className="text-xs text-red-600 uppercase font-semibold mb-1">Egresos</p>
                                <p className="text-2xl font-bold text-red-700">{FMT(summary.expense)}</p>
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
                                <thead><tr><th>Tipo</th><th>Monto</th><th>Descripción</th><th>Hora</th></tr></thead>
                                <tbody>
                                    {movements.length === 0
                                        ? <tr><td colSpan={4} className="text-center text-primary-400 py-8">Sin movimientos aún</td></tr>
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
                    <div className="table-wrapper rounded-none border-0">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Apertura</th>
                                    <th>Cierre</th>
                                    <th>Fondo Inicial ($)</th>
                                    <th>Cierre Declarado ($)</th>
                                    <th>Notas</th>
                                </tr>
                            </thead>
                            <tbody>
                                {history.length === 0 ? (
                                    <tr><td colSpan={5} className="text-center text-primary-400 py-8">No hay registros en este rango</td></tr>
                                ) : history.map(h => (
                                    <tr key={h.id} className={h.closedAt ? '' : 'bg-primary-50'}>
                                        <td className="text-sm">{new Date(h.openedAt).toLocaleString('es-AR')}</td>
                                        <td className="text-sm">{h.closedAt ? new Date(h.closedAt).toLocaleString('es-AR') : <span className="text-primary-500 font-semibold">Actual / Abierta</span>}</td>
                                        <td className="font-medium text-sm">{FMT(h.openingAmount ?? 0)}</td>
                                        <td className="font-semibold text-sm">{h.closingAmount != null ? FMT(h.closingAmount) : '—'}</td>
                                        <td className="text-primary-500 text-sm">{h.notes ?? '—'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
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
                            <h2 className="text-lg font-bold text-espresso">Agregar Movimiento</h2>
                            <button onClick={() => setShowMove(false)} className="btn-ghost p-1.5"><X className="w-5 h-5" /></button>
                        </div>
                        <form onSubmit={addMovement} className="p-6 space-y-4">
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
                                <input className="input" value={moveForm.description} onChange={e => setMoveForm({ ...moveForm, description: e.target.value })} />
                            </div>
                            <div className="flex gap-3">
                                <button type="button" onClick={() => setShowMove(false)} className="btn-secondary flex-1">Cancelar</button>
                                <button type="submit" className="btn-primary flex-1" disabled={saving}>{saving ? 'Guardando…' : 'Agregar'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}
