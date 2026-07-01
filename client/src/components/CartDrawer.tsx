'use client'
import { useState } from 'react'
import api from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { useCart } from '@/lib/cart'
import { ShoppingCart, X, Coffee, Plus, Minus } from 'lucide-react'

const FMT = (n: number) => `$${Number(n ?? 0).toLocaleString('es-AR')}`

/**
 * Floating cart button + slide-in cart drawer. Shares the global cart (useCart)
 * so it works identically on any page (home, catálogo, etc.).
 */
interface CartDrawerProps {
    /** Controlled open state. When provided, the drawer is opened/closed by the
     *  parent (e.g. a navbar cart button) in addition to its own triggers. */
    open?: boolean
    onOpenChange?: (open: boolean) => void
    /** Show the floating cart button. Defaults to true when uncontrolled. Pass true
     *  on controlled pages that still want a floating button (e.g. catálogo, whose
     *  navbar scrolls away). */
    showFloatingButton?: boolean
}

export function CartDrawer({ open, onOpenChange, showFloatingButton }: CartDrawerProps = {}) {
    const { user } = useAuth()
    const { cart, updateQty, setQtyExact, removeFromCart, cartTotal, cartCount } = useCart()
    const controlled = open !== undefined
    const [internalOpen, setInternalOpen] = useState(false)
    const showCart = controlled ? open : internalOpen
    const setShowCart = (v: boolean) => {
        if (controlled) onOpenChange?.(v)
        else setInternalOpen(v)
    }
    // Show the floating button when explicitly requested, or by default when uncontrolled.
    const floatingButton = showFloatingButton ?? !controlled
    const [checkoutLoading, setCheckoutLoading] = useState(false)

    const handleCheckout = async () => {
        if (cart.length === 0) return
        if (!user) {
            window.location.href = '/login'
            return
        }
        setCheckoutLoading(true)
        try {
            const payload = {
                frontendUrl: window.location.origin,
                lines: cart.map(c => ({ itemId: c.item.id, quantity: c.qty, unitPrice: c.item.price }))
            }
            const res = await api.post('/api/checkout/preference', payload)
            if (res.data?.init_point) {
                if (res.data.orderId) {
                    sessionStorage.setItem('pending_checkout_order', res.data.orderId)
                }
                window.location.href = res.data.init_point
            }
        } catch (e: any) {
            const msg = e.response?.data
            const errorText = typeof msg === 'string' ? msg : (msg?.message || msg?.error || 'Error al procesar el pago. Por favor intenta de nuevo.')
            alert(errorText)
            setCheckoutLoading(false)
        }
    }

    return (
        <>
            {/* Floating cart button */}
            {floatingButton && (
                <button
                    onClick={() => setShowCart(true)}
                    aria-label="Ver carrito"
                    className="fixed bottom-6 right-6 z-40 w-14 h-14 rounded-full bg-espresso hover:bg-primary-800 text-white shadow-lg flex items-center justify-center transition-colors">
                    <ShoppingCart className="w-6 h-6" />
                    {cartCount > 0 && (
                        <span className="absolute -top-1 -right-1 bg-caramel text-espresso text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center">
                            {cartCount}
                        </span>
                    )}
                </button>
            )}

            {showCart && (
                <div className="fixed inset-0 z-50 flex items-center justify-center">
                    <div className="absolute inset-0 bg-black/40" onClick={() => setShowCart(false)} />
                    <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 max-h-[80vh] flex flex-col">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-muted">
                            <h3 className="font-bold text-espresso text-lg">Tu carrito</h3>
                            <button onClick={() => setShowCart(false)} className="w-7 h-7 bg-primary-100 hover:bg-primary-200 rounded-full flex items-center justify-center transition-colors">
                                <X className="w-4 h-4 text-primary-600" />
                            </button>
                        </div>
                        {cart.length === 0 ? (
                            <div className="flex flex-col items-center justify-center text-center p-10">
                                <ShoppingCart className="w-12 h-12 text-primary-200 mb-3" />
                                <p className="text-primary-400 font-medium">No hay productos en el carrito.</p>
                                <button onClick={() => setShowCart(false)} className="mt-4 text-sm text-caramel hover:underline">Seguir comprando</button>
                            </div>
                        ) : (
                            <>
                                <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
                                    {cart.map(c => (
                                        <div key={c.item.id} className="flex gap-3 items-center">
                                            <div className="w-14 h-14 rounded-lg bg-cream overflow-hidden flex-shrink-0 flex items-center justify-center">
                                                {c.item.imageUrl
                                                    ? <img src={c.item.imageUrl} alt={c.item.name} className="w-full h-full object-cover" />
                                                    : <Coffee className="w-6 h-6 text-primary-300" />
                                                }
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="font-semibold text-espresso text-sm truncate">{c.item.name}</p>
                                                <p className="text-caramel font-bold text-sm">{FMT(c.item.price * c.qty)}</p>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <button onClick={() => updateQty(c.item.id, -1)} className="w-7 h-7 rounded-full bg-primary-100 hover:bg-primary-200 flex items-center justify-center transition-colors">
                                                    <Minus className="w-3 h-3 text-primary-600" />
                                                </button>
                                                <input type="number" step="1" min="1" className="w-16 text-center text-sm font-semibold border border-muted rounded px-1 py-0.5" value={c.qty} onChange={(e) => setQtyExact(c.item.id, parseInt(e.target.value) || 0)} />
                                                <button onClick={() => updateQty(c.item.id, 1)} className="w-7 h-7 rounded-full bg-primary-100 hover:bg-primary-200 flex items-center justify-center transition-colors">
                                                    <Plus className="w-3 h-3 text-primary-600" />
                                                </button>
                                                <button onClick={() => removeFromCart(c.item.id)} className="w-7 h-7 rounded-full hover:bg-red-50 flex items-center justify-center transition-colors ml-1">
                                                    <X className="w-3 h-3 text-red-400" />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <div className="border-t border-muted px-6 py-5 space-y-4">
                                    <div className="flex items-center justify-between font-bold text-espresso">
                                        <span>Total</span>
                                        <span className="text-xl">{FMT(cartTotal)}</span>
                                    </div>
                                    <button
                                        onClick={handleCheckout}
                                        disabled={checkoutLoading}
                                        className="w-full bg-espresso hover:bg-primary-800 text-white font-semibold py-3 rounded-xl transition-colors disabled:opacity-50">
                                        {checkoutLoading ? 'Procesando...' : 'Confirmar pedido'}
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}
        </>
    )
}
