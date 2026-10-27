import RankEmblem from './RankEmblem'
import XpBar from './XpBar'
import { LevelBadge } from './GameTags'
import { ClassIcon } from '@/configs/icons.config'
import { UNCLASSED_TITLE } from '@/utils/classTitles'
import classNames from '@/utils/classNames'
import type { LevelProgress, Rank } from '@/@types/progression/Progression'
import type { ClassTitle } from '@/@types/subjects/Subject'

interface PlayerIdentityProps {
    name: string
    rank: Pick<Rank, 'code' | 'name'>
    progress: LevelProgress
    classTitle: ClassTitle | null
    className?: string
}

/** Rank crest, name, class title, level and XP to next level — the player's status line. */
export default function PlayerIdentity({ name, rank, progress, classTitle, className }: PlayerIdentityProps) {
    return (
        <div className={classNames('flex flex-col gap-5 sm:flex-row sm:items-center', className)}>
            <RankEmblem code={rank.code} size={96} className="mx-auto shrink-0 sm:mx-0" />
            <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                    <h2 className="truncate text-xl md:text-2xl">{name}</h2>
                    <LevelBadge level={progress.level} />
                </div>
                <p className="mt-0.5 flex items-center gap-1.5 text-sm font-medium text-primary">
                    <ClassIcon aria-hidden />
                    <span>{classTitle?.title ?? UNCLASSED_TITLE}</span>
                    <span className="text-gray-400">·</span>
                    <span className="text-gray-500 dark:text-gray-400">
                        {rank.code}-Rank {rank.name}
                    </span>
                </p>
                <XpBar
                    className="mt-4"
                    size="lg"
                    value={progress.xpIntoLevel}
                    max={progress.xpForNextLevel || 1}
                    label={progress.isMaxLevel ? 'Maximum level' : `Level ${progress.level + 1}`}
                    valueText={
                        progress.isMaxLevel
                            ? `${progress.totalXp.toLocaleString()} XP`
                            : `${progress.xpIntoLevel.toLocaleString()} / ${progress.xpForNextLevel.toLocaleString()} XP`
                    }
                />
                <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
                    {progress.totalXp.toLocaleString()} XP earned in total
                </p>
            </div>
        </div>
    )
}
