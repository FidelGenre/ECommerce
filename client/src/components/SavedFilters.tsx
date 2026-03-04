import { useState, useEffect } from 'react'
import { Bookmark, Save, Trash2 } from 'lucide-react'

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

    useEffect(() => {
        const stored = localStorage.getItem(storageKey)
        if (stored) {
            try { setViews(JSON.parse(stored)) } catch (e) { }
        }
    }, [storageKey])

    const saveView = () => {
        if (!viewName.trim()) return
        const newView: SavedView = { id: Date.now().toString(), name: viewName, filters: currentFilters }
        const newViews = [...views, newView]
        setViews(newViews)
        localStorage.setItem(storageKey, JSON.stringify(newViews))
        setViewName('')
        setShowSave(false)
    }

    const deleteView = (e: React.MouseEvent, id: string) => {
        e.stopPropagation()
        const newViews = views.filter(v => v.id !== id)
        setViews(newViews)
        localStorage.setItem(storageKey, JSON.stringify(newViews))
    }

    return (
        <div className="flex items-center gap-3">
            {views.length > 0 && (
                <div className="relative group">
                    <button className="text-xs text-primary-600 hover:text-espresso flex items-center gap-1 font-medium bg-primary-100/50 py-1.5 px-3 rounded-lg border border-primary-200">
                        <Bookmark className="w-3.5 h-3.5" /> Vistas guardadas ({views.length})
                    </button>
                    <div className="absolute top-full left-0 mt-1 w-48 bg-white border border-muted rounded-xl shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-20 overflow-hidden">
                        {views.map(v => (
                            <div key={v.id} onClick={() => onLoadFilters(v.filters)} className="px-3 py-2 text-sm hover:bg-warm-50 cursor-pointer flex items-center justify-between group/item">
                                <span className="truncate">{v.name}</span>
                                <button onClick={(e) => deleteView(e, v.id)} className="text-red-400 hover:text-red-600 opacity-0 group-hover/item:opacity-100 transition-opacity p-1">
                                    <Trash2 className="w-3.5 h-3.5" />
                                </button>
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
