'use client'

import Alert from '@/components/ui/Alert'
import SystemPanel from '@/components/game/SystemPanel'
import QuestionCard from './QuestionCard'
import { BossHpBar } from './BossBattle'
import type { BossConfig } from '@/utils/boss'
import { FeedbackIcon, GradingIcon, SuccessIcon, WarningIcon } from '@/configs/icons.config'
import { formatDateTime } from '@/utils/dates'
import classNames from '@/utils/classNames'
import type { AttemptResult } from '@/@types/attempts/Attempt'

interface AttemptResultViewProps {
    result: AttemptResult
    /** Boss battles: the boss's HP after this attempt */
    boss?: BossConfig | null
}

/** Why answers aren't shown, in the student's terms */
function hiddenAnswersMessage({ activity }: AttemptResult) {
    if (activity.feedbackMode === 'after_due') {
        return activity.dueAt
            ? `Correct answers appear after the due date (${formatDateTime(activity.dueAt)}), once everyone has had their turn.`
            : 'Correct answers appear after the due date.'
    }
    return 'Your teacher keeps the answers to this assessment private. Their comments are below.'
}

/**
 * A handed-in attempt: score (or "being marked"), the teacher's comments, and each question reviewed —
 * with correct answers, explanations and rubrics when the activity's feedback setting allows.
 */
export default function AttemptResultView({ result, boss }: AttemptResultViewProps) {
    const { attempt, activity, questions } = result
    const pending = attempt.status === 'pending_review'
    const passed = !!attempt.passed
    const counts = questions.reduce(
        (acc, q) => {
            const outcome = q.response?.outcome ?? 'incorrect'
            acc[outcome] = (acc[outcome] ?? 0) + 1
            return acc
        },
        {} as Record<string, number>,
    )

    return (
        <div className="space-y-6">
            {result.submittedLate && (
                <Alert showIcon type="warning">
                    Time ran out, so the answers saved before the deadline were handed in.
                </Alert>
            )}
            {boss && !pending && <BossHpBar boss={boss} percent={attempt.percent} passed={passed} />}
            <SystemPanel
                eyebrow={`Attempt ${attempt.attemptNo} · handed in ${formatDateTime(attempt.submittedAt)}`}
                tone={passed ? 'gold' : 'system'}
            >
                {pending ? (
                    <div className="flex flex-col items-center gap-2 text-center sm:flex-row sm:gap-5 sm:text-left">
                        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-info-subtle text-3xl text-info">
                            <GradingIcon aria-hidden />
                        </span>
                        <div>
                            <p className="font-semibold text-gray-900 dark:text-gray-50">
                                Your teacher is marking your work
                            </p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                {counts.pending_review} {counts.pending_review === 1 ? 'answer needs' : 'answers need'}{' '}
                                their marks. Your score and XP will arrive with a notification when they’re done.
                            </p>
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col items-center gap-2 text-center sm:flex-row sm:gap-6 sm:text-left">
                        <div
                            className={classNames(
                                'font-display text-5xl font-bold tabular-nums',
                                passed ? 'text-success' : 'text-warning',
                            )}
                        >
                            {Math.round(attempt.percent ?? 0)}%
                        </div>
                        <div>
                            <p
                                className={classNames(
                                    'flex items-center justify-center gap-1.5 font-semibold sm:justify-start',
                                    passed ? 'text-success' : 'text-warning',
                                )}
                            >
                                {passed ? <SuccessIcon aria-hidden /> : <WarningIcon aria-hidden />}
                                {passed ? 'Passed' : `Not passed yet — ${activity.passingScore}% needed`}
                            </p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                {attempt.score} of {attempt.maxScore} points · {counts.correct ?? 0} correct
                                {counts.partial ? ` · ${counts.partial} partly correct` : ''} · {counts.incorrect ?? 0}{' '}
                                incorrect
                                {counts.skipped ? ` · ${counts.skipped} skipped` : ''}
                            </p>
                            {attempt.gradedAt && (
                                <p className="mt-1 text-xs text-gray-500">Marked {formatDateTime(attempt.gradedAt)}</p>
                            )}
                        </div>
                    </div>
                )}
            </SystemPanel>

            {attempt.feedback.trim() && (
                <SystemPanel
                    eyebrow="From your teacher"
                    tone="gold"
                    title={
                        <span className="flex items-center gap-2">
                            <FeedbackIcon aria-hidden /> Overall comment
                        </span>
                    }
                >
                    <p className="whitespace-pre-wrap text-gray-800 dark:text-gray-100">{attempt.feedback}</p>
                </SystemPanel>
            )}

            {!result.answersRevealed && !pending && (
                <Alert showIcon type="info">
                    {hiddenAnswersMessage(result)}
                </Alert>
            )}

            <div className="space-y-4">
                {questions.map((item, i) => (
                    <QuestionCard
                        key={item.question.id}
                        question={item.question}
                        index={i}
                        total={questions.length}
                        answer={{
                            selectedOptionIds: item.response?.selectedOptionIds ?? [],
                            textAnswer: item.response?.textAnswer ?? '',
                        }}
                        review={{ response: item.response, key: item.key }}
                        uploads={{ files: item.files }}
                    />
                ))}
            </div>
        </div>
    )
}
