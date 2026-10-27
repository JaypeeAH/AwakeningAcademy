import Tag from '@/components/ui/Tag'
import navigationIcon, { DifficultyIcon, LevelIcon, XpIcon } from '@/configs/icons.config'
import { rankTagClass } from '@/@types/progression/RankOptions'
import { subjectTagClass, subjectThemeIcon } from '@/@types/subjects/SubjectOptions'
import {
    DIFFICULTY_LABELS,
    activityKindIcon,
    activityKindLabel,
    activityKindTagClass,
    publishStatusLabel,
    publishStatusTagClass,
    type ActivityKind,
    type PublishStatus,
} from '@/@types/activities/ActivityKindOptions'
import classNames from '@/utils/classNames'
import type { SubjectMeta } from '@/@types/subjects/Subject'
import type { QuestState } from '@/@types/activities/Activity'

/* Small labels used across quests, courses and reports. Colours come from the *Options maps. */

export function XpReward({ amount, className }: { amount: number; className?: string }) {
    return (
        <span
            className={classNames('inline-flex items-center gap-0.5 font-semibold tabular-nums text-gold', className)}
        >
            <XpIcon aria-hidden />
            {amount > 0 ? `+${amount}` : amount} XP
        </span>
    )
}

export function LevelBadge({ level, className }: { level: number; className?: string }) {
    return (
        <span
            className={classNames(
                'inline-flex items-center gap-1 rounded-lg bg-primary-subtle px-2 py-0.5 text-xs font-bold text-primary tabular-nums',
                className,
            )}
        >
            <LevelIcon aria-hidden /> Lv {level}
        </span>
    )
}

export function RankTag({ code, className }: { code: string; className?: string }) {
    return <Tag className={classNames(rankTagClass(code), className)}>{code}-Rank</Tag>
}

export function SubjectTag({
    subject,
    className,
}: {
    subject: Pick<SubjectMeta, 'name' | 'theme'>
    className?: string
}) {
    return (
        <Tag className={classNames(subjectTagClass(subject.theme), 'gap-1', className)}>
            <span aria-hidden>{navigationIcon[subjectThemeIcon[subject.theme]]}</span>
            {subject.name}
        </Tag>
    )
}

export function ActivityKindTag({ kind, className }: { kind: ActivityKind; className?: string }) {
    return (
        <Tag className={classNames(activityKindTagClass[kind], 'gap-1', className)}>
            <span aria-hidden>{navigationIcon[activityKindIcon[kind]]}</span>
            {activityKindLabel[kind]}
        </Tag>
    )
}

export function PublishStatusTag({ status, className }: { status: PublishStatus; className?: string }) {
    return <Tag className={classNames(publishStatusTagClass[status], className)}>{publishStatusLabel[status]}</Tag>
}

const questStateMeta: Record<QuestState, { label: string; className: string }> = {
    locked: {
        label: 'Locked',
        className: 'bg-gray-100 text-gray-500 border-transparent dark:bg-gray-700 dark:text-gray-300',
    },
    upcoming: { label: 'Upcoming', className: 'bg-info-subtle text-info border-transparent' },
    available: { label: 'Available', className: 'bg-primary-subtle text-primary border-transparent' },
    in_progress: { label: 'In progress', className: 'bg-warning-subtle text-warning border-transparent' },
    in_review: { label: 'Being marked', className: 'bg-info-subtle text-info border-transparent' },
    completed: { label: 'Completed', className: 'bg-success-subtle text-success border-transparent' },
}

export function QuestStateTag({ state, className }: { state: QuestState; className?: string }) {
    const meta = questStateMeta[state]
    return <Tag className={classNames(meta.className, className)}>{meta.label}</Tag>
}

export function DifficultyStars({ difficulty, className }: { difficulty: number; className?: string }) {
    const label = DIFFICULTY_LABELS[Math.min(Math.max(difficulty, 1), 5) - 1]
    return (
        <span className={classNames('inline-flex items-center gap-0.5', className)} title={`Difficulty: ${label}`}>
            <span className="sr-only">Difficulty: {label}</span>
            {Array.from({ length: 5 }, (_, i) => (
                <DifficultyIcon
                    key={i}
                    aria-hidden
                    className={i < difficulty ? 'fill-current text-gold' : 'text-gray-300 dark:text-gray-600'}
                />
            ))}
        </span>
    )
}
