'use client'

import { Controller, FormProvider, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import Input from '@/components/ui/Input'
import { Form, FormItem } from '@/components/ui/Form'
import { toastError, toastSuccess } from '@/components/ui/toast/toast'
import { apiCreateModule, apiUpdateModule } from '@/services/courses'
import { getCourseState } from '@/stores/GameStores'
import { ModuleFormSchema, type ModuleFormData } from '@/@types/courses/forms/CourseFormData'
import type { CourseModule } from '@/@types/courses/Course'

const FORM_ID = 'module-form'

interface ModuleDialogProps {
    courseId: string
    /** Edit this module; omit to create one */
    module?: CourseModule | null
    isOpen: boolean
    onClose: () => void
}

/** Create or rename a module (a chapter that groups activities) */
export default function ModuleDialog({ courseId, module, isOpen, onClose }: ModuleDialogProps) {
    const form = useForm<ModuleFormData>({
        resolver: zodResolver(ModuleFormSchema),
        values: { title: module?.title ?? '', description: module?.description ?? '' },
    })
    const {
        control,
        formState: { errors, isSubmitting },
    } = form

    const onValid = async (input: ModuleFormData) => {
        try {
            if (module) await apiUpdateModule(module.id, input)
            else await apiCreateModule(courseId, input)
            await getCourseState(courseId).refresh()
            toastSuccess(module ? 'Module renamed.' : 'Module added.')
            form.reset()
            onClose()
        } catch (error) {
            toastError('Couldn’t save the module.', error)
        }
    }

    return (
        <ConfirmDialog
            isOpen={isOpen}
            onClose={onClose}
            title={module ? 'Edit module' : 'New module'}
            confirmText={module ? 'Save' : 'Add module'}
            confirmForm={FORM_ID}
            loading={isSubmitting}
        >
            <FormProvider {...form}>
                <Form id={FORM_ID} onSubmit={form.handleSubmit(onValid)} noValidate>
                    <FormItem
                        label="Title"
                        htmlFor="module-title"
                        asterisk
                        invalid={!!errors.title}
                        errorMessage={errors.title?.message}
                    >
                        <Controller
                            name="title"
                            control={control}
                            render={({ field }) => (
                                <Input id="module-title" placeholder="e.g. Chapter 1 · Fractions" {...field} />
                            )}
                        />
                    </FormItem>
                    <FormItem label="Description" htmlFor="module-description">
                        <Controller
                            name="description"
                            control={control}
                            render={({ field }) => <Input id="module-description" textArea rows={2} {...field} />}
                        />
                    </FormItem>
                </Form>
            </FormProvider>
        </ConfirmDialog>
    )
}
