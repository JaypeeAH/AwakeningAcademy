'use client'

import Button from '@/components/ui/Button'
import { toastError, toastSuccess } from '@/components/ui/toast/toast'
import { CopyIcon } from '@/configs/icons.config'
import { markerSnippet } from '@/utils/secrets'
import type { EggTrigger } from '@/@types/game/Secrets'

interface MarkerSnippetProps {
    trigger: EggTrigger
    markerKey: string
    className?: string
}

/** The Markdown a teacher pastes into a lesson for a hidden object or a hidden lesson section */
export default function MarkerSnippet({ trigger, markerKey, className }: MarkerSnippetProps) {
    const snippet = markerSnippet(trigger, markerKey)
    const copy = async () => {
        try {
            await navigator.clipboard.writeText(snippet)
            toastSuccess('Marker copied. Paste it into the lesson’s content.', { duration: 3000 })
        } catch {
            toastError('Couldn’t copy — select it and copy it manually.')
        }
    }

    return (
        <div className={className}>
            <div className="flex items-center gap-2">
                <code className="min-w-0 flex-1 truncate rounded-lg bg-gray-100 px-3 py-2 font-mono text-sm select-all dark:bg-gray-900">
                    {snippet}
                </code>
                <Button size="sm" icon={<CopyIcon />} onClick={() => void copy()}>
                    Copy
                </Button>
            </div>
            <p className="mt-1 text-xs text-gray-500">
                {trigger === 'lesson_section'
                    ? 'Paste this into the lesson’s content where students should have read up to. It’s invisible to them.'
                    : 'Paste this into the lesson’s content where you want the glowing ✦ to hide. Students find the secret by clicking it.'}
            </p>
        </div>
    )
}
