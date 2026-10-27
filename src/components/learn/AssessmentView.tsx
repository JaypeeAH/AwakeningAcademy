'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Button from '@/components/ui/Button'
import Table from '@/components/ui/Table'
import { toastError } from '@/components/ui/toast/toast'
import MarkdownContent from '@/components/shared/MarkdownContent'
import Loading from '@/components/shared/Loading'
import ErrorState from '@/components/shared/ErrorState'
import SystemPanel from '@/components/game/SystemPanel'
import RewardDialog from '@/components/game/RewardDialog'
import LearningOutcomeDialogs from '@/components/game/LearningOutcomeDialogs'
import QuestSkillsPanel from './QuestSkillsPanel'
import { BossBriefing } from './BossBattle'
import { XpReward } from '@/components/game/GameTags'
import QuizRunner from './QuizRunner'
import AttemptResultView from './AttemptResultView'
import { PrevIcon, StartIcon } from '@/configs/icons.config'
import { getLearnPath } from '@/configs/app.config'
import { apiStartAttempt, useSWRAttemptResult } from '@/services/attempts'
import { usePlayViewStore, usePlayerStatusStore, useQuestBoardStore } from '@/stores/GameStores'
import { formatDateTime, formatDuration } from '@/utils/dates'
import type { FeedbackMode } from '@/utils/feedback'
import { tryGetErrorMessage } from '@/utils/errors'
import type { AttemptResult, AttemptSession } from '@/@types/attempts/Attempt'
import type { RewardSummary } from '@/@types/progression/Progression'
import type { LearningOutcome } from '@/@types/progression/Streak'

const briefingFeedbackLine = (mode: FeedbackMode) =>
    mode === 'immediate'
        ? 'You’ll see the correct answers and explanations straight after'
        : mode === 'after_due'
          ? 'Correct answers are shown after the due date'
          : 'You’ll see your score and your teacher’s comments (answers stay private)'

interface AssessmentViewProps {
    activityId: string
    /** ?attempt= — re-open a graded attempt's result */
    attemptId: string | null
}

