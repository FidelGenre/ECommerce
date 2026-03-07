'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth'
import AdminSidebar from '@/components/admin/AdminSidebar'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const { user, loading } = useAuth()
    const router = useRouter()

    useEffect(() => {
        if (!loading && (!user || (user.role !== 'ADMIN' && user.role !== 'SUPPLIER'))) {
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

    return (
        <div className="flex min-h-screen bg-surface">
            <AdminSidebar />
            {/* Desktop: offset for fixed sidebar. Mobile: offset for fixed top bar */}
            <main className="flex-1 lg:ml-60 xl:ml-64 pt-16 lg:pt-0 p-4 sm:p-6 lg:p-8 overflow-auto min-w-0">
                {children}
            </main>
        </div>
    )
}
