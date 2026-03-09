export const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080'

export interface PageResponse<T> {
    content: T[]
    totalElements: number
    totalPages: number
    number: number
    size: number
}

// Entities
export interface User {
    id: number
    username: string
    email: string
    role: 'ADMIN' | 'CUSTOMER'
    active: boolean
    createdAt: string
}

export interface Category {
    id: number
    name: string
    description?: string
    type: 'PRODUCT'
}

export interface Supplier {
    id: number
    name: string
    legalName?: string
    taxId?: string
    alias?: string
    phone?: string
    email?: string
    address?: string
    category?: Category
    accountBalance: number
    createdAt: string
}

export interface Customer {
    id: number
    firstName: string
    lastName?: string
    email?: string
    phone?: string
    address?: string
    taxId?: string
    notes?: string
    accountBalance: number
    loyaltyPoints: number
    createdAt: string
}

export interface ItemComponent {
    id: number
    componentItem: Item
    quantity: number
}

export interface Item {
    id: number
    name: string
    description?: string
    price: number
    cost: number
    imageUrl?: string
    stock: number
    minStock: number
    category?: Category
    supplier?: Supplier
    visible: boolean
    barcode?: string
    unit?: string
    unitSize?: number
    purchaseUnit?: string
    purchaseConversion?: number
    createdAt: string
    components?: ItemComponent[]
}

export interface OperationStatus {
    id: number
    name: string
    type: 'SALE' | 'PURCHASE'
    color: string
    createdBy?: User
    createdAt?: string
}

export interface PaymentMethod {
    id: number
    name: string
    description?: string
    createdBy?: User
    createdAt?: string
}

export interface OrderLine {
    id: number
    item: Item
    quantity: number
    unitPrice?: number
    unitCost?: number
}

export interface SaleOrder {
    id: number
    customer?: Customer
    status?: OperationStatus
    paymentMethod?: PaymentMethod
    notes?: string
    total: number
    pointsUsed?: number
    createdBy?: User
    createdAt: string
    lines: OrderLine[]
}

export interface PurchaseOrder {
    id: number
    supplier?: Supplier
    status?: OperationStatus
    paymentMethod?: PaymentMethod
    notes?: string
    total: number
    createdBy?: User
    createdAt: string
    lines: OrderLine[]
}

export interface StockMovement {
    id: number
    item: Item
    movementType: 'IN' | 'OUT' | 'ADJUSTMENT'
    quantity: number
    reason?: string
    referenceType?: string
    referenceId?: number
    createdBy?: User
    createdAt: string
}

export interface CashRegister {
    id: number
    openingAmount: number
    closingAmount?: number
    openedAt: string
    closedAt?: string
    notes?: string
}

export interface CashMovement {
    id: number
    movementType: 'INCOME' | 'EXPENSE'
    amount: number
    description?: string
    createdAt: string
}

export interface Notification {
    id: number
    message: string
    type: 'INFO' | 'WARNING' | 'ALERT'
    isRead: boolean
    createdAt: string
}

export interface AccountMovement {
    id: number
    customer?: Customer
    supplier?: Supplier
    movementType: 'CHARGE' | 'PAYMENT'
    amount: number
    description: string
    createdAt: string
}

export interface DashboardKpi {
    salesToday: number
    salesWeek: number
    salesPeriod: number
    purchasesPeriod: number
    grossMargin: number
    criticalStock: number
    unreadAlerts: number
    orderCount: number
    avgTicket: number
    activeProducts: number
}
