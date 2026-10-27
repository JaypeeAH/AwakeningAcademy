'use client'

import Dialog from '@/components/ui/Dialog'
import Tag from '@/components/ui/Tag'
import LinkButton from '@/components/ui/LinkButton'
import ErrorState from '@/components/shared/ErrorState'
import Loading from '@/components/shared/Loading'
import QuestionCard from '@/components/learn/QuestionCard'
import { FeedbackIcon, GradingIcon } from '@/configs/icons.config'
import { getGradingPath } from '@/configs/app.config'
import { useSWRAttemptResult } from '@/services/attempts'
import { responseOutcomeLabel, responseOutcomeTagClass, type ResponseOutcome } from '@/@types/activities/Question'
import { formatDateTime } from '@/utils/dates'
import { tryGetErrorMessage } from '@/utils/errors'

interface AttemptReviewDialogProps {
    attemptId: string | null
    studentName: string
    onClose: () => void
}

const OUTCOMES: ResponseOutcome[] = ['correct', 'partial', 'incorrect', 'skipped', 'pending_review']

/** One submitted attempt, question by question, with the student's answers and the key (teachers always see it) */
export default function AttemptReviewDialog({ attemptId, studentName, onClose }: AttemptReviewDialogProps) {
    const { data, error, isLoading, mutate } = useSWRAttemptResult(attemptId)

    const counts = OUTCOMES.map((outcome) => ({
        outcome,
        count: data?.questions.filter((q) => (q.response?.outcome ?? 'incorrect') === outcome).length ?? 0,
    })).filter((c) => c.count > 0)
    const awaitingReview = data?.attempt.status === 'pending_review'

    return (
        <Dialog isOpen={!!attemptId} onClose={onClose} onRequestClose={onClose} width={760}>
            <div className="max-h-[80vh] overflow-y-auto pr-1">
                {!data ? (
                    error ? (
                        <ErrorState message={tryGetErrorMessage(error)} onRetry={() => void mutate()} />
                    ) : (
                        <Loading loading={isLoading} message="Loading the attempt…" />
                    )
                ) : (
                    <>
                        <div className="mb-4 pr-8">
                            <div className="system-eyebrow">Attempt {data.attempt.attemptNo}</div>
                            <h3>
                                {studentName} · {data.activity.title}
                            </h3>
                            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                                {awaitingReview ? (
                                    <span className="font-semibold text-info">Awaiting your review</span>
                                ) : (
                                    <>
                                        {data.attempt.percent === null ? 'Not scored' : `${data.attempt.percent}%`} (
                                        {data.attempt.score ?? 0}/{data.attempt.maxScore ?? 0} points) —{' '}
                                        {data.attempt.passed ? (
                                            <span className="font-semibold text-success">passed</span>
                                        ) : (
                                            <span className="font-semibold text-error">not passed</span>
                                        )}
                                    </>
                                )}{' '}
                                · submitted {formatDateTime(data.attempt.submittedAt)}
                            </p>
                            <div className="mt-2 flex flex-wrap items-center gap-1.5">
                                {counts.map(({ outcome, count }) => (
                                    <Tag key={outcome} className={responseOutcomeTagClass[outcome]}>
                                        {count} {responseOutcomeLabel[outcome].toLowerCase()}
                                    </Tag>
                                ))}
                                <LinkButton
                                    size="xs"
                                    variant={awaitingReview ? 'solid' : 'default'}
                                    icon={<GradingIcon />}
                                    href={getGradingPath(data.attempt.id)}
                                    className="ml-auto"
                                >
                                    {awaitingReview ? 'Mark' : 'Re-grade'}
                                </LinkButton>
                            </div>
                            {data.attempt.feedback && (
                                <div className="mt-3 rounded-xl border-l-4 border-gold bg-gold-subtle px-4 py-2 text-sm">
                                    <span className="mb-0.5 flex items-center gap-1.5 font-semibold text-gold">
                                        <FeedbackIcon aria-hidden /> Your overall comment
                                    </span>
                                    <span className="whitespace-pre-wrap text-gray-800 dark:text-gray-100">
                                        {data.attempt.feedback}
                                    </span>
                                </div>
                            )}
                        </div>
                        <div className="space-y-4">
                            {data.questions.map((q, i) => (
                                <QuestionCard
                                    key={q.question.id}
                                    question={q.question}
                                    index={i}
                                    total={data.questions.length}
                                    answer={{
                                        selectedOptionIds: q.response?.selectedOptionIds ?? [],
                                        textAnswer: q.response?.textAnswer ?? '',
                                    }}
                                    review={{ response: q.response, key: q.key }}
                                    uploads={{ files: q.files }}
                                />
                            ))}
                        </div>
                    </>
                )}
            </div>
        </Dialog>
    )
}
