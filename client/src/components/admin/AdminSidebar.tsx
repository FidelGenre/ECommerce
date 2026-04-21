'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/lib/auth'
import { useState, useEffect } from 'react'
import {
    LayoutDashboard, ShoppingCart, Package2, Users, Truck,
    BarChart3, Boxes, Banknote, Bell, ClipboardList,
    Settings, LogOut, ChevronRight, Coffee, Package, Menu, X, Store
} from 'lucide-react'

const NAV = [
    { href: '/admin', icon: LayoutDashboard, label: 'Dashboard', perm: 'VIEW_DASHBOARD' },
    { href: '/admin/sales', icon: ShoppingCart, label: 'Ventas', perm: 'MANAGE_SALES' },
    { href: '/admin/purchases', icon: Truck, label: 'Compras', perm: 'MANAGE_PURCHASES' },
    { href: '/admin/inventory', icon: Boxes, label: 'Inventario', perm: 'MANAGE_INVENTORY' },
    { href: '/admin/cash', icon: Banknote, label: 'Caja', perm: 'MANAGE_CASH' },
    { href: '/admin/reports', icon: BarChart3, label: 'Informes', perm: 'VIEW_REPORTS' },
    { separator: true, label: 'Gestión', perm: null }, // Visibilidad condicional abajo
    { href: '/admin/productos', icon: Package, label: 'Productos', perm: 'MANAGE_INVENTORY' },
    { href: '/admin/clientes', icon: Users, label: 'Clientes', perm: 'MANAGE_CUSTOMERS' },
    { href: '/admin/costs', icon: ClipboardList, label: 'Costos Internos', perm: 'MANAGE_CASH' },
    { href: '/admin/suppliers', icon: Truck, label: 'Proveedores', perm: 'MANAGE_SUPPLIERS' },
    { href: '/admin/notifications', icon: Bell, label: 'Notificaciones', perm: 'MANAGE_SETTINGS' },
    { href: '/admin/audit', icon: ClipboardList, label: 'Auditoría', perm: 'MANAGE_SETTINGS' },
    { separator: true, label: 'Configuración', perm: 'MANAGE_SETTINGS' },
    { href: '/admin/settings/categories', icon: Settings, label: 'Categorías de Productos', perm: 'MANAGE_SETTINGS' },
    { href: '/admin/settings/supplier-categories', icon: Truck, label: 'Categorías de Proveedores', perm: 'MANAGE_SETTINGS' },
    { href: '/admin/settings/users', icon: Users, label: 'Usuarios y Permisos', perm: 'MANAGE_SETTINGS' },
    { href: '/admin/settings/payments', icon: Banknote, label: 'Formas de Pago', perm: 'MANAGE_SETTINGS' },
    { href: '/admin/settings/statuses', icon: Settings, label: 'Estados de Operación', perm: 'MANAGE_SETTINGS' },
]

function SidebarInner({ onNav }: { onNav?: () => void }) {
    const pathname = usePathname()
    const { user, logout } = useAuth()

    return (
        <>
            {/* Logo */}
            <Link href="/" className="flex items-center gap-3 px-6 py-5 border-b border-primary-800 hover:bg-primary-800/40 transition-colors group">
                <div className="w-9 h-9 bg-caramel rounded-lg flex items-center justify-center">
                    <Coffee className="w-5 h-5 text-espresso" />
                </div>
                <div>
                    <h1 className="text-white font-bold text-base leading-tight">Coffee Beans</h1>
                    <p className="text-white/60 text-xs group-hover:text-white/80 transition-colors">← Ir al inicio</p>
                </div>
            </Link>

            {/* Nav */}
            <nav className="flex-1 px-3 py-4 overflow-y-auto space-y-0.5 sidebar-scroll">
                {NAV.map((item, i) => {
                    const hasPerm = !item.perm || user?.role === 'ADMIN' || (user?.permissions && user.permissions.includes(item.perm as string))
                    if (!hasPerm) return null

                    if ('separator' in item) {
                        return (
                            <div key={i} className="pt-4 pb-1 px-3">
                                <p className="text-white/60 text-xs font-semibold uppercase tracking-wider">{item.label}</p>
                            </div>
                        )
                    }
                    const Icon = item.icon!
                    const active = pathname === item.href || (item.href !== '/admin' && pathname.startsWith(item.href!))
                    return (
                        <Link key={item.href} href={item.href!} onClick={onNav} className={`sidebar-link ${active ? 'active' : ''}`}>
                            <Icon className="w-4 h-4 shrink-0" />
                            <span className="flex-1">{item.label}</span>
                            {active && <ChevronRight className="w-3 h-3 opacity-60" />}
                        </Link>
                    )
                })}
            </nav>

            {/* User + Logout */}
            <div className="border-t border-primary-800 px-4 py-4">
                <div className="flex items-center gap-3 mb-3">
                    <div className="w-8 h-8 bg-caramel rounded-full flex items-center justify-center text-espresso font-bold text-sm">
                        {user?.username?.[0]?.toUpperCase() ?? 'A'}
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-white text-sm font-medium truncate">{user?.username}</p>
                        <p className="text-white/60 text-xs">{user?.role}</p>
                    </div>
                </div>
                <button onClick={logout} className="w-full flex items-center gap-2 text-primary-300 hover:text-white hover:bg-primary-700/40 px-3 py-2 rounded-lg text-sm transition-colors">
                    <LogOut className="w-4 h-4" />
                    Cerrar sesión
                </button>
            </div>
        </>
    )
}

