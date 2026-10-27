'use client'

import { useEffect } from 'react'
import { FormProvider, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import { Form } from '@/components/ui/Form'
import { toastError, toastSuccess } from '@/components/ui/toast/toast'
import BankMetaFields from './BankMetaFields'
import { apiSaveToBank } from '@/services/grading'
import { questionKindLabel } from '@/@types/activities/Question'
import {
    BankMetaFormSchema,
    splitLines,
    splitTags,
    type BankMetaFormData,
} from '@/@types/activities/forms/BankMetaFormData'
import type { QuestionInput } from '@/@types/activities/ActivitySchema'

const FORM_ID = 'save-to-bank-form'

interface SaveToBankDialogProps {
    courseId: string
    /** The question to save (null = closed). Already converted with toQuestionInput. */
    question: QuestionInput | null
    /** Pre-filled objectives (e.g. the activity's) */
    defaultObjectives?: string[]
    defaultDifficulty?: number
    onClose: () => void
}

/**
 * Saves a COPY of a question to the course's bank, to reuse in other activities. Later edits to either
 * copy don't affect the other — so graded history never changes.
 */
export default function SaveToBankDialog({
    courseId,
    question,
    defaultObjectives = [],
    defaultDifficulty = 1,
    onClose,
}: SaveToBankDialogProps) {
    const form = useForm<BankMetaFormData>({
        resolver: zodResolver(BankMetaFormSchema),
        defaultValues: { tags: '', objectives: '', difficulty: defaultDifficulty },
    })
    const { reset } = form
    const open = question !== null
    const objectivesText = defaultObjectives.join('\n')

    // Fresh form each time the dialog opens for a question
    useEffect(() => {
        if (open) reset({ tags: '', objectives: objectivesText, difficulty: defaultDifficulty })
    }, [open, question?.id, reset, objectivesText, defaultDifficulty])

    const onValid = async (meta: BankMetaFormData) => {
        if (!question) return
        try {
            // The bank gives the copy its own ids
            const content = {
                kind: question.kind,
                prompt: question.prompt,
                points: question.points,
                options: question.options,
                key: question.key,
            }
            await apiSaveToBank(courseId, {
                question: content,
                tags: splitTags(meta.tags),
                objectives: splitLines(meta.objectives),
                difficulty: meta.difficulty,
            })
            toastSuccess('Saved to the question bank. Add it to any activity in this course with “Add from bank”.')
            onClose()
        } catch (error) {
            toastError('Couldn’t save the question to the bank.', error)
        }
    }

    return (
        <ConfirmDialog
            isOpen={open}
            onClose={onClose}
            title="Save to question bank"
            confirmText="Save to bank"
            confirmForm={FORM_ID}
            loading={form.formState.isSubmitting}
        >
            {question && (
                <p className="mb-4 text-sm">
                    A copy of this {questionKindLabel[question.kind as keyof typeof questionKindLabel].toLowerCase()}{' '}
                    question — with its answers and explanation — will be saved for reuse. Editing it here later won’t
                    change the bank copy.
                </p>
            )}
            <FormProvider {...form}>
                <Form id={FORM_ID} onSubmit={form.handleSubmit(onValid)} noValidate>
                    <BankMetaFields />
                </Form>
            </FormProvider>
        </ConfirmDialog>
    )
}
