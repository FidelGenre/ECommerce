type Listener = (msg: string) => void

// --- Forbidden (403) ---
const forbiddenListeners: Listener[] = []
export function onForbidden(fn: Listener) {
    forbiddenListeners.push(fn)
    return () => { const i = forbiddenListeners.indexOf(fn); if (i >= 0) forbiddenListeners.splice(i, 1) }
}
export function emitForbidden(msg: string) { forbiddenListeners.forEach(fn => fn(msg)) }

// --- General toast ---
export type ToastType = 'success' | 'error' | 'info'
type ToastListener = (msg: string, type: ToastType) => void
const toastListeners: ToastListener[] = []
export function onToast(fn: ToastListener) {
    toastListeners.push(fn)
    return () => { const i = toastListeners.indexOf(fn); if (i >= 0) toastListeners.splice(i, 1) }
}
export function emitToast(msg: string, type: ToastType) { toastListeners.forEach(fn => fn(msg, type)) }