export default function AdminSidebar() {
    const [mobileOpen, setMobileOpen] = useState(false)
    const pathname = usePathname()
    const { user, logout } = useAuth()

    // Lock body scroll when mobile menu is open
    useEffect(() => {
        if (mobileOpen) {
            document.body.classList.add('menu-open')
        } else {
            document.body.classList.remove('menu-open')
        }
        return () => document.body.classList.remove('menu-open')
    }, [mobileOpen])

    return (
        <>
            {/* Desktop */}
            <aside className="hidden lg:flex fixed left-0 top-0 h-screen w-64 bg-primary-600 flex-col z-40 shadow-2xl">
                <SidebarInner />
            </aside>

            {/* Mobile top bar */}
            <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-primary-600 flex items-center justify-between px-4 py-3 shadow-lg">
                <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 bg-caramel rounded-lg flex items-center justify-center">
                        <Coffee className="w-4 h-4 text-espresso" />
                    </div>
                    <span className="text-white font-bold">Coffee Beans</span>
                </div>
                <button onClick={() => setMobileOpen(true)} className="w-9 h-9 bg-white/10 rounded-lg flex items-center justify-center text-white">
                    <Menu className="w-5 h-5" />
                </button>
            </div>

            {/* Mobile fullscreen overlay */}
            {mobileOpen && (
                <div className="lg:hidden fixed inset-0 z-[9999] bg-primary-600/98 backdrop-blur-sm flex flex-col overlay-animate"
                    style={{ touchAction: 'none' }}>
                    {/* Top bar */}
                    <div className="flex items-center justify-between px-4 py-3 border-b border-primary-800">
                        <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 bg-caramel rounded-lg flex items-center justify-center">
                                <Coffee className="w-4 h-4 text-espresso" />
                            </div>
                            <span className="text-white font-bold">Coffee Beans</span>
                        </div>
                        <button type="button" onClick={() => setMobileOpen(false)}
                            className="relative z-50 w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center text-white hover:bg-white/20 transition-colors cursor-pointer touch-manipulation">
                            <X className="w-6 h-6" />
                        </button>
                    </div>

                    {/* Centered nav items */}
                    <div className="flex-1 flex flex-col items-center justify-center overflow-y-auto py-4 -mt-4 overlay-items-animate">
                        {NAV.map((item, i) => {
                            const hasPerm = !item.perm || user?.role === 'ADMIN' || (user?.permissions && user.permissions.includes(item.perm as string))
                            if (!hasPerm) return null

                            if ('separator' in item) {
                                return (
                                    <div key={i} className="w-48 mt-3 mb-1">
                                        <p className="text-primary-500 text-[10px] font-semibold uppercase tracking-widest text-center">{item.label}</p>
                                    </div>
                                )
                            }
                            const Icon = item.icon!
                            const active = pathname === item.href || (item.href !== '/admin' && pathname.startsWith(item.href!))
                            return (
                                <Link key={item.href} href={item.href!} onClick={() => setMobileOpen(false)}
                                    className={`flex items-center gap-2.5 py-2 text-sm font-medium transition-colors ${active ? 'text-caramel' : 'text-primary-300 hover:text-white'
                                        }`}>
                                    <Icon className="w-4 h-4" />
                                    {item.label}
                                </Link>
                            )
                        })}

                        {/* Separator */}
                        <div className="w-16 h-px bg-primary-500/30 my-3" />

                        {/* Quick links */}
                        <Link href="/" onClick={() => setMobileOpen(false)}
                            className="flex items-center gap-2 text-primary-300 hover:text-white text-sm font-medium py-2 transition-colors">
                            <Store className="w-4 h-4" /> Ir a la tienda
                        </Link>
                    </div>

                    {/* User + Logout at bottom */}
                    <div className="border-t border-primary-800 px-6 py-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-caramel rounded-full flex items-center justify-center text-espresso font-bold text-sm">
                                {user?.username?.[0]?.toUpperCase() ?? 'A'}
                            </div>
                            <div>
                                <p className="text-white text-sm font-medium">{user?.username}</p>
                                <p className="text-primary-400 text-xs">{user?.role}</p>
                            </div>
                        </div>
                        <button onClick={logout} className="flex items-center gap-2 text-primary-300 hover:text-white text-sm transition-colors">
                            <LogOut className="w-4 h-4" /> Salir
                        </button>
                    </div>
                </div>
            )}
        </>
    )
}
