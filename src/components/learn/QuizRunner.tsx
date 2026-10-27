'use client'

import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Button from '@/components/ui/Button'
import { toastError } from '@/components/ui/toast/toast'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import XpBar from '@/components/game/XpBar'
import QuestionCard, { EMPTY_ANSWER, type QuestionAnswer } from './QuestionCard'
import AttemptTimer from './AttemptTimer'
import { AttemptPowersBar, KnowledgeEchoPanel } from './AttemptPowersBar'
import { BossPhaseHeader } from './BossBattle'
import { groupByPhase, type BossConfig } from '@/utils/boss'
import { ForwardIcon, PrevIcon, SubmitIcon } from '@/configs/icons.config'
import { apiDeleteAttemptFile, apiSaveDraft, apiSubmitAttempt, uploadAttemptFile } from '@/services/attempts'
import { isManuallyGraded, type AttemptFile } from '@/@types/activities/Question'
import { getErrorCode, tryGetErrorMessage } from '@/utils/errors'
import { tryParseJson } from '@/utils/parse'
import classNames from '@/utils/classNames'
import type { AttemptResult, AttemptSession } from '@/@types/attempts/Attempt'
import type { ResponseInput } from '@/@types/attempts/AttemptSchema'

interface QuizRunnerProps {
    session: AttemptSession
    onSubmitted: (result: AttemptResult) => void
    /** Boss battles: questions run phase by phase under the boss's banner */
    boss?: BossConfig | null
}

type Answers = Record<string, QuestionAnswer>
type SaveState = 'saved' | 'saving' | 'unsaved' | 'offline'

const AUTOSAVE_DELAY_MS = 1500
const AUTOSAVE_HEARTBEAT_MS = 30_000
const localKey = (attemptId: string) => `aa-attempt-${attemptId}`

/** This tab's copy (instant) over the server's autosave (survives devices) */
function initialAnswers(session: AttemptSession): Answers {
    const fromServer: Answers = Object.fromEntries(
        session.draft.map((r) => [
            r.questionId,
            { selectedOptionIds: r.selectedOptionIds, textAnswer: r.textAnswer ?? '' },
        ]),
    )
    if (typeof window === 'undefined') return fromServer
    try {
        return { ...fromServer, ...tryParseJson<Answers>(sessionStorage.getItem(localKey(session.attempt.id)), {}) }
    } catch {
        return fromServer
    }
}

const toResponses = (questionIds: string[], answers: Answers): ResponseInput[] =>
    questionIds.map((questionId) => ({
        questionId,
        selectedOptionIds: answers[questionId]?.selectedOptionIds ?? [],
        textAnswer: answers[questionId]?.textAnswer?.trim() || null,
    }))

const SAVE_LABEL: Record<SaveState, string> = {
    saved: 'All answers saved',
    saving: 'Saving…',
    unsaved: 'Saving soon…',
    offline: 'Not saved — check your connection',
}

/**
 * One question at a time with a question map. Answers autosave to the server (and this tab), so a
 * refresh or another device resumes the attempt; on a timed attempt, what was saved is handed in when
 * time runs out. Only choices are sent — scoring happens on the server.
 */
