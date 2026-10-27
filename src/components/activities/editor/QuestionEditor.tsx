'use client'

import { useId } from 'react'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import Switcher from '@/components/ui/Switcher'
import Tooltip from '@/components/ui/Tooltip'
import NumberInput from './NumberInput'
import { convertQuestion } from './activityForm'
import {
    AddIcon,
    BankIcon,
    CheckIcon,
    CopyIcon,
    DeleteIcon,
    MoveDownIcon,
    MoveUpIcon,
    SparkleIcon,
} from '@/configs/icons.config'
import {
    AUTHORABLE_QUESTION_KINDS,
    isChoiceKind,
    isManuallyGraded,
    questionKindLabel,
    type QuestionKind,
} from '@/@types/activities/Question'
import type { QuestionFormData } from '@/@types/activities/forms/ActivityFormData'
import type { ActivityIssue } from '@/utils/activityValidation'
import type { FieldErrors } from 'react-hook-form'
import classNames from '@/utils/classNames'

const MAX_OPTIONS = 12
const MAX_ANSWERS = 20

interface QuestionEditorProps {
    value: QuestionFormData
    onChange: (value: QuestionFormData) => void
    index: number
    total: number
    errors?: FieldErrors<QuestionFormData>
    /** Publish-checklist issues for this question */
    issues: ActivityIssue[]
    onMoveUp: () => void
    onMoveDown: () => void
    onDuplicate: () => void
    onDelete: () => void
    /** Opens the "Save to bank" dialog for this question */
    onSaveToBank: () => void
    /** Boss battles: phase titles (shows a phase picker) */
    phases?: string[]
    /** The activity's learning objectives (shows an objective picker when there are any) */
    objectives?: string[]
}

const kindOptions = AUTHORABLE_QUESTION_KINDS.map((k) => ({ value: k, label: questionKindLabel[k] }))

/**
 * One question: type, prompt, points, then by kind — options + correct answer(s), accepted answers, or (essay /
 * file upload, teacher-graded) a rubric — and an explanation.
 */
