'use client'
import { useEffect, useState } from 'react'
import { onToast, ToastType } from '@/lib/events'
import { CheckCircle2, XCircle, Info, X } from 'lucide-react'

interface ToastItem {
    id: number
    msg: string
    type: ToastType
}

let nextId = 0

export function Toast() {
    const [toasts, setToasts] = useState<ToastItem[]>([])

    useEffect(() => {
        return onToast((msg, type) => {
            const id = ++nextId
            setToasts(prev => [...prev, { id, msg, type }])
            setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4500)
        })
    }, [])

    if (toasts.length === 0) return null

    return (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[9999] flex flex-col gap-2 items-center pointer-events-none">
            {toasts.map(t => (
                <div
                    key={t.id}
                    className={`flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-lg text-sm font-medium pointer-events-auto max-w-sm w-full
                        ${t.type === 'success' ? 'bg-green-600 text-white' : ''}
                        ${t.type === 'error' ? 'bg-red-600 text-white' : ''}
                        ${t.type === 'info' ? 'bg-blue-600 text-white' : ''}
                    `}
                >
                    {t.type === 'success' && <CheckCircle2 className="w-4 h-4 shrink-0" />}
                    {t.type === 'error' && <XCircle className="w-4 h-4 shrink-0" />}
                    {t.type === 'info' && <Info className="w-4 h-4 shrink-0" />}
                    <span className="flex-1">{t.msg}</span>
                    <button onClick={() => setToasts(prev => prev.filter(x => x.id !== t.id))} className="opacity-70 hover:opacity-100">
                        <X className="w-3.5 h-3.5" />
                    </button>
                </div>
            ))}
        </div>
    )
}
