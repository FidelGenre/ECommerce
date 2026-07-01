'use client'
import { createContext, useContext, useEffect, useState } from 'react'
import { Item } from '@/types'

export interface CartLine { item: Item; qty: number }

interface CartCtx {
    cart: CartLine[]
    addToCart: (item: Item) => void
    removeFromCart: (id: number) => void
    updateQty: (id: number, delta: number) => void
    setQtyExact: (id: number, val: number) => void
    clearCart: () => void
    getAvailableStock: (itemId: number, totalStock: number) => number
    cartTotal: number
    cartCount: number
}

const CART_KEY = 'cart'
const Context = createContext<CartCtx>({} as CartCtx)

export function CartProvider({ children }: { children: React.ReactNode }) {
    const [cart, setCart] = useState<CartLine[]>([])
    const [hydrated, setHydrated] = useState(false)

    // Load persisted cart on mount.
    useEffect(() => {
        try {
            const stored = localStorage.getItem(CART_KEY)
            if (stored) setCart(JSON.parse(stored))
        } catch {
            // Ignore corrupt cart data.
        }
        setHydrated(true)
    }, [])

    // Persist on every change (but only after the initial load, so we don't
    // clobber the stored cart with the empty initial state).
    useEffect(() => {
        if (!hydrated) return
        localStorage.setItem(CART_KEY, JSON.stringify(cart))
    }, [cart, hydrated])

    const removeFromCart = (id: number) => setCart(prev => prev.filter(c => c.item.id !== id))

    const updateQty = (id: number, delta: number) => {
        setCart(prev => prev.map(c => {
            if (c.item.id === id) {
                const stock = Number(c.item.stock)
                const newQty = Math.min(stock, Math.max(0, Math.floor(c.qty + delta)))
                return { ...c, qty: newQty }
            }
            return c
        }))
    }

    const setQtyExact = (id: number, val: number) => {
        setCart(prev => prev.map(c => {
            if (c.item.id === id) {
                const stock = Number(c.item.stock)
                const newQty = Math.min(stock, Math.max(0, Math.floor(val)))
                return { ...c, qty: newQty }
            }
            return c
        }))
    }

    const addToCart = (item: Item) => {
        const stock = Number(item.stock)
        setCart(prev => {
            const existing = prev.find(c => c.item.id === item.id)
            if (existing) {
                if (existing.qty >= stock) return prev
                return prev.map(c => c.item.id === item.id ? { ...c, qty: c.qty + 1 } : c)
            } else {
                if (stock <= 0) return prev
                return [...prev, { item, qty: 1 }]
            }
        })
    }

    const clearCart = () => setCart([])

    const getAvailableStock = (itemId: number, totalStock: number) => {
        const inCart = cart.find(c => c.item.id === itemId)
        return totalStock - (inCart ? inCart.qty : 0)
    }

    const cartTotal = cart.reduce((s, c) => s + (c.item.price * c.qty), 0)
    const cartCount = cart.reduce((s, c) => s + c.qty, 0)

    return (
        <Context.Provider value={{
            cart, addToCart, removeFromCart, updateQty, setQtyExact, clearCart,
            getAvailableStock, cartTotal, cartCount
        }}>
            {children}
        </Context.Provider>
    )
}

export const useCart = () => useContext(Context)
