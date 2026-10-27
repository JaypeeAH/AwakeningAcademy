'use client'

import { useEffect } from 'react'
import { FormProvider, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import { Form } from '@/components/ui/Form'
import { toastError, toastSuccess } from '@/components/ui/toast/toast'
import BankMetaFields from './BankMetaFields'
import { apiUpdateBankQuestion } from '@/services/grading'
import {
    BankMetaFormSchema,
    splitLines,
    splitTags,
    type BankMetaFormData,
} from '@/@types/activities/forms/BankMetaFormData'
import type { BankQuestion } from '@/@types/bank/BankQuestion'

const FORM_ID = 'bank-tags-form'

interface BankQuestionTagsDialogProps {
    question: BankQuestion | null
    onClose: () => void
    onSaved: (question: BankQuestion) => void
}

/** Organise a bank question: tags, difficulty, objectives. (The question itself is edited in an activity.) */
export default function BankQuestionTagsDialog({ question, onClose, onSaved }: BankQuestionTagsDialogProps) {
    const form = useForm<BankMetaFormData>({
        resolver: zodResolver(BankMetaFormSchema),
        defaultValues: { tags: '', objectives: '', difficulty: 1 },
    })
    const { reset } = form

    useEffect(() => {
        if (question) {
            reset({
                tags: question.tags.join(', '),
                objectives: question.objectives.join('\n'),
                difficulty: question.difficulty,
            })
        }
    }, [question, reset])

    const onValid = async (meta: BankMetaFormData) => {
        if (!question) return
        try {
            const saved = await apiUpdateBankQuestion(question.id, {
                tags: splitTags(meta.tags),
                objectives: splitLines(meta.objectives),
                difficulty: meta.difficulty,
            })
            toastSuccess('Question updated.', { duration: 3000 })
            onSaved(saved)
            onClose()
        } catch (error) {
            toastError('Couldn’t update the question.', error)
        }
    }

    return (
        <ConfirmDialog
            isOpen={question !== null}
            onClose={onClose}
            title="Edit tags and difficulty"
            confirmText="Save"
            confirmForm={FORM_ID}
            loading={form.formState.isSubmitting}
        >
            <p className="mb-4 text-sm">
                To change the question itself, add it to an activity, edit it there, then save it to the bank again.
            </p>
            <FormProvider {...form}>
                <Form id={FORM_ID} onSubmit={form.handleSubmit(onValid)} noValidate>
                    <BankMetaFields />
                </Form>
            </FormProvider>
        </ConfirmDialog>
    )
}
