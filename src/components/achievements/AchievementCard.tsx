import Tag from '@/components/ui/Tag'
import XpBar from '@/components/game/XpBar'
import { XpReward } from '@/components/game/GameTags'
import { achievementIcon } from '@/components/game/achievementIcons'
import { rarityBorderClass } from '@/components/inventory/rarity'
import { SuccessIcon } from '@/configs/icons.config'
import { formatDate } from '@/utils/dates'
import classNames from '@/utils/classNames'
import { rarityLabel, rarityTagClass } from '@/@types/game/Inventory'
import type { PlayerAchievement } from '@/@types/game/Achievements'

/** One achievement: earned (with date) or locked (with progress); hidden ones stay ??? */
export default function AchievementCard({ achievement }: { achievement: PlayerAchievement }) {
    const earned = !!achievement.earnedAt
    const hidden = achievement.secret && !earned
    return (
        <article
            className={classNames(
                'flex h-full flex-col gap-3 rounded-2xl border-2 bg-white p-4 dark:bg-gray-800',
                earned ? rarityBorderClass[achievement.rarity] : 'border-dashed border-gray-200 dark:border-gray-700',
            )}
            aria-label={
                earned ? `${achievement.name}, earned` : hidden ? 'Hidden achievement' : `${achievement.name}, locked`
            }
        >
            <div className="flex items-start gap-3">
                <span
                    className={classNames(
                        'flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-2xl',
                        earned ? 'bg-gold-subtle text-gold' : 'bg-gray-100 text-gray-400 dark:bg-gray-700',
                    )}
                    aria-hidden
                >
                    {achievementIcon(achievement.icon)}
                </span>
                <div className="min-w-0 flex-1">
                    <h3 className={classNames('text-base', !earned && 'text-gray-600 dark:text-gray-300')}>
                        {achievement.name}
                    </h3>
                    <Tag className={`mt-1 ${rarityTagClass[achievement.rarity]}`}>
                        {rarityLabel[achievement.rarity]}
                    </Tag>
                </div>
                {achievement.xpReward > 0 && !hidden && <XpReward amount={achievement.xpReward} className="shrink-0" />}
            </div>
            <p className="flex-1 text-sm text-gray-600 dark:text-gray-300">{achievement.description}</p>
            {earned ? (
                <p className="flex items-center gap-1.5 text-xs font-semibold text-success">
                    <SuccessIcon aria-hidden /> Earned {formatDate(achievement.earnedAt)}
                </p>
            ) : (
                !hidden && (
                    <XpBar
                        size="sm"
                        value={achievement.progress.current}
                        max={Math.max(achievement.progress.target, 1)}
                        valueText={`${achievement.progress.current.toLocaleString()} / ${achievement.progress.target.toLocaleString()}`}
                    />
                )
            )}
        </article>
    )
}
