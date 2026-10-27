import SystemPanel from './SystemPanel'
import RankEmblem from './RankEmblem'
import { CheckIcon, LockedIcon, TrialIcon } from '@/configs/icons.config'
import classNames from '@/utils/classNames'
import type { RankTrial } from '@/@types/progression/Progression'

interface RankTrialPanelProps {
    trial: RankTrial | null
    className?: string
}

/**
 * The promotion trial: what the next rank requires. Rank needs both level AND demonstrated mastery, so
 * students can see exactly which learning goal is holding them back.
 */
export default function RankTrialPanel({ trial, className }: RankTrialPanelProps) {
    if (!trial) {
        return (
            <SystemPanel eyebrow="Promotion trial" title="The summit" tone="gold" className={className}>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                    You hold the highest rank. Keep learning — mastery never ends.
                </p>
            </SystemPanel>
        )
    }
    const met = trial.requirements.filter((r) => r.met).length
    return (
        <SystemPanel
            eyebrow="Promotion trial"
            title={`${trial.rank.code}-Rank · ${trial.rank.name}`}
            actions={<RankEmblem code={trial.rank.code} size={44} />}
            className={className}
        >
            <p className="mb-3 text-sm text-gray-500 dark:text-gray-400">
                {trial.eligible
                    ? 'Every requirement is met — your promotion arrives with your next reward.'
                    : `${met} of ${trial.requirements.length} requirements met.`}
            </p>
            <ul className="space-y-2">
                {trial.requirements.map((r) => (
                    <li key={r.key} className="flex items-start gap-2.5 text-sm">
                        <span
                            className={classNames(
                                'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs',
                                r.met ? 'bg-success-subtle text-success' : 'bg-gray-100 text-gray-400 dark:bg-gray-700',
                            )}
                            aria-hidden
                        >
                            {r.met ? <CheckIcon /> : r.key === 'level' ? <LockedIcon /> : <TrialIcon />}
                        </span>
                        <span
                            className={classNames(
                                'flex-1',
                                r.met && 'text-gray-500 line-through decoration-gray-400/60',
                            )}
                        >
                            {r.label}
                            <span className="sr-only">{r.met ? ' (met)' : ' (not yet met)'}</span>
                        </span>
                        <span className="tabular-nums text-xs text-gray-500 dark:text-gray-400">
                            {r.key === 'averageScore' ? `${Math.round(r.current)}%` : r.current} /{' '}
                            {r.key === 'averageScore' ? `${r.required}%` : r.required}
                        </span>
                    </li>
                ))}
            </ul>
        </SystemPanel>
    )
}