export default function QuizRunner({ session, onSubmitted, boss }: QuizRunnerProps) {
    const { attempt } = session
    // Boss battles: in phase order; each question's phase clamped to the boss's phases
    const questions = useMemo(
        () =>
            boss
                ? groupByPhase(session.questions, boss.phases.length).flatMap((g) =>
                      g.questions.map((q) => ({ ...q, phase: g.phase })),
                  )
                : session.questions,
        [session.questions, boss],
    )
    const questionIds = useMemo(() => questions.map((q) => q.id), [questions])
    const [answers, setAnswers] = useState<Answers>(() => initialAnswers(session))
    const [files, setFiles] = useState<AttemptFile[]>(session.files)
    const [uploadingFor, setUploadingFor] = useState<string | null>(null)
    const [current, setCurrent] = useState(0)
    const [confirming, setConfirming] = useState(false)
    const [submitting, setSubmitting] = useState(false)
    const [saveState, setSaveState] = useState<SaveState>('saved')
    const [powers, setPowers] = useState(session.powers)
    const [expiresAt, setExpiresAt] = useState(attempt.expiresAt)
    const latest = useRef(answers)
    const submitted = useRef(false)

    // Keep this tab's copy and schedule a server autosave after each change
    useEffect(() => {
        latest.current = answers
        try {
            sessionStorage.setItem(localKey(attempt.id), JSON.stringify(answers))
        } catch {
            // Storage unavailable (private mode): the server autosave still runs
        }
    }, [answers, attempt.id])

    const saveNow = useCallback(async () => {
        if (submitted.current) return
        setSaveState('saving')
        try {
            await apiSaveDraft(attempt.id, toResponses(questionIds, latest.current))
            setSaveState('saved')
        } catch (error) {
            const code = getErrorCode(error)
            if (code === 'TIME_UP' || code === 'ATTEMPT_CLOSED') return
            setSaveState('offline')
        }
    }, [attempt.id, questionIds])

    useEffect(() => {
        if (saveState !== 'unsaved') return
        const timer = setTimeout(() => void saveNow(), AUTOSAVE_DELAY_MS)
        return () => clearTimeout(timer)
    }, [answers, saveState, saveNow])

    // Heartbeat: retries after a dropped connection
    useEffect(() => {
        const timer = setInterval(() => saveState === 'offline' && void saveNow(), AUTOSAVE_HEARTBEAT_MS)
        return () => clearInterval(timer)
    }, [saveState, saveNow])

    const setAnswer = (questionId: string, answer: QuestionAnswer) => {
        setAnswers((prev) => ({ ...prev, [questionId]: answer }))
        setSaveState('unsaved')
    }

    const isAnswered = useCallback(
        (questionId: string) => {
            const a = answers[questionId]
            return (
                files.some((f) => f.questionId === questionId) ||
                (!!a && (a.selectedOptionIds.length > 0 || a.textAnswer.trim().length > 0))
            )
        },
        [answers, files],
    )
    const isSkipped = useCallback((questionId: string) => powers.skippedQuestionIds.includes(questionId), [powers])
    const answeredCount = questions.filter((q) => isAnswered(q.id) || isSkipped(q.id)).length
    const skippedCount = powers.skippedQuestionIds.length
    const teacherMarked = questions.some((q) => isManuallyGraded(q.kind))
    const question = questions[current]

    const submit = useCallback(async () => {
        if (submitted.current) return
        submitted.current = true
        setSubmitting(true)
        try {
            const result = await apiSubmitAttempt(attempt.id, { responses: toResponses(questionIds, latest.current) })
            try {
                sessionStorage.removeItem(localKey(attempt.id))
            } catch {
                // ignore
            }
            onSubmitted(result)
        } catch (error) {
            submitted.current = false
            toastError(`Your answers couldn’t be handed in. They’re saved — try again. ${tryGetErrorMessage(error)}`)
        } finally {
            setSubmitting(false)
            setConfirming(false)
        }
    }, [attempt.id, questionIds, onSubmitted])

    const upload = async (questionId: string, file: File) => {
        setUploadingFor(questionId)
        try {
            const added = await uploadAttemptFile(attempt.id, questionId, file)
            setFiles((prev) => [...prev, added])
        } catch (error) {
            toastError(tryGetErrorMessage(error))
        } finally {
            setUploadingFor(null)
        }
    }

    const removeFile = async (fileId: string) => {
        try {
            await apiDeleteAttemptFile(attempt.id, fileId)
            setFiles((prev) => prev.filter((f) => f.id !== fileId))
        } catch (error) {
            toastError('Couldn’t remove that file.', error)
        }
    }

    if (!question) return <p className="text-gray-500">This activity has no questions yet.</p>

    return (
        <div>
            {boss && <BossPhaseHeader boss={boss} phase={question.phase ?? 1} />}
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
                <XpBar
                    className="flex-1"
                    value={answeredCount}
                    max={questions.length}
                    label={`Attempt ${attempt.attemptNo}`}
                    valueText={`${answeredCount} / ${questions.length} answered`}
                />
                {expiresAt && <AttemptTimer expiresAt={expiresAt} serverNow={session.serverNow} onExpire={submit} />}
            </div>
            <p
                className={classNames(
                    'mb-3 text-xs',
                    saveState === 'offline' ? 'font-semibold text-error' : 'text-gray-500',
                )}
                role="status"
                aria-live="polite"
            >
                {SAVE_LABEL[saveState]}
            </p>
            <nav aria-label="Questions" className="mb-4 flex flex-wrap gap-1.5">
                {questions.map((q, i) => (
                    <Fragment key={q.id}>
                        {boss && q.phase !== questions[i - 1]?.phase && (
                            <span
                                className={classNames(
                                    'flex h-9 items-center text-[11px] font-semibold uppercase tracking-[0.14em] text-error',
                                    i > 0 && 'ml-2 border-l border-gray-200 pl-3 dark:border-gray-700',
                                )}
                                aria-hidden
                            >
                                Phase {q.phase}
                            </span>
                        )}
                        <button
                            type="button"
                            onClick={() => setCurrent(i)}
                            aria-current={i === current ? 'step' : undefined}
                            aria-label={`Question ${i + 1}${isSkipped(q.id) ? ', skipped' : isAnswered(q.id) ? ', answered' : ''}`}
                            className={classNames(
                                'h-9 w-9 rounded-lg border text-sm font-semibold tabular-nums',
                                i === current
                                    ? 'border-primary bg-primary text-neutral'
                                    : isSkipped(q.id)
                                      ? 'border-gold bg-gold-subtle text-gold'
                                      : isAnswered(q.id)
                                        ? 'border-primary bg-primary-subtle text-primary'
                                        : 'border-gray-200 text-gray-500 dark:border-gray-700',
                            )}
                        >
                            {i + 1}
                        </button>
                    </Fragment>
                ))}
            </nav>
            <QuestionCard
                key={question.id}
                question={question}
                index={current}
                total={questions.length}
                answer={answers[question.id] ?? EMPTY_ANSWER}
                onAnswer={(answer) => setAnswer(question.id, answer)}
                uploads={{
                    files: files.filter((f) => f.questionId === question.id),
                    onUpload: (file) => void upload(question.id, file),
                    onRemove: (fileId) => void removeFile(fileId),
                    uploading: uploadingFor === question.id,
                }}
                skipped={isSkipped(question.id)}
                removedOptionIds={powers.removedOptions[question.id]}
                footer={
                    <>
                        <KnowledgeEchoPanel echo={powers.echoes[question.id]} />
                        <AttemptPowersBar
                            attemptId={attempt.id}
                            question={question}
                            powers={powers}
                            onChange={(next) => {
                                // A skipped question's answer no longer matters: clear it
                                const newlySkipped = next.skippedQuestionIds.find((id) => !isSkipped(id))
                                if (newlySkipped) setAnswer(newlySkipped, EMPTY_ANSWER)
                                setPowers(next)
                            }}
                            onTimeExtended={setExpiresAt}
                        />
                    </>
                }
            />
            <div className="mt-4 flex items-center justify-between gap-2">
                <Button icon={<PrevIcon />} disabled={current === 0} onClick={() => setCurrent((c) => c - 1)}>
                    Previous
                </Button>
                {current < questions.length - 1 ? (
                    <Button
                        variant="solid"
                        icon={<ForwardIcon />}
                        iconAlignment="end"
                        onClick={() => setCurrent((c) => c + 1)}
                    >
                        Next
                    </Button>
                ) : (
                    <Button variant="solid" icon={<SubmitIcon />} onClick={() => setConfirming(true)}>
                        Hand in
                    </Button>
                )}
            </div>
            <ConfirmDialog
                isOpen={confirming}
                onClose={() => setConfirming(false)}
                type={answeredCount < questions.length ? 'warning' : 'info'}
                title="Hand in your answers?"
                confirmText="Hand in"
                onConfirm={submit}
                loading={submitting}
            >
                <p>
                    {answeredCount < questions.length
                        ? `You’ve answered ${answeredCount - skippedCount} of ${questions.length - skippedCount}. Unanswered questions count as incorrect.`
                        : 'You can’t change your answers after handing them in.'}
                </p>
                {skippedCount > 0 && (
                    <p className="mt-2">
                        {skippedCount} {skippedCount === 1 ? 'question was' : 'questions were'} skipped with an Easter
                        Bunny and won’t count.
                    </p>
                )}
                {teacherMarked && (
                    <p className="mt-2">
                        Your teacher marks the written and uploaded answers — your score and XP arrive when they’re
                        done.
                    </p>
                )}
                {session.attemptsLeft !== null && (
                    <p className="mt-2">
                        This uses attempt {attempt.attemptNo}; {session.attemptsLeft} will remain.
                    </p>
                )}
            </ConfirmDialog>
        </div>
    )
}
