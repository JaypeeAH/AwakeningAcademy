'use client'

import { useMemo, useState } from 'react'
import Button from '@/components/ui/Button'
import Alert from '@/components/ui/Alert'
import MarkdownContent from '@/components/shared/MarkdownContent'
import EmptyState from '@/components/shared/EmptyState'
import QuestionCard, { EMPTY_ANSWER, type QuestionAnswer } from '@/components/learn/QuestionCard'
import { ActivityKindTag, DifficultyStars, XpReward } from '@/components/game/GameTags'
import { toQuestionInput } from './activityForm'
import { CheckIcon, PreviewIcon, RefreshIcon } from '@/configs/icons.config'
import { gradeAttempt } from '@/utils/grading'
import { canRevealAnswers, feedbackModeLabel } from '@/utils/feedback'
import { toastInfo } from '@/components/ui/toast/toast'
import { formatDuration } from '@/utils/dates'
import { isAssessment, type ActivityKind } from '@/@types/activities/ActivityKindOptions'
import type { ActivityFormData } from '@/@types/activities/forms/ActivityFormData'
import type { KeyedQuestion } from '@/@types/activities/Question'

interface StudentPreviewProps {
    kind: ActivityKind
    values: ActivityFormData
}

/**
 * What a student will see, built from the unsaved form. "Check answers" grades with the same function the
 * server uses, so teachers can try their own quiz before publishing. Nothing here is saved.
 */
export default function StudentPreview({ kind, values }: StudentPreviewProps) {
    const [answers, setAnswers] = useState<Record<string, QuestionAnswer>>({})
    const [checked, setChecked] = useState(false)

    const questions = useMemo<KeyedQuestion[]>(
        () =>
            values.questions.map((q, position) => {
                const input = toQuestionInput(q)
                return {
                    id: q.id,
                    kind: q.kind,
                    prompt: q.prompt || '_(No question text yet)_',
                    points: q.points || 1,
                    position,
                    options: q.options.map((o, i) => ({ id: o.id, label: o.label || `Option ${i + 1}`, position: i })),
                    key: input.key,
                }
            }),
        [values.questions],
    )

    const grade = useMemo(
        () =>
            checked
                ? gradeAttempt(
                      questions,
                      questions.map((q) => ({
                          questionId: q.id,
                          selectedOptionIds: answers[q.id]?.selectedOptionIds ?? [],
                          textAnswer: answers[q.id]?.textAnswer ?? null,
                      })),
                      values.passingScore,
                  )
                : null,
        [checked, questions, answers, values.passingScore],
    )

    // What a student would see right now (after_due depends on the due date)
    const answersShown = canRevealAnswers(values.feedbackMode, values.dueAt ? new Date(values.dueAt) : null)
    const objectives = values.objectives.map((o) => o.text.trim()).filter(Boolean)
    const duration = formatDuration(values.estimatedMinutes)

    return (
        <div className="mx-auto max-w-3xl space-y-6">
            <Alert showIcon type="info">
                Preview of the unsaved version. Answers here aren’t recorded and earn no XP.
            </Alert>

            <header className="system-panel p-5">
                <div className="flex flex-wrap items-center gap-2 text-sm">
                    <ActivityKindTag kind={kind} />
                    <DifficultyStars difficulty={values.difficulty} />
                    <XpReward amount={values.xpReward} />
                    {duration && <span className="text-gray-500">· {duration}</span>}
                </div>
                <h2 className="mt-2 text-2xl">{values.title || 'Untitled activity'}</h2>
                {values.summary && <p className="mt-1 text-gray-500 dark:text-gray-400">{values.summary}</p>}
                {objectives.length > 0 && (
                    <div className="mt-3">
                        <div className="system-eyebrow mb-1">You will be able to</div>
                        <ul className="list-inside list-disc text-sm text-gray-600 dark:text-gray-300">
                            {objectives.map((o) => (
                                <li key={o}>{o}</li>
                            ))}
                        </ul>
                    </div>
                )}
            </header>

            {values.body.trim() && (
                <article className="rounded-2xl border border-gray-200 bg-white p-5 md:p-8 dark:border-gray-700 dark:bg-gray-800">
                    <MarkdownContent>{values.body}</MarkdownContent>
                </article>
            )}

            {isAssessment(kind) &&
                (questions.length === 0 ? (
                    <EmptyState
                        icon={<PreviewIcon />}
                        title="No questions to preview"
                        description="Add questions on the Build tab."
                    />
                ) : (
                    <>
                        {questions.map((q, i) => {
                            const response = grade?.responses.find((r) => r.questionId === q.id) ?? null
                            return (
                                <QuestionCard
                                    key={q.id}
                                    question={q}
                                    index={i}
                                    total={questions.length}
                                    answer={answers[q.id] ?? EMPTY_ANSWER}
                                    onAnswer={
                                        checked
                                            ? undefined
                                            : (answer) => setAnswers((prev) => ({ ...prev, [q.id]: answer }))
                                    }
                                    review={checked ? { response, key: answersShown ? q.key : null } : undefined}
                                    uploads={
                                        q.kind === 'file_upload'
                                            ? {
                                                  files: [],
                                                  onUpload: () =>
                                                      toastInfo(
                                                          'Students upload files here when they take the activity.',
                                                      ),
                                              }
                                            : undefined
                                    }
                                />
                            )
                        })}
                        <div className="flex flex-col gap-3 rounded-2xl border border-gray-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between dark:border-gray-700 dark:bg-gray-800">
                            {grade ? (
                                <p className="text-sm">
                                    Score <strong>{grade.percent}%</strong> ({grade.score}/{grade.maxScore}) —{' '}
                                    {grade.passed ? (
                                        <span className="text-success">passes</span>
                                    ) : (
                                        <span className="text-error">
                                            below the {values.passingScore}% passing score
                                        </span>
                                    )}
                                    {grade.needsReview && (
                                        <span className="block text-xs text-gray-500">
                                            Essay and upload answers score 0 until you mark them — students see
                                            “awaiting review”.
                                        </span>
                                    )}
                                    <span className="block text-xs text-gray-500">
                                        {feedbackModeLabel[values.feedbackMode]}.
                                    </span>
                                </p>
                            ) : (
                                <p className="text-sm text-gray-500">Answer as a student would, then check.</p>
                            )}
                            {checked ? (
                                <Button
                                    size="sm"
                                    icon={<RefreshIcon />}
                                    onClick={() => {
                                        setChecked(false)
                                        setAnswers({})
                                    }}
                                >
                                    Try again
                                </Button>
                            ) : (
                                <Button size="sm" variant="solid" icon={<CheckIcon />} onClick={() => setChecked(true)}>
                                    Check answers
                                </Button>
                            )}
                        </div>
                    </>
                ))}
        </div>
    )
}
