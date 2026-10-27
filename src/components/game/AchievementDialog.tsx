'use client'

import { useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import Dialog from '@/components/ui/Dialog'
import Button from '@/components/ui/Button'
import LinkButton from '@/components/ui/LinkButton'
import Tag from '@/components/ui/Tag'
import { XpReward } from './GameTags'
import { achievementIcon } from './achievementIcons'
import { LevelIcon, SparkleIcon } from '@/configs/icons.config'
import { achievementsPath } from '@/configs/app.config'
import { rarityLabel, rarityTagClass } from '@/@types/game/Inventory'
import type { AchievementUnlock } from '@/@types/game/Achievements'

interface AchievementDialogProps {
    /** Shown one after another; nothing renders while empty */
    achievements: AchievementUnlock[]
    onClose: () => void
}

/** "Achievement unlocked!" — one at a time, with any XP it gave. */
export default function AchievementDialog({ achievements, onClose }: AchievementDialogProps) {
    const reduceMotion = useReducedMotion()
    const [index, setIndex] = useState(0)
    const achievement = achievements[index]
    if (!achievement) return null
    const last = index >= achievements.length - 1
    const next = () => {
        if (last) {
            setIndex(0)
            onClose()
        } else setIndex(index + 1)
    }
    const reward = achievement.reward

    return (
        <Dialog isOpen onClose={next} onRequestClose={next} width={440} contentClassName="overflow-hidden">
            <div className="reward-dialog flex flex-col items-center text-center" key={achievement.id}>
                <div className="system-eyebrow">
                    <SparkleIcon className="mr-1 inline" aria-hidden />
                    Achievement unlocked
                    {achievements.length > 1 ? ` · ${index + 1} of ${achievements.length}` : ''}
                </div>
                <motion.div
                    className="mt-3 flex h-20 w-20 items-center justify-center rounded-full bg-gold-subtle text-4xl text-gold"
                    aria-hidden
                    {...(reduceMotion
                        ? {}
                        : {
                              initial: { opacity: 0, scale: 0.4 },
                              animate: { opacity: 1, scale: 1 },
                              transition: { duration: 0.45, ease: 'easeOut' as const },
                          })}
                >
                    {achievementIcon(achievement.icon)}
                </motion.div>
                <h3 className="font-display mt-3 text-2xl">{achievement.name}</h3>
                <Tag className={`mt-2 ${rarityTagClass[achievement.rarity]}`}>{rarityLabel[achievement.rarity]}</Tag>
                {achievement.description && (
                    <p className="mt-3 text-sm text-gray-600 dark:text-gray-300">{achievement.description}</p>
                )}
                {(reward?.xpGained ?? 0) > 0 && (
                    <div className="mt-4 text-2xl">
                        <XpReward amount={reward!.xpGained} />
                    </div>
                )}
                {reward?.leveledUp && (
                    <p className="mt-3 flex items-center gap-1.5 font-semibold text-primary">
                        <LevelIcon aria-hidden /> Level {reward.before.level} → {reward.after.level}
                    </p>
                )}
                <div className="mt-6 flex w-full flex-col-reverse gap-2 sm:flex-row sm:justify-center">
                    <LinkButton href={achievementsPath} onClick={onClose}>
                        All achievements
                    </LinkButton>
                    <Button variant="solid" onClick={next} autoFocus>
                        {last ? 'Continue' : 'Next'}
                    </Button>
                </div>
            </div>
        </Dialog>
    )
}
