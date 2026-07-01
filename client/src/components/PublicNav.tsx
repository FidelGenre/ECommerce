'use client'
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import { useAuth } from '@/lib/auth'
import { useCart } from '@/lib/cart'
import { ShoppingCart, User, X, Menu, ChevronRight, Star } from 'lucide-react'

const NAV_LINKS = [
    { href: '/#inicio', label: 'Inicio' },
    { href: '/#nosotros', label: 'Nosotros' },
    { href: '/#productos', label: 'Productos' },
    { href: '/#contacto', label: 'Contacto' },
]

/** Shared public storefront navbar (home + catálogo): desktop links with the
 *  Productos dropdown, user/cart icons, and the mobile hamburger overlay. */
export function PublicNav({ onCartClick }: { onCartClick: () => void }) {
    const { user } = useAuth()
    const { cartCount } = useCart()
    const [mobileMenu, setMobileMenu] = useState(false)

    // Lock body scroll while the mobile menu is open.
    useEffect(() => {
        if (mobileMenu) document.body.classList.add('menu-open')
        else document.body.classList.remove('menu-open')
        return () => document.body.classList.remove('menu-open')
    }, [mobileMenu])

    return (
        <nav className="bg-primary-600 relative z-50 shadow-lg">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
                <Link href="/" className="text-white font-bold text-xl tracking-wide hover:text-caramel transition-colors">
                    Coffee Beans
                </Link>

                {/* Desktop nav */}
                <div className="hidden md:flex items-center gap-8">
                    {NAV_LINKS.map(l => (
                        l.href === '/#productos' ? (
                            <div key={l.href} className="relative group">
                                <Link href={l.href} className="text-primary-300 group-hover:text-white text-sm font-medium transition-colors inline-flex items-center gap-1">
                                    {l.label}
                                    <ChevronRight className="w-3.5 h-3.5 rotate-90 transition-transform group-hover:translate-y-0.5" />
                                </Link>
                                <div className="absolute left-1/2 -translate-x-1/2 top-full pt-3 w-52 opacity-0 invisible translate-y-1 group-hover:opacity-100 group-hover:visible group-hover:translate-y-0 transition-all duration-200 z-50">
                                    <div className="bg-primary-700 rounded-xl shadow-xl border border-primary-800 overflow-hidden py-1">
                                        <Link href="/catalogo-productos" className="block px-4 py-2.5 text-sm font-semibold text-center text-primary-100 hover:bg-primary-600 hover:text-white transition-colors">
                                            Catálogo completo →
                                        </Link>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <Link key={l.href} href={l.href} className="text-primary-300 hover:text-white text-sm font-medium transition-colors">
                                {l.label}
                            </Link>
                        )
                    ))}
                </div>

                <div className="flex items-center gap-2">
                    {/* Desktop-only user icons */}
                    {user ? (
                        <>
                            <Link href="/account" className="hidden md:flex w-9 h-9 bg-primary-700/60 hover:bg-primary-800 rounded-lg items-center justify-center text-white transition-colors">
                                <User className="w-4 h-4" />
                            </Link>
                            {((user.permissions && user.permissions.length > 0) || user.role === 'ADMIN') && (
                                <Link href="/admin" className="hidden md:flex px-3 h-9 bg-primary-700/60 hover:bg-primary-800 rounded-lg items-center justify-center text-caramel font-semibold text-xs transition-colors">
                                    Panel
                                </Link>
                            )}
                        </>
                    ) : (
                        <Link href="/login" className="hidden md:flex w-9 h-9 bg-caramel hover:bg-amber-500 rounded-lg items-center justify-center text-white transition-colors">
                            <User className="w-4 h-4" />
                        </Link>
                    )}

                    <button onClick={onCartClick}
                        className="relative w-9 h-9 bg-primary-600 hover:bg-primary-500 rounded-lg flex items-center justify-center text-white transition-colors">
                        <ShoppingCart className="w-4 h-4" />
                        {cartCount > 0 && (
                            <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                                {cartCount}
                            </span>
                        )}
                    </button>

                    <button onClick={() => setMobileMenu(!mobileMenu)}
                        className="md:hidden w-9 h-9 bg-primary-700/60 rounded-lg flex items-center justify-center text-white">
                        {mobileMenu ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
                    </button>
                </div>
            </div>

            {/* Mobile overlay */}
            {mobileMenu && typeof document !== 'undefined' && createPortal(
                <div className="fixed inset-0 z-[9999] bg-primary-800/95 backdrop-blur-sm flex flex-col overlay-animate"
                    style={{ overscrollBehavior: 'contain' }}
                    onClick={() => setMobileMenu(false)}>
                    <div className="flex items-center justify-between px-4 py-4" onClick={e => e.stopPropagation()}>
                        <span className="text-white font-bold text-xl tracking-wide">Coffee Beans</span>
                        <div className="flex items-center gap-2">
                            <button type="button" onClick={() => { setMobileMenu(false); onCartClick() }}
                                className="relative w-9 h-9 bg-primary-700/60 rounded-lg flex items-center justify-center text-white active:scale-90 transition-transform">
                                <ShoppingCart className="w-4 h-4" />
                                {cartCount > 0 && (
                                    <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                                        {cartCount}
                                    </span>
                                )}
                            </button>
                            <button type="button" onClick={() => setMobileMenu(false)}
                                className="w-9 h-9 flex items-center justify-center text-white hover:text-primary-300 active:scale-90 transition-all">
                                <X className="w-6 h-6" />
                            </button>
                        </div>
                    </div>

                    <div className="flex-1 flex flex-col items-center justify-center gap-2 overlay-items-animate">
                        {NAV_LINKS.map(l => (
                            <Link key={l.href} href={l.href}
                                onClick={() => setMobileMenu(false)}
                                className="text-white text-2xl font-bold hover:text-caramel active:scale-95 transition-all py-3">
                                {l.label}
                            </Link>
                        ))}

                        <div className="w-16 h-px bg-primary-500/40 my-3" />

                        {user ? (
                            <>
                                <Link href="/account" onClick={() => setMobileMenu(false)}
                                    className="flex items-center gap-2 text-primary-300 hover:text-white text-lg font-medium py-2 active:scale-95 transition-all">
                                    <User className="w-5 h-5" /> Mi Cuenta
                                </Link>
                                {((user.permissions && user.permissions.length > 0) || user.role === 'ADMIN') && (
                                    <Link href="/admin" onClick={() => setMobileMenu(false)}
                                        className="flex items-center gap-2 text-caramel hover:text-amber-300 text-lg font-medium py-2 active:scale-95 transition-all">
                                        <Star className="w-5 h-5" /> Panel de Admin
                                    </Link>
                                )}
                            </>
                        ) : (
                            <Link href="/login" onClick={() => setMobileMenu(false)}
                                className="flex items-center gap-2 text-caramel hover:text-amber-300 text-lg font-medium py-2 active:scale-95 transition-all">
                                <User className="w-5 h-5" /> Iniciar sesión
                            </Link>
                        )}
                    </div>
                </div>,
                document.body
            )}
        </nav>
    )
}