/** Quiz/exam flow: briefing → attempt → result. A refresh mid-attempt resumes the same attempt. */
export default function AssessmentView({ activityId, attemptId }: AssessmentViewProps) {
    const router = useRouter()
    const view = usePlayViewStore(activityId, (s) => s.data)
    const refreshView = usePlayViewStore(activityId, (s) => s.refresh)
    const refreshStatus = usePlayerStatusStore((s) => s.refresh)
    const refreshQuests = useQuestBoardStore((s) => s.refresh)
    const [session, setSession] = useState<AttemptSession | null>(null)
    const [starting, setStarting] = useState(false)
    const [justSubmitted, setJustSubmitted] = useState<AttemptResult | null>(null)
    const [reward, setReward] = useState<RewardSummary | null>(null)
    const [outcome, setOutcome] = useState<LearningOutcome | null>(null)
    const saved = useSWRAttemptResult(justSubmitted ? null : attemptId)

    if (!view) return null
    const { activity, quest, attempts } = view
    const boss = activity.kind === 'boss_battle' ? activity.boss : null
    const openAttempt = attempts.find((a) => a.status === 'in_progress')

    const start = async () => {
        setStarting(true)
        try {
            setSession(await apiStartAttempt(activityId))
        } catch (error) {
            toastError(tryGetErrorMessage(error), error)
        } finally {
            setStarting(false)
        }
    }

    const onSubmitted = (result: AttemptResult) => {
        setSession(null)
        setJustSubmitted(result)
        if (result.reward) setReward(result.reward)
        setOutcome({
            discoveries: result.discoveries ?? [],
            achievements: result.achievements ?? [],
            teamQuests: result.teamQuests ?? [],
            streak: result.streak ?? null,
        })
        router.replace(getLearnPath(activityId, result.attempt.id), { scroll: true })
        void Promise.all([refreshView(), refreshStatus(), refreshQuests()])
    }

    const backToBriefing = () => {
        setJustSubmitted(null)
        router.replace(getLearnPath(activityId))
    }

    // ── Result ──
    if (attemptId) {
        const result = justSubmitted ?? saved.data
        return (
            <>
                <Button size="sm" variant="plain" icon={<PrevIcon />} className="mb-4" onClick={backToBriefing}>
                    Back to the quest
                </Button>
                {result ? (
                    <AttemptResultView result={result} boss={boss} />
                ) : saved.error ? (
                    <ErrorState message={tryGetErrorMessage(saved.error)} onRetry={() => void saved.mutate()} />
                ) : (
                    <Loading loading message="Loading your result…" />
                )}
                <RewardDialog
                    reward={reward}
                    title={justSubmitted?.attempt.passed ? 'Quest cleared' : 'Attempt handed in'}
                    emptyMessage={
                        justSubmitted?.attempt.passed
                            ? 'You’ve already earned this quest’s XP — great revision!'
                            : `Reach ${activity.passingScore}% to earn the XP.`
                    }
                    onClose={() => setReward(null)}
                />
                {/* Secrets, achievements, team quests and streaks set off by this submission, after its own reward */}
                <LearningOutcomeDialogs outcome={outcome} paused={!!reward} onDone={() => setOutcome(null)} />
            </>
        )
    }

    // ── Attempt ──
    if (session) return <QuizRunner session={session} onSubmitted={onSubmitted} boss={boss} />

    // ── Briefing ──
    const graded = attempts.filter((a) => a.status !== 'in_progress') // marked or being marked
    return (
        <div className="space-y-6">
            <SystemPanel eyebrow="Briefing" title={boss ? 'Prepare for battle' : 'Before you begin'}>
                {boss && <BossBriefing boss={boss} />}
                {activity.body && <MarkdownContent className="mb-4">{activity.body}</MarkdownContent>}
                <ul className="grid gap-2 text-sm sm:grid-cols-2">
                    <li>
                        <strong>{quest.questionCount}</strong> {quest.questionCount === 1 ? 'question' : 'questions'}
                    </li>
                    <li>
                        Pass with <strong>{activity.passingScore}%</strong> to earn{' '}
                        <XpReward amount={activity.xpReward} />
                    </li>
                    <li>
                        {quest.attemptsLeft === null
                            ? 'Unlimited attempts'
                            : `${quest.attemptsLeft} of ${activity.maxAttempts} attempts left`}
                    </li>
                    {activity.dueAt && <li>Due {formatDateTime(activity.dueAt)}</li>}
                    {activity.timeLimitMinutes && (
                        <li>
                            <strong>{formatDuration(activity.timeLimitMinutes)}</strong> once you begin — the timer
                            keeps going if you leave, and your saved answers are handed in when it ends
                        </li>
                    )}
                    <li>{briefingFeedbackLine(activity.feedbackMode)}</li>
                </ul>
                {activity.objectives.length > 0 && (
                    <ul className="mt-4 list-disc space-y-1 pl-5 text-sm text-gray-600 dark:text-gray-300">
                        {activity.objectives.map((o) => (
                            <li key={o}>{o}</li>
                        ))}
                    </ul>
                )}
                <div className="mt-6">
                    {quest.state === 'locked' || quest.state === 'upcoming' || quest.state === 'in_review' ? (
                        <p className="text-sm font-medium text-gray-500">{quest.stateReason}</p>
                    ) : quest.attemptsLeft === 0 && !openAttempt ? (
                        <p className="text-sm font-medium text-gray-500">
                            You’ve used every attempt for this activity.
                        </p>
                    ) : (
                        <Button variant="solid" size="lg" icon={<StartIcon />} loading={starting} onClick={start}>
                            {openAttempt ? 'Resume attempt' : graded.length ? 'Try again' : 'Begin'}
                        </Button>
                    )}
                </div>
                <QuestSkillsPanel
                    activityId={activityId}
                    skills={view.skills}
                    onUsed={() => void Promise.all([refreshView(), refreshQuests()])}
                />
            </SystemPanel>

            {graded.length > 0 && (
                <SystemPanel eyebrow="Chronicle" title="Your attempts">
                    <div className="overflow-x-auto">
                        <Table compact>
                            <Table.THead>
                                <Table.Tr>
                                    <Table.Th>Attempt</Table.Th>
                                    <Table.Th>Submitted</Table.Th>
                                    <Table.Th>Score</Table.Th>
                                    <Table.Th>
                                        <span className="sr-only">Review</span>
                                    </Table.Th>
                                </Table.Tr>
                            </Table.THead>
                            <Table.TBody>
                                {graded.map((a) => (
                                    <Table.Tr key={a.id}>
                                        <Table.Td>#{a.attemptNo}</Table.Td>
                                        <Table.Td>{formatDateTime(a.submittedAt)}</Table.Td>
                                        <Table.Td
                                            className={
                                                a.status === 'pending_review'
                                                    ? 'text-info'
                                                    : a.passed
                                                      ? 'font-semibold text-success'
                                                      : 'text-warning'
                                            }
                                        >
                                            {a.status === 'pending_review'
                                                ? 'Being marked'
                                                : `${Math.round(a.percent ?? 0)}%${a.passed ? ' · passed' : ''}`}
                                        </Table.Td>
                                        <Table.Td className="text-right">
                                            <Button
                                                size="xs"
                                                onClick={() => router.push(getLearnPath(activityId, a.id))}
                                            >
                                                Review
                                            </Button>
                                        </Table.Td>
                                    </Table.Tr>
                                ))}
                            </Table.TBody>
                        </Table>
                    </div>
                </SystemPanel>
            )}
        </div>
    )
}
