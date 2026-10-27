import Link from 'next/link'
import { ActivityKindTag, DifficultyStars, QuestStateTag, SubjectTag, XpReward } from '@/components/game/GameTags'
import { CalendarIcon, DurationIcon, LockedIcon } from '@/configs/icons.config'
import { getLearnPath } from '@/configs/app.config'
import { isAssessment } from '@/@types/activities/ActivityKindOptions'
import { formatDuration, fromNow } from '@/utils/dates'
import classNames from '@/utils/classNames'
import type { Quest } from '@/@types/activities/Activity'

interface QuestCardProps {
    quest: Quest
    /** Hide the course/subject line (e.g. on the course's own page) */
    hideCourse?: boolean
    className?: string
}

/** A quest on the board: what it is, what it's worth, and whether it can be played now. */
export default function QuestCard({ quest, hideCourse, className }: QuestCardProps) {
    const blocked = quest.state === 'locked' || quest.state === 'upcoming'
    const overdue = quest.dueAt && quest.dueAt < new Date() && quest.state !== 'completed'
    const content = (
        <div
            className={classNames(
                'subject-accent flex h-full flex-col gap-3 rounded-2xl border border-l-4 border-gray-200 bg-white p-4 transition-colors dark:border-gray-700 dark:bg-gray-800',
                `subject-theme-${quest.course.subject.theme}`,
                !blocked && 'hover:border-primary dark:hover:border-primary',
                blocked && 'opacity-75',
                className,
            )}
            style={{ borderLeftColor: 'var(--subject)' }}
        >
            <div className="flex flex-wrap items-center gap-2">
                <ActivityKindTag kind={quest.kind} />
                <QuestStateTag state={quest.state} />
                <span className="ml-auto">
                    <XpReward amount={quest.xpReward} />
                </span>
            </div>
            <div className="min-w-0">
                <h3 className="text-base font-semibold leading-snug">{quest.title}</h3>
                {quest.summary && (
                    <p className="mt-1 line-clamp-2 text-sm text-gray-500 dark:text-gray-400">{quest.summary}</p>
                )}
            </div>
            {!hideCourse && (
                <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                    <SubjectTag subject={quest.course.subject} />
                    <span className="truncate">
                        {quest.course.title}
                        {quest.moduleTitle && ` · ${quest.moduleTitle}`}
                    </span>
                </div>
            )}
            <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
                <DifficultyStars difficulty={quest.difficulty} />
                {quest.estimatedMinutes && (
                    <span className="inline-flex items-center gap-1">
                        <DurationIcon aria-hidden /> {formatDuration(quest.estimatedMinutes)}
                    </span>
                )}
                {quest.dueAt && (
                    <span
                        className={classNames('inline-flex items-center gap-1', overdue && 'font-semibold text-error')}
                    >
                        <CalendarIcon aria-hidden /> {overdue ? 'Overdue' : 'Due'} {fromNow(quest.dueAt)}
                    </span>
                )}
                {isAssessment(quest.kind) && quest.bestPercent !== null && (
                    <span>Best {Math.round(quest.bestPercent)}%</span>
                )}
                {isAssessment(quest.kind) && quest.attemptsLeft !== null && quest.state !== 'completed' && (
                    <span>
                        {quest.attemptsLeft} {quest.attemptsLeft === 1 ? 'attempt' : 'attempts'} left
                    </span>
                )}
            </div>
            {quest.stateReason && (
                <p className="flex items-center gap-1.5 text-xs font-medium text-gray-500 dark:text-gray-400">
                    <LockedIcon aria-hidden /> {quest.stateReason}
                </p>
            )}
        </div>
    )

    if (blocked) return <div aria-disabled>{content}</div>
    return (
        <Link
            href={getLearnPath(quest.id)}
            className="block h-full rounded-2xl focus-visible:outline-2"
            aria-label={`${quest.title} — open quest`}
        >
            {content}
        </Link>
    )
}
