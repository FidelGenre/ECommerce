'use client'
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import api from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { Item } from '@/types'
import {
  ShoppingCart, User, Coffee, Mail, Phone,
  MapPin, Flame, Leaf, Award, Heart, X, Plus, Minus,
  Menu, ChevronRight, Star
} from 'lucide-react'

const FMT = (n: number) => `$${Number(n ?? 0).toLocaleString('es-AR')}`

export default function StorefrontPage() {
  const { user } = useAuth()
  const [items, setItems] = useState<Item[]>([])
  const [categories, setCategories] = useState<any[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [cart, setCart] = useState<{ item: Item; qty: number }[]>([])
  const [showCart, setShowCart] = useState(false)
  const [mobileMenu, setMobileMenu] = useState(false)
  const [contactForm, setContactForm] = useState({ name: '', email: '', message: '' })
  const [contactSent, setContactSent] = useState(false)
  const [checkoutLoading, setCheckoutLoading] = useState(false)

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (mobileMenu) {
      document.body.classList.add('menu-open')
    } else {
      document.body.classList.remove('menu-open')
    }
    return () => document.body.classList.remove('menu-open')
  }, [mobileMenu])

  useEffect(() => {
    api.get('/api/public/items?size=100')
      .then(r => {
        const fetchedItems = r.data.content ?? [];
        setItems(fetchedItems);
        const uniqueCategories = Array.from(new Set(fetchedItems.map((it: any) => it.category?.name).filter(Boolean))).sort();
        setCategories(uniqueCategories);
      })
      .catch(() => setItems([]))
      .finally(() => setLoading(false))
  }, [])

  const filteredItems = selectedCategory ? items.filter((it: any) => it.category?.name === selectedCategory) : items;

  const removeFromCart = (id: number) => setCart(prev => prev.filter(c => c.item.id !== id))

  const updateQty = (id: number, delta: number) => {
    setCart(prev => prev.map(c => {
      if (c.item.id === id) {
        const stock = Number(c.item.stock)
        const newQty = Math.max(0, Math.floor(c.qty + delta))
        if (newQty > stock) {
          alert(`Solo hay ${stock} unidades disponibles de este producto.`);
          return { ...c, qty: stock };
        }
        return { ...c, qty: newQty }
      }
      return c
    }))
  }

  const setQtyExact = (id: number, val: number) => {
    setCart(prev => prev.map(c => {
      if (c.item.id === id) {
        const stock = Number(c.item.stock)
        const newQty = Math.max(0, Math.floor(val))
        if (newQty > stock) {
          alert(`Solo hay ${stock} unidades disponibles de este producto.`);
          return { ...c, qty: stock };
        }
        return { ...c, qty: newQty }
      }
      return c
    }))
  }

  const addToCart = (item: Item) => {
    const step = 1;
    const stock = Number(item.stock);
    setCart(prev => {
      const existing = prev.find(c => c.item.id === item.id)
      if (existing) {
        if (existing.qty + step > stock) {
          alert(`No puedes agregar más. El stock disponible es ${stock}.`);
          return prev;
        }
        return prev.map(c => c.item.id === item.id ? { ...c, qty: c.qty + step } : c)
      } else {
        if (step > stock) return prev;
        return [...prev, { item, qty: step }]
      }
    })
  }

  const cartTotal = cart.reduce((s: number, c) => s + (c.item.price * c.qty), 0)
  const cartCount = cart.reduce((s: number, c) => s + c.qty, 0)

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
        lines: cart.map(c => ({
          itemId: c.item.id,
          quantity: c.qty,
          unitPrice: c.item.price
        }))
      }
      const res = await api.post('/api/checkout/preference', payload)
      if (res.data?.init_point) {
        window.location.href = res.data.init_point
      }
    } catch (e: any) {
      console.error('Checkout error', e)
      alert(e.response?.data || 'Error al procesar el pago. Por favor intenta de nuevo.')
      setCheckoutLoading(false)
    }
  }

  const handleContact = (e: React.FormEvent) => {
    e.preventDefault()
    setContactSent(true)
    setTimeout(() => setContactSent(false), 5000)
    setContactForm({ name: '', email: '', message: '' })
  }

  const NAV_LINKS = [
    { href: '#inicio', label: 'Inicio' },
    { href: '#nosotros', label: 'Nosotros' },
    { href: '#productos', label: 'Productos' },
    { href: '#contacto', label: 'Contacto' },
  ]

  return (
    <>
      <div className="min-h-screen bg-surface">

        {/* ═══════════════════ NAVBAR ═══════════════════ */}
        <nav className="bg-primary-600 sticky top-0 z-50 shadow-lg">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
            <span className="text-white font-bold text-xl tracking-wide">Coffee Beans</span>

            {/* Desktop nav */}
            <div className="hidden md:flex items-center gap-8">
              {NAV_LINKS.map(l => (
                <a key={l.href} href={l.href} className="text-primary-300 hover:text-white text-sm font-medium transition-colors">
                  {l.label}
                </a>
              ))}
            </div>

            <div className="flex items-center gap-2">
              {/* Desktop-only user icons */}
              {user ? (
                <>
                  <Link href="/account" className="hidden md:flex w-9 h-9 bg-primary-700/60 hover:bg-primary-800 rounded-lg items-center justify-center text-white transition-colors">
                    <User className="w-4 h-4" />
                  </Link>
                  {user.role === 'ADMIN' && (
                    <Link href="/admin" className="hidden md:block text-caramel hover:text-amber-300 text-xs font-medium ml-1">Admin</Link>
                  )}
                </>
              ) : (
                <Link href="/login" className="hidden md:flex w-9 h-9 bg-caramel hover:bg-amber-500 rounded-lg items-center justify-center text-white transition-colors">
                  <User className="w-4 h-4" />
                </Link>
              )}

              <button onClick={() => setShowCart(!showCart)}
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
        </nav>

        {/* ═══════════════════ CART PANEL ═══════════════════ */}
        {/* Floating cart button */}
        <button onClick={() => setShowCart(!showCart)}
          className="fixed bottom-6 right-6 z-40 w-14 h-14 bg-espresso hover:bg-primary-800 text-white rounded-full shadow-xl flex items-center justify-center transition-all hover:scale-105 active:scale-95">
          <ShoppingCart className="w-6 h-6" />
          {cartCount > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
              {cartCount}
            </span>
          )}
        </button>

        {/* Cart popup */}
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

        {/* ═══════════════════ HERO ═══════════════════ */}
        <section id="inicio" className="bg-surface">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16 md:py-24 flex flex-col md:flex-row items-center gap-12">
            <div className="flex-1 space-y-6 text-center md:text-left">
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-espresso leading-tight">
                Viví la Esencia<br />del Café
              </h1>
              <p className="text-primary-500 text-lg leading-relaxed max-w-lg mx-auto md:mx-0">
                Descubrí nuestra selección artesanal de granos de café premium, tostados a la
                perfección para resaltar los mejores aromas y sabores en cada taza.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center md:justify-start">
                <a href="#productos"
                  className="inline-flex items-center justify-center gap-2 bg-espresso hover:bg-primary-800 text-white font-semibold px-7 py-3.5 rounded-xl transition-all shadow-md hover:shadow-lg active:scale-95">
                  Explorar Nuestras Mezclas
                  <ChevronRight className="w-4 h-4" />
                </a>
                <a href="#nosotros"
                  className="inline-flex items-center justify-center gap-2 border border-primary-300 hover:border-espresso text-espresso font-semibold px-7 py-3.5 rounded-xl transition-all">
                  Nuestra Historia
                </a>
              </div>
            </div>
            <div className="flex-1 w-full max-w-md md:max-w-none mx-auto">
              <img
                src="/images/coffee-hero.png"
                alt="Granos de café premium"
                className="w-full rounded-2xl shadow-xl object-cover aspect-[4/3]"
              />
            </div>
          </div>
        </section>

        {/* ═══════════════════ FEATURES ═══════════════════ */}
        <section className="bg-sand py-14">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              {[
                { icon: Flame, title: 'Sabor Premium', desc: 'Cada lote se tuesta con precisión para lograr el equilibrio perfecto entre aroma, sabor y textura.' },
                { icon: Coffee, title: 'El Arte del Café', desc: 'Elaborado en pequeños lotes por tostadores apasionados que celebran la tradición artesanal.' },
                { icon: Leaf, title: 'Origen Sustentable', desc: 'Trabajamos con fincas éticas que promueven el comercio justo, la sustentabilidad y el planeta.' },
              ].map((card, i) => (
                <div key={i} className="bg-white rounded-2xl p-8 text-center shadow-sm border border-muted hover:shadow-md hover:-translate-y-0.5 transition-all duration-300">
                  <div className="w-12 h-12 bg-cream rounded-xl flex items-center justify-center mx-auto mb-4">
                    <card.icon className="w-6 h-6 text-caramel" />
                  </div>
                  <h3 className="font-bold text-espresso text-lg mb-2">{card.title}</h3>
                  <p className="text-primary-500 text-sm leading-relaxed">{card.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ═══════════════════ NOSOTROS ═══════════════════ */}
        <section id="nosotros" className="bg-surface py-16 lg:py-24">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <div className="text-center mb-14">
              <h2 className="text-3xl sm:text-4xl font-bold text-espresso mb-2">Sobre Coffee Beans</h2>
              <p className="text-primary-500 max-w-2xl mx-auto">
                Descubrí la historia detrás de Coffee Beans y nuestra pasión por crear la taza perfecta
              </p>
            </div>

            <div className="flex flex-col lg:flex-row items-center gap-12 mb-16">
              <div className="flex-1 space-y-4 order-2 lg:order-1">
                <h3 className="text-2xl sm:text-3xl font-bold text-espresso mb-4">Nuestra Historia</h3>
                <p className="text-primary-500 leading-relaxed text-base">
                  Coffee Beans nació de una idea simple: compartir nuestro amor por el café auténtico y de alta calidad. Lo que comenzó como una pequeña tostadora local se transformó en una comunidad de amantes del café que valoran el sabor, la artesanía y la sustentabilidad.
                </p>
                <p className="text-primary-500 leading-relaxed text-base">
                  Nuestra filosofía se basa en la frescura, la dedicación y el respeto por cada grano. Desde la selección cuidadosa hasta el tueste artesanal, cada paso está guiado por nuestra misión de brindarte una experiencia inolvidable en cada taza.
                </p>
              </div>
              <div className="flex-1 w-full max-w-lg mx-auto order-1 lg:order-2">
                <img
                  src="/images/coffee-about.png"
                  alt="Proceso de tueste artesanal"
                  className="w-full rounded-2xl shadow-xl object-cover aspect-[4/3]"
                />
              </div>
            </div>

            {/* Values */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              {[
                { icon: Heart, title: 'Pasión por el Café', desc: 'Cada tueste se realiza con cuidado, resaltando el carácter único de cada grano.' },
                { icon: Leaf, title: 'Sustentabilidad', desc: 'Trabajamos con fincas éticas para promover el comercio justo y cuidar el medio ambiente.' },
                { icon: Award, title: 'Calidad Excepcional', desc: 'Solo granos premium tostados en pequeños lotes para garantizar la frescura máxima.' },
              ].map((v, i) => (
                <div key={i} className="bg-white rounded-2xl p-8 text-center shadow-sm border border-muted hover:shadow-md transition-all duration-300">
                  <div className="w-12 h-12 bg-cream rounded-xl flex items-center justify-center mx-auto mb-4">
                    <v.icon className="w-6 h-6 text-caramel" />
                  </div>
                  <h4 className="font-bold text-espresso text-lg mb-2">{v.title}</h4>
                  <p className="text-primary-500 text-sm leading-relaxed">{v.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ═══════════════════ PRODUCTOS ═══════════════════ */}
        <section id="productos" className="bg-[#CDB38B] py-16 lg:py-24">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <div className="text-center mb-12">
              <h2 className="text-3xl sm:text-4xl font-extrabold text-[#4A2D19] mb-2">Nuestra selección de café</h2>
              <p className="text-[#6B4B31] max-w-xl mx-auto font-medium">
                Explorá nuestros granos artesanales, seleccionados por origen y nivel de tueste.
              </p>
            </div>

            {loading ? (
              <div className="flex justify-center py-20">
                <div className="w-10 h-10 border-4 border-[#4A2D19] border-t-transparent rounded-full animate-spin" />
              </div>
            ) : items.length === 0 ? (
              <div className="text-center py-20">
                <Coffee className="w-12 h-12 text-[#6B4B31] mx-auto mb-4" />
                <p className="text-[#4A2D19] text-lg font-bold">Próximamente disponibles</p>
              </div>
            ) : (
              <>
                {categories.length > 0 && (
                  <div className="flex flex-wrap items-center justify-center gap-2 mb-10">
                    <button
                      onClick={() => setSelectedCategory('')}
                      className={`px-4 py-2 rounded-full text-sm font-semibold transition-all ${selectedCategory === '' ? 'bg-[#4A2D19] text-white shadow-md' : 'bg-[#FFFDF8] text-[#8B6A4B] hover:bg-[#D4A97A] hover:text-[#4A2D19]'}`}
                    >
                      Todos
                    </button>
                    {categories.map((cat, idx) => (
                      <button
                        key={idx}
                        onClick={() => setSelectedCategory(cat as string)}
                        className={`px-4 py-2 rounded-full text-sm font-semibold transition-all ${selectedCategory === cat ? 'bg-[#4A2D19] text-white shadow-md' : 'bg-[#FFFDF8] text-[#8B6A4B] hover:bg-[#D4A97A] hover:text-[#4A2D19]'}`}
                      >
                        {cat as string}
                      </button>
                    ))}
                  </div>
                )}

                {filteredItems.length === 0 && selectedCategory && (
                  <div className="text-center py-10 w-full col-span-full">
                    <p className="text-[#4A2D19] font-medium">No hay productos en esta categoría.</p>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredItems.map(item => (
                    <div key={item.id}
                      className="bg-[#FFFDF8] rounded-lg overflow-hidden flex flex-col transition-all duration-300 transform hover:shadow-xl hover:-translate-y-1">

                      {/* Image full width */}
                      <div className="h-56 bg-[#D4A97A] overflow-hidden relative">
                        {item.imageUrl
                          ? <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                          : <div className="w-full h-full flex items-center justify-center"><Coffee className="w-16 h-16 text-[#8B6A4B]" /></div>
                        }
                      </div>

                      {/* Card Content centered */}
                      <div className="p-5 flex flex-col text-center flex-1">
                        <h3 className="font-extrabold text-[#4A2D19] text-lg mb-2">{item.name.toLowerCase()}</h3>

                        <p className={`text-xs font-semibold mb-6 ${item.stock <= 0 ? 'text-red-500' : 'text-[#8B6A4B]'}`}>
                          {item.stock <= 0 ? 'Sin stock' : `Stock: ${item.stock} disponibles`}
                        </p>

                        <div className="flex items-center justify-between mt-auto">
                          <span className="text-lg font-bold text-[#6B4B31]">
                            {FMT(item.price)}
                            <span className="text-sm font-normal ml-1">/ 100 gramos cada unidad</span>
                          </span>
                          <button
                            onClick={() => addToCart(item)}
                            disabled={item.stock <= 0}
                            className={`text-sm font-semibold px-5 py-2 rounded-md transition-colors shadow-sm ${item.stock <= 0
                              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                              : 'bg-[#5C3A21] hover:bg-[#4A2D19] text-white'
                              }`}>
                            {item.stock <= 0 ? 'Sin stock' : 'Añadir'}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </section>

        {/* ═══════════════════ CONTACTO ═══════════════════ */}
        <section id="contacto" className="bg-surface py-16 lg:py-24">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <div className="text-center mb-12">
              <h2 className="text-3xl sm:text-4xl font-bold text-espresso mb-2">Contacto Coffee Beans</h2>
              <p className="text-primary-400 max-w-xl mx-auto">
                ¿Tenés alguna pregunta sobre nuestros granos o querés colaborar con nosotros? Ponete en contacto —
                nos encantaría escucharte y compartir nuestra pasión por el café.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-4xl mx-auto">
              {/* Contact info card */}
              <div className="bg-white rounded-2xl p-8 border border-muted shadow-sm">
                <h3 className="font-bold text-espresso text-lg mb-6">Ponete en contacto</h3>
                <div className="space-y-4">
                  {[
                    { icon: Mail, text: 'coffeebeansweb@gmail.com' },
                    { icon: Phone, text: '+54 3426 102734' },
                    { icon: MapPin, text: 'Argentina' },
                  ].map(({ icon: Icon, text }, i, arr) => (
                    <div key={text}>
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-primary-700 rounded-xl flex items-center justify-center flex-shrink-0">
                          <Icon className="w-5 h-5 text-white" />
                        </div>
                        <span className="text-primary-600 text-sm">{text}</span>
                      </div>
                      {i < arr.length - 1 && <div className="border-b border-muted mt-4" />}
                    </div>
                  ))}
                </div>
              </div>

              {/* Contact form card */}
              <form onSubmit={handleContact} className="bg-white rounded-2xl p-8 border border-muted shadow-sm space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-espresso mb-1.5">Nombre</label>
                  <input
                    className="w-full border border-primary-300 rounded-xl px-4 py-2.5 text-sm text-espresso placeholder:text-primary-300 focus:outline-none focus:ring-2 focus:ring-caramel/30 focus:border-caramel transition-colors"
                    placeholder="Ingresá tu nombre"
                    value={contactForm.name}
                    onChange={e => setContactForm({ ...contactForm, name: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-espresso mb-1.5">Correo electrónico</label>
                  <input
                    type="email"
                    className="w-full border border-primary-300 rounded-xl px-4 py-2.5 text-sm text-espresso placeholder:text-primary-300 focus:outline-none focus:ring-2 focus:ring-caramel/30 focus:border-caramel transition-colors"
                    placeholder="Ingresá tu correo"
                    value={contactForm.email}
                    onChange={e => setContactForm({ ...contactForm, email: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-espresso mb-1.5">Mensaje</label>
                  <textarea
                    rows={5}
                    className="w-full border border-primary-300 rounded-xl px-4 py-2.5 text-sm text-espresso placeholder:text-primary-300 focus:outline-none focus:ring-2 focus:ring-caramel/30 focus:border-caramel transition-colors resize-none"
                    placeholder="Escribí tu mensaje aquí..."
                    value={contactForm.message}
                    onChange={e => setContactForm({ ...contactForm, message: e.target.value })}
                    required
                  />
                </div>
                {contactSent ? (
                  <div className="bg-green-50 border border-green-200 text-green-700 text-sm font-semibold py-3 px-4 rounded-xl text-center">
                    ✓ ¡Mensaje enviado con éxito!
                  </div>
                ) : (
                  <button type="submit" className="w-full bg-primary-700 hover:bg-espresso text-white font-semibold py-3 rounded-xl transition-all active:scale-[0.98]">
                    Enviar mensaje
                  </button>
                )}
              </form>
            </div>
          </div>
        </section>

        {/* ═══════════════════ FOOTER ═══════════════════ */}
        <footer className="bg-primary-600 text-primary-300 py-10">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            <div>
              <h4 className="text-white font-bold text-lg mb-3">Coffee Beans</h4>
              <p className="text-sm leading-relaxed text-primary-200">Café artesanal tostado con pasión y precisión para resaltar los mejores sabores en cada taza.</p>
            </div>
            <div>
              <h4 className="text-white font-bold mb-3">Contacto</h4>
              <div className="space-y-1.5 text-sm text-primary-200">
                <p>Eva Perón 2641 (Sucursal)</p>
                <p>+54 3426 102734</p>
                <p>coffeebeansweb@gmail.com</p>
              </div>
            </div>
            <div>
              <h4 className="text-white font-bold mb-3">Horarios</h4>
              <div className="space-y-1.5 text-sm text-primary-200">
                <p>Lun — Vie: 8:00 a 20:00</p>
                <p>Sáb — Dom: 9:00 a 21:00</p>
              </div>
            </div>
            <div>
              <h4 className="text-white font-bold mb-3">Enlaces</h4>
              <ul className="space-y-1.5 text-sm text-primary-200">
                <li><a href="#productos" className="hover:text-white transition-colors">Nuestras Mezclas</a></li>
                <li><a href="#nosotros" className="hover:text-white transition-colors">Sobre Nosotros</a></li>
                <li><a href="#contacto" className="hover:text-white transition-colors">Contacto</a></li>
                {user && <li><Link href="/account" className="hover:text-white transition-colors">Mi Cuenta</Link></li>}
              </ul>
            </div>
          </div>
          <div className="max-w-3xl mx-auto px-4 sm:px-6 mt-10 pt-6 border-t border-primary-500/60 text-center text-xs text-primary-200">
            © 2025 Coffee Beans. Todos los derechos reservados.
          </div>
        </footer>
      </div>

      {/* Mobile menu — fullscreen overlay via portal */}
      {mobileMenu && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[9999] bg-primary-800/95 backdrop-blur-sm flex flex-col overlay-animate"
          style={{ touchAction: 'none' }}>
          {/* Top bar with logo and close */}
          <div className="flex items-center justify-between px-4 py-4">
            <span className="text-white font-bold text-xl tracking-wide">Coffee Beans</span>
            <div className="flex items-center gap-2">
              <button onClick={() => { setShowCart(!showCart); setMobileMenu(false) }}
                className="relative w-9 h-9 bg-primary-700/60 rounded-lg flex items-center justify-center text-white active:scale-90 transition-transform">
                <ShoppingCart className="w-4 h-4" />
                {cartCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                    {cartCount}
                  </span>
                )}
              </button>
              <button onClick={() => setMobileMenu(false)}
                className="w-9 h-9 flex items-center justify-center text-white hover:text-primary-300 active:scale-90 transition-all">
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>

          {/* Centered navigation links */}
          <div className="flex-1 flex flex-col items-center justify-center gap-2 -mt-16 overlay-items-animate">
            {NAV_LINKS.map(l => (
              <a key={l.href} href={l.href}
                onClick={(e) => {
                  e.preventDefault()
                  setMobileMenu(false)
                  setTimeout(() => {
                    const el = document.querySelector(l.href)
                    if (el) el.scrollIntoView({ behavior: 'smooth' })
                  }, 50)
                }}
                className="text-white text-2xl font-bold hover:text-caramel active:scale-95 transition-all py-3">
                {l.label}
              </a>
            ))}

            {/* Separator */}
            <div className="w-16 h-px bg-primary-500/40 my-3" />

            {/* User links */}
            {user ? (
              <>
                <Link href="/account" onClick={() => setMobileMenu(false)}
                  className="flex items-center gap-2 text-primary-300 hover:text-white text-lg font-medium py-2 active:scale-95 transition-all">
                  <User className="w-5 h-5" /> Mi Cuenta
                </Link>
                {user.role === 'ADMIN' && (
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
    </>
  )
}
