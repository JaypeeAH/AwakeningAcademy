'use client'

import { useRouter } from 'next/navigation'
import { Controller, FormProvider, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import Input from '@/components/ui/Input'
import { Form, FormItem } from '@/components/ui/Form'
import { toastError, toastSuccess } from '@/components/ui/toast/toast'
import { apiJoinCourse } from '@/services/courses'
import { useCoursesStore } from '@/stores/GameStores'
import { getCoursePath } from '@/configs/app.config'
import { JoinCourseSchema, type JoinCourseInput } from '@/@types/courses/CourseSchema'

const FORM_ID = 'join-course-form'

interface JoinCourseDialogProps {
    isOpen: boolean
    onClose: () => void
    /** Pre-filled from a teacher's shared link (`/courses?join=CODE`) */
    initialCode?: string
}

/** Students join a course with the code their teacher shares. */
export default function JoinCourseDialog({ isOpen, onClose, initialCode = '' }: JoinCourseDialogProps) {
    const router = useRouter()
    const refresh = useCoursesStore((s) => s.refresh)
    const form = useForm<JoinCourseInput>({
        resolver: zodResolver(JoinCourseSchema),
        defaultValues: { code: initialCode },
    })
    const {
        control,
        formState: { errors, isSubmitting },
    } = form

    const onValid = async (input: JoinCourseInput) => {
        try {
            const { courseId, title } = await apiJoinCourse(input)
            toastSuccess(`Welcome to ${title}! Its quests are on your Quest Board.`)
            await refresh()
            form.reset()
            onClose()
            router.push(getCoursePath(courseId))
        } catch (error) {
            form.setError('code', { message: error instanceof Error ? error.message : 'Couldn’t join that course.' })
            if (!(error instanceof Error)) toastError('Couldn’t join that course.', error)
        }
    }

    return (
        <ConfirmDialog
            isOpen={isOpen}
            onClose={onClose}
            title="Join a course"
            confirmText="Join"
            confirmForm={FORM_ID}
            loading={isSubmitting}
        >
            <p className="mb-4 text-sm">Enter the join code from your teacher (letters and numbers, like K7PQ2MXA).</p>
            <FormProvider {...form}>
                <Form id={FORM_ID} onSubmit={form.handleSubmit(onValid)} noValidate>
                    <FormItem
                        label="Join code"
                        htmlFor="join-code"
                        invalid={!!errors.code}
                        errorMessage={errors.code?.message}
                    >
                        <Controller
                            name="code"
                            control={control}
                            render={({ field }) => (
                                <Input
                                    id="join-code"
                                    autoComplete="off"
                                    autoCapitalize="characters"
                                    className="font-mono uppercase tracking-[0.3em]"
                                    maxLength={10}
                                    invalid={!!errors.code}
                                    {...field}
                                    onChange={(e) => field.onChange(e.target.value.toUpperCase().replace(/\s/g, ''))}
                                />
                            )}
                        />
                    </FormItem>
                </Form>
            </FormProvider>
        </ConfirmDialog>
    )
}
