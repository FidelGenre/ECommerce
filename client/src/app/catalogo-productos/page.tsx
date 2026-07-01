'use client'
import { useEffect, useState, useMemo, useRef } from 'react'
import api from '@/lib/api'
import { useCart } from '@/lib/cart'
import { CartDrawer } from '@/components/CartDrawer'
import { ScrollToTop } from '@/components/ScrollToTop'
import { PublicNav } from '@/components/PublicNav'
import { Item } from '@/types'
import { Coffee, Search, X, ChevronLeft, ChevronRight } from 'lucide-react'

const FMT = (n: number) => `$${Number(n ?? 0).toLocaleString('es-AR')}`

export default function CatalogoProductosPage() {
    const { addToCart, getAvailableStock } = useCart()
    const [items, setItems] = useState<Item[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [selectedCategory, setSelectedCategory] = useState<string>('')
    const [showCart, setShowCart] = useState(false)

    // Category filters row: horizontal scroll with arrows that appear only when the
    // chips overflow (many categories). Otherwise it just centers them.
    const catRowRef = useRef<HTMLDivElement>(null)
    const [catOverflow, setCatOverflow] = useState(false)

    useEffect(() => {
        api.get('/api/public/items?size=100')
            .then(r => setItems(r.data.content ?? []))
            .catch(() => setItems([]))
            .finally(() => setLoading(false))
    }, [])

    const categories = useMemo(
        () => Array.from(new Set(items.map((it: any) => it.category?.name).filter(Boolean))).sort() as string[],
        [items]
    )

    // Detect whether the category row overflows (to show the arrows), on mount,
    // when categories change, and on resize.
    useEffect(() => {
        const check = () => {
            const el = catRowRef.current
            if (el) setCatOverflow(el.scrollWidth > el.clientWidth + 4)
        }
        check()
        window.addEventListener('resize', check)
        return () => window.removeEventListener('resize', check)
    }, [categories])

    const scrollCategories = (dir: 'left' | 'right') => {
        const el = catRowRef.current
        if (!el) return
        el.scrollBy({ left: dir === 'left' ? -240 : 240, behavior: 'smooth' })
    }

    const filteredItems = useMemo(() => {
        const q = search.trim().toLowerCase()
        return items.filter((it: any) => {
            const matchesCategory = !selectedCategory || it.category?.name === selectedCategory
            const matchesSearch = !q || it.name?.toLowerCase().includes(q)
            return matchesCategory && matchesSearch
        })
    }, [items, search, selectedCategory])

    return (
        <div className="min-h-screen bg-[#CDB38B]">
            <PublicNav onCartClick={() => setShowCart(true)} />

            <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
                <div className="text-center mb-8">
                    <h1 className="text-3xl sm:text-4xl font-extrabold text-[#4A2D19] mb-2">Nuestra tienda de café</h1>
                    <p className="text-[#6B4B31] max-w-xl mx-auto font-medium">
                        Explorá todo nuestro catálogo. Buscá por nombre o filtrá por categoría.
                    </p>
                </div>

                {/* Buscador */}
                <div className="max-w-md mx-auto mb-6">
                    <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#8B6A4B]" />
                        <input
                            type="text"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Buscar café por nombre..."
                            className="w-full pl-12 pr-10 py-3 rounded-full bg-[#FFFDF8] text-[#4A2D19] placeholder-[#8B6A4B] shadow-sm focus:outline-none focus:ring-2 focus:ring-[#4A2D19]"
                        />
                        {search && (
                            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8B6A4B] hover:text-[#4A2D19]">
                                <X className="w-5 h-5" />
                            </button>
                        )}
                    </div>
                </div>

                {/* Filtros por categoría (una fila; con flechas si hay muchas) */}
                {categories.length > 0 && (
                    <div className="relative mb-10">
                        {/* Flecha izquierda */}
                        {catOverflow && (
                            <button
                                onClick={() => scrollCategories('left')}
                                aria-label="Categorías anteriores"
                                className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-9 h-9 flex items-center justify-center rounded-full bg-[#4A2D19] text-white shadow-md hover:bg-[#3a2313] transition-colors">
                                <ChevronLeft className="w-4 h-4" />
                            </button>
                        )}

                        <div
                            ref={catRowRef}
                            className={`flex items-center gap-2 overflow-x-auto no-scrollbar ${catOverflow ? 'justify-start px-11' : 'flex-wrap justify-center'}`}>
                            <button
                                onClick={() => setSelectedCategory('')}
                                className={`shrink-0 px-4 py-2 rounded-full text-sm font-semibold transition-all ${selectedCategory === '' ? 'bg-[#4A2D19] text-white shadow-md' : 'bg-[#FFFDF8] text-[#8B6A4B] hover:bg-[#D4A97A] hover:text-[#4A2D19]'}`}
                            >
                                Todos
                            </button>
                            {categories.map((cat, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => setSelectedCategory(cat)}
                                    className={`shrink-0 px-4 py-2 rounded-full text-sm font-semibold transition-all ${selectedCategory === cat ? 'bg-[#4A2D19] text-white shadow-md' : 'bg-[#FFFDF8] text-[#8B6A4B] hover:bg-[#D4A97A] hover:text-[#4A2D19]'}`}
                                >
                                    {cat}
                                </button>
                            ))}
                        </div>

                        {/* Flecha derecha */}
                        {catOverflow && (
                            <button
                                onClick={() => scrollCategories('right')}
                                aria-label="Más categorías"
                                className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-9 h-9 flex items-center justify-center rounded-full bg-[#4A2D19] text-white shadow-md hover:bg-[#3a2313] transition-colors">
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                )}

                {loading ? (
                    <div className="flex justify-center py-20">
                        <div className="w-10 h-10 border-4 border-[#4A2D19] border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : filteredItems.length === 0 ? (
                    <div className="text-center py-20">
                        <Coffee className="w-12 h-12 text-[#6B4B31] mx-auto mb-4" />
                        <p className="text-[#4A2D19] text-lg font-bold">
                            {items.length === 0 ? 'Próximamente disponibles' : 'No se encontraron productos'}
                        </p>
                        {(search || selectedCategory) && items.length > 0 && (
                            <button onClick={() => { setSearch(''); setSelectedCategory('') }} className="mt-3 text-[#6B4B31] underline hover:text-[#4A2D19]">
                                Limpiar filtros
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                        {filteredItems.map(item => {
                            const available = getAvailableStock(item.id, Number(item.stock))
                            const soldOut = available <= 0
                            return (
                                <div key={item.id}
                                    className="bg-[#FFFDF8] rounded-xl overflow-hidden flex flex-col transition-all duration-300 transform hover:shadow-xl hover:-translate-y-1">
                                    <div className="h-64 bg-[#D4A97A] overflow-hidden relative">
                                        {item.imageUrl
                                            ? <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                                            : <div className="w-full h-full flex items-center justify-center"><Coffee className="w-16 h-16 text-[#8B6A4B]" /></div>
                                        }
                                    </div>
                                    <div className="p-5 flex flex-col text-center flex-1">
                                        <h3 className="font-extrabold text-[#4A2D19] text-lg mb-2">{item.name.toLowerCase()}</h3>
                                        <p className={`text-xs font-semibold mb-6 ${soldOut ? 'text-red-500' : 'text-[#8B6A4B]'}`}>
                                            {soldOut ? 'Sin stock disponible' : `Stock: ${available} disponibles`}
                                        </p>
                                        <div className="flex items-center justify-between mt-auto">
                                            <span className="text-lg font-bold text-[#6B4B31]">
                                                {FMT(item.price)}
                                                <span className="text-sm font-normal ml-1">/ 100 gramos cada unidad</span>
                                            </span>
                                            <button
                                                onClick={() => addToCart(item)}
                                                disabled={soldOut}
                                                className={`text-sm font-semibold px-5 py-2 rounded-md transition-colors shadow-sm ${soldOut
                                                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                                    : 'bg-[#5C3A21] hover:bg-[#4A2D19] text-white'
                                                    }`}>
                                                {soldOut ? 'Sin stock' : 'Añadir'}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>

            <CartDrawer open={showCart} onOpenChange={setShowCart} showFloatingButton />
            <ScrollToTop bottomClass="bottom-24" />
        </div>
    )
}
