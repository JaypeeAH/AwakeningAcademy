'use client'

import { CheckIcon, WarningIcon } from '@/configs/icons.config'
import { issueTargetElementId } from './activityForm'
import type { ActivityIssue } from '@/utils/activityValidation'

interface PublishChecklistProps {
    issues: ActivityIssue[]
    published: boolean
}

/** What still blocks publishing, live as the teacher edits. Each item jumps to the field to fix. */
export default function PublishChecklist({ issues, published }: PublishChecklistProps) {
    const focusTarget = (target: string) => {
        const element = document.getElementById(issueTargetElementId(target))
        if (!element) return
        element.scrollIntoView({ behavior: 'smooth', block: 'center' })
        element.focus({ preventScroll: true })
    }

    if (!issues.length) {
        return (
            <p className="flex items-center gap-2 text-sm text-success">
                <CheckIcon aria-hidden /> {published ? 'Published and complete.' : 'Ready to publish.'}
            </p>
        )
    }

    return (
        <div>
            <p className="mb-2 text-sm text-gray-600 dark:text-gray-300">
                {published ? 'Fix these to save — published activities must stay complete:' : 'Before you can publish:'}
            </p>
            <ul className="space-y-1.5" aria-live="polite">
                {issues.map((issue) => (
                    <li key={`${issue.target}-${issue.message}`}>
                        <button
                            type="button"
                            onClick={() => focusTarget(issue.target)}
                            className="flex w-full items-start gap-2 rounded-lg px-2 py-1 text-left text-sm text-warning hover:bg-warning-subtle"
                        >
                            <WarningIcon className="mt-0.5 shrink-0" aria-hidden />
                            <span>{issue.message}</span>
                        </button>
                    </li>
                ))}
            </ul>
        </div>
    )
}
