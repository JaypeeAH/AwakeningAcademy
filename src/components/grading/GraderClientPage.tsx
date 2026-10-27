'use client'

import { useMemo, useState } from 'react'
import Alert from '@/components/ui/Alert'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import LinkButton from '@/components/ui/LinkButton'
import Tag from '@/components/ui/Tag'
import { toastError, toastSuccess } from '@/components/ui/toast/toast'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import ErrorState from '@/components/shared/ErrorState'
import Loading from '@/components/shared/Loading'
import PageHeader from '@/components/shared/PageHeader'
import { ActivityKindTag } from '@/components/game/GameTags'
import QuestionCard from '@/components/learn/QuestionCard'
import GradeQuestionPanel, { type MarkState } from './GradeQuestionPanel'
import { LateTag, isLate } from './GradingQueueClientPage'
import { FeedbackIcon, ForwardIcon, SaveIcon } from '@/configs/icons.config'
import { getActivityResultsPath, getGradingPath, gradingPath } from '@/configs/app.config'
import { apiGradeAttempt } from '@/services/grading'
import { useGradingAttemptStore, useGradingQueueStore } from '@/stores/GameStores'
import { isManuallyGraded } from '@/@types/activities/Question'
import { applyManualGrades, GradeError, type ManualGradeResult, type TeacherGrade } from '@/utils/manualGrading'
import useUnsavedChangesGuard from '@/utils/hooks/useUnsavedChangesGuard'
import { usePageBreadcrumbs } from '@/utils/hooks/useBreadcrumbs'
import { formatDateTime } from '@/utils/dates'
import { tryGetErrorMessage } from '@/utils/errors'
import classNames from '@/utils/classNames'
import type { ActivityKind } from '@/@types/activities/ActivityKindOptions'
import type { AttemptForGrading } from '@/@types/grading/Grading'

/** Marks the teacher has entered, keyed by question id */
type Marks = Record<string, MarkState>

function initialMarks(data: AttemptForGrading): Marks {
    return Object.fromEntries(
        data.questions.map(({ question, response }) => {
            const manual = isManuallyGraded(question.kind)
            const marked = !!response && response.outcome !== 'pending_review'
            return [
                question.id,
                {
                    points: manual
                        ? marked
                            ? String(response.pointsAwarded)
                            : ''
                        : String(response?.pointsAwarded ?? 0),
                    feedback: response?.feedback ?? '',
                    adjust: false,
                },
            ]
        }),
    )
}

/** A mark is valid when it's a number of half-points between 0 and the question's maximum */
function pointsError(points: string, max: number): string | null {
    if (points.trim() === '') return null
    const value = Number(points)
    if (!Number.isFinite(value) || value < 0 || value > max) return `Enter 0 to ${max}`
    if (!Number.isInteger(value * 2)) return 'Use whole or half points'
    return null
}

/** The grader for one submitted attempt (keyed by its marks, so it resets after every save) */
export default function GraderClientPage({ attemptId }: { attemptId: string }) {
    const data = useGradingAttemptStore(attemptId, (s) => s.data)
    const error = useGradingAttemptStore(attemptId, (s) => s.error)
    const loading = useGradingAttemptStore(attemptId, (s) => s.loading)
    const refresh = useGradingAttemptStore(attemptId, (s) => s.refresh)

    usePageBreadcrumbs([
        { label: 'Grading', href: gradingPath },
        { label: data ? `${data.student.displayName} · ${data.activity.title}` : 'Attempt' },
    ])

    if (!data) {
        return error ? (
            <ErrorState message={error} onRetry={() => void refresh()} />
        ) : (
            <Loading loading={loading} message="Opening the attempt…" />
        )
    }

    const formKey = JSON.stringify([
        data.attempt.status,
        data.attempt.feedback,
        data.questions.map((q) => [q.response?.outcome, q.response?.pointsAwarded, q.response?.feedback]),
    ])
    return <GraderForm key={formKey} attemptId={attemptId} data={data} />
}

