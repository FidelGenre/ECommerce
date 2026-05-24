type Listener = (msg: string) => void
const listeners: Listener[] = []

export function onForbidden(fn: Listener) {
    listeners.push(fn)
    return () => {
        const i = listeners.indexOf(fn)
        if (i >= 0) listeners.splice(i, 1)
    }
}

export function emitForbidden(msg: string) {
    listeners.forEach(fn => fn(msg))
}
