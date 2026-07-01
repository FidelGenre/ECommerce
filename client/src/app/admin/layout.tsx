'use client'
import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/lib/auth'
import { requiredViewPermission } from '@/lib/adminPermissions'
import AdminSidebar from '@/components/admin/AdminSidebar'
import { ForbiddenToast } from '@/components/ForbiddenToast'
import { Toast } from '@/components/Toast'
import { ShieldX } from 'lucide-react'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const { user, loading, canWrite } = useAuth()
    const router = useRouter()
    const pathname = usePathname()

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

    // Block direct-URL access to sections the role can't view. ADMIN (MANAGE_WRITE
    // wildcard aside) and any role holding the section's permission pass through.
    const requiredPerm = requiredViewPermission(pathname)
    const hasSectionAccess = user.role === 'ADMIN'
        || !requiredPerm
        || (user.permissions?.includes(requiredPerm) ?? false)

    const isReadOnly = !canWrite

    return (
        <div className="flex min-h-screen bg-surface">
            <AdminSidebar />
            {!hasSectionAccess ? (
                <main className="flex-1 lg:ml-60 xl:ml-64 pt-16 lg:pt-0 p-4 sm:p-6 lg:p-8 overflow-auto min-w-0 flex items-center justify-center">
                    <div className="text-center max-w-md">
                        <div className="w-14 h-14 rounded-2xl bg-red-50 flex items-center justify-center mx-auto mb-4">
                            <ShieldX className="w-7 h-7 text-red-500" />
                        </div>
                        <h2 className="text-xl font-bold text-espresso mb-2">Sin acceso a esta sección</h2>
                        <p className="text-primary-500 text-sm mb-6">Tu rol no tiene permiso para ver esta parte del panel.</p>
                        <Link href="/admin" className="btn-primary inline-flex">Volver al inicio del panel</Link>
                    </div>
                    <ForbiddenToast />
                    <Toast />
                </main>
            ) : (
            <>
            <main className="flex-1 lg:ml-60 xl:ml-64 pt-16 lg:pt-0 p-4 sm:p-6 lg:p-8 overflow-auto min-w-0">
                {isReadOnly && (
                    <div className="mb-4 flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-800 text-sm px-4 py-2.5 rounded-xl">
                        <ShieldX className="w-4 h-4 shrink-0" />
                        <span><strong>Modo solo lectura.</strong> Tu rol no tiene permisos para crear, editar ni eliminar datos.</span>
                    </div>
                )}
                {children}
            </main>
            <ForbiddenToast />
            <Toast />
            </>
            )}
        </div>
    )
}
