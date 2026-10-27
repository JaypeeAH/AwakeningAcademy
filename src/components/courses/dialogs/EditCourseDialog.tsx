'use client'

import { FormProvider, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import { Form } from '@/components/ui/Form'
import { toastError, toastSuccess } from '@/components/ui/toast/toast'
import CourseDetailsFields from '@/components/courses/forms/CourseDetailsFields'
import { apiUpdateCourse } from '@/services/courses'
import { useCourseStore } from '@/stores/GameStores'
import { CourseFormSchema, type CourseFormData } from '@/@types/courses/forms/CourseFormData'
import type { Course } from '@/@types/courses/Course'

const FORM_ID = 'edit-course-form'

interface EditCourseDialogProps {
    course: Course
    isOpen: boolean
    onClose: () => void
}

export default function EditCourseDialog({ course, isOpen, onClose }: EditCourseDialogProps) {
    const setData = useCourseStore(course.id, (s) => s.setData)
    const form = useForm<CourseFormData>({
        resolver: zodResolver(CourseFormSchema),
        values: { title: course.title, description: course.description, subjectId: course.subject.id },
    })
    const {
        formState: { isSubmitting },
    } = form

    const onValid = async (input: CourseFormData) => {
        try {
            setData(await apiUpdateCourse(course.id, input))
            toastSuccess('Course details saved.')
            onClose()
        } catch (error) {
            toastError('Couldn’t save the course.', error)
        }
    }

    return (
        <ConfirmDialog
            isOpen={isOpen}
            onClose={onClose}
            title="Edit course"
            confirmText="Save"
            confirmForm={FORM_ID}
            loading={isSubmitting}
            width={560}
        >
            <FormProvider {...form}>
                <Form id={FORM_ID} onSubmit={form.handleSubmit(onValid)} noValidate>
                    <CourseDetailsFields />
                </Form>
            </FormProvider>
        </ConfirmDialog>
    )
}
