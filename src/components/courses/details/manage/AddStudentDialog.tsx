'use client'

import { Controller, FormProvider, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import Input from '@/components/ui/Input'
import { Form, FormItem } from '@/components/ui/Form'
import { toastSuccess } from '@/components/ui/toast/toast'
import { apiAddStudent } from '@/services/courses'
import { getCourseState, useRosterStore } from '@/stores/GameStores'
import { AddStudentFormSchema, type AddStudentFormData } from '@/@types/courses/forms/CourseFormData'
import { tryGetErrorMessage } from '@/utils/errors'

const FORM_ID = 'add-student-form'

interface AddStudentDialogProps {
    courseId: string
    isOpen: boolean
    onClose: () => void
}

/** Enrol an existing student account by its sign-in email or username */
export default function AddStudentDialog({ courseId, isOpen, onClose }: AddStudentDialogProps) {
    const setRoster = useRosterStore(courseId, (s) => s.setData)
    const form = useForm<AddStudentFormData>({
        resolver: zodResolver(AddStudentFormSchema),
        defaultValues: { login: '' },
    })
    const {
        control,
        setError,
        formState: { errors, isSubmitting },
    } = form

    const close = () => {
        form.reset()
        onClose()
    }

    const onValid = async ({ login }: AddStudentFormData) => {
        try {
            setRoster(await apiAddStudent(courseId, { login }))
            void getCourseState(courseId).refresh()
            toastSuccess(`${login} added to the course.`)
            close()
        } catch (error) {
            // The server explains what to do (e.g. ask them to sign up, or share the join code)
            setError('login', { message: tryGetErrorMessage(error) })
        }
    }

    return (
        <ConfirmDialog
            isOpen={isOpen}
            onClose={close}
            title="Add a student"
            confirmText="Add student"
            confirmForm={FORM_ID}
            loading={isSubmitting}
        >
            <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
                The student needs an account first. Alternatively, share the course join code and they can join
                themselves.
            </p>
            <FormProvider {...form}>
                <Form id={FORM_ID} onSubmit={form.handleSubmit(onValid)} noValidate>
                    <FormItem
                        label="Student’s email or username"
                        htmlFor="student-login"
                        asterisk
                        invalid={!!errors.login}
                        errorMessage={errors.login?.message}
                    >
                        <Controller
                            name="login"
                            control={control}
                            render={({ field }) => (
                                <Input
                                    id="student-login"
                                    autoComplete="off"
                                    autoCapitalize="none"
                                    spellCheck={false}
                                    invalid={!!errors.login}
                                    {...field}
                                />
                            )}
                        />
                    </FormItem>
                </Form>
            </FormProvider>
        </ConfirmDialog>
    )
}
