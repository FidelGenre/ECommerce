'use client'
import { useSearchParams } from 'next/navigation'
import { Suspense, useEffect } from 'react'
import { XCircle, ArrowLeft, RefreshCw } from 'lucide-react'
import Link from 'next/link'
import api from '@/lib/api'

function FailureContent() {
    const params = useSearchParams()
    const rawPaymentId = params.get('payment_id') || params.get('collection_id')
    const paymentId = rawPaymentId && rawPaymentId !== 'null' ? rawPaymentId : null
    const externalRef = params.get('external_reference')

    useEffect(() => {
        // Cancel the order from sessionStorage OR from URL external_reference
        const pendingOrderId = sessionStorage.getItem('pending_checkout_order') || externalRef
        if (pendingOrderId && pendingOrderId !== 'null') {
            sessionStorage.removeItem('pending_checkout_order')
            api.post(`/api/checkout/cancel/${pendingOrderId}`)
                .then(() => console.log('Order', pendingOrderId, 'cancelled from failure page'))
                .catch(e => console.error('Could not cancel order:', e))
        } else {
            sessionStorage.removeItem('pending_checkout_order')
        }
    }, [])

    return (
        <div className="min-h-screen bg-warm-50 flex items-center justify-center p-6">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-10 text-center space-y-6">
                <div className="flex justify-center">
                    <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center">
                        <XCircle className="w-10 h-10 text-red-600" />
                    </div>
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-espresso">El pago no fue procesado</h1>
                    <p className="text-primary-500 mt-2">Hubo un problema con tu pago. Podés intentarlo de nuevo.</p>
                </div>
                {paymentId ? (
                    <div className="bg-red-50 rounded-xl p-4 text-left">
                        <p className="text-xs text-red-400 font-medium uppercase tracking-wider mb-2">Referencia</p>
                        <span className="font-mono font-bold text-espresso text-sm">{paymentId}</span>
                    </div>
                ) : (
                    <div className="bg-red-50 rounded-xl p-4 text-left">
                        <p className="text-xs text-red-400 font-medium uppercase tracking-wider mb-2">Estado</p>
                        <span className="font-medium text-espresso text-sm">El pago fue cancelado o no se completó</span>
                    </div>
                )}
                <div className="flex flex-col gap-3">
                    <Link href="/" className="btn-primary flex items-center justify-center gap-2">
                        <RefreshCw className="w-4 h-4" /> Intentar de nuevo
                    </Link>
                    <Link href="/" className="btn-secondary flex items-center justify-center gap-2">
                        <ArrowLeft className="w-4 h-4" /> Volver al inicio
                    </Link>
                </div>
            </div>
        </div>
    )
}

export default function CheckoutFailurePage() {
    return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-4 border-primary-700 border-t-transparent rounded-full animate-spin" /></div>}>
            <FailureContent />
        </Suspense>
    )
}
