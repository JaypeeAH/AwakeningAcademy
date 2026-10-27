'use client'

import { motion, useReducedMotion } from 'framer-motion'
import Dialog from '@/components/ui/Dialog'
import Button from '@/components/ui/Button'
import RankEmblem from './RankEmblem'
import { XpReward } from './GameTags'
import { LevelIcon, SparkleIcon } from '@/configs/icons.config'
import { xpSourceLabel } from '@/@types/progression/XpSourceOptions'
import type { RewardSummary } from '@/@types/progression/Progression'
import type { ReactNode } from 'react'

interface RewardDialogProps {
    reward: RewardSummary | null
    /** Shown when nothing new was earned (e.g. a repeat completion) */
    emptyMessage?: string
    title?: string
    onClose: () => void
    /** Extra actions next to "Continue" */
    actions?: ReactNode
}

/**
 * The moment after finishing a quest: XP gained, level ups and rank promotions. Dramatic but brief —
 * a short scale-in, skipped entirely when the user prefers reduced motion.
 */
export default function RewardDialog({ reward, emptyMessage, title, onClose, actions }: RewardDialogProps) {
    const reduceMotion = useReducedMotion()
    if (!reward) return null
    const promotion = reward.promotions[reward.promotions.length - 1]
    const heading = promotion ? 'Rank promotion' : reward.leveledUp ? 'Level up' : (title ?? 'Quest complete')

    const appear = (delay: number) =>
        reduceMotion
            ? {}
            : {
                  initial: { opacity: 0, y: 8 },
                  animate: { opacity: 1, y: 0 },
                  transition: { delay, duration: 0.35, ease: 'easeOut' as const },
              }

    return (
        <Dialog isOpen onClose={onClose} onRequestClose={onClose} width={460} contentClassName="overflow-hidden">
            <div className="reward-dialog flex flex-col items-center text-center">
                <motion.div className="system-eyebrow" {...appear(0)}>
                    <SparkleIcon className="mr-1 inline" aria-hidden />
                    System message
                </motion.div>
                <motion.h3 className="font-display mt-1 text-2xl" {...appear(0.05)}>
                    {heading}
                </motion.h3>

                {promotion && (
                    <motion.div
                        className="mt-4"
                        {...(reduceMotion
                            ? {}
                            : {
                                  initial: { opacity: 0, scale: 0.6 },
                                  animate: { opacity: 1, scale: 1 },
                                  transition: { delay: 0.15, duration: 0.5, ease: 'easeOut' as const },
                              })}
                    >
                        <RankEmblem code={promotion.toRank} size={112} className="rank-emblem-glow" />
                        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                            {promotion.fromRank}-Rank →{' '}
                            <strong className="text-gray-900 dark:text-gray-50">{promotion.toRank}-Rank</strong> ·{' '}
                            {reward.after.rankName}
                        </p>
                    </motion.div>
                )}

                {reward.xpGained > 0 ? (
                    <motion.div className="mt-4 text-3xl" {...appear(0.1)}>
                        <XpReward amount={reward.xpGained} />
                    </motion.div>
                ) : (
                    <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
                        {emptyMessage ?? 'No new XP this time.'}
                    </p>
                )}

                {reward.awards.length > 0 && (
                    <motion.ul className="mt-3 w-full space-y-1 text-sm" {...appear(0.2)}>
                        {reward.awards.map((award, i) => (
                            <li
                                key={i}
                                className="flex justify-between gap-3 rounded-lg bg-gray-50 px-3 py-1.5 dark:bg-gray-900"
                            >
                                <span className="truncate text-left">
                                    {award.reason ?? xpSourceLabel[award.source]}
                                </span>
                                <XpReward amount={award.amount} className="shrink-0" />
                            </li>
                        ))}
                    </motion.ul>
                )}

                {reward.leveledUp && (
                    <motion.p className="mt-4 flex items-center gap-1.5 font-semibold text-primary" {...appear(0.25)}>
                        <LevelIcon aria-hidden /> Level {reward.before.level} → {reward.after.level}
                    </motion.p>
                )}
                {reward.subjectLevel && reward.subjectLevel.after > reward.subjectLevel.before && (
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                        Your subject path grew to level {reward.subjectLevel.after}.
                    </p>
                )}

                <div className="mt-6 flex w-full flex-col-reverse gap-2 sm:flex-row sm:justify-center">
                    {actions}
                    <Button variant="solid" onClick={onClose} autoFocus>
                        Continue
                    </Button>
                </div>
            </div>
        </Dialog>
    )
}
