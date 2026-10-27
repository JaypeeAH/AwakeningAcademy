'use client'

import { useState } from 'react'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import EmptyState from '@/components/shared/EmptyState'
import ErrorState from '@/components/shared/ErrorState'
import Loading from '@/components/shared/Loading'
import BankFilters from './BankFilters'
import BankQuestionList from './BankQuestionList'
import useCourseBank from './useCourseBank'
import { BankIcon } from '@/configs/icons.config'
import { copyBankQuestion } from '@/utils/questionBank'
import { tryGetErrorMessage } from '@/utils/errors'
import type { QuestionInput } from '@/@types/activities/ActivitySchema'

interface AddFromBankDialogProps {
    courseId: string
    isOpen: boolean
    onClose: () => void
    /** Receives COPIES (fresh ids) of the chosen questions, in bank order */
    onAdd: (questions: QuestionInput[]) => void
    /** Questions left before the activity's limit */
    remaining: number
}

/** Pick questions from the course bank; they're copied into the activity (editing them won't touch the bank). */
export default function AddFromBankDialog({ courseId, isOpen, onClose, onAdd, remaining }: AddFromBankDialogProps) {
    const bank = useCourseBank(isOpen ? courseId : null)
    const [selected, setSelected] = useState<Set<string>>(new Set())

    const toggle = (id: string) =>
        setSelected((prev) => {
            const next = new Set(prev)
            if (next.has(id)) next.delete(id)
            else if (next.size < remaining) next.add(id)
            return next
        })

    const close = () => {
        setSelected(new Set())
        onClose()
    }

    const add = () => {
        const chosen = (bank.data ?? []).filter((q) => selected.has(q.id))
        onAdd(chosen.map((q) => copyBankQuestion(q, () => crypto.randomUUID())))
        close()
    }

    const renderBody = () => {
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
                    compact
                    icon={<BankIcon />}
                    title="The question bank is empty"
                    description="Use “Save to bank” on any question in the Quest Builder to reuse it in other activities."
                />
            )
        }
        return (
            <>
                <BankFilters value={bank.filter} onChange={bank.setFilter} tags={bank.tags} idPrefix="add-from-bank" />
                <div className="mt-4 max-h-[55vh] overflow-y-auto pr-1">
                    {bank.visible.length ? (
                        <BankQuestionList questions={bank.visible} selected={selected} onToggle={toggle} />
                    ) : (
                        <p className="py-8 text-center text-sm text-gray-500">No questions match these filters.</p>
                    )}
                </div>
            </>
        )
    }

    return (
        <ConfirmDialog
            isOpen={isOpen}
            onClose={close}
            title="Add questions from the bank"
            confirmText={
                selected.size
                    ? `Add ${selected.size} ${selected.size === 1 ? 'question' : 'questions'}`
                    : 'Add questions'
            }
            confirmButtonProps={{ disabled: selected.size === 0 }}
            onConfirm={add}
            width={880}
        >
            <p className="mb-4 text-sm">
                Chosen questions are copied into this activity with their answers and explanations. You can edit the
                copies freely — the bank keeps its own version.
            </p>
            {renderBody()}
        </ConfirmDialog>
    )
}
