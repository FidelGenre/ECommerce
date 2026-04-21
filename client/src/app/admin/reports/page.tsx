'use client'
import { useEffect, useState } from 'react'
import api from '@/lib/api'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area } from 'recharts'
import { FileSpreadsheet, Printer, TrendingUp, Users, PackageX, Clock, Truck, DollarSign, Boxes, FileText, AlertTriangle } from 'lucide-react'
import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

const FMT = (n: number) => `$${Number(n ?? 0).toLocaleString('es-AR')}`
const COLORS = ['#6B3F1F', '#C49A6C', '#8B5A2B', '#4A2C14', '#D9C9B0', '#A67C52', '#3E2723', '#D7CCC8']

interface ProfitRow {
    id: number; name: string; unitsSold: number
    revenue: number; cost: number; margin: number; marginPct: number
}

type Tab = 'compras' | 'ventas_cliente' | 'rentabilidad' | 'franja' | 'no_rotan' | 'ganancias' | 'stock'

export default function ReportsPage() {
    const today = new Date().toISOString().slice(0, 10)
    const month30ago = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10)
    const [fromDate, setFromDate] = useState(month30ago)
    const [toDate, setToDate] = useState(today)
    const [loading, setLoading] = useState(true)
    const [activeTab, setActiveTab] = useState<Tab>('compras')

    // Data states
    const [bySupplier, setBySupplier] = useState<any[]>([])
    const [salesByClientOnly, setSalesByClientOnly] = useState<any[]>([])
    const [profitability, setProfitability] = useState<ProfitRow[]>([])
    const [byHour, setByHour] = useState<any[]>([])
    const [nonRotating, setNonRotating] = useState<any[]>([])
    const [marginEvolution, setMarginEvolution] = useState<any[]>([])
    const [allItems, setAllItems] = useState<any[]>([])

    const daysDiff = Math.max(1, Math.ceil((new Date(toDate).getTime() - new Date(fromDate).getTime()) / 86400000))
    const dateParam = `from=${fromDate}&to=${toDate}`

    const load = async () => {
        setLoading(true)
        try {
            const results = await Promise.allSettled([
                api.get(`/api/admin/dashboard/purchases-by-supplier?${dateParam}`),
                api.get(`/api/admin/dashboard/sales-by-client-only?${dateParam}`),
                api.get(`/api/admin/dashboard/profitability?${dateParam}`),
                api.get(`/api/admin/dashboard/sales-by-hour?${dateParam}`),
                api.get(`/api/admin/dashboard/non-rotating?${dateParam}`),
                api.get(`/api/admin/dashboard/margin-evolution?${dateParam}`),
                api.get(`/api/admin/items?size=500&${dateParam}`),
            ])

            const getData = (res: PromiseSettledResult<any>) => res.status === 'fulfilled' ? res.value.data : []

            setBySupplier(getData(results[0]))
            setSalesByClientOnly(getData(results[1]))
            setProfitability(getData(results[2]))
            setByHour(getData(results[3]))
            setNonRotating(getData(results[4]))
            setMarginEvolution(getData(results[5]))
            const itemsData = results[6].status === 'fulfilled' ? results[6].value.data?.content ?? results[6].value.data ?? [] : []
            setAllItems(itemsData)
        } catch (e) { console.error(e) }
        setLoading(false)
    }

    useEffect(() => { load() }, [fromDate, toDate])

    const exportExcel = (data: any[], sheetName: string, fileName: string) => {
        const ws = XLSX.utils.json_to_sheet(data)
        const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, sheetName)
        XLSX.writeFile(wb, `${fileName}_${new Date().toISOString().slice(0, 10)}.xlsx`)
    }

    const exportPDF = () => {
        const doc = new jsPDF()
        const dateRange = `${fromDate} – ${toDate}`
        doc.setFontSize(18)
        doc.setTextColor(75, 46, 5)
        doc.text('Informes — Coffee Beans', 14, 16)
        doc.setFontSize(10)
        doc.setTextColor(120, 80, 40)
        doc.text(`Período: ${dateRange}`, 14, 24)

        let y = 32

        if (profitability.length > 0) {
            doc.setFontSize(13)
            doc.setTextColor(75, 46, 5)
            doc.text('Rentabilidad por Producto', 14, y)
            autoTable(doc, {
                startY: y + 4,
                head: [['Producto', 'Unidades', 'Ingresos', 'Costo', 'Margen', '%']],
                body: profitability.map(r => [
                    r.name, r.unitsSold,
                    FMT(r.revenue), FMT(r.cost), FMT(r.margin),
                    `${Number(r.marginPct).toFixed(1)}%`
                ]),
                headStyles: { fillColor: [92, 61, 32] },
                alternateRowStyles: { fillColor: [245, 230, 204] },
                margin: { left: 14, right: 14 },
            })
            y = (doc as any).lastAutoTable.finalY + 12
        }

        if (salesByClientOnly.length > 0) {
            if (y > 220) { doc.addPage(); y = 14 }
            doc.setFontSize(13)
            doc.setTextColor(75, 46, 5)
            doc.text('Ventas por Cliente', 14, y)
            autoTable(doc, {
                startY: y + 4,
                head: [['Cliente', 'Órdenes', 'Total']],
                body: salesByClientOnly.map((r: any) => [r.client, r.orders, FMT(r.total)]),
                headStyles: { fillColor: [92, 61, 32] },
                alternateRowStyles: { fillColor: [245, 230, 204] },
                margin: { left: 14, right: 14 },
            })
            y = (doc as any).lastAutoTable.finalY + 12
        }

        if (nonRotating.length > 0) {
            if (y > 220) { doc.addPage(); y = 14 }
            doc.setFontSize(13)
            doc.setTextColor(75, 46, 5)
            doc.text('Productos Sin Rotación', 14, y)
            autoTable(doc, {
                startY: y + 4,
                head: [['Producto', 'Stock', 'Última Venta']],
                body: nonRotating.map((r: any) => [r.name, r.stock, r.lastSale ?? '—']),
                headStyles: { fillColor: [92, 61, 32] },
                alternateRowStyles: { fillColor: [245, 230, 204] },
                margin: { left: 14, right: 14 },
            })
        }

        doc.save(`informe_${fromDate}_${toDate}.pdf`)
    }

    const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
        { key: 'compras', label: 'Compras por Proveedor', icon: <Truck className="w-4 h-4" /> },
        { key: 'ventas_cliente', label: 'Ventas por Cliente', icon: <Users className="w-4 h-4" /> },
        { key: 'rentabilidad', label: 'Rentabilidad', icon: <TrendingUp className="w-4 h-4" /> },
        { key: 'franja', label: 'Franja Horaria', icon: <Clock className="w-4 h-4" /> },
        { key: 'no_rotan', label: 'Sin Rotación', icon: <PackageX className="w-4 h-4" /> },
        { key: 'ganancias', label: 'Ganancias Mensuales', icon: <DollarSign className="w-4 h-4" /> },
        { key: 'stock', label: 'Stock Detallado', icon: <Boxes className="w-4 h-4" /> },
    ]

    // Stock helpers
    const stockStatus = (item: any) => {
        if (item.stock <= 0) return { label: 'Sin stock', cls: 'badge-red', key: 'out' }
        if (item.stock <= item.minStock) return { label: 'Crítico', cls: 'badge-yellow', key: 'critical' }
        if (item.stock <= item.minStock * 1.5) return { label: 'Bajo', cls: 'badge-brown', key: 'low' }
        return { label: 'OK', cls: 'badge-green', key: 'ok' }
    }

    const criticalItems = allItems.filter((i: any) => i.stock <= i.minStock)
    const lowItems = allItems.filter((i: any) => i.stock > i.minStock && i.stock <= i.minStock * 1.5)

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-espresso">Informes</h1>
                <div className="flex items-center gap-2">
                    <span className="text-sm text-primary-500">Desde</span>
                    <input type="date" className="input text-sm py-1.5 px-2 w-40" value={fromDate} onChange={e => setFromDate(e.target.value)} />
                    <span className="text-sm text-primary-500">Hasta</span>
                    <input type="date" className="input text-sm py-1.5 px-2 w-40" value={toDate} onChange={e => setToDate(e.target.value)} />
                    <button onClick={() => window.print()} className="btn-secondary flex items-center gap-1.5 text-sm py-1.5 px-3">
                        <Printer className="w-4 h-4" /> Imprimir
                    </button>
                    <button onClick={exportPDF} className="btn-primary flex items-center gap-1.5 text-sm py-1.5 px-3">
                        <FileText className="w-4 h-4" /> Exportar PDF
                    </button>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 p-1 bg-primary-100 rounded-lg overflow-x-auto">
                {tabs.map(t => (
                    <button key={t.key}
                        onClick={() => setActiveTab(t.key)}
                        className={`flex items-center gap-1.5 px-3 py-2 rounded-md text-xs font-medium transition-all whitespace-nowrap ${activeTab === t.key ? 'bg-white shadow text-espresso' : 'text-primary-500 hover:text-espresso'
                            }`}>{t.icon}{t.label}</button>
                ))}
            </div>

            {loading ? (
                <div className="flex justify-center py-24"><div className="w-8 h-8 border-4 border-primary-700 border-t-transparent rounded-full animate-spin" /></div>
            ) : (
                <>
                    {/* COMPRAS POR PROVEEDOR */}
                    {activeTab === 'compras' && (
                        <div className="space-y-6">
                            <div className="card">
                                <div className="flex items-center justify-between mb-4">
                                    <h2 className="font-semibold text-espresso flex items-center gap-2">
                                        <Truck className="w-5 h-5 text-primary-600" />Compras por Proveedor
                                    </h2>
                                    <button onClick={() => exportExcel(bySupplier.map(s => ({ Proveedor: s.supplier, Total: s.total })), 'Compras', 'compras_proveedor')}
                                        className="btn-secondary flex items-center gap-1.5 text-xs py-1 px-2.5">
                                        <FileSpreadsheet className="w-3.5 h-3.5" /> Excel
                                    </button>
                                </div>
                                {bySupplier.length === 0 ? <p className="text-primary-400 text-sm text-center py-10">Sin datos en el período</p> : (
                                    <>
                                        <ResponsiveContainer width="100%" height={300}>
                                            <BarChart data={bySupplier}>
                                                <CartesianGrid strokeDasharray="3 3" stroke="#D9C9B0" />
                                                <XAxis dataKey="supplier" tick={{ fontSize: 11 }} stroke="#A67C52" />
                                                <YAxis tick={{ fontSize: 11 }} stroke="#A67C52" />
                                                <Tooltip formatter={(v: any) => FMT(v)} />
                                                <Bar dataKey="total" radius={[4, 4, 0, 0]}>
                                                    {bySupplier.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                                                </Bar>
                                            </BarChart>
                                        </ResponsiveContainer>
                                        <div className="table-wrapper max-h-[500px] overflow-y-auto w-full">
                                            <table className="data-table">
                                                <thead className="sticky top-0 bg-white shadow-sm"><tr>
                                                    <th>#</th><th>Proveedor</th><th className="text-right">Total Comprado</th><th className="text-right">% del Total</th>
                                                </tr></thead>
                                                <tbody>
                                                    {(() => {
                                                        const grandTotal = bySupplier.reduce((acc, s) => acc + Number(s.total), 0)
                                                        return bySupplier.map((s: any, i: number) => (
                                                            <tr key={i}>
                                                                <td className="font-bold text-primary-400">{i + 1}</td>
                                                                <td className="font-medium">{s.supplier}</td>
                                                                <td className="text-right font-bold text-espresso">{FMT(s.total)}</td>
                                                                <td className="text-right text-primary-500">{grandTotal > 0 ? ((Number(s.total) / grandTotal) * 100).toFixed(1) : 0}%</td>
                                                            </tr>
                                                        ))
                                                    })()}
                                                </tbody>
                                            </table>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    )}

                    {/* VENTAS POR CLIENTE */}
                    {activeTab === 'ventas_cliente' && (
                        <div className="space-y-6">
                            {/* Sales by client (solo clientes registrados) */}
                            <div className="card">
                                <div className="flex items-center justify-between mb-4">
                                    <h2 className="font-semibold text-espresso">Ventas por Cliente</h2>
                                    <button onClick={() => exportExcel(salesByClientOnly, 'Ventas Clientes', 'ventas_clientes_registrados')}
                                        className="btn-secondary flex items-center gap-1.5 text-xs py-1 px-2.5">
                                        <FileSpreadsheet className="w-3.5 h-3.5" /> Excel
                                    </button>
                                </div>
                                {salesByClientOnly.length === 0 ? <p className="text-primary-400 text-sm text-center py-10">Sin datos de clientes registrados</p> : (
                                    <div className="table-wrapper max-h-[500px] overflow-y-auto">
                                        <table className="data-table">
                                            <thead className="sticky top-0 bg-white">
                                                <tr>
                                                    <th>Cliente</th>
                                                    <th className="text-right">Cantidad de Compras</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {salesByClientOnly.map((r, i) => (
                                                    <tr key={i}>
                                                        <td className="font-medium">{r.client}</td>
                                                        <td className="text-right font-bold text-primary-600">{r.orders}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* RENTABILIDAD POR PRODUCTO */}
                    {activeTab === 'rentabilidad' && (
                        <div className="card">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="font-semibold text-espresso flex items-center gap-2">
                                    <TrendingUp className="w-5 h-5 text-emerald-600" />Rentabilidad por Producto
                                </h2>
                                <button onClick={() => exportExcel(
                                    profitability.map(p => ({ Producto: p.name, Unidades: p.unitsSold, Ingresos: p.revenue, Costo: p.cost, Margen: p.margin, 'Margen %': p.marginPct })),
                                    'Rentabilidad', 'rentabilidad'
                                )} className="btn-secondary flex items-center gap-1.5 text-xs py-1 px-2.5">
                                    <FileSpreadsheet className="w-3.5 h-3.5" /> Excel
                                </button>
                            </div>
                            {profitability.length === 0 ? <p className="text-primary-400 text-sm text-center py-10">Aún no hay ventas registradas</p> : (
                                <div className="table-wrapper max-h-[500px] overflow-y-auto w-full">
                                    <table className="data-table">
                                        <thead className="sticky top-0 bg-white shadow-sm"><tr>
                                            <th>Producto</th><th className="text-right">Unidades</th><th className="text-right">Ingresos</th>
                                            <th className="text-right">Costo</th><th className="text-right">Margen</th><th className="text-right">Margen %</th>
                                        </tr></thead>
                                        <tbody>
                                            {profitability.map(p => (
                                                <tr key={p.id}>
                                                    <td className="font-medium">{p.name}</td>
                                                    <td className="text-right text-primary-500">{p.unitsSold}</td>
                                                    <td className="text-right font-semibold">{FMT(p.revenue)}</td>
                                                    <td className="text-right text-primary-500">{FMT(p.cost)}</td>
                                                    <td className="text-right font-bold text-espresso">{FMT(p.margin)}</td>
                                                    <td className="text-right">
                                                        <span className={`font-semibold ${p.marginPct >= 30 ? 'text-green-600' : p.marginPct >= 10 ? 'text-yellow-600' : 'text-red-500'}`}>
                                                            {p.marginPct}%
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    )}

                    {/* VENTAS POR FRANJA HORARIA */}
                    {activeTab === 'franja' && (
                        <div className="card">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="font-semibold text-espresso flex items-center gap-2">
                                    <Clock className="w-5 h-5 text-blue-600" />Ventas por Franja Horaria
                                </h2>
                                <button onClick={() => exportExcel(byHour.map(h => ({ Hora: h.hour, Total: h.total, Órdenes: h.orders })), 'Franja Horaria', 'ventas_franja')}
                                    className="btn-secondary flex items-center gap-1.5 text-xs py-1 px-2.5">
                                    <FileSpreadsheet className="w-3.5 h-3.5" /> Excel
                                </button>
                            </div>
                            {byHour.filter(h => Number(h.total) > 0).length === 0 ? <p className="text-primary-400 text-sm text-center py-10">Sin ventas en el período</p> : (
                                <>
                                    <ResponsiveContainer width="100%" height={300}>
                                        <BarChart data={byHour.filter(h => Number(h.total) > 0)}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#D9C9B0" />
                                            <XAxis dataKey="hour" tick={{ fontSize: 10 }} stroke="#A67C52" />
                                            <YAxis tick={{ fontSize: 11 }} stroke="#A67C52" />
                                            <Tooltip formatter={(v: any) => FMT(v)} />
                                            <Bar dataKey="total" radius={[4, 4, 0, 0]}>
                                                {byHour.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                    <div className="table-wrapper max-h-[500px] overflow-y-auto w-full mt-4">
                                        <table className="data-table">
                                            <thead className="sticky top-0 bg-white shadow-sm"><tr>
                                                <th>Hora</th><th className="text-right">Total Ventas</th><th className="text-right">Órdenes</th>
                                            </tr></thead>
                                            <tbody>
                                                {byHour.filter(h => Number(h.total) > 0).map((h: any, i: number) => (
                                                    <tr key={i}>
                                                        <td className="font-medium">{h.hour}</td>
                                                        <td className="text-right font-bold text-espresso">{FMT(h.total)}</td>
                                                        <td className="text-right text-primary-500">{h.orders ?? '—'}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </>
                            )}
                        </div>
                    )}

                    {/* PRODUCTOS QUE NO ROTAN */}
                    {activeTab === 'no_rotan' && (
                        <div className="card">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="font-semibold text-espresso flex items-center gap-2">
                                    <PackageX className="w-5 h-5 text-red-500" />Productos sin Rotación ({fromDate} — {toDate})
                                </h2>
                                <button onClick={() => exportExcel(nonRotating, 'Sin rotación', 'sin_rotacion')}
                                    className="btn-secondary flex items-center gap-1.5 text-xs py-1 px-2.5">
                                    <FileSpreadsheet className="w-3.5 h-3.5" /> Excel
                                </button>
                            </div>
                            {nonRotating.length === 0 ? (
                                <p className="text-green-600 text-sm text-center py-10">Todos los productos tuvieron ventas en este período 🎉</p>
                            ) : (
                                <div className="table-wrapper max-h-[500px] overflow-y-auto w-full">
                                    <table className="data-table">
                                        <thead className="sticky top-0 bg-white shadow-sm">
                                            <tr>
                                                <th>Producto</th><th>Categoría</th><th className="text-right">Stock</th>
                                                <th className="text-right">Precio</th><th className="text-right">Días sin venta</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {nonRotating.map((p: any) => (
                                                <tr key={p.id}>
                                                    <td className="font-medium">{p.name}</td>
                                                    <td className="text-primary-500">{p.category}</td>
                                                    <td className="text-right">{p.stock}</td>
                                                    <td className="text-right">{FMT(p.price)}</td>
                                                    <td className="text-right">
                                                        <span className={`font-semibold ${p.daysSinceCreated > 60 ? 'text-red-500' : 'text-yellow-600'}`}>
                                                            {p.daysSinceCreated}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    )}

                    {/* GANANCIAS MENSUALES */}
                    {activeTab === 'ganancias' && (
                        <div className="space-y-6">
                            <div className="card">
                                <div className="flex items-center justify-between mb-4">
                                    <h2 className="font-semibold text-espresso flex items-center gap-2">
                                        <DollarSign className="w-5 h-5 text-emerald-600" />Ganancias Mensuales
                                    </h2>
                                    <button onClick={() => exportExcel(marginEvolution.map(m => ({ Mes: m.month, Ventas: m.sales, Compras: m.purchases, Margen: m.margin })), 'Ganancias', 'ganancias_mensuales')}
                                        className="btn-secondary flex items-center gap-1.5 text-xs py-1 px-2.5">
                                        <FileSpreadsheet className="w-3.5 h-3.5" /> Excel
                                    </button>
                                </div>
                                {marginEvolution.length === 0 ? <p className="text-primary-400 text-sm text-center py-10">Sin datos</p> : (
                                    <>
                                        <ResponsiveContainer width="100%" height={300}>
                                            <BarChart data={marginEvolution}>
                                                <CartesianGrid strokeDasharray="3 3" stroke="#D9C9B0" />
                                                <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="#A67C52" />
                                                <YAxis tick={{ fontSize: 11 }} stroke="#A67C52" />
                                                <Tooltip formatter={(v: any) => FMT(v)} />
                                                <Bar dataKey="sales" name="Ventas" fill="#6B3F1F" radius={[4, 4, 0, 0]} />
                                                <Bar dataKey="purchases" name="Compras" fill="#C49A6C" radius={[4, 4, 0, 0]} />
                                                <Bar dataKey="margin" name="Margen" fill="#10B981" radius={[4, 4, 0, 0]} />
                                            </BarChart>
                                        </ResponsiveContainer>
                                        <div className="table-wrapper max-h-[500px] overflow-y-auto w-full mt-4">
                                            <table className="data-table">
                                                <thead className="sticky top-0 bg-white shadow-sm"><tr>
                                                    <th>Mes</th><th className="text-right">Ventas</th><th className="text-right">Compras</th><th className="text-right">Margen</th><th className="text-right">Margen %</th>
                                                </tr></thead>
                                                <tbody>
                                                    {marginEvolution.map((m: any, i: number) => {
                                                        const pct = Number(m.sales) > 0 ? ((Number(m.margin) / Number(m.sales)) * 100).toFixed(1) : '0.0'
                                                        return (
                                                            <tr key={i}>
                                                                <td className="font-medium">{m.month}</td>
                                                                <td className="text-right font-semibold">{FMT(m.sales)}</td>
                                                                <td className="text-right text-primary-500">{FMT(m.purchases)}</td>
                                                                <td className="text-right font-bold text-espresso">{FMT(m.margin)}</td>
                                                                <td className="text-right">
                                                                    <span className={`font-semibold ${Number(pct) >= 30 ? 'text-green-600' : Number(pct) >= 10 ? 'text-yellow-600' : 'text-red-500'}`}>
                                                                        {pct}%
                                                                    </span>
                                                                </td>
                                                            </tr>
                                                        )
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    )}

                    {/* STOCK DETALLADO Y CRÍTICO */}
                    {activeTab === 'stock' && (
                        <div className="space-y-6">
                            {/* Summary cards */}
                            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                                <div className="card flex items-start gap-3 p-4">
                                    <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center"><Boxes className="w-5 h-5" /></div>
                                    <div><p className="text-xs text-primary-500 font-semibold uppercase">Total Productos</p><p className="text-xl font-bold text-espresso">{allItems.length}</p></div>
                                </div>
                                <div className="card flex items-start gap-3 p-4">
                                    <div className="w-10 h-10 rounded-xl bg-red-100 text-red-700 flex items-center justify-center"><AlertTriangle className="w-5 h-5" /></div>
                                    <div><p className="text-xs text-primary-500 font-semibold uppercase">Stock Crítico</p><p className="text-xl font-bold text-red-600">{criticalItems.length}</p></div>
                                </div>
                                <div className="card flex items-start gap-3 p-4">
                                    <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center"><AlertTriangle className="w-5 h-5" /></div>
                                    <div><p className="text-xs text-primary-500 font-semibold uppercase">Stock Bajo</p><p className="text-xl font-bold text-amber-600">{lowItems.length}</p></div>
                                </div>
                                <div className="card flex items-start gap-3 p-4">
                                    <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center"><Boxes className="w-5 h-5" /></div>
                                    <div><p className="text-xs text-primary-500 font-semibold uppercase">Stock OK</p><p className="text-xl font-bold text-emerald-600">{allItems.length - criticalItems.length - lowItems.length}</p></div>
                                </div>
                            </div>

                            {/* Critical stock table */}
                            {criticalItems.length > 0 && (
                                <div className="card border-l-4 border-l-red-500">
                                    <div className="flex items-center justify-between mb-4">
                                        <h2 className="font-semibold text-red-700 flex items-center gap-2">
                                            <AlertTriangle className="w-5 h-5" />Stock Crítico — Bajo el Mínimo
                                        </h2>
                                        <button onClick={() => exportExcel(criticalItems.map((i: any) => ({
                                            ID: i.id, Producto: i.name, Stock: i.stock, Mínimo: i.minStock,
                                            Categoría: i.category?.name ?? '—', Proveedor: i.supplier?.name ?? '—',
                                            Precio: i.price, Costo: i.cost,
                                        })), 'Stock Crítico', 'stock_critico')}
                                            className="btn-secondary flex items-center gap-1.5 text-xs py-1 px-2.5">
                                            <FileSpreadsheet className="w-3.5 h-3.5" /> Excel
                                        </button>
                                    </div>
                                    <div className="table-wrapper max-h-[500px] overflow-y-auto w-full">
                                        <table className="data-table">
                                            <thead className="sticky top-0 bg-white shadow-sm"><tr>
                                                <th>ID</th><th>Producto</th><th className="text-right">Stock</th><th className="text-right">Mínimo</th>
                                                <th>Categoría</th><th>Proveedor</th><th className="text-right">Precio</th><th className="text-right">Costo</th>
                                            </tr></thead>
                                            <tbody>
                                                {criticalItems.map((item: any) => (
                                                    <tr key={item.id}>
                                                        <td className="font-mono text-primary-400">{item.id}</td>
                                                        <td className="font-medium">{item.name}</td>
                                                        <td className="text-right"><span className="badge-red font-bold">{item.stock}</span></td>
                                                        <td className="text-right text-primary-500">{item.minStock}</td>
                                                        <td className="text-primary-400">{item.category?.name ?? '—'}</td>
                                                        <td className="text-primary-400">{item.supplier?.name ?? '—'}</td>
                                                        <td className="text-right font-semibold">{FMT(item.price)}</td>
                                                        <td className="text-right text-primary-500">{FMT(item.cost)}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            {/* Full stock table */}
                            <div className="card">
                                <div className="flex items-center justify-between mb-4">
                                    <h2 className="font-semibold text-espresso flex items-center gap-2">
                                        <Boxes className="w-5 h-5 text-primary-600" />Stock Detallado — Todos los Productos
                                    </h2>
                                    <button onClick={() => exportExcel(allItems.map((i: any) => ({
                                        ID: i.id, Producto: i.name, Stock: i.stock, Mínimo: i.minStock,
                                        Estado: stockStatus(i).label,
                                        Categoría: i.category?.name ?? '—', Proveedor: i.supplier?.name ?? '—',
                                        Precio: i.price, Costo: i.cost,
                                    })), 'Stock Detallado', 'stock_detallado')}
                                        className="btn-secondary flex items-center gap-1.5 text-xs py-1 px-2.5">
                                        <FileSpreadsheet className="w-3.5 h-3.5" /> Excel
                                    </button>
                                </div>
                                <div className="table-wrapper max-h-[500px] overflow-y-auto w-full">
                                    <table className="data-table">
                                        <thead className="sticky top-0 bg-white shadow-sm"><tr>
                                            <th>ID</th><th>Producto</th><th className="text-right">Stock</th><th className="text-right">Mínimo</th>
                                            <th>Estado</th><th>Categoría</th><th>Proveedor</th><th className="text-right">Precio</th><th className="text-right">Costo</th>
                                        </tr></thead>
                                        <tbody>
                                            {allItems.map((item: any) => {
                                                const st = stockStatus(item)
                                                return (
                                                    <tr key={item.id}>
                                                        <td className="font-mono text-primary-400">{item.id}</td>
                                                        <td className="font-medium">{item.name}</td>
                                                        <td className="text-right font-bold">{item.stock}</td>
                                                        <td className="text-right text-primary-500">{item.minStock}</td>
                                                        <td><span className={st.cls}>{st.label}</span></td>
                                                        <td className="text-primary-400">{item.category?.name ?? '—'}</td>
                                                        <td className="text-primary-400">{item.supplier?.name ?? '—'}</td>
                                                        <td className="text-right font-semibold">{FMT(item.price)}</td>
                                                        <td className="text-right text-primary-500">{FMT(item.cost)}</td>
                                                    </tr>
                                                )
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    )
}
