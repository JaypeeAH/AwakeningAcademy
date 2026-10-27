'use client'

import { useState } from 'react'
import Dialog from '@/components/ui/Dialog'
import Button from '@/components/ui/Button'
import DiscoveryDialog from './DiscoveryDialog'
import AchievementDialog from './AchievementDialog'
import { XpReward } from './GameTags'
import navigationIcon, { SparkleIcon } from '@/configs/icons.config'
import type { LearningOutcome } from '@/@types/progression/Streak'

interface LearningOutcomeDialogsProps {
    outcome: LearningOutcome | null
    /** True while the quest's own RewardDialog is still open: these wait their turn */
    paused?: boolean
    onDone: () => void
}

type Stage = 'discoveries' | 'achievements' | 'celebrations'

/**
 * Everything a piece of learning set off, after its own reward: secrets found, achievements unlocked,
 * then team quests finished and streak milestones reached. Each shows only when there's something to show.
 */
export default function LearningOutcomeDialogs({ outcome, paused, onDone }: LearningOutcomeDialogsProps) {
    const [stage, setStage] = useState(0)
    if (!outcome || paused) return null

    const milestones = outcome.streak?.milestoneRewards ?? []
    const stages = (
        [
            outcome.discoveries.length > 0 && 'discoveries',
            outcome.achievements.length > 0 && 'achievements',
            (outcome.teamQuests.length > 0 || milestones.length > 0) && 'celebrations',
        ] as (Stage | false)[]
    ).filter((s): s is Stage => !!s)
    const current = stages[stage]
    if (!current) return null

    const next = () => {
        if (stage + 1 >= stages.length) {
            setStage(0)
            onDone()
        } else setStage(stage + 1)
    }

    if (current === 'discoveries') return <DiscoveryDialog discoveries={outcome.discoveries} onClose={next} />
    if (current === 'achievements') return <AchievementDialog achievements={outcome.achievements} onClose={next} />

    return (
        <Dialog isOpen onClose={next} onRequestClose={next} width={440}>
            <div className="reward-dialog flex flex-col items-center text-center">
                <div className="system-eyebrow">
                    <SparkleIcon className="mr-1 inline" aria-hidden />
                    System message
                </div>
                <ul className="mt-4 w-full space-y-3">
                    {outcome.teamQuests.map((quest) => (
                        <li
                            key={quest.activityId}
                            className="flex items-center gap-3 rounded-xl bg-success-subtle px-4 py-3 text-left"
                        >
                            <span className="text-2xl text-success" aria-hidden>
                                {navigationIcon.team}
                            </span>
                            <span className="flex-1">
                                <span className="block font-semibold text-gray-900 dark:text-gray-50">
                                    Your guild finished “{quest.title}”
                                </span>
                                <span className="text-sm text-gray-600 dark:text-gray-300">
                                    {quest.guildName} did it together.
                                </span>
                            </span>
                            {quest.xpGained > 0 && <XpReward amount={quest.xpGained} className="shrink-0" />}
                        </li>
                    ))}
                    {milestones.map((m) => (
                        <li
                            key={m.days}
                            className="flex items-center gap-3 rounded-xl bg-warning-subtle px-4 py-3 text-left"
                        >
                            <span className="text-2xl text-warning" aria-hidden>
                                {navigationIcon.streak}
                            </span>
                            <span className="flex-1">
                                <span className="block font-semibold text-gray-900 dark:text-gray-50">
                                    {m.days}-day streak!
                                </span>
                                <span className="text-sm text-gray-600 dark:text-gray-300">
                                    You’ve learned {m.days} days in a row.
                                </span>
                            </span>
                            {m.reward.xpGained > 0 && <XpReward amount={m.reward.xpGained} className="shrink-0" />}
                        </li>
                    ))}
                </ul>
                <Button variant="solid" className="mt-6" onClick={next} autoFocus>
                    Continue
                </Button>
            </div>
        </Dialog>
    )
}