function GraderForm({ attemptId, data }: { attemptId: string; data: AttemptForGrading }) {
    const refresh = useGradingAttemptStore(attemptId, (s) => s.refresh)
    const queue = useGradingQueueStore((s) => s.data)
    const refreshQueue = useGradingQueueStore((s) => s.refresh)
    const { attempt, activity, student, questions } = data

    const [initial] = useState(() => ({ marks: initialMarks(data), feedback: attempt.feedback }))
    const [marks, setMarks] = useState<Marks>(initial.marks)
    const [feedback, setFeedback] = useState(initial.feedback)
    const [saving, setSaving] = useState(false)
    const [confirmRegrade, setConfirmRegrade] = useState(false)
    const [justSaved, setJustSaved] = useState(false)

    const dirty = feedback !== initial.feedback || JSON.stringify(marks) !== JSON.stringify(initial.marks)
    const guard = useUnsavedChangesGuard(() => dirty && !saving)
    const regrade = attempt.status === 'graded'

    const nextItem = queue?.pending.find((i) => i.attemptId !== attemptId) ?? null

    const errors = useMemo(
        () =>
            Object.fromEntries(
                questions.map((q) => [
                    q.question.id,
                    pointsError(marks[q.question.id]?.points ?? '', q.question.points),
                ]),
            ),
        [questions, marks],
    )
    const hasErrors = Object.values(errors).some(Boolean)

    /** Grades to send: every marked essay/upload, plus auto-graded answers the teacher adjusted or commented on */
    const grades = useMemo<TeacherGrade[]>(
        () =>
            questions.flatMap(({ question, response }) => {
                const mark = marks[question.id]
                if (!mark || errors[question.id]) return []
                const manual = isManuallyGraded(question.kind)
                if (manual) {
                    return mark.points.trim() === ''
                        ? []
                        : [
                              {
                                  questionId: question.id,
                                  pointsAwarded: Number(mark.points),
                                  feedback: mark.feedback.trim(),
                              },
                          ]
                }
                const commentChanged = mark.feedback.trim() !== (response?.feedback ?? '').trim()
                if (!mark.adjust && !commentChanged) return []
                return [
                    {
                        questionId: question.id,
                        pointsAwarded:
                            mark.adjust && mark.points.trim() !== ''
                                ? Number(mark.points)
                                : (response?.pointsAwarded ?? 0),
                        feedback: mark.feedback.trim(),
                    },
                ]
            }),
        [questions, marks, errors],
    )

    const totals = useMemo<ManualGradeResult | null>(() => {
        try {
            return applyManualGrades({
                questions: questions.map((q) => ({ id: q.question.id, points: q.question.points })),
                responses: questions.flatMap((q) => (q.response ? [q.response] : [])),
                grades,
                passingScore: activity.passingScore,
            })
        } catch (e) {
            if (e instanceof GradeError) return null
            throw e
        }
    }, [questions, grades, activity.passingScore])

    const save = async () => {
        setConfirmRegrade(false)
        setSaving(true)
        try {
            const result = await apiGradeAttempt(attemptId, { grades, feedback: feedback.trim() })
            if (result.status === 'pending_review') {
                const left = totals?.pending ?? 0
                toastSuccess(`Saved. ${left} ${left === 1 ? 'answer' : 'answers'} still to mark.`)
            } else if (regrade) {
                toastSuccess(
                    `Grade updated to ${Math.round(result.percent)}%. XP already earned isn’t paid again or taken away.`,
                )
            } else {
                const xp = result.reward?.xpGained ?? 0
                toastSuccess(
                    `Marked: ${Math.round(result.percent)}% — ${result.passed ? 'passed' : 'not passed yet'}.${
                        xp > 0 ? ` ${xp} XP awarded to the student.` : ''
                    }`,
                )
            }
            setJustSaved(true)
            await Promise.all([refresh(), refreshQueue()])
        } catch (e) {
            toastError(`Couldn’t save the marks. ${tryGetErrorMessage(e)}`)
        } finally {
            setSaving(false)
        }
    }

    const onSave = () => {
        if (hasErrors) {
            toastError('Some marks need fixing — they’re highlighted below.')
            return
        }
        if (regrade) setConfirmRegrade(true)
        else void save()
    }

    return (
        <div className="pb-24">
            <PageHeader
                eyebrow={`Grading · ${activity.courseTitle}`}
                title={`${student.displayName} · ${activity.title}`}
                description={
                    <span className="flex flex-wrap items-center gap-2 text-sm">
                        <ActivityKindTag kind={activity.kind as ActivityKind} />
                        <span>Attempt {attempt.attemptNo}</span>
                        <span>· handed in {formatDateTime(attempt.submittedAt)}</span>
                        {isLate({ submittedAt: data.attempt.submittedAt, dueAt: data.activity.dueAt }) && <LateTag />}
                        {attempt.status === 'graded' ? (
                            <Tag className="border-transparent bg-success-subtle text-success">
                                Marked · {Math.round(attempt.percent ?? 0)}%
                            </Tag>
                        ) : (
                            <Tag className="border-transparent bg-info-subtle text-info">Awaiting review</Tag>
                        )}
                    </span>
                }
                actions={
                    <LinkButton size="sm" href={getActivityResultsPath(activity.courseId, activity.id)}>
                        All results
                    </LinkButton>
                }
            />

            {justSaved && !dirty && (
                <Alert showIcon type="success" className="mb-6">
                    <span className="flex flex-wrap items-center justify-between gap-3">
                        <span>
                            Marks saved.
                            {nextItem
                                ? ` Next: ${nextItem.studentName} · ${nextItem.activityTitle}.`
                                : ' Your queue is clear.'}
                        </span>
                        {nextItem ? (
                            <LinkButton
                                size="sm"
                                variant="solid"
                                href={getGradingPath(nextItem.attemptId)}
                                icon={<ForwardIcon />}
                                iconAlignment="end"
                            >
                                Next in queue
                            </LinkButton>
                        ) : (
                            <LinkButton size="sm" href={gradingPath}>
                                Back to the queue
                            </LinkButton>
                        )}
                    </span>
                </Alert>
            )}

            <div className="space-y-6">
                {questions.map((q, i) => {
                    const manual = isManuallyGraded(q.question.kind)
                    return (
                        <section key={q.question.id} aria-label={`Question ${i + 1}`}>
                            <QuestionCard
                                question={q.question}
                                index={i}
                                total={questions.length}
                                answer={{
                                    selectedOptionIds: q.response?.selectedOptionIds ?? [],
                                    textAnswer: q.response?.textAnswer ?? '',
                                }}
                                review={{ response: q.response, key: q.key }}
                                uploads={{ files: q.files }}
                                hideFeedback
                            />
                            <GradeQuestionPanel
                                maxPoints={q.question.points}
                                manual={manual}
                                autoPoints={q.response?.pointsAwarded ?? 0}
                                mark={marks[q.question.id]}
                                error={errors[q.question.id]}
                                onChange={(mark) => setMarks((prev) => ({ ...prev, [q.question.id]: mark }))}
                            />
                        </section>
                    )
                })}

                <section className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
                    <label
                        htmlFor="overall-feedback"
                        className="mb-2 flex items-center gap-2 font-semibold text-gray-900 dark:text-gray-50"
                    >
                        <FeedbackIcon aria-hidden /> Overall comment
                    </label>
                    <Input
                        id="overall-feedback"
                        textArea
                        rows={4}
                        maxLength={5000}
                        value={feedback}
                        onChange={(e) => setFeedback(e.target.value)}
                        placeholder="A short note the student sees with their result"
                    />
                </section>
            </div>

            {/* Live totals + save, always in reach */}
            <div className="sticky bottom-0 z-10 -mx-4 mt-6 border-t border-gray-200 bg-white/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6 md:-mx-8 md:px-8 dark:border-gray-700 dark:bg-gray-900/95">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="text-sm" aria-live="polite">
                        {totals ? (
                            <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
                                <span className="font-semibold tabular-nums text-gray-900 dark:text-gray-50">
                                    {totals.score} / {totals.maxScore} points · {Math.round(totals.percent)}%
                                </span>
                                {totals.pending > 0 ? (
                                    <span className="text-info">
                                        {totals.pending} {totals.pending === 1 ? 'answer' : 'answers'} still to mark
                                    </span>
                                ) : (
                                    <span
                                        className={classNames(
                                            'font-semibold',
                                            totals.passed ? 'text-success' : 'text-warning',
                                        )}
                                    >
                                        {totals.passed ? 'Passes' : 'Doesn’t pass'} (needs {activity.passingScore}%)
                                    </span>
                                )}
                                {dirty && <span className="text-xs text-gray-500">Unsaved changes</span>}
                            </span>
                        ) : (
                            <span className="text-error">Fix the highlighted marks to see the total.</span>
                        )}
                    </div>
                    <Button
                        variant="solid"
                        icon={<SaveIcon />}
                        loading={saving}
                        disabled={!dirty || hasErrors}
                        onClick={onSave}
                    >
                        {regrade ? 'Update marks' : 'Save marks'}
                    </Button>
                </div>
            </div>

            <ConfirmDialog
                isOpen={confirmRegrade}
                onClose={() => setConfirmRegrade(false)}
                type="warning"
                title="Change a grade the student has already seen?"
                confirmText="Update marks"
                onConfirm={() => void save()}
                loading={saving}
            >
                The new score replaces the old one and the student is notified. XP they already earned for this work
                isn’t paid again — and isn’t taken away if the score goes down. The change is recorded in the audit log.
            </ConfirmDialog>

            <ConfirmDialog
                isOpen={!!guard.pendingHref}
                onClose={guard.stay}
                type="warning"
                title="Leave without saving?"
                confirmText="Leave"
                cancelText="Stay and save"
                onConfirm={guard.leave}
            >
                You have marks that aren’t saved yet. If you leave now, they’ll be lost.
            </ConfirmDialog>
        </div>
    )
}
