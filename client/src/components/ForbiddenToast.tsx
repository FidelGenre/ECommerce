'use client'
import { useEffect, useState } from 'react'
import { ShieldX, X } from 'lucide-react'
import { onForbidden } from '@/lib/events'

interface ToastMsg { id: number; text: string }

export function ForbiddenToast() {
    const [messages, setMessages] = useState<ToastMsg[]>([])

    useEffect(() => {
        return onForbidden(text => {
            const id = Date.now()
            setMessages(prev => [...prev, { id, text }])
            setTimeout(() => setMessages(prev => prev.filter(m => m.id !== id)), 4500)
        })
    }, [])

    if (!messages.length) return null

    return (
        <div className="fixed bottom-5 right-5 z-[200] flex flex-col gap-2 pointer-events-none">
            {messages.map(m => (
                <div key={m.id} className="flex items-start gap-3 bg-red-600 text-white px-4 py-3 rounded-xl shadow-xl max-w-xs pointer-events-auto animate-in slide-in-from-right-4 fade-in duration-200">
                    <ShieldX className="w-5 h-5 shrink-0 mt-0.5" />
                    <span className="text-sm font-medium flex-1 leading-snug">{m.text}</span>
                    <button onClick={() => setMessages(prev => prev.filter(x => x.id !== m.id))} className="hover:opacity-70 shrink-0">
                        <X className="w-4 h-4" />
                    </button>
                </div>
            ))}
        </div>
    )
}
