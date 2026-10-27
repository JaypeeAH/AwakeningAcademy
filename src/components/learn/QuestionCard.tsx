'use client'

import { useId, useRef, type ReactNode } from 'react'
import Tag from '@/components/ui/Tag'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import MarkdownContent from '@/components/shared/MarkdownContent'
import { CheckIcon, CloseIcon, DeleteIcon, FeedbackIcon, FileIcon, UploadIcon } from '@/configs/icons.config'
import {
    MAX_FILES_PER_QUESTION,
    responseOutcomeLabel,
    responseOutcomeTagClass,
    type AttemptFile,
    type Question,
} from '@/@types/activities/Question'
import type { AttemptResultQuestion } from '@/@types/attempts/Attempt'
import { getFileUrl } from '@/services/attempts'
import { UPLOAD_ACCEPT, UPLOAD_TYPES_DESCRIPTION } from '@/utils/fileTypes'
import classNames from '@/utils/classNames'

export interface QuestionAnswer {
    selectedOptionIds: string[]
    textAnswer: string
}

export const EMPTY_ANSWER: QuestionAnswer = { selectedOptionIds: [], textAnswer: '' }

const ESSAY_MAX = 20000

interface UploadControls {
    /** Files attached to this question */
    files: AttemptFile[]
    /** Omit for read-only */
    onUpload?: (file: File) => void
    onRemove?: (fileId: string) => void
    uploading?: boolean
}

interface QuestionCardProps {
    question: Question
    index: number
    total: number
    answer: QuestionAnswer
    /** Omit for read-only (preview / review) */
    onAnswer?: (answer: QuestionAnswer) => void
    /** Result mode: the marked response, teacher comment and (when revealed) the key and rubric */
    review?: Pick<AttemptResultQuestion, 'response' | 'key'>
    /** File-upload questions */
    uploads?: UploadControls
    /** Hide the teacher's comment box (the grader shows its own editable one) */
    hideFeedback?: boolean
    /** Insight: wrong options taken away (shown struck through, can't be chosen) */
    removedOptionIds?: string[]
    /** Skipped with an Easter Bunny: read-only, and it won't count */
    skipped?: boolean
    /** Extra content under the answer (skills, Knowledge Echo) */
    footer?: ReactNode
    className?: string
}

