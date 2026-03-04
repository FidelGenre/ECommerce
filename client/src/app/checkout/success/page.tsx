'use client'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import { CheckCircle, ShoppingBag, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

function SuccessContent() {
    const params = useSearchParams()
    const paymentId = params.get('payment_id') || params.get('collection_id')
    const status = params.get('collection_status') || params.get('status') || 'approved'

    return (
        <div className="min-h-screen bg-warm-50 flex items-center justify-center p-6">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-10 text-center space-y-6">
                <div className="flex justify-center">
                    <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
                        <CheckCircle className="w-10 h-10 text-green-600" />
                    </div>
                </div>

                <div>
                    <h1 className="text-2xl font-bold text-espresso">¡Pago exitoso!</h1>
                    <p className="text-primary-500 mt-2">Tu compra fue procesada correctamente.</p>
                </div>

                {paymentId && (
                    <div className="bg-primary-50 rounded-xl p-4 text-left space-y-2">
                        <p className="text-xs text-primary-400 font-medium uppercase tracking-wider">Comprobante</p>
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-primary-600">N° de pago</span>
                            <span className="font-mono font-bold text-espresso text-sm">{paymentId}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-primary-600">Estado</span>
                            <span className="badge-green capitalize">{status}</span>
                        </div>
                    </div>
                )}

                <p className="text-sm text-primary-500">
                    Tu pedido está siendo procesado. Te notificaremos cuando esté listo.
                </p>

                <div className="flex flex-col gap-3">
                    <Link href="/" className="btn-primary flex items-center justify-center gap-2">
                        <ShoppingBag className="w-4 h-4" /> Seguir comprando
                    </Link>
                    <Link href="/" className="btn-secondary flex items-center justify-center gap-2">
                        <ArrowLeft className="w-4 h-4" /> Volver al inicio
                    </Link>
                </div>
            </div>
        </div>
    )
}

export default function CheckoutSuccessPage() {
    return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-4 border-primary-700 border-t-transparent rounded-full animate-spin" /></div>}>
            <SuccessContent />
        </Suspense>
    )
}
