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