const formatBytes = (bytes: number) =>
    bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`

function FileList({ files, onRemove }: { files: AttemptFile[]; onRemove?: (fileId: string) => void }) {
    if (!files.length) return null
    return (
        <ul className="mt-3 space-y-2">
            {files.map((file) => (
                <li
                    key={file.id}
                    className="flex items-center gap-3 rounded-xl border border-gray-200 px-3 py-2 dark:border-gray-700"
                >
                    <FileIcon className="shrink-0 text-xl text-primary" aria-hidden />
                    <a
                        href={getFileUrl(file.id)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="min-w-0 flex-1 truncate font-medium text-gray-800 hover:text-primary hover:underline dark:text-gray-100"
                    >
                        {file.fileName}
                    </a>
                    <span className="shrink-0 text-xs text-gray-500">{formatBytes(file.sizeBytes)}</span>
                    {onRemove && (
                        <Button
                            size="xs"
                            variant="plain"
                            icon={<DeleteIcon />}
                            onClick={() => onRemove(file.id)}
                            aria-label={`Remove ${file.fileName}`}
                        />
                    )}
                </li>
            ))}
        </ul>
    )
}

/**
 * One question card, used everywhere a question is shown: answering in the Learning Dungeon, the Quest
 * Builder preview, reviewing a marked attempt (student or teacher) and the grader. Native inputs keep it
 * fully keyboard- and screen-reader-accessible.
 */
export default function QuestionCard({
    question,
    index,
    total,
    answer,
    onAnswer,
    review,
    uploads,
    hideFeedback,
    removedOptionIds = [],
    skipped = false,
    footer,
    className,
}: QuestionCardProps) {
    const id = useId()
    const fileInput = useRef<HTMLInputElement>(null)
    const readOnly = !onAnswer || skipped
    const multiple = question.kind === 'multiple_choice'
    // No response = nothing to judge (e.g. a bank preview); submitted attempts store one for every question
    const outcome = review?.response?.outcome ?? null
    const correctIds = review?.key?.correctOptionIds ?? []
    const feedback = review?.response?.feedback?.trim()

    const toggle = (optionId: string) => {
        if (!onAnswer || skipped || removedOptionIds.includes(optionId)) return
        const selected = multiple
            ? answer.selectedOptionIds.includes(optionId)
                ? answer.selectedOptionIds.filter((x) => x !== optionId)
                : [...answer.selectedOptionIds, optionId]
            : [optionId]
        onAnswer({ ...answer, selectedOptionIds: selected })
    }

    const renderAnswer = () => {
        switch (question.kind) {
            case 'short_answer':
                return (
                    <div>
                        <label htmlFor={`${id}-text`} className="sr-only">
                            Your answer
                        </label>
                        <Input
                            id={`${id}-text`}
                            value={answer.textAnswer}
                            onChange={(e) => onAnswer?.({ ...answer, textAnswer: e.target.value })}
                            disabled={readOnly}
                            placeholder={readOnly ? undefined : 'Type your answer'}
                            maxLength={500}
                            autoComplete="off"
                        />
                        {review?.key && review.key.acceptedAnswers.length > 0 && (
                            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                                Accepted:{' '}
                                <span className="font-semibold text-success">
                                    {review.key.acceptedAnswers.join(' · ')}
                                </span>
                            </p>
                        )}
                    </div>
                )
            case 'essay':
                return readOnly ? (
                    <div className="whitespace-pre-wrap rounded-xl bg-gray-50 px-4 py-3 text-gray-800 dark:bg-gray-900 dark:text-gray-100">
                        {answer.textAnswer || <span className="italic text-gray-500">No answer written.</span>}
                    </div>
                ) : (
                    <div>
                        <label htmlFor={`${id}-essay`} className="sr-only">
                            Your answer
                        </label>
                        <Input
                            id={`${id}-essay`}
                            textArea
                            rows={10}
                            value={answer.textAnswer}
                            onChange={(e) => onAnswer({ ...answer, textAnswer: e.target.value })}
                            placeholder="Write your answer here. It saves automatically."
                            maxLength={ESSAY_MAX}
                        />
                        <p className="mt-1 text-right text-xs text-gray-500">
                            {answer.textAnswer.trim() ? answer.textAnswer.trim().split(/\s+/).length : 0} words
                        </p>
                    </div>
                )
            case 'file_upload': {
                const files = uploads?.files ?? []
                const canAdd = !readOnly && !!uploads?.onUpload && files.length < MAX_FILES_PER_QUESTION
                return (
                    <div>
                        {canAdd && (
                            <div className="rounded-xl border-2 border-dashed border-gray-300 p-4 text-center dark:border-gray-600">
                                <input
                                    ref={fileInput}
                                    id={`${id}-file`}
                                    type="file"
                                    accept={UPLOAD_ACCEPT}
                                    className="sr-only"
                                    onChange={(e) => {
                                        const file = e.target.files?.[0]
                                        if (file) uploads?.onUpload?.(file)
                                        e.target.value = ''
                                    }}
                                />
                                <Button
                                    icon={<UploadIcon />}
                                    loading={uploads?.uploading}
                                    onClick={() => fileInput.current?.click()}
                                >
                                    Choose a file
                                </Button>
                                <p className="mt-2 text-xs text-gray-500">
                                    {UPLOAD_TYPES_DESCRIPTION}. Up to 10 MB each, {MAX_FILES_PER_QUESTION} files.
                                </p>
                            </div>
                        )}
                        <FileList files={files} onRemove={readOnly ? undefined : uploads?.onRemove} />
                        {readOnly && !files.length && (
                            <p className="text-sm italic text-gray-500">No files uploaded.</p>
                        )}
                        {!readOnly && (
                            <div className="mt-3">
                                <label
                                    htmlFor={`${id}-note`}
                                    className="mb-1 block text-xs font-semibold text-gray-500"
                                >
                                    Note for your teacher (optional)
                                </label>
                                <Input
                                    id={`${id}-note`}
                                    textArea
                                    rows={2}
                                    value={answer.textAnswer}
                                    onChange={(e) => onAnswer({ ...answer, textAnswer: e.target.value })}
                                    maxLength={2000}
                                />
                            </div>
                        )}
                        {readOnly && answer.textAnswer && (
                            <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                                <span className="font-semibold">Note:</span> {answer.textAnswer}
                            </p>
                        )}
                    </div>
                )
            }
            default:
                return (
                    <ul className="space-y-2">
                        {question.options.map((option) => {
                            const selected = answer.selectedOptionIds.includes(option.id)
                            const isCorrect = correctIds.includes(option.id)
                            const showCorrect = !!review?.key && isCorrect
                            const showWrong = !!review && selected && review.key !== null && !isCorrect
                            const removed = !review && removedOptionIds.includes(option.id)
                            return (
                                <li key={option.id}>
                                    <label
                                        className={classNames(
                                            'flex items-start gap-3 rounded-xl border px-4 py-3 transition-colors',
                                            readOnly || removed
                                                ? 'cursor-default'
                                                : 'cursor-pointer hover:border-primary',
                                            removed && 'opacity-50',
                                            selected && !review
                                                ? 'border-primary bg-primary-subtle'
                                                : 'border-gray-200 dark:border-gray-700',
                                            showCorrect && 'border-success bg-success-subtle',
                                            showWrong && 'border-error bg-error-subtle',
                                            review && selected && !review.key && 'border-primary bg-primary-subtle',
                                        )}
                                    >
                                        <input
                                            type={multiple ? 'checkbox' : 'radio'}
                                            name={`${id}-options`}
                                            className="mt-1 h-4 w-4 shrink-0 accent-[var(--primary)]"
                                            checked={selected && !removed}
                                            onChange={() => toggle(option.id)}
                                            disabled={readOnly || removed}
                                        />
                                        <span
                                            className={classNames(
                                                'flex-1 text-gray-800 dark:text-gray-100',
                                                removed && 'line-through',
                                            )}
                                        >
                                            {option.label}
                                            {removed && <span className="sr-only"> (removed by Insight)</span>}
                                        </span>
                                        {showCorrect && (
                                            <CheckIcon
                                                className="mt-1 shrink-0 text-success"
                                                aria-label="Correct answer"
                                            />
                                        )}
                                        {showWrong && (
                                            <CloseIcon
                                                className="mt-1 shrink-0 text-error"
                                                aria-label="Your answer, incorrect"
                                            />
                                        )}
                                    </label>
                                </li>
                            )
                        })}
                    </ul>
                )
        }
    }

    return (
        <fieldset
            className={classNames(
                'rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800',
                className,
            )}
        >
            <legend className="sr-only">
                Question {index + 1} of {total}
            </legend>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <span className="system-eyebrow">
                    Question {index + 1} / {total}
                    <span className="ml-2 normal-case tracking-normal text-gray-500">
                        ·{' '}
                        {review?.response && review.response.outcome !== 'pending_review'
                            ? `${review.response.pointsAwarded} / ${question.points} points`
                            : `${question.points} ${question.points === 1 ? 'point' : 'points'}`}
                    </span>
                </span>
                {outcome && <Tag className={responseOutcomeTagClass[outcome]}>{responseOutcomeLabel[outcome]}</Tag>}
            </div>
            <MarkdownContent className="mb-4 text-gray-900 dark:text-gray-50">{question.prompt}</MarkdownContent>
            {multiple && !readOnly && <p className="-mt-2 mb-3 text-xs text-gray-500">Select all that apply.</p>}
            {skipped && (
                <p className="mb-3 rounded-xl bg-gold-subtle px-4 py-2 text-sm font-medium text-gold" role="status">
                    The Easter Bunny hopped you past this one. It won’t count for or against your score.
                </p>
            )}

            {renderAnswer()}
            {footer}

            {feedback && !hideFeedback && (
                <div className="mt-4 rounded-xl border-l-4 border-gold bg-gold-subtle px-4 py-3">
                    <div className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-gold">
                        <FeedbackIcon aria-hidden /> Teacher’s comment
                    </div>
                    <p className="whitespace-pre-wrap text-sm text-gray-800 dark:text-gray-100">{feedback}</p>
                </div>
            )}
            {review?.key?.rubric && (
                <div className="mt-4 rounded-xl border-l-4 border-info bg-gray-50 px-4 py-3 dark:bg-gray-900">
                    <div className="system-eyebrow mb-1">What a full-marks answer includes</div>
                    <MarkdownContent className="text-sm">{review.key.rubric}</MarkdownContent>
                </div>
            )}
            {review?.key?.explanation && (
                <div className="mt-4 rounded-xl border-l-4 border-primary bg-gray-50 px-4 py-3 dark:bg-gray-900">
                    <div className="system-eyebrow mb-1">Explanation</div>
                    <MarkdownContent className="text-sm">{review.key.explanation}</MarkdownContent>
                </div>
            )}
        </fieldset>
    )
}
