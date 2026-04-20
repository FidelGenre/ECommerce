'use client'
import { useSearchParams } from 'next/navigation'
import { Suspense, useEffect } from 'react'
import { Clock, ArrowLeft, ShoppingBag } from 'lucide-react'
import Link from 'next/link'

function PendingContent() {
    const params = useSearchParams()
    const rawPaymentId = params.get('payment_id') || params.get('collection_id')
    const paymentId = rawPaymentId && rawPaymentId !== 'null' ? rawPaymentId : null

    useEffect(() => {
        sessionStorage.removeItem('pending_checkout_order')
    }, [])

    return (
        <div className="min-h-screen bg-warm-50 flex items-center justify-center p-6">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-10 text-center space-y-6">
                <div className="flex justify-center">
                    <div className="w-20 h-20 bg-yellow-100 rounded-full flex items-center justify-center">
                        <Clock className="w-10 h-10 text-yellow-600" />
                    </div>
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-espresso">Pago pendiente</h1>
                    <p className="text-primary-500 mt-2">Tu pago está siendo procesado por MercadoPago.</p>
                </div>
                {paymentId && (
                    <div className="bg-primary-50 rounded-xl p-4 text-left">
                        <p className="text-xs text-primary-400 font-medium uppercase tracking-wider mb-2">Referencia</p>
                        <span className="font-mono font-bold text-espresso text-sm">{paymentId}</span>
                    </div>
                )}
                <p className="text-sm text-primary-500">Cuando se confirme el pago, recibirás tu comprobante. Puede tardar unos minutos.</p>
                <div className="flex flex-col gap-3">
                    <Link href="/" className="btn-primary flex items-center justify-center gap-2">
                        <ShoppingBag className="w-4 h-4" /> Volver a la tienda
                    </Link>
                </div>
            </div>
        </div>
    )
}

export default function CheckoutPendingPage() {
    return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-4 border-primary-700 border-t-transparent rounded-full animate-spin" /></div>}>
            <PendingContent />
        </Suspense>
    )
}
