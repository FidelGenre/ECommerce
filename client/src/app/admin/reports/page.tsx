'use client'
import { useEffect, useState } from 'react'
import api from '@/lib/api'
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area } from 'recharts'
import { FileSpreadsheet, Printer, TrendingUp, Users, PackageX, Clock, Layers, FileText } from 'lucide-react'
import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

const FMT = (n: number) => `$${Number(n ?? 0).toLocaleString('es-AR')}`
const COLORS = ['#6B3F1F', '#C49A6C', '#8B5A2B', '#4A2C14', '#D9C9B0', '#A67C52', '#3E2723', '#D7CCC8']

interface ProfitRow {
    id: number; name: string; unitsSold: number
    revenue: number; cost: number; margin: number; marginPct: number
}

export default function ReportsPage() {
    const [sales, setSales] = useState<any[]>([])
    const [bySupplier, setBySupplier] = useState<any[]>([])
    const [byCategory, setByCategory] = useState<any[]>([])
    const [byHour, setByHour] = useState<any[]>([])
    const [marginEvolution, setMarginEvolution] = useState<any[]>([])
    const [topCustomers, setTopCustomers] = useState<any[]>([])
    const [topCustomersClients, setTopCustomersClients] = useState<any[]>([])
    const [salesByUsuario, setSalesByUsuario] = useState<any[]>([])
    const [salesByUsuarioClients, setSalesByUsuarioClients] = useState<any[]>([])
    const [nonRotating, setNonRotating] = useState<any[]>([])
    const [profitability, setProfitability] = useState<ProfitRow[]>([])
    const today = new Date().toISOString().slice(0, 10)
    const month30ago = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10)
    const [fromDate, setFromDate] = useState(month30ago)
    const [toDate, setToDate] = useState(today)
    const [loading, setLoading] = useState(true)
    const [activeTab, setActiveTab] = useState<'overview' | 'clients' | 'products'>('overview')

    const load = async () => {
        setLoading(true)
        try {
            const dateParam = fromDate && toDate
                ? `from=${fromDate}&to=${toDate}`
                : `days=30`
            // salesByHour and nonRotatingProducts only accept an integer 'days' param
            const daysDiff = fromDate && toDate
                ? Math.max(1, Math.ceil((new Date(toDate).getTime() - new Date(fromDate).getTime()) / 86400000))
                : 30
            const [s, sup, cat, hour, margin, top, topC, byClient, byClientC, nonRot, profit] = await Promise.all([
                api.get(`/api/admin/dashboard/sales-by-period?${dateParam}`),
                api.get(`/api/admin/dashboard/purchases-by-supplier?${dateParam}`),
                api.get(`/api/admin/dashboard/sales-by-category?${dateParam}`),
                api.get(`/api/admin/dashboard/sales-by-hour?days=${daysDiff}`),
                api.get('/api/admin/dashboard/margin-evolution?months=6'),
                api.get('/api/admin/dashboard/top-customers?limit=10'),
                api.get('/api/admin/dashboard/top-customers-clients?limit=10'),
                api.get('/api/admin/dashboard/sales-by-client'),
                api.get('/api/admin/dashboard/sales-by-client-only'),
                api.get(`/api/admin/dashboard/non-rotating?days=${daysDiff}`),
                api.get('/api/admin/dashboard/profitability'),
            ])
            setSales(s.data); setBySupplier(sup.data); setByCategory(cat.data)
            setByHour(hour.data); setMarginEvolution(margin.data)
            setTopCustomers(top.data); setTopCustomersClients(topC.data)
            setSalesByUsuario(byClient.data); setSalesByUsuarioClients(byClientC.data)
            setNonRotating(nonRot.data); setProfitability(profit.data)
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

        if (topCustomers.length > 0) {
            if (y > 220) { doc.addPage(); y = 14 }
            doc.setFontSize(13)
            doc.setTextColor(75, 46, 5)
            doc.text('Top Compradores', 14, y)
            autoTable(doc, {
                startY: y + 4,
                head: [['Comprador', 'Órdenes', 'Total']],
                body: topCustomers.map((r: any) => [r.name, r.orders, FMT(r.total)]),
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

    const tabs = [
        { key: 'overview', label: 'Visión General', icon: <Layers className="w-4 h-4" /> },
        { key: 'clients', label: 'Compradores', icon: <Users className="w-4 h-4" /> },
        { key: 'products', label: 'Productos', icon: <TrendingUp className="w-4 h-4" /> },
    ] as const

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
            <div className="flex gap-1 p-1 bg-primary-100 rounded-lg w-fit">
                {tabs.map(t => (
                    <button key={t.key}
                        onClick={() => setActiveTab(t.key)}
                        className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === t.key ? 'bg-white shadow text-espresso' : 'text-primary-500 hover:text-espresso'
                            }`}>{t.icon}{t.label}</button>
                ))}
            </div>

            {loading ? (
                <div className="flex justify-center py-24"><div className="w-8 h-8 border-4 border-primary-700 border-t-transparent rounded-full animate-spin" /></div>
            ) : (
                <>
                    {/* OVERVIEW TAB */}
                    {activeTab === 'overview' && (
                        <div className="space-y-6">
                            {/* Sales over time */}
                            <div className="card">
                                <div className="flex items-center justify-between mb-4">
                                    <h2 className="font-semibold text-espresso">Ventas en el Tiempo</h2>
                                    <button onClick={() => exportExcel(sales.map(s => ({ Fecha: s.date, Total: s.total })), 'Ventas', 'ventas_periodo')}
                                        className="btn-secondary flex items-center gap-1.5 text-xs py-1 px-2.5">
                                        <FileSpreadsheet className="w-3.5 h-3.5" /> Excel
                                    </button>
                                </div>
                                <ResponsiveContainer width="100%" height={280}>
                                    <AreaChart data={sales}>
                                        <defs><linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#6B3F1F" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#6B3F1F" stopOpacity={0} />
                                        </linearGradient></defs>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#D9C9B0" />
                                        <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="#A67C52" />
                                        <YAxis tick={{ fontSize: 11 }} stroke="#A67C52" />
                                        <Tooltip formatter={(v: any) => FMT(v)} />
                                        <Area type="monotone" dataKey="total" stroke="#6B3F1F" strokeWidth={2.5} fill="url(#salesGrad)" />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>

                            {/* Margin evolution + Sales by hour */}
                            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                                <div className="card">
                                    <div className="flex items-center justify-between mb-4">
                                        <h2 className="font-semibold text-espresso">Evolución del Margen</h2>
                                        <button onClick={() => exportExcel(marginEvolution, 'Margen', 'margen_mensual')}
                                            className="btn-secondary flex items-center gap-1.5 text-xs py-1 px-2.5">
                                            <FileSpreadsheet className="w-3.5 h-3.5" /> Excel
                                        </button>
                                    </div>
                                    <ResponsiveContainer width="100%" height={250}>
                                        <BarChart data={marginEvolution}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#D9C9B0" />
                                            <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="#A67C52" />
                                            <YAxis tick={{ fontSize: 11 }} stroke="#A67C52" />
                                            <Tooltip formatter={(v: any) => FMT(v)} />
                                            <Bar dataKey="sales" name="Ventas" fill="#6B3F1F" radius={[4, 4, 0, 0]} />
                                            <Bar dataKey="purchases" name="Compras" fill="#C49A6C" radius={[4, 4, 0, 0]} />
                                            <Bar dataKey="margin" name="Margen" fill="#4A2C14" radius={[4, 4, 0, 0]} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>

                                <div className="card">
                                    <h2 className="font-semibold text-espresso mb-4">
                                        <Clock className="w-4 h-4 inline mr-1.5" />Ventas por Franja Horaria
                                    </h2>
                                    <ResponsiveContainer width="100%" height={250}>
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
                                </div>
                            </div>

                            {/* By category + by supplier */}
                            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                                <div className="card">
                                    <h2 className="font-semibold text-espresso mb-4">Distribución por Categoría</h2>
                                    {byCategory.length === 0 ? <p className="text-primary-400 text-sm text-center py-10">Sin datos</p> : (
                                        <ResponsiveContainer width="100%" height={250}>
                                            <PieChart>
                                                <Pie data={byCategory} dataKey="total" nameKey="category" cx="50%" cy="50%" outerRadius={90} label={({ name }) => name}>
                                                    {byCategory.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                                                </Pie>
                                                <Tooltip formatter={(v: any) => FMT(v)} />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    )}
                                </div>
                                <div className="card">
                                    <h2 className="font-semibold text-espresso mb-4">Compras por Proveedor</h2>
                                    {bySupplier.length === 0 ? <p className="text-primary-400 text-sm text-center py-10">Sin datos</p> : (
                                        <ResponsiveContainer width="100%" height={250}>
                                            <PieChart>
                                                <Pie data={bySupplier} dataKey="total" nameKey="supplier" cx="50%" cy="50%" outerRadius={90} label={({ name }) => name}>
                                                    {bySupplier.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                                                </Pie>
                                                <Tooltip formatter={(v: any) => FMT(v)} />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* CLIENTS TAB */}
                    {activeTab === 'clients' && (
                        <div className="space-y-6">
                            {/* Top customers (General) */}
                            <div className="card">
                                <div className="flex items-center justify-between mb-4">
                                    <h2 className="font-semibold text-espresso">
                                        <Users className="w-4 h-4 inline mr-1.5" />Compradores Más Importantes
                                    </h2>
                                    <button onClick={() => exportExcel(topCustomers, 'Top Compradores', 'top_compradores')}
                                        className="btn-secondary flex items-center gap-1.5 text-xs py-1 px-2.5">
                                        <FileSpreadsheet className="w-3.5 h-3.5" /> Excel
                                    </button>
                                </div>
                                {topCustomers.length === 0 ? <p className="text-primary-400 text-sm text-center py-10">Sin datos de clientes</p> : (
                                    <div className="overflow-x-auto">
                                        <table className="data-table">
                                            <thead><tr>
                                                <th>#</th><th>Comprador</th><th>Email</th><th className="text-right">Pedidos</th><th className="text-right">Total</th>
                                            </tr></thead>
                                            <tbody>
                                                {topCustomers.map((c: any, i: number) => (
                                                    <tr key={c.id}>
                                                        <td className="font-bold text-primary-400">{i + 1}</td>
                                                        <td className="font-medium">{c.name}</td>
                                                        <td className="text-primary-500">{c.email || '—'}</td>
                                                        <td className="text-right">{c.orderCount}</td>
                                                        <td className="text-right font-bold text-espresso">{FMT(c.totalPurchases)}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>

                            {/* Sales by client (General) */}
                            <div className="card">
                                <div className="flex items-center justify-between mb-4">
                                    <h2 className="font-semibold text-espresso">Ventas por Comprador</h2>
                                    <button onClick={() => exportExcel(salesByUsuario, 'Ventas por Comprador', 'ventas_por_comprador')}
                                        className="btn-secondary flex items-center gap-1.5 text-xs py-1 px-2.5">
                                        <FileSpreadsheet className="w-3.5 h-3.5" /> Excel
                                    </button>
                                </div>
                                {salesByUsuario.length === 0 ? <p className="text-primary-400 text-sm text-center py-10">Sin datos</p> : (
                                    <div className="overflow-x-auto">
                                        <table className="data-table">
                                            <thead><tr>
                                                <th>Comprador</th><th className="text-right">Pedidos</th><th className="text-right">Total</th><th className="text-right">Ticket Promedio</th>
                                            </tr></thead>
                                            <tbody>
                                                {salesByUsuario.map((c: any, i: number) => (
                                                    <tr key={i}>
                                                        <td className="font-medium">{c.client}</td>
                                                        <td className="text-right">{c.orders}</td>
                                                        <td className="text-right font-bold text-espresso">{FMT(c.total)}</td>
                                                        <td className="text-right text-primary-500">{FMT(c.avgTicket)}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>

                            {/* Top clients (Solo Clientes) */}
                            <div className="card border-t-4 border-t-primary-600">
                                <div className="flex items-center justify-between mb-4">
                                    <h2 className="font-semibold text-espresso">
                                        <Users className="w-4 h-4 inline mr-1.5" />Compradores Más Importantes (Solo Clientes)
                                    </h2>
                                    <button onClick={() => exportExcel(topCustomersClients, 'Top Clientes', 'top_clientes_rol')}
                                        className="btn-secondary flex items-center gap-1.5 text-xs py-1 px-2.5">
                                        <FileSpreadsheet className="w-3.5 h-3.5" /> Excel
                                    </button>
                                </div>
                                {topCustomersClients.length === 0 ? <p className="text-primary-400 text-sm text-center py-10">Sin datos de clientes con rol CLIENTE</p> : (
                                    <div className="overflow-x-auto">
                                        <table className="data-table">
                                            <thead><tr>
                                                <th>#</th><th>Cliente</th><th>Email</th><th className="text-right">Pedidos</th><th className="text-right">Total</th>
                                            </tr></thead>
                                            <tbody>
                                                {topCustomersClients.map((c: any, i: number) => (
                                                    <tr key={c.id}>
                                                        <td className="font-bold text-primary-400">{i + 1}</td>
                                                        <td className="font-medium">{c.name}</td>
                                                        <td className="text-primary-500">{c.email || '—'}</td>
                                                        <td className="text-right">{c.orderCount}</td>
                                                        <td className="text-right font-bold text-espresso">{FMT(c.totalPurchases)}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>

                            {/* Sales by client (Solo Clientes) */}
                            <div className="card border-t-4 border-t-primary-600">
                                <div className="flex items-center justify-between mb-4">
                                    <h2 className="font-semibold text-espresso">Ventas por Comprador (Solo Clientes)</h2>
                                    <button onClick={() => exportExcel(salesByUsuarioClients, 'Ventas por Cliente', 'ventas_por_cliente_rol')}
                                        className="btn-secondary flex items-center gap-1.5 text-xs py-1 px-2.5">
                                        <FileSpreadsheet className="w-3.5 h-3.5" /> Excel
                                    </button>
                                </div>
                                {salesByUsuarioClients.length === 0 ? <p className="text-primary-400 text-sm text-center py-10">Sin datos de clientes con rol CLIENTE</p> : (
                                    <div className="overflow-x-auto">
                                        <table className="data-table">
                                            <thead><tr>
                                                <th>Cliente</th><th className="text-right">Pedidos</th><th className="text-right">Total</th><th className="text-right">Ticket Promedio</th>
                                            </tr></thead>
                                            <tbody>
                                                {salesByUsuarioClients.map((c: any, i: number) => (
                                                    <tr key={i}>
                                                        <td className="font-medium">{c.client}</td>
                                                        <td className="text-right">{c.orders}</td>
                                                        <td className="text-right font-bold text-espresso">{FMT(c.total)}</td>
                                                        <td className="text-right text-primary-500">{FMT(c.avgTicket)}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* PRODUCTS TAB */}
                    {activeTab === 'products' && (
                        <div className="space-y-6">
                            {/* Profitability table */}
                            <div className="card">
                                <div className="flex items-center justify-between mb-4">
                                    <h2 className="font-semibold text-espresso">
                                        <TrendingUp className="w-4 h-4 inline mr-1.5" />Rentabilidad por Producto
                                    </h2>
                                    <button onClick={() => exportExcel(
                                        profitability.map(p => ({ Producto: p.name, Unidades: p.unitsSold, Ingresos: p.revenue, Costo: p.cost, Margen: p.margin, 'Margen %': p.marginPct })),
                                        'Rentabilidad', 'rentabilidad'
                                    )} className="btn-secondary flex items-center gap-1.5 text-xs py-1 px-2.5">
                                        <FileSpreadsheet className="w-3.5 h-3.5" /> Excel
                                    </button>
                                </div>
                                {profitability.length === 0 ? <p className="text-primary-400 text-sm text-center py-10">Aún no hay ventas registradas</p> : (
                                    <div className="overflow-x-auto">
                                        <table className="data-table">
                                            <thead><tr>
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

                            {/* Non-rotating products */}
                            <div className="card">
                                <div className="flex items-center justify-between mb-4">
                                    <h2 className="font-semibold text-espresso">
                                        <PackageX className="w-4 h-4 inline mr-1.5" />Productos sin Rotación ({fromDate} — {toDate})
                                    </h2>
                                    <button onClick={() => exportExcel(nonRotating, 'Sin rotación', 'sin_rotacion')}
                                        className="btn-secondary flex items-center gap-1.5 text-xs py-1 px-2.5">
                                        <FileSpreadsheet className="w-3.5 h-3.5" /> Excel
                                    </button>
                                </div>
                                {nonRotating.length === 0 ? (
                                    <p className="text-green-600 text-sm text-center py-10">Todos los productos tuvieron ventas en este período 🎉</p>
                                ) : (
                                    <div className="overflow-x-auto">
                                        <table className="data-table">
                                            <thead><tr>
                                                <th>Producto</th><th>Categoría</th><th className="text-right">Stock</th>
                                                <th className="text-right">Precio</th><th className="text-right">Días sin venta</th>
                                            </tr></thead>
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
                        </div>
                    )}
                </>
            )}
        </div>
    )
}
