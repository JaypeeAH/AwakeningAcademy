'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { toastInfo } from '@/components/ui/toast/toast'
import { apiClaimMarker } from '@/services/game'
import { getErrorCode } from '@/utils/errors'
import classNames from '@/utils/classNames'
import type { Discovery } from '@/@types/game/Secrets'

/*
 * Secrets teachers hide in lesson Markdown:
 *   [✦](secret:KEY)       a hidden object — a faint glint the student can click
 *   [](secret-seen:KEY)   a hidden section — found by scrolling far enough to reach it
 * The server checks the key belongs to a lesson the student can open, and claims it once.
 */

interface SecretMarkerContextValue {
    claim: (key: string, silent: boolean) => Promise<void>
    found: ReadonlySet<string>
}

const SecretMarkerContext = createContext<SecretMarkerContextValue | null>(null)

export function SecretMarkerProvider({
    children,
    onFound,
}: {
    children: ReactNode
    onFound: (discovery: Discovery) => void
}) {
    const [found, setFound] = useState<ReadonlySet<string>>(new Set())
    const pending = useRef(new Set<string>())

    const claim = useCallback(
        async (key: string, silent: boolean) => {
            if (pending.current.has(key)) return
            pending.current.add(key)
            try {
                const discovery = await apiClaimMarker(key)
                setFound((prev) => new Set(prev).add(key))
                if (discovery) onFound(discovery)
                else if (!silent) notify('You’ve already found this secret. It’s in your Codex.')
            } catch (error) {
                pending.current.delete(key)
                if (!silent)
                    notify(
                        getErrorCode(error) === 'SECRET_NOT_FOUND'
                            ? 'Nothing here… this time.'
                            : 'The glint faded. Try again in a moment.',
                    )
            }
        },
        [onFound],
    )

    const value = useMemo(() => ({ claim, found }), [claim, found])
    return <SecretMarkerContext.Provider value={value}>{children}</SecretMarkerContext.Provider>
}

const notify = (message: string) => toastInfo(message)

/** Renders a secret link; outside a provider (previews, other pages) only the label shows */
export function SecretMarker({ markerKey, seen, label }: { markerKey: string; seen: boolean; label: ReactNode }) {
    const context = useContext(SecretMarkerContext)
    const sentinel = useRef<HTMLSpanElement>(null)
    const claim = context?.claim

    useEffect(() => {
        if (!seen || !claim || !sentinel.current) return
        const observer = new IntersectionObserver(
            (entries) => {
                if (entries.some((e) => e.isIntersecting)) {
                    observer.disconnect()
                    void claim(markerKey, true)
                }
            },
            { threshold: 1 },
        )
        observer.observe(sentinel.current)
        return () => observer.disconnect()
    }, [seen, claim, markerKey])

    if (seen) return <span ref={sentinel} aria-hidden className="inline-block h-px w-px" />
    if (!context) return <>{label}</>
    const isFound = context.found.has(markerKey)
    return (
        <button
            type="button"
            className={classNames('secret-marker', isFound && 'secret-marker-found')}
            onClick={() => void context.claim(markerKey, false)}
            aria-label={isFound ? 'A secret you found' : 'Something glints here'}
        >
            {label}
        </button>
    )
}
