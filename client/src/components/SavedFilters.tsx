import { useState, useEffect, useRef } from 'react'
import { Bookmark, Save, Trash2, Pencil, Check, X } from 'lucide-react'

export interface SavedFiltersProps {
    storageKey: string
    currentFilters: Record<string, any>
    onLoadFilters: (filters: Record<string, any>) => void
}

interface SavedView {
    id: string
    name: string
    filters: Record<string, any>
}

export function SavedFilters({ storageKey, currentFilters, onLoadFilters }: SavedFiltersProps) {
    const [views, setViews] = useState<SavedView[]>([])
    const [showSave, setShowSave] = useState(false)
    const [viewName, setViewName] = useState('')
    const [editingId, setEditingId] = useState<string | null>(null)
    const [editingName, setEditingName] = useState('')
    const editInputRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        const stored = localStorage.getItem(storageKey)
        if (stored) {
            try { setViews(JSON.parse(stored)) } catch (e) { }
        }
    }, [storageKey])

    useEffect(() => {
        if (editingId) editInputRef.current?.focus()
    }, [editingId])

    const persist = (updated: SavedView[]) => {
        setViews(updated)
        localStorage.setItem(storageKey, JSON.stringify(updated))
    }

    const saveView = () => {
        if (!viewName.trim()) return
        const newView: SavedView = { id: Date.now().toString(), name: viewName, filters: currentFilters }
        persist([...views, newView])
        setViewName('')
        setShowSave(false)
    }

    const deleteView = (e: React.MouseEvent, id: string) => {
        e.stopPropagation()
        persist(views.filter(v => v.id !== id))
    }

    const startEdit = (e: React.MouseEvent, v: SavedView) => {
        e.stopPropagation()
        setEditingId(v.id)
        setEditingName(v.name)
    }

    const confirmEdit = (e?: React.MouseEvent) => {
        e?.stopPropagation()
        if (!editingName.trim()) { cancelEdit(); return }
        persist(views.map(v => v.id === editingId ? { ...v, name: editingName.trim() } : v))
        setEditingId(null)
    }

    const cancelEdit = (e?: React.MouseEvent) => {
        e?.stopPropagation()
        setEditingId(null)
    }

    return (
        <div className="flex items-center gap-3">
            {views.length > 0 && (
                <div className="relative group">
                    <button className="text-xs text-primary-600 hover:text-espresso flex items-center gap-1 font-medium bg-primary-100/50 py-1.5 px-3 rounded-lg border border-primary-200">
                        <Bookmark className="w-3.5 h-3.5" /> Vistas guardadas ({views.length})
                    </button>
                    <div className="absolute top-full left-0 mt-1 w-56 bg-white border border-muted rounded-xl shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-20 overflow-hidden">
                        {views.map(v => (
                            <div key={v.id} className="px-3 py-2 text-sm hover:bg-warm-50 group/item">
                                {editingId === v.id ? (
                                    <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                                        <input
                                            ref={editInputRef}
                                            type="text"
                                            className="input text-xs py-0.5 px-1.5 flex-1 min-h-0"
                                            value={editingName}
                                            onChange={e => setEditingName(e.target.value)}
                                            onKeyDown={e => { if (e.key === 'Enter') confirmEdit(); if (e.key === 'Escape') cancelEdit() }}
                                        />
                                        <button onClick={confirmEdit} className="text-green-500 hover:text-green-700 p-0.5">
                                            <Check className="w-3.5 h-3.5" />
                                        </button>
                                        <button onClick={cancelEdit} className="text-primary-400 hover:text-primary-600 p-0.5">
                                            <X className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                ) : (
                                    <div className="flex items-center justify-between cursor-pointer" onClick={() => onLoadFilters(v.filters)}>
                                        <span className="truncate flex-1">{v.name}</span>
                                        <div className="flex items-center gap-0.5 opacity-0 group-hover/item:opacity-100 transition-opacity">
                                            <button onClick={e => startEdit(e, v)} className="text-primary-400 hover:text-espresso p-1">
                                                <Pencil className="w-3.5 h-3.5" />
                                            </button>
                                            <button onClick={e => deleteView(e, v.id)} className="text-red-400 hover:text-red-600 p-1">
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {showSave ? (
                <div className="flex items-center gap-1">
                    <input autoFocus type="text" className="input text-xs py-1 px-2 w-32 min-h-0" placeholder="Nombre vista..." value={viewName} onChange={e => setViewName(e.target.value)} onKeyDown={e => e.key === 'Enter' && saveView()} />
                    <button onClick={saveView} className="btn-primary py-1 px-2 text-xs min-h-0">Guardar</button>
                    <button onClick={() => setShowSave(false)} className="btn-ghost py-1 px-2 text-xs min-h-0">Cancelar</button>
                </div>
            ) : (
                <button onClick={() => setShowSave(true)} className="text-xs text-primary-500 hover:text-espresso flex items-center gap-1">
                    <Save className="w-3.5 h-3.5" /> Guardar filtros
                </button>
            )}
        </div>
    )
}