export default function QuestionEditor({
    value,
    onChange,
    index,
    total,
    errors,
    issues,
    onMoveUp,
    onMoveDown,
    onDuplicate,
    onDelete,
    onSaveToBank,
    phases,
    objectives = [],
}: QuestionEditorProps) {
    const id = useId()
    const q = value
    const isChoice = isChoiceKind(q.kind)
    const manual = isManuallyGraded(q.kind)
    const fixedOptions = q.kind === 'true_false'
    const multiple = q.kind === 'multiple_choice'

    const objectiveOptions = [
        { value: '', label: 'None' },
        ...objectives.map((o) => ({ value: o, label: o })),
        // A saved objective that has since been renamed or removed stays visible until changed
        ...(q.objective && !objectives.includes(q.objective)
            ? [{ value: q.objective, label: `${q.objective} (removed)` }]
            : []),
    ]

    const phaseOptions = phases?.map((title, i) => ({ value: i + 1, label: `${i + 1}. ${title || 'Untitled'}` }))

    const set = (patch: Partial<QuestionFormData>) => onChange({ ...q, ...patch })
    const setKey = (patch: Partial<QuestionFormData['key']>) => onChange({ ...q, key: { ...q.key, ...patch } })

    const toggleCorrect = (optionId: string) => {
        const current = q.key.correctOptionIds
        setKey({
            correctOptionIds: multiple
                ? current.includes(optionId)
                    ? current.filter((x) => x !== optionId)
                    : [...current, optionId]
                : [optionId],
        })
    }

    const removeOption = (optionId: string) =>
        onChange({
            ...q,
            options: q.options.filter((o) => o.id !== optionId),
            key: { ...q.key, correctOptionIds: q.key.correctOptionIds.filter((x) => x !== optionId) },
        })

    return (
        <section
            id={`question-${q.id}`}
            tabIndex={-1}
            className={classNames(
                'rounded-2xl border bg-white p-4 outline-none focus:ring-2 focus:ring-primary sm:p-5 dark:bg-gray-800',
                issues.length ? 'border-warning/60' : 'border-gray-200 dark:border-gray-700',
            )}
            aria-label={`Question ${index + 1}`}
        >
            <header className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <span className="system-eyebrow">Question {index + 1}</span>
                <div className="flex items-center gap-1">
                    <Button
                        type="button"
                        size="xs"
                        variant="plain"
                        icon={<MoveUpIcon />}
                        aria-label="Move up"
                        disabled={index === 0}
                        onClick={onMoveUp}
                    />
                    <Button
                        type="button"
                        size="xs"
                        variant="plain"
                        icon={<MoveDownIcon />}
                        aria-label="Move down"
                        disabled={index === total - 1}
                        onClick={onMoveDown}
                    />
                    <Tooltip title="Save to the course question bank">
                        <Button
                            type="button"
                            size="xs"
                            variant="plain"
                            icon={<BankIcon />}
                            aria-label="Save question to bank"
                            onClick={onSaveToBank}
                        />
                    </Tooltip>
                    <Tooltip title="Duplicate">
                        <Button
                            type="button"
                            size="xs"
                            variant="plain"
                            icon={<CopyIcon />}
                            aria-label="Duplicate question"
                            onClick={onDuplicate}
                        />
                    </Tooltip>
                    <Button
                        type="button"
                        size="xs"
                        variant="plain"
                        icon={<DeleteIcon />}
                        aria-label="Delete question"
                        onClick={onDelete}
                    />
                </div>
            </header>

            {q.aiDraft && (
                <div
                    className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-primary/40 bg-primary-subtle px-4 py-3"
                    role="status"
                >
                    <p className="flex items-start gap-2 text-sm text-gray-800 dark:text-gray-100">
                        <SparkleIcon className="mt-0.5 shrink-0 text-primary" aria-hidden />
                        <span>
                            <strong>Drafted by AI</strong> — check the question, answers and explanation, then mark it
                            reviewed.
                        </span>
                    </p>
                    <Button
                        type="button"
                        size="xs"
                        variant="solid"
                        icon={<CheckIcon />}
                        onClick={() => set({ aiDraft: false })}
                    >
                        Mark as reviewed
                    </Button>
                </div>
            )}

            <div
                className={classNames(
                    'grid gap-3',
                    phases ? 'sm:grid-cols-[1fr_12rem_7rem]' : 'sm:grid-cols-[1fr_7rem]',
                )}
            >
                <div>
                    <label htmlFor={`${id}-kind`} className="form-label mb-1 block">
                        Type
                    </label>
                    <Select
                        inputId={`${id}-kind`}
                        options={kindOptions}
                        value={kindOptions.find((o) => o.value === q.kind)}
                        onChange={(option) => option && onChange(convertQuestion(q, option.value as QuestionKind))}
                        isSearchable={false}
                    />
                </div>
                {phases && phaseOptions && (
                    <div>
                        <label htmlFor={`${id}-phase`} className="form-label mb-1 block">
                            Phase
                        </label>
                        <Select
                            inputId={`${id}-phase`}
                            options={phaseOptions}
                            value={phaseOptions[Math.min(q.phase ?? 1, phaseOptions.length) - 1]}
                            onChange={(option) => option && set({ phase: option.value })}
                            isSearchable={false}
                        />
                    </div>
                )}
                <div>
                    <label htmlFor={`${id}-points`} className="form-label mb-1 block">
                        Points
                    </label>
                    <NumberInput
                        id={`${id}-points`}
                        min={1}
                        max={100}
                        value={q.points}
                        onChange={(points) => set({ points: points ?? 1 })}
                        invalid={!!errors?.points}
                    />
                </div>
            </div>

            <div className="mt-3">
                <label htmlFor={`${id}-prompt`} className="form-label mb-1 block">
                    Question <span className="text-xs font-normal text-gray-500">(Markdown supported)</span>
                </label>
                <Input
                    id={`${id}-prompt`}
                    textArea
                    rows={2}
                    value={q.prompt}
                    onChange={(e) => set({ prompt: e.target.value })}
                    invalid={!!errors?.prompt}
                    placeholder="What is ¾ + ⅛?"
                />
                {errors?.prompt?.message && <p className="mt-1 text-xs text-error">{errors.prompt.message}</p>}
            </div>

            {objectives.length > 0 && (
                <div className="mt-3 sm:max-w-md">
                    <label htmlFor={`${id}-objective`} className="form-label mb-1 block">
                        Learning objective{' '}
                        <span className="text-xs font-normal text-gray-500">(used in your analytics)</span>
                    </label>
                    <Select
                        inputId={`${id}-objective`}
                        options={objectiveOptions}
                        value={objectiveOptions.find((o) => o.value === (q.objective ?? '')) ?? objectiveOptions[0]}
                        onChange={(option) => set({ objective: option?.value ?? '' })}
                        isSearchable={false}
                    />
                </div>
            )}

            {isChoice ? (
                <fieldset className="mt-4">
                    <legend className="form-label mb-2">
                        {fixedOptions
                            ? 'Correct answer'
                            : multiple
                              ? 'Options — tick every correct answer'
                              : 'Options — pick the correct answer'}
                    </legend>
                    <ul className="space-y-2">
                        {q.options.map((option, i) => {
                            const correct = q.key.correctOptionIds.includes(option.id)
                            return (
                                <li key={option.id} className="flex items-center gap-2">
                                    <label
                                        className="flex shrink-0 cursor-pointer items-center"
                                        title="Mark as correct"
                                    >
                                        <input
                                            type={multiple ? 'checkbox' : 'radio'}
                                            name={`${id}-correct`}
                                            className="h-4 w-4 accent-[var(--success)]"
                                            checked={correct}
                                            onChange={() => toggleCorrect(option.id)}
                                            aria-label={`Option ${i + 1} is correct`}
                                        />
                                    </label>
                                    {fixedOptions ? (
                                        <span
                                            className={classNames(
                                                'flex-1 rounded-xl border px-3 py-2',
                                                correct
                                                    ? 'border-success text-success'
                                                    : 'border-gray-200 dark:border-gray-700',
                                            )}
                                        >
                                            {option.label}
                                        </span>
                                    ) : (
                                        <Input
                                            aria-label={`Option ${i + 1}`}
                                            value={option.label}
                                            onChange={(e) =>
                                                set({
                                                    options: q.options.map((o) =>
                                                        o.id === option.id ? { ...o, label: e.target.value } : o,
                                                    ),
                                                })
                                            }
                                            invalid={!!errors?.options?.[i]?.label}
                                            placeholder={`Option ${i + 1}`}
                                            className={correct ? 'ring-1 ring-success' : undefined}
                                        />
                                    )}
                                    {!fixedOptions && (
                                        <Button
                                            type="button"
                                            variant="plain"
                                            size="sm"
                                            icon={<DeleteIcon />}
                                            aria-label={`Remove option ${i + 1}`}
                                            disabled={q.options.length <= 2}
                                            onClick={() => removeOption(option.id)}
                                        />
                                    )}
                                </li>
                            )
                        })}
                    </ul>
                    {!fixedOptions && (
                        <Button
                            type="button"
                            size="sm"
                            variant="plain"
                            icon={<AddIcon />}
                            className="mt-2"
                            disabled={q.options.length >= MAX_OPTIONS}
                            onClick={() => set({ options: [...q.options, { id: crypto.randomUUID(), label: '' }] })}
                        >
                            Add option
                        </Button>
                    )}
                </fieldset>
            ) : manual ? (
                <div className="mt-4">
                    <p className="mb-3 rounded-xl bg-info-subtle px-3 py-2 text-xs text-info">
                        {q.kind === 'essay'
                            ? 'Students write an answer. You mark it yourself — the attempt waits in “awaiting review” (no XP yet) until you do.'
                            : 'Students upload files (PDF, documents, images). You mark them yourself — the attempt waits in “awaiting review” (no XP yet) until you do.'}
                    </p>
                    <label htmlFor={`${id}-rubric`} className="form-label mb-1 block">
                        Rubric — what a full-marks answer includes{' '}
                        <span className="text-xs font-normal text-gray-500">(Markdown)</span>
                    </label>
                    <Input
                        id={`${id}-rubric`}
                        textArea
                        rows={4}
                        value={q.key.rubric}
                        onChange={(e) => setKey({ rubric: e.target.value })}
                        placeholder={
                            '- States the main idea clearly (2 points)\n- Uses two pieces of evidence (2 points)\n- Explains the result (1 point)'
                        }
                    />
                    <p className="mt-1 text-xs text-gray-500">
                        Shown to you while grading, and to students with the answers when your feedback setting allows.
                    </p>
                </div>
            ) : (
                <fieldset className="mt-4">
                    <legend className="form-label mb-2">Accepted answers</legend>
                    <p className="mb-2 text-xs text-gray-500">
                        Any of these counts as correct. Spacing is ignored; numbers match by value (0.5 = .5).
                    </p>
                    <ul className="space-y-2">
                        {q.key.acceptedAnswers.map((answer, i) => (
                            <li key={i} className="flex items-center gap-2">
                                <Input
                                    aria-label={`Accepted answer ${i + 1}`}
                                    value={answer}
                                    maxLength={500}
                                    onChange={(e) =>
                                        setKey({
                                            acceptedAnswers: q.key.acceptedAnswers.map((a, j) =>
                                                j === i ? e.target.value : a,
                                            ),
                                        })
                                    }
                                    placeholder="e.g. 7/8"
                                />
                                <Button
                                    type="button"
                                    variant="plain"
                                    size="sm"
                                    icon={<DeleteIcon />}
                                    aria-label={`Remove accepted answer ${i + 1}`}
                                    disabled={q.key.acceptedAnswers.length <= 1}
                                    onClick={() =>
                                        setKey({ acceptedAnswers: q.key.acceptedAnswers.filter((_, j) => j !== i) })
                                    }
                                />
                            </li>
                        ))}
                    </ul>
                    <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                        <Button
                            type="button"
                            size="sm"
                            variant="plain"
                            icon={<AddIcon />}
                            disabled={q.key.acceptedAnswers.length >= MAX_ANSWERS}
                            onClick={() => setKey({ acceptedAnswers: [...q.key.acceptedAnswers, ''] })}
                        >
                            Add accepted answer
                        </Button>
                        <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                            <Switcher
                                checked={q.key.caseSensitive}
                                onChange={(caseSensitive) => setKey({ caseSensitive })}
                            />
                            Case-sensitive
                        </label>
                    </div>
                </fieldset>
            )}

            <div className="mt-4">
                <label htmlFor={`${id}-explanation`} className="form-label mb-1 block">
                    Explanation{' '}
                    <span className="text-xs font-normal text-gray-500">
                        ({manual ? 'optional — ' : ''}shown after answering, when answers are revealed)
                    </span>
                </label>
                <Input
                    id={`${id}-explanation`}
                    textArea
                    rows={2}
                    value={q.key.explanation}
                    onChange={(e) => setKey({ explanation: e.target.value })}
                    placeholder="Why this is the answer — helps students learn from mistakes"
                />
            </div>

            {issues.length > 0 && (
                <ul className="mt-3 space-y-1 text-xs text-warning">
                    {issues.map((issue) => (
                        <li key={issue.message}>• {issue.message.replace(/^Question \d+ /, 'This question ')}</li>
                    ))}
                </ul>
            )}
        </section>
    )
}
