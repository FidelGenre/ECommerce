// Maps each admin route to the view permission required to access it.
// Used by AdminLayout to block direct-URL access, and mirrors the backend's
// read-permission enforcement. Order matters: longest/most-specific prefixes first.
const ROUTE_PERMISSIONS: { prefix: string; perm: string }[] = [
    { prefix: '/admin/settings', perm: 'MANAGE_SETTINGS' },
    { prefix: '/admin/notifications', perm: 'MANAGE_SETTINGS' },
    { prefix: '/admin/audit', perm: 'MANAGE_SETTINGS' },
    { prefix: '/admin/sales', perm: 'MANAGE_SALES' },
    { prefix: '/admin/purchases', perm: 'MANAGE_PURCHASES' },
    { prefix: '/admin/inventory', perm: 'MANAGE_INVENTORY' },
    { prefix: '/admin/productos', perm: 'MANAGE_INVENTORY' },
    { prefix: '/admin/cash', perm: 'MANAGE_CASH' },
    { prefix: '/admin/costs', perm: 'MANAGE_CASH' },
    { prefix: '/admin/reports', perm: 'VIEW_REPORTS' },
    { prefix: '/admin/clientes', perm: 'MANAGE_CUSTOMERS' },
    { prefix: '/admin/customers', perm: 'MANAGE_CUSTOMERS' },
    { prefix: '/admin/suppliers', perm: 'MANAGE_SUPPLIERS' },
    // Dashboard is the base /admin route; checked last so it doesn't shadow the others.
    { prefix: '/admin', perm: 'VIEW_DASHBOARD' },
]

/** Returns the view permission required for a given admin path, or null if none maps. */
export function requiredViewPermission(pathname: string): string | null {
    const match = ROUTE_PERMISSIONS.find(r => pathname === r.prefix || pathname.startsWith(r.prefix + '/'))
    return match ? match.perm : null
}

// Landing order: which section to send a user to first, mirroring the sidebar order.
// Used to redirect away from /admin (Dashboard) when the role lacks VIEW_DASHBOARD.
const LANDING_ORDER: { href: string; perm: string }[] = [
    { href: '/admin', perm: 'VIEW_DASHBOARD' },
    { href: '/admin/sales', perm: 'MANAGE_SALES' },
    { href: '/admin/purchases', perm: 'MANAGE_PURCHASES' },
    { href: '/admin/inventory', perm: 'MANAGE_INVENTORY' },
    { href: '/admin/cash', perm: 'MANAGE_CASH' },
    { href: '/admin/reports', perm: 'VIEW_REPORTS' },
    { href: '/admin/clientes', perm: 'MANAGE_CUSTOMERS' },
    { href: '/admin/suppliers', perm: 'MANAGE_SUPPLIERS' },
    { href: '/admin/settings/users', perm: 'MANAGE_SETTINGS' },
]

/** First admin route the given permissions can access, or null if none. ADMIN handled by caller. */
export function firstAccessibleAdminRoute(permissions: string[] | undefined): string | null {
    if (!permissions) return null
    const match = LANDING_ORDER.find(r => permissions.includes(r.perm))
    return match ? match.href : null
}
