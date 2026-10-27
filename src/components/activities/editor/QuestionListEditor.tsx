'use client'

import { useState } from 'react'
import { Controller, useFieldArray, useFormContext } from 'react-hook-form'
import Button from '@/components/ui/Button'
import Dropdown from '@/components/ui/Dropdown'
import EmptyState from '@/components/shared/EmptyState'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import QuestionEditor from './QuestionEditor'
import AddFromBankDialog from '@/components/bank/AddFromBankDialog'
import SaveToBankDialog from '@/components/bank/SaveToBankDialog'
import { toastSuccess } from '@/components/ui/toast/toast'
import { duplicateQuestion, newQuestion, questionInputToForm, toQuestionInput } from './activityForm'
import navigationIcon, { AddIcon, BankIcon } from '@/configs/icons.config'
import type { QuestionInput } from '@/@types/activities/ActivitySchema'
import { AUTHORABLE_QUESTION_KINDS, questionKindLabel, type QuestionKind } from '@/@types/activities/Question'
import type { ActivityFormData } from '@/@types/activities/forms/ActivityFormData'
import type { ActivityIssue } from '@/utils/activityValidation'

const MAX_QUESTIONS = 200

interface QuestionListEditorProps {
    courseId: string
    /** Graded attempts so far: questions students answered can't be removed */
    attemptCount: number
    issues: ActivityIssue[]
    /** Boss battles: phase titles (questions get a phase picker) */
    phases?: string[]
}

/** The questions of a quiz/exam/homework: add by type or from the bank, reorder, duplicate, save to bank, delete */
export default function QuestionListEditor({ courseId, attemptCount, issues, phases }: QuestionListEditorProps) {
    const {
        control,
        getValues,
        formState: { errors },
    } = useFormContext<ActivityFormData>()
    // keyName: our questions already have an `id` (sent to the server), so field keys live elsewhere
    const { fields, append, insert, remove, swap } = useFieldArray({ control, name: 'questions', keyName: 'fieldKey' })
    const [deleteIndex, setDeleteIndex] = useState<number | null>(null)
    const [bankOpen, setBankOpen] = useState(false)
    const [saving, setSaving] = useState<QuestionInput | null>(null)

    const addFromBank = (questions: QuestionInput[]) => {
        append(questions.map(questionInputToForm))
        toastSuccess(`Added ${questions.length} ${questions.length === 1 ? 'question' : 'questions'} from the bank.`, {
            duration: 3000,
        })
    }

    const addQuestion = (kind: QuestionKind) => {
        // In a boss battle a new question joins the last phase (questions are usually written in order)
        const question = { ...newQuestion(kind), phase: phases?.length || 1 }
        append(question)
        // Bring the new question into view once rendered
        requestAnimationFrame(() =>
            document.getElementById(`question-${question.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }),
        )
    }

    const addMenu = (
        <Dropdown
            placement="bottom-start"
            renderTitle={
                <Button
                    type="button"
                    size="sm"
                    variant="solid"
                    icon={<AddIcon />}
                    disabled={fields.length >= MAX_QUESTIONS}
                >
                    Add question
                </Button>
            }
        >
            {AUTHORABLE_QUESTION_KINDS.map((kind) => (
                <Dropdown.Item key={kind} eventKey={kind} onClick={() => addQuestion(kind)}>
                    {questionKindLabel[kind]}
                </Dropdown.Item>
            ))}
        </Dropdown>
    )

    const bankButton = (
        <Button
            type="button"
            size="sm"
            icon={<BankIcon />}
            disabled={fields.length >= MAX_QUESTIONS}
            onClick={() => setBankOpen(true)}
        >
            Add from bank
        </Button>
    )

    const addActions = (
        <div className="flex flex-wrap items-center gap-2">
            {bankButton}
            {addMenu}
        </div>
    )

    return (
        <section id="questions-section" tabIndex={-1} className="outline-none" aria-label="Questions">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-lg">
                    Questions <span className="text-sm font-normal text-gray-500">({fields.length})</span>
                </h2>
                {fields.length > 0 && addActions}
            </div>

            {fields.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-gray-300 dark:border-gray-600">
                    <EmptyState
                        icon={navigationIcon.quiz}
                        title="No questions yet"
                        description="Choice and short-answer questions are graded automatically on the server. Essay and file-upload questions are marked by you."
                        action={addActions}
                    />
                </div>
            ) : (
                <ol className="space-y-4">
                    {fields.map((field, index) => (
                        <li key={field.fieldKey}>
                            <Controller
                                name={`questions.${index}`}
                                control={control}
                                render={({ field: { value, onChange } }) => (
                                    <QuestionEditor
                                        value={value}
                                        onChange={onChange}
                                        index={index}
                                        total={fields.length}
                                        errors={errors.questions?.[index]}
                                        issues={issues.filter((issue) => issue.target === value.id)}
                                        onMoveUp={() => swap(index, index - 1)}
                                        onMoveDown={() => swap(index, index + 1)}
                                        onDuplicate={() => insert(index + 1, duplicateQuestion(value))}
                                        onDelete={() => setDeleteIndex(index)}
                                        onSaveToBank={() => setSaving(toQuestionInput(value))}
                                        phases={phases}
                                    />
                                )}
                            />
                        </li>
                    ))}
                </ol>
            )}

            <AddFromBankDialog
                courseId={courseId}
                isOpen={bankOpen}
                onClose={() => setBankOpen(false)}
                onAdd={addFromBank}
                remaining={MAX_QUESTIONS - fields.length}
            />
            <SaveToBankDialog
                courseId={courseId}
                question={saving}
                defaultObjectives={
                    saving
                        ? getValues('objectives')
                              .map((o) => o.text.trim())
                              .filter(Boolean)
                        : []
                }
                defaultDifficulty={getValues('difficulty')}
                onClose={() => setSaving(null)}
            />

            <ConfirmDialog
                isOpen={deleteIndex !== null}
                onClose={() => setDeleteIndex(null)}
                type="warning"
                title={`Delete question ${deleteIndex !== null ? deleteIndex + 1 : ''}?`}
                confirmText="Delete"
                onConfirm={() => {
                    if (deleteIndex !== null) remove(deleteIndex)
                    setDeleteIndex(null)
                }}
            >
                {attemptCount > 0
                    ? `Students have already submitted ${attemptCount} ${attemptCount === 1 ? 'attempt' : 'attempts'}. If any of them answered this question, saving will be refused to protect their results — edit the question instead.`
                    : 'It’s removed when you save.'}
            </ConfirmDialog>
        </section>
    )
}
