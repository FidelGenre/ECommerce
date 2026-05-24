'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth'
import AdminSidebar from '@/components/admin/AdminSidebar'
import { ForbiddenToast } from '@/components/ForbiddenToast'
import { ShieldX } from 'lucide-react'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const { user, loading } = useAuth()
    const router = useRouter()

    useEffect(() => {
        if (!loading && (!user || user.role === 'NONE' || (user.role === 'CLIENTE' && (!user.permissions || user.permissions.length === 0)))) {
            router.replace('/login')
        }
    }, [user, loading, router])

    if (loading || !user) {
        return (
            <div className="min-h-screen bg-surface flex items-center justify-center">
                <div className="w-10 h-10 border-4 border-primary-700 border-t-transparent rounded-full animate-spin" />
            </div>
        )
    }

    const isConsulta = user.role === 'CONSULTA'

    return (
        <div className="flex min-h-screen bg-surface">
            <AdminSidebar />
            <main className="flex-1 lg:ml-60 xl:ml-64 pt-16 lg:pt-0 p-4 sm:p-6 lg:p-8 overflow-auto min-w-0">
                {isConsulta && (
                    <div className="mb-4 flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-800 text-sm px-4 py-2.5 rounded-xl">
                        <ShieldX className="w-4 h-4 shrink-0" />
                        <span><strong>Modo solo lectura.</strong> Tu rol no tiene permisos para crear, editar ni eliminar datos.</span>
                    </div>
                )}
                {children}
            </main>
            <ForbiddenToast />
        </div>
    )
}
