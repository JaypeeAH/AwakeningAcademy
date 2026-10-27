'use client'

import ErrorState from '@/components/shared/ErrorState'

/** Catches unexpected rendering errors inside the app shell and offers a retry. */
export default function PortalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
    return (
        <ErrorState
            title="This page hit a snag"
            message={`Something unexpected went wrong while showing this page. Try again — if it keeps happening, tell your teacher or administrator${error.digest ? ` (reference ${error.digest})` : ''}.`}
            onRetry={reset}
        />
    )
}
