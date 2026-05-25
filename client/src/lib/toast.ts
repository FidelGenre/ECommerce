import { emitToast } from './events'

export const toast = {
    success: (msg: string) => emitToast(msg, 'success'),
    error: (msg: string) => emitToast(msg, 'error'),
    info: (msg: string) => emitToast(msg, 'info'),
}
