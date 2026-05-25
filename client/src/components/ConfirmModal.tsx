'use client'
import { Trash2 } from 'lucide-react'

interface Props {
    message: string
    onConfirm: () => void
    onCancel: () => void
    confirmLabel?: string
    loading?: boolean
    danger?: boolean
}

export function ConfirmModal({ message, onConfirm, onCancel, confirmLabel = 'Eliminar', loading, danger = true }: Props) {
    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[60] p-4 text-center">
            <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl p-6 py-8">
                <Trash2 className="w-12 h-12 text-red-500 mx-auto mb-4" />
                <p className="text-base font-semibold text-espresso mb-6 whitespace-pre-line">{message}</p>
                <div className="flex gap-3">
                    <button onClick={onCancel} className="btn-secondary flex-1">Cancelar</button>
                    <button onClick={onConfirm} className={danger ? 'btn-danger flex-1' : 'btn-primary flex-1'} disabled={loading}>
                        {loading ? 'Procesando…' : confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    )
}
