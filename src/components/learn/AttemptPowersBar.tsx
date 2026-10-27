'use client'

import { useState } from 'react'
import Button from '@/components/ui/Button'
import Tooltip from '@/components/ui/Tooltip'
import { toastError } from '@/components/ui/toast/toast'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import navigationIcon, { EchoIcon, InsightIcon, TimerIcon } from '@/configs/icons.config'
import { getLearnPath } from '@/configs/app.config'
import { apiBunnySkip, apiUseSkill } from '@/services/game'
import { tryGetErrorMessage } from '@/utils/errors'
import type { Question } from '@/@types/activities/Question'
import type { AttemptPowers, AttemptSkillCode } from '@/@types/game/Inventory'

interface AttemptPowersBarProps {
    attemptId: string
    question: Question
    powers: AttemptPowers
    onChange: (powers: AttemptPowers) => void
    /** Time Dilation moved the deadline */
    onTimeExtended: (expiresAt: Date) => void
}

const SKILL_ICON: Record<AttemptSkillCode, React.ReactNode> = {
    insight: <InsightIcon />,
    knowledge_echo: <EchoIcon />,
    time_dilation: <TimerIcon />,
}

/** Insight needs a choice question with more than two options still in play */
const insightFits = (question: Question, removed: string[]) =>
    (question.kind === 'single_choice' || question.kind === 'multiple_choice') &&
    question.options.length - removed.length > 2

/**
 * The student's tools for the current question: an Easter Bunny (skip it — confirmed first, recorded as
 * skipped, never correct) and in-attempt skills. The server decides every effect and spends charges once;
 * this only shows what's on offer. Hidden entirely when the activity allows neither.
 */
export function AttemptPowersBar({ attemptId, question, powers, onChange, onTimeExtended }: AttemptPowersBarProps) {
    const [confirmingSkip, setConfirmingSkip] = useState(false)
    const [busy, setBusy] = useState<string | null>(null)
    const skipped = powers.skippedQuestionIds.includes(question.id)
    const removed = powers.removedOptions[question.id] ?? []

    const skills = powers.skills.filter((s) => {
        if (s.code === 'insight') return insightFits(question, removed)
        if (s.code === 'knowledge_echo') return !powers.echoes[question.id]
        return true
    })
    if (skipped || (!powers.allowBunnySkips && !skills.length)) return null

    const skip = async () => {
        setBusy('bunny')
        try {
            const result = await apiBunnySkip(attemptId, question.id)
            onChange({
                ...powers,
                bunnyCharges: result.charges,
                skippedQuestionIds: [...new Set([...powers.skippedQuestionIds, question.id])],
            })
            setConfirmingSkip(false)
        } catch (error) {
            toastError(tryGetErrorMessage(error), error)
        } finally {
            setBusy(null)
        }
    }

    const activateSkill = async (code: AttemptSkillCode) => {
        setBusy(code)
        try {
            const effect = await apiUseSkill({ skill: code, attemptId, questionId: question.id })
            const spend = powers.skills.map((s) =>
                s.code === code ? { ...s, chargesLeft: Math.max(0, s.chargesLeft - 1) } : s,
            )
            if (effect.kind === 'insight') {
                onChange({
                    ...powers,
                    skills: spend,
                    removedOptions: { ...powers.removedOptions, [question.id]: [...removed, effect.removedOptionId] },
                })
            } else if (effect.kind === 'knowledge_echo') {
                const { activityId, title, summary } = effect
                onChange({
                    ...powers,
                    skills: spend,
                    echoes: { ...powers.echoes, [question.id]: { activityId, title, summary } },
                })
            } else if (effect.kind === 'time_dilation') {
                // Once per attempt
                onChange({ ...powers, skills: powers.skills.filter((s) => s.code !== 'time_dilation') })
                onTimeExtended(effect.expiresAt)
            }
        } catch (error) {
            toastError(tryGetErrorMessage(error), error)
        } finally {
            setBusy(null)
        }
    }

    return (
        <div
            className="mt-4 flex flex-wrap items-center gap-2 border-t border-dashed border-gray-200 pt-4 dark:border-gray-700"
            aria-label="Skills and items"
            role="group"
        >
            {powers.allowBunnySkips && (
                <Tooltip
                    title={
                        powers.bunnyCharges
                            ? 'Skip this question. It’s recorded as skipped — never as correct.'
                            : 'Find Easter Bunnies by discovering secrets in your courses.'
                    }
                >
                    <Button
                        size="sm"
                        icon={navigationIcon.easter}
                        disabled={!powers.bunnyCharges}
                        loading={busy === 'bunny'}
                        onClick={() => setConfirmingSkip(true)}
                    >
                        Easter Bunny ({powers.bunnyCharges})
                    </Button>
                </Tooltip>
            )}
            {skills.map((s) => (
                <Tooltip key={s.code} title={s.chargesLeft ? s.description : `${s.name} is recharging.`}>
                    <Button
                        size="sm"
                        icon={SKILL_ICON[s.code]}
                        disabled={!s.chargesLeft || (!!busy && busy !== s.code)}
                        loading={busy === s.code}
                        onClick={() => void activateSkill(s.code)}
                    >
                        {s.name} ({s.chargesLeft})
                    </Button>
                </Tooltip>
            ))}
            <ConfirmDialog
                isOpen={confirmingSkip}
                onClose={() => setConfirmingSkip(false)}
                type="info"
                title="Send the Easter Bunny?"
                confirmText="Skip this question"
                onConfirm={skip}
                loading={busy === 'bunny'}
            >
                <p>
                    This uses 1 Easter Bunny (you have {powers.bunnyCharges}). The question is recorded as{' '}
                    <strong>skipped</strong> — it won’t count for or against your score, and you can’t answer it in this
                    attempt.
                </p>
            </ConfirmDialog>
        </div>
    )
}

/** Knowledge Echo's pointer back to a lesson (opens in a new tab so the attempt stays open) */
export function KnowledgeEchoPanel({ echo }: { echo: AttemptPowers['echoes'][string] | undefined }) {
    if (!echo) return null
    return (
        <div className="mt-4 rounded-xl border-l-4 border-primary bg-primary-subtle px-4 py-3" role="note">
            <div className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
                <EchoIcon aria-hidden /> Knowledge Echo
            </div>
            <p className="text-sm text-gray-800 dark:text-gray-100">
                This connects to{' '}
                <a
                    href={getLearnPath(echo.activityId)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-semibold text-primary underline"
                >
                    {echo.title}
                    <span className="sr-only"> (opens in a new tab)</span>
                </a>
                .
            </p>
            {echo.summary && <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">{echo.summary}</p>}
        </div>
    )
}
