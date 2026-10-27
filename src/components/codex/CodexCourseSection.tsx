import Tag from '@/components/ui/Tag'
import MarkdownContent from '@/components/shared/MarkdownContent'
import SystemPanel from '@/components/game/SystemPanel'
import { rarityBorderClass } from '@/components/inventory/rarity'
import navigationIcon from '@/configs/icons.config'
import { rarityLabel, rarityTagClass } from '@/@types/game/Inventory'
import { formatDate } from '@/utils/dates'
import classNames from '@/utils/classNames'
import type { CodexCourse, CodexEntry, CodexSilhouette } from '@/@types/game/Secrets'

function DiscoveredCard({ entry }: { entry: CodexEntry }) {
    return (
        <article
            className={classNames(
                'flex h-full flex-col gap-2 rounded-2xl border-2 bg-white p-4 dark:bg-gray-800',
                rarityBorderClass[entry.rarity],
            )}
        >
            <div className="flex items-start gap-3">
                <span
                    className={classNames(
                        'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-xl',
                        rarityTagClass[entry.rarity],
                    )}
                    aria-hidden
                >
                    {navigationIcon.easter}
                </span>
                <div className="min-w-0 flex-1">
                    <h3 className="font-semibold">{entry.title}</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Found {formatDate(entry.discoveredAt)}</p>
                </div>
                <Tag className={rarityTagClass[entry.rarity]}>{rarityLabel[entry.rarity]}</Tag>
            </div>
            {entry.rewards.length > 0 && (
                <ul className="flex flex-wrap gap-1" aria-label="Rewards">
                    {entry.rewards.map((r) => (
                        <li key={r.label}>
                            <Tag className="border-transparent bg-gold-subtle text-gold">{r.label}</Tag>
                        </li>
                    ))}
                </ul>
            )}
            {entry.reveal && (
                <details className="group mt-1 rounded-xl bg-gray-50 px-3 py-2 text-sm dark:bg-gray-900">
                    <summary className="cursor-pointer font-medium text-primary">Read what you found</summary>
                    <MarkdownContent className="mt-2">{entry.reveal}</MarkdownContent>
                </details>
            )}
        </article>
    )
}

function Silhouette({ secret }: { secret: CodexSilhouette }) {
    return (
        <article
            className={classNames(
                'flex h-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed p-4 text-center',
                rarityBorderClass[secret.rarity],
            )}
        >
            <span className="sr-only">Undiscovered {rarityLabel[secret.rarity].toLowerCase()} secret.</span>
            <span className="font-display text-3xl tracking-[0.3em] text-gray-400 dark:text-gray-500" aria-hidden>
                ???
            </span>
            <Tag className={rarityTagClass[secret.rarity]} aria-hidden>
                {rarityLabel[secret.rarity]}
            </Tag>
            <p className="text-sm text-gray-600 dark:text-gray-300">
                {secret.clue ?? 'A secret waits somewhere in this course.'}
            </p>
        </article>
    )
}

/** One course's page in the Codex: what's been found, and silhouettes of what hasn't */
export default function CodexCourseSection({ course }: { course: CodexCourse }) {
    const total = course.discovered.length + course.undiscovered.length
    return (
        <SystemPanel
            eyebrow="Course"
            title={course.courseTitle}
            actions={
                <span className="text-sm text-gray-500 tabular-nums dark:text-gray-400">
                    {course.discovered.length} / {total} found
                </span>
            }
        >
            <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {course.discovered.map((entry) => (
                    <li key={entry.eggId}>
                        <DiscoveredCard entry={entry} />
                    </li>
                ))}
                {course.undiscovered.map((secret) => (
                    <li key={secret.eggId}>
                        <Silhouette secret={secret} />
                    </li>
                ))}
            </ul>
        </SystemPanel>
    )
}
