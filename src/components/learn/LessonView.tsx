'use client'

import { useState } from 'react'
import Button from '@/components/ui/Button'
import { toastError } from '@/components/ui/toast/toast'
import MarkdownContent from '@/components/shared/MarkdownContent'
import SystemPanel from '@/components/game/SystemPanel'
import RewardDialog from '@/components/game/RewardDialog'
import LearningOutcomeDialogs from '@/components/game/LearningOutcomeDialogs'
import { SecretMarkerProvider } from '@/components/game/SecretMarker'
import { XpReward } from '@/components/game/GameTags'
import { CheckIcon, SuccessIcon } from '@/configs/icons.config'
import { apiCompleteLesson } from '@/services/activities'
import { usePlayViewStore, usePlayerStatusStore, useQuestBoardStore } from '@/stores/GameStores'
import { formatDateTime } from '@/utils/dates'
import type { RewardSummary } from '@/@types/progression/Progression'
import { EMPTY_OUTCOME, type LearningOutcome } from '@/@types/progression/Streak'

/** A lesson: readable content, then "Complete lesson" (XP once — repeating is safe). */
export default function LessonView({ activityId }: { activityId: string }) {
    const view = usePlayViewStore(activityId, (s) => s.data)
    const refresh = usePlayViewStore(activityId, (s) => s.refresh)
    const refreshStatus = usePlayerStatusStore((s) => s.refresh)
    const refreshQuests = useQuestBoardStore((s) => s.refresh)
    const [completing, setCompleting] = useState(false)
    const [reward, setReward] = useState<RewardSummary | null>(null)
    const [outcome, setOutcome] = useState<LearningOutcome | null>(null)
    if (!view) return null
    const { activity, quest } = view
    const done = quest.state === 'completed'

    const complete = async () => {
        setCompleting(true)
        try {
            const result = await apiCompleteLesson(activityId)
            setReward(result.reward)
            // The server also returns secrets, achievements, team quests and the streak with the reward
            setOutcome({
                discoveries: result.discoveries,
                achievements: result.achievements,
                teamQuests: result.teamQuests,
                streak: result.streak,
            })
            await Promise.all([refresh(), refreshStatus(), refreshQuests()])
        } catch (error) {
            toastError('Couldn’t complete the lesson. Your progress is safe — try again.', error)
        } finally {
            setCompleting(false)
        }
    }

    return (
        <>
            {activity.objectives.length > 0 && (
                <SystemPanel eyebrow="Objectives" title="By the end you will be able to" className="mb-6">
                    <ul className="list-disc space-y-1 pl-5 text-sm">
                        {activity.objectives.map((o) => (
                            <li key={o}>{o}</li>
                        ))}
                    </ul>
                </SystemPanel>
            )}
            <article className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-8 dark:border-gray-700 dark:bg-gray-800">
                {/* Hidden objects and sections teachers placed in the lesson ([✦](secret:KEY)) */}
                <SecretMarkerProvider
                    onFound={(found) =>
                        setOutcome((prev) => ({
                            ...(prev ?? EMPTY_OUTCOME),
                            discoveries: [...(prev?.discoveries ?? []), found],
                        }))
                    }
                >
                    <MarkdownContent className="text-base leading-relaxed" secrets>
                        {activity.body || '_This lesson has no content yet._'}
                    </MarkdownContent>
                </SecretMarkerProvider>
            </article>
            <div className="mt-6 flex flex-col items-center gap-3 rounded-2xl border border-dashed border-gray-300 p-6 text-center dark:border-gray-600">
                {done ? (
                    <>
                        <p className="flex items-center gap-2 font-semibold text-success">
                            <SuccessIcon aria-hidden /> Lesson complete
                        </p>
                        {quest.completedAt && (
                            <p className="text-xs text-gray-500">
                                Completed {formatDateTime(quest.completedAt)}. Revisit any time.
                            </p>
                        )}
                    </>
                ) : (
                    <>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            Finished reading? Claim <XpReward amount={activity.xpReward} /> and mark it complete.
                        </p>
                        <Button variant="solid" size="lg" icon={<CheckIcon />} loading={completing} onClick={complete}>
                            Complete lesson
                        </Button>
                    </>
                )}
            </div>
            <RewardDialog
                reward={reward}
                title="Lesson complete"
                emptyMessage="You’ve already earned this lesson’s XP."
                onClose={() => setReward(null)}
            />
            <LearningOutcomeDialogs outcome={outcome} paused={!!reward} onDone={() => setOutcome(null)} />
        </>
    )
}
