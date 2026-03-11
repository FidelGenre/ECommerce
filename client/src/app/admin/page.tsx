'use client'
import { useEffect, useState } from 'react'
import api from '@/lib/api'
import { DashboardKpi } from '@/types'
import {
    TrendingUp, ShoppingCart, Package, AlertTriangle,
    DollarSign, Bell, Boxes, RefreshCw, Users, Calendar
} from 'lucide-react'
import {
    LineChart, Line, BarChart, Bar, XAxis, YAxis,
    CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth'

const FMT = (n: number) => `$${Number(n ?? 0).toLocaleString('es-AR')}`

function KpiCard({ icon: Icon, label, value, sub, color }: any) {
    return (
        <div className="card flex items-start gap-3 hover:shadow-md transition-shadow p-4 min-w-0">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
                <Icon className="w-6 h-6" />
            </div>
            <div className="min-w-0 flex-1">
                <p className="text-xs text-primary-500 uppercase tracking-wide font-semibold truncate">{label}</p>
                <p className="text-lg sm:text-xl md:text-2xl font-bold text-espresso mt-0.5" title={String(value)}>{value}</p>
                {sub && <p className="text-xs text-primary-400 mt-0.5 truncate">{sub}</p>}
            </div>
        </div>
    )
}

const CHART_COLORS = ['#6B3F1F', '#C49A6C', '#8B5A2B', '#4A2C14', '#D9C9B0']

type Preset = 'today' | '7d' | '30d' | 'month' | 'year' | 'custom'

function getPresetDates(preset: Preset): { from: string; to: string; label: string } {
    const now = new Date()
    const fmt = (d: Date) => d.toISOString().split('T')[0]
    const today = fmt(now)
    switch (preset) {
        case 'today':
            return { from: today, to: today, label: 'Hoy' }
        case '7d': {
            const d = new Date(now); d.setDate(d.getDate() - 7)
            return { from: fmt(d), to: today, label: 'Últimos 7 días' }
        }
        case '30d': {
            const d = new Date(now); d.setDate(d.getDate() - 30)
            return { from: fmt(d), to: today, label: 'Últimos 30 días' }
        }
        case 'month': {
            const d = new Date(now.getFullYear(), now.getMonth(), 1)
            return { from: fmt(d), to: today, label: 'Este mes' }
        }
        case 'year': {
            const d = new Date(now.getFullYear(), 0, 1)
            return { from: fmt(d), to: today, label: 'Este año' }
        }
        default:
            return { from: today, to: today, label: 'Personalizado' }
    }
}

export default function AdminDashboard() {
    const { user } = useAuth()
    const router = useRouter()

    useEffect(() => {
        if (user?.role === 'SUPPLIER') {
            router.replace('/admin/inventory')
        }
    }, [user, router])

    const [kpi, setKpi] = useState<DashboardKpi | null>(null)
    const [sales, setSales] = useState<any[]>([])
    const [bySupplier, setBy] = useState<any[]>([])
    const [lowStock, setLow] = useState<any[]>([])
    const [topCustomers, setTopCustomers] = useState<any[]>([])
    const [byCategory, setByCategory] = useState<any[]>([])
    const [salesByPayment, setSalesByPayment] = useState<any[]>([])
    const [purchasesByPayment, setPurchasesByPayment] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    const [preset, setPreset] = useState<Preset>('30d')
    const [dateFrom, setDateFrom] = useState(() => getPresetDates('30d').from)
    const [dateTo, setDateTo] = useState(() => getPresetDates('30d').to)

    const load = async (from: string, to: string) => {
        if (user?.role === 'SUPPLIER') return
        setLoading(true)
        try {
            const params = `from=${from}&to=${to}`
            const [k, s, sup, ls, tc, cat] = await Promise.all([
                api.get(`/api/admin/dashboard/kpi?${params}`),
                api.get(`/api/admin/dashboard/sales-by-period?${params}`),
                api.get(`/api/admin/dashboard/purchases-by-supplier?${params}`),
                api.get('/api/admin/dashboard/low-stock'),
                api.get(`/api/admin/dashboard/top-customers?limit=5`),
                api.get(`/api/admin/dashboard/sales-by-category?${params}`),
            ])
            setKpi(k.data); setSales(s.data); setBy(sup.data); setLow(ls.data)
            setTopCustomers(tc.data); setByCategory(cat.data)

            // Payment breakdown — optional (won't crash dashboard if endpoint missing)
            const [spResult, ppResult] = await Promise.allSettled([
                api.get(`/api/admin/dashboard/sales-by-payment?${params}`),
                api.get(`/api/admin/dashboard/purchases-by-payment?${params}`),
            ])
            if (spResult.status === 'fulfilled') setSalesByPayment(spResult.value.data)
            if (ppResult.status === 'fulfilled') setPurchasesByPayment(ppResult.value.data)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => { load(dateFrom, dateTo) }, [dateFrom, dateTo])

    const handlePreset = (p: Preset) => {
        setPreset(p)
        if (p !== 'custom') {
            const { from, to } = getPresetDates(p)
            setDateFrom(from)
            setDateTo(to)
        }
    }

    const presetLabel = preset !== 'custom' ? getPresetDates(preset).label : `${dateFrom} — ${dateTo}`

    if (loading && !kpi) return (
        <div className="flex items-center justify-center h-64">
            <div className="w-8 h-8 border-4 border-primary-700 border-t-transparent rounded-full animate-spin" />
        </div>
    )

    return (
        <div className="space-y-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-espresso">Dashboard</h1>
                    <p className="text-primary-500 text-sm mt-0.5">Resumen del negocio — {presetLabel}</p>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={() => load(dateFrom, dateTo)} className="btn-ghost flex items-center gap-2 text-sm">
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Actualizar
                    </button>
                </div>
            </div>

            {/* Date range selector */}
            <div className="card !p-3">
                <div className="flex flex-wrap items-center gap-2">
                    <Calendar className="w-4 h-4 text-primary-500 shrink-0" />
                    {([
                        ['today', 'Hoy'],
                        ['7d', '7 días'],
                        ['30d', '30 días'],
                        ['month', 'Este mes'],
                        ['year', 'Este año'],
                    ] as [Preset, string][]).map(([key, label]) => (
                        <button key={key} onClick={() => handlePreset(key)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${preset === key
                                ? 'bg-espresso text-white shadow-sm'
                                : 'bg-primary-50 text-primary-600 hover:bg-primary-100'
                                }`}>
                            {label}
                        </button>
                    ))}
                    <div className="h-5 w-px bg-primary-200 mx-1 hidden sm:block" />
                    <div className="flex items-center gap-1.5">
                        <input type="date" value={dateFrom}
                            onChange={e => { setPreset('custom'); setDateFrom(e.target.value) }}
                            className="input !w-auto !py-1 !px-2 text-xs" />
                        <span className="text-primary-400 text-xs">—</span>
                        <input type="date" value={dateTo}
                            onChange={e => { setPreset('custom'); setDateTo(e.target.value) }}
                            className="input !w-auto !py-1 !px-2 text-xs" />
                    </div>
                </div>
            </div>

            {/* KPI Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                <KpiCard icon={DollarSign} label="Ventas" value={FMT(kpi?.salesPeriod ?? 0)} sub={`${FMT(kpi?.salesMercadoPago ?? 0)} MP / ${FMT(kpi?.salesOther ?? 0)} Otros`} color="bg-emerald-100 text-emerald-700" />
                <KpiCard icon={ShoppingCart} label="Compras" value={FMT(kpi?.purchasesPeriod ?? 0)} sub={`${FMT(kpi?.purchasesMercadoPago ?? 0)} MP / ${FMT(kpi?.purchasesOther ?? 0)} Otros`} color="bg-amber-100 text-amber-700" />
                <KpiCard icon={TrendingUp} label="Margen Bruto" value={FMT(kpi?.grossMargin ?? 0)} sub={presetLabel} color="bg-primary-100 text-primary-700" />
                <KpiCard icon={Boxes} label="Stock Crítico" value={kpi?.criticalStock ?? 0} sub="Ítems bajo mínimo" color="bg-red-100 text-red-700" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                <KpiCard icon={ShoppingCart} label="Órdenes" value={kpi?.orderCount ?? 0} sub={presetLabel} color="bg-blue-100 text-blue-700" />
                <KpiCard icon={DollarSign} label="Ticket Promedio" value={FMT(kpi?.avgTicket ?? 0)} sub={presetLabel} color="bg-violet-100 text-violet-700" />
                <KpiCard icon={Bell} label="Alertas sin leer" value={kpi?.unreadAlerts ?? 0} color="bg-orange-100 text-orange-700" />
                <KpiCard icon={Package} label="Productos Activos" value={kpi?.activeProducts ?? 0} color="bg-teal-100 text-teal-700" />
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                <div className="card">
                    <h2 className="text-base font-semibold text-espresso mb-4">Ventas — {presetLabel}</h2>
                    {sales.length === 0
                        ? <p className="text-primary-400 text-sm text-center py-16">Sin ventas en el período seleccionado</p>
                        : <ResponsiveContainer width="100%" height={220}>
                            <LineChart data={sales}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#D9C9B0" />
                                <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="#A67C52" />
                                <YAxis tick={{ fontSize: 11 }} stroke="#A67C52" />
                                <Tooltip formatter={(v: any) => FMT(v)} />
                                <Line type="monotone" dataKey="total" stroke="#6B3F1F" strokeWidth={2.5} dot={false} />
                            </LineChart>
                        </ResponsiveContainer>
                    }
                </div>

                <div className="card">
                    <h2 className="text-base font-semibold text-espresso mb-4">Compras por Proveedor</h2>
                    {bySupplier.length === 0
                        ? <p className="text-primary-400 text-sm text-center py-10">Sin datos en el período</p>
                        : <ResponsiveContainer width="100%" height={220}>
                            <BarChart data={bySupplier}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#D9C9B0" />
                                <XAxis dataKey="supplier" tick={{ fontSize: 11 }} stroke="#A67C52" />
                                <YAxis tick={{ fontSize: 11 }} stroke="#A67C52" />
                                <Tooltip formatter={(v: any) => FMT(v)} />
                                <Bar dataKey="total" radius={[4, 4, 0, 0]}>
                                    {bySupplier.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    }
                </div>
            </div>

            {/* Low Stock Table */}
            {lowStock.length > 0 && (
                <div className="card">
                    <div className="flex items-center gap-2 mb-4">
                        <AlertTriangle className="w-5 h-5 text-red-500" />
                        <h2 className="text-base font-semibold text-espresso">Stock Crítico</h2>
                    </div>
                    <div className="table-wrapper">
                        <table className="data-table">
                            <thead><tr>
                                <th>Producto</th><th>Stock</th><th>Mínimo</th><th>Categoría</th>
                            </tr></thead>
                            <tbody>
                                {lowStock.map((item: any) => (
                                    <tr key={item.id}>
                                        <td className="font-medium">{item.name}</td>
                                        <td><span className="badge-red">{item.stock}</span></td>
                                        <td className="text-primary-500">{item.minStock}</td>
                                        <td className="text-primary-400">{item.category?.name ?? '—'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Top Customers + Category Distribution */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                {topCustomers.length > 0 && (
                    <div className="card">
                        <div className="flex items-center gap-2 mb-4">
                            <Users className="w-5 h-5 text-primary-600" />
                            <h2 className="text-base font-semibold text-espresso">Top 5 Clientes</h2>
                        </div>
                        <div className="table-wrapper">
                            <table className="data-table">
                                <thead><tr><th>#</th><th>Cliente</th><th className="text-right">Total</th></tr></thead>
                                <tbody>
                                    {topCustomers.map((c: any, i: number) => (
                                        <tr key={c.id}>
                                            <td className="font-bold text-primary-400">{i + 1}</td>
                                            <td className="font-medium">{c.name}</td>
                                            <td className="text-right font-bold text-espresso">{FMT(c.totalPurchases)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {byCategory.length > 0 && (
                    <div className="card">
                        <h2 className="text-base font-semibold text-espresso mb-4">Ventas por Categoría</h2>
                        <ResponsiveContainer width="100%" height={220}>
                            <PieChart>
                                <Pie data={byCategory} dataKey="total" nameKey="category" cx="50%" cy="50%" outerRadius={80} label={({ name }) => name}>
                                    {byCategory.map((_: any, i: number) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                                </Pie>
                                <Tooltip formatter={(v: any) => FMT(v)} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                )}
            </div>

            {/* Payment Method Breakdown */}
            {(salesByPayment.length > 0 || purchasesByPayment.length > 0) && (
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                    {salesByPayment.length > 0 && (
                        <div className="card">
                            <h2 className="text-base font-semibold text-espresso mb-4">Ventas por Método de Pago</h2>
                            <ResponsiveContainer width="100%" height={Math.max(160, salesByPayment.length * 52)}>
                                <BarChart data={salesByPayment} layout="vertical" margin={{ left: 8, right: 24, top: 4, bottom: 4 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#D9C9B0" horizontal={false} />
                                    <XAxis type="number" tick={{ fontSize: 10 }} stroke="#A67C52" tickFormatter={(v) => `$${Number(v).toLocaleString('es-AR')}`} />
                                    <YAxis type="category" dataKey="method" tick={{ fontSize: 11 }} width={96} stroke="#A67C52" />
                                    <Tooltip formatter={(v: any) => FMT(v)} cursor={{ fill: '#f5ede3' }} />
                                    <Bar dataKey="total" radius={[0, 4, 4, 0]}>
                                        {salesByPayment.map((_: any, i: number) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                            <div className="mt-3 divide-y divide-muted">
                                {salesByPayment.map((r: any) => (
                                    <div key={r.method} className="flex items-center justify-between py-1.5 text-sm">
                                        <span className="text-primary-600 font-medium">{r.method}</span>
                                        <div className="text-right">
                                            <span className="font-bold text-espresso">{FMT(r.total)}</span>
                                            <span className="text-primary-400 text-xs ml-2">({r.orders} órd.)</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {purchasesByPayment.length > 0 && (
                        <div className="card">
                            <h2 className="text-base font-semibold text-espresso mb-4">Compras por Método de Pago</h2>
                            <ResponsiveContainer width="100%" height={Math.max(160, purchasesByPayment.length * 52)}>
                                <BarChart data={purchasesByPayment} layout="vertical" margin={{ left: 8, right: 24, top: 4, bottom: 4 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#D9C9B0" horizontal={false} />
                                    <XAxis type="number" tick={{ fontSize: 10 }} stroke="#A67C52" tickFormatter={(v) => `$${Number(v).toLocaleString('es-AR')}`} />
                                    <YAxis type="category" dataKey="method" tick={{ fontSize: 11 }} width={96} stroke="#A67C52" />
                                    <Tooltip formatter={(v: any) => FMT(v)} cursor={{ fill: '#f5ede3' }} />
                                    <Bar dataKey="total" radius={[0, 4, 4, 0]}>
                                        {purchasesByPayment.map((_: any, i: number) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                            <div className="mt-3 divide-y divide-muted">
                                {purchasesByPayment.map((r: any) => (
                                    <div key={r.method} className="flex items-center justify-between py-1.5 text-sm">
                                        <span className="text-primary-600 font-medium">{r.method}</span>
                                        <div className="text-right">
                                            <span className="font-bold text-espresso">{FMT(r.total)}</span>
                                            <span className="text-primary-400 text-xs ml-2">({r.orders} órd.)</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
