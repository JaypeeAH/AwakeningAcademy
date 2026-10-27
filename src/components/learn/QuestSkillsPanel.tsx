'use client'

import { useState } from 'react'
import Button from '@/components/ui/Button'
import Tag from '@/components/ui/Tag'
import { toastError, toastSuccess } from '@/components/ui/toast/toast'
import { OverdriveIcon, SecondChanceIcon } from '@/configs/icons.config'
import { apiUseSkill } from '@/services/game'
import { tryGetErrorMessage } from '@/utils/errors'
import type { QuestSkills } from '@/@types/game/Inventory'

interface QuestSkillsPanelProps {
    activityId: string
    skills: QuestSkills
    onUsed: () => void
}

/** Overdrive (arm before a new quest) and Second Chance (one more attempt), when unlocked and allowed */
export default function QuestSkillsPanel({ activityId, skills, onUsed }: QuestSkillsPanelProps) {
    const [busy, setBusy] = useState<'overdrive' | 'second_chance' | null>(null)
    const { overdrive, secondChance } = skills
    if (!overdrive && !secondChance) return null

    const use = async (skill: 'overdrive' | 'second_chance') => {
        setBusy(skill)
        try {
            await apiUseSkill({ skill, activityId })
            toastSuccess(
                skill === 'overdrive'
                    ? 'Overdrive armed! Pass this quest to earn the bonus.'
                    : 'Second Chance! You have one more attempt.',
            )
            onUsed()
        } catch (error) {
            toastError(tryGetErrorMessage(error), error)
        } finally {
            setBusy(null)
        }
    }

    return (
        <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-dashed border-gray-200 pt-4 dark:border-gray-700">
            <span className="system-eyebrow w-full">Skills</span>
            {overdrive &&
                (overdrive.armed ? (
                    <Tag
                        className="bg-primary-subtle text-primary border-transparent"
                        prefix={<OverdriveIcon className="mr-1" />}
                    >
                        Overdrive armed · +{overdrive.bonusXp} XP when you pass
                    </Tag>
                ) : (
                    <Button
                        size="sm"
                        icon={<OverdriveIcon />}
                        disabled={!overdrive.chargesLeft}
                        loading={busy === 'overdrive'}
                        onClick={() => void use('overdrive')}
                        title={overdrive.chargesLeft ? undefined : 'Overdrive is recharging'}
                    >
                        Arm Overdrive (+{overdrive.bonusXp} XP on your first pass)
                    </Button>
                ))}
            {secondChance && (
                <Button
                    size="sm"
                    variant="solid"
                    icon={<SecondChanceIcon />}
                    disabled={!secondChance.chargesLeft}
                    loading={busy === 'second_chance'}
                    onClick={() => void use('second_chance')}
                    title={secondChance.chargesLeft ? undefined : 'Second Chance is recharging'}
                >
                    Use Second Chance (1 more attempt)
                </Button>
            )}
        </div>
    )
}
