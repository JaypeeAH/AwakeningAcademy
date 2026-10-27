'use client'

import { useState } from 'react'
import Button from '@/components/ui/Button'
import { toastError, toastSuccess } from '@/components/ui/toast/toast'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import EmptyState from '@/components/shared/EmptyState'
import ErrorState from '@/components/shared/ErrorState'
import Loading from '@/components/shared/Loading'
import BankFilters from '@/components/bank/BankFilters'
import BankQuestionList from '@/components/bank/BankQuestionList'
import BankQuestionTagsDialog from '@/components/bank/BankQuestionTagsDialog'
import useCourseBank from '@/components/bank/useCourseBank'
import { BankIcon, DeleteIcon, EditIcon } from '@/configs/icons.config'
import { apiDeleteBankQuestion } from '@/services/grading'
import { tryGetErrorMessage } from '@/utils/errors'
import type { BankQuestion } from '@/@types/bank/BankQuestion'

/** The course's reusable questions: find, preview, organise and remove. */
export default function BankTab({ courseId }: { courseId: string }) {
    const bank = useCourseBank(courseId)
    const [editing, setEditing] = useState<BankQuestion | null>(null)
    const [deleting, setDeleting] = useState<BankQuestion | null>(null)
    const [busy, setBusy] = useState(false)

    const remove = async () => {
        if (!deleting) return
        setBusy(true)
        try {
            await apiDeleteBankQuestion(deleting.id)
            await bank.mutate((list) => list?.filter((q) => q.id !== deleting.id), { revalidate: false })
            toastSuccess('Removed from the question bank.')
            setDeleting(null)
        } catch (error) {
            toastError('Couldn’t remove the question.', error)
        } finally {
            setBusy(false)
        }
    }

    if (!bank.data) {
        return bank.error ? (
            <ErrorState message={tryGetErrorMessage(bank.error)} onRetry={() => void bank.mutate()} />
        ) : (
            <Loading loading message="Opening the question bank…" />
        )
    }

    if (!bank.data.length) {
        return (
            <EmptyState
                icon={<BankIcon />}
                title="No questions in the bank yet"
                description="In the Quest Builder, use “Save to bank” on any question to keep a copy here. Then add it to other quizzes, exams and homework with “Add from bank”."
            />
        )
    }

    return (
        <>
            <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
                {bank.data.length} {bank.data.length === 1 ? 'question' : 'questions'} saved for reuse. Activities get
                their own copy, so changing or removing a bank question never affects work students have done.
            </p>
            <BankFilters value={bank.filter} onChange={bank.setFilter} tags={bank.tags} idPrefix="bank-tab" />
            <div className="mt-4">
                {bank.visible.length ? (
                    <BankQuestionList
                        questions={bank.visible}
                        actions={(q) => (
                            <>
                                <Button
                                    size="xs"
                                    variant="plain"
                                    icon={<EditIcon />}
                                    onClick={() => setEditing(q)}
                                    aria-label="Edit tags and difficulty"
                                />
                                <Button
                                    size="xs"
                                    variant="plain"
                                    icon={<DeleteIcon />}
                                    onClick={() => setDeleting(q)}
                                    aria-label="Remove from bank"
                                />
                            </>
                        )}
                    />
                ) : (
                    <p className="py-8 text-center text-sm text-gray-500">No questions match these filters.</p>
                )}
            </div>

            <BankQuestionTagsDialog
                question={editing}
                onClose={() => setEditing(null)}
                onSaved={(saved) =>
                    void bank.mutate((list) => list?.map((q) => (q.id === saved.id ? saved : q)), { revalidate: false })
                }
            />
            <ConfirmDialog
                isOpen={deleting !== null}
                onClose={() => setDeleting(null)}
                type="danger"
                title="Remove this question from the bank?"
                confirmText="Remove"
                onConfirm={remove}
                loading={busy}
            >
                Activities that already copied it keep their copy, and students’ answers aren’t affected. This can’t be
                undone.
            </ConfirmDialog>
        </>
    )
}
