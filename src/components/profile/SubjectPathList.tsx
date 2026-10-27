import navigationIcon from '@/configs/icons.config'
import XpBar from '@/components/game/XpBar'
import { LevelBadge } from '@/components/game/GameTags'
import { subjectThemeIcon } from '@/@types/subjects/SubjectOptions'
import classNames from '@/utils/classNames'
import type { SubjectPath } from '@/@types/subjects/Subject'

interface SubjectPathListProps {
    paths: SubjectPath[]
    /** Dashboard version: no next-title requirements */
    compact?: boolean
}

/**
 * The student's paths per subject: level, mastery and class title (Apprentice Mathematician …), with what
 * the next title needs. Mastery is shown beside level because titles need both.
 */
export default function SubjectPathList({ paths, compact }: SubjectPathListProps) {
    return (
        <ul className={classNames(compact ? 'space-y-3' : 'space-y-5')}>
            {paths.map((path) => {
                const next = path.nextTitle
                return (
                    <li key={path.subject.id} className={`subject-theme-${path.subject.theme} flex gap-3`}>
                        <span
                            className={classNames(
                                'subject-icon shrink-0',
                                compact ? 'h-9 w-9 text-lg' : 'h-11 w-11 text-xl',
                            )}
                            aria-hidden
                        >
                            {navigationIcon[subjectThemeIcon[path.subject.theme]]}
                        </span>
                        <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                                <span className="font-semibold text-gray-900 dark:text-gray-50">
                                    {path.title?.title ?? path.subject.name}
                                </span>
                                <LevelBadge level={path.level} />
                            </div>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                {path.subject.name} · {path.xp.toLocaleString()} XP ·{' '}
                                {path.gradedCount
                                    ? `${Math.round(path.mastery)}% mastery (${path.gradedCount} graded)`
                                    : 'no graded work yet'}
                            </p>
                            {!compact && next && (
                                <div className="subject-bar mt-2">
                                    <XpBar
                                        size="sm"
                                        value={Math.min(path.level, next.minSubjectLevel)}
                                        max={next.minSubjectLevel}
                                        label={`Next: ${next.title}`}
                                        valueText={`Level ${next.minSubjectLevel}${next.minMastery > 0 ? ` · ${next.minMastery}% mastery` : ''}`}
                                    />
                                    {next.minMastery > path.mastery && path.level >= next.minSubjectLevel && (
                                        <p className="mt-1 text-xs font-medium text-warning">
                                            Level reached — raise your mastery to {next.minMastery}% to claim this
                                            title.
                                        </p>
                                    )}
                                </div>
                            )}
                        </div>
                    </li>
                )
            })}
        </ul>
    )
}
