'use client'
import { useEffect, useState } from 'react'
import { ArrowUp } from 'lucide-react'

interface ScrollToTopProps {
    /** Vertical offset class. Use the taller "bottom-24" on pages that also have
     *  a floating cart button (home) so this sits centered right above it. */
    bottomClass?: string
}

/** Floating "back to top" button that fades in once the user scrolls down.
 *  Matches the cart button (espresso) and, on the home, sits centered above it
 *  (both are anchored to the same right edge with matching widths). */
export function ScrollToTop({ bottomClass = 'bottom-6' }: ScrollToTopProps = {}) {
    const [visible, setVisible] = useState(false)

    useEffect(() => {
        const onScroll = () => setVisible(window.scrollY > 400)
        onScroll()
        window.addEventListener('scroll', onScroll, { passive: true })
        return () => window.removeEventListener('scroll', onScroll)
    }, [])

    return (
        <button
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            aria-label="Volver arriba"
            className={`fixed ${bottomClass} right-[calc(1.5rem+4px)] z-40 w-12 h-12 rounded-full bg-espresso hover:bg-primary-800 text-white shadow-lg flex items-center justify-center transition-all duration-300 ${
                visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'
            }`}>
            <ArrowUp className="w-5 h-5" />
        </button>
    )
}
