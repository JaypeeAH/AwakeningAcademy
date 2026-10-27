'use client'

import { useRouter } from 'next/navigation'
import { FormProvider, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import { Form } from '@/components/ui/Form'
import { toastError, toastSuccess } from '@/components/ui/toast/toast'
import CourseDetailsFields from '@/components/courses/forms/CourseDetailsFields'
import { apiCreateCourse } from '@/services/courses'
import { useCoursesStore } from '@/stores/GameStores'
import { getCoursePath } from '@/configs/app.config'
import { CourseFormSchema, type CourseFormData } from '@/@types/courses/forms/CourseFormData'

const FORM_ID = 'create-course-form'

interface CreateCourseDialogProps {
    isOpen: boolean
    onClose: () => void
}

/** Creates a course (as a draft) and opens it so the teacher can add content */
export default function CreateCourseDialog({ isOpen, onClose }: CreateCourseDialogProps) {
    const router = useRouter()
    const refresh = useCoursesStore((s) => s.refresh)
    const form = useForm<CourseFormData>({
        resolver: zodResolver(CourseFormSchema),
        defaultValues: { title: '', description: '', subjectId: '' },
    })
    const {
        formState: { isSubmitting },
    } = form

    const close = () => {
        form.reset()
        onClose()
    }

    const onValid = async (input: CourseFormData) => {
        try {
            const { course } = await apiCreateCourse(input)
            toastSuccess(`“${course.title}” created. Add a lesson, then publish it and share the join code.`)
            void refresh()
            close()
            router.push(getCoursePath(course.id))
        } catch (error) {
            toastError('Couldn’t create the course.', error)
        }
    }

    return (
        <ConfirmDialog
            isOpen={isOpen}
            onClose={close}
            title="New course"
            confirmText="Create course"
            confirmForm={FORM_ID}
            loading={isSubmitting}
            width={560}
        >
            <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
                Courses start as drafts. Students can join once you publish it.
            </p>
            <FormProvider {...form}>
                <Form id={FORM_ID} onSubmit={form.handleSubmit(onValid)} noValidate>
                    <CourseDetailsFields />
                </Form>
            </FormProvider>
        </ConfirmDialog>
    )
}
