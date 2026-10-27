'use client'

import { useRouter } from 'next/navigation'
import { Controller, FormProvider, useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import { Form, FormItem } from '@/components/ui/Form'
import { toastError } from '@/components/ui/toast/toast'
import navigationIcon from '@/configs/icons.config'
import { apiCreateActivity } from '@/services/activities'
import { getActivityEditPath } from '@/configs/app.config'
import {
    AUTHORABLE_KINDS,
    activityKindDescription,
    activityKindIcon,
    activityKindLabel,
    type ActivityKind,
} from '@/@types/activities/ActivityKindOptions'
import { NewActivityFormSchema, type NewActivityFormData } from '@/@types/activities/forms/NewActivityFormData'
import type { CourseModule } from '@/@types/courses/Course'
import classNames from '@/utils/classNames'

const FORM_ID = 'new-activity-form'

interface NewActivityDialogProps {
    courseId: string
    modules: CourseModule[]
    /** Pre-select a module (when adding from a module's section) */
    moduleId?: string | null
    isOpen: boolean
    onClose: () => void
}

/** Pick a kind and title, then open the Quest Builder for the new (draft) activity */
export default function NewActivityDialog({
    courseId,
    modules,
    moduleId = null,
    isOpen,
    onClose,
}: NewActivityDialogProps) {
    const router = useRouter()
    const form = useForm<NewActivityFormData>({
        resolver: zodResolver(NewActivityFormSchema),
        values: { kind: 'lesson', title: '', moduleId },
    })
    const {
        control,
        formState: { errors, isSubmitting },
    } = form
    const kind = useWatch({ control, name: 'kind' }) as ActivityKind
    const moduleOptions = [{ value: '', label: 'No module' }, ...modules.map((m) => ({ value: m.id, label: m.title }))]

    const onValid = async (input: NewActivityFormData) => {
        try {
            const activity = await apiCreateActivity(courseId, {
                kind: input.kind,
                title: input.title,
                moduleId: input.moduleId || null,
            })
            onClose()
            router.push(getActivityEditPath(courseId, activity.id))
        } catch (error) {
            toastError('Couldn’t create the activity.', error)
        }
    }

    return (
        <ConfirmDialog
            isOpen={isOpen}
            onClose={onClose}
            title="New activity"
            confirmText="Create & open builder"
            confirmForm={FORM_ID}
            loading={isSubmitting}
            width={620}
        >
            <FormProvider {...form}>
                <Form id={FORM_ID} onSubmit={form.handleSubmit(onValid)} noValidate>
                    <FormItem label="Kind">
                        <Controller
                            name="kind"
                            control={control}
                            render={({ field }) => (
                                <div className="grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label="Activity kind">
                                    {AUTHORABLE_KINDS.map((k) => (
                                        <button
                                            key={k}
                                            type="button"
                                            role="radio"
                                            aria-checked={field.value === k}
                                            onClick={() => field.onChange(k)}
                                            className={classNames(
                                                'flex items-start gap-3 rounded-xl border p-3 text-left transition-colors',
                                                field.value === k
                                                    ? 'border-primary bg-primary-subtle'
                                                    : 'border-gray-200 hover:border-primary dark:border-gray-700',
                                            )}
                                        >
                                            <span className="mt-0.5 text-xl text-primary">
                                                {navigationIcon[activityKindIcon[k]]}
                                            </span>
                                            <span>
                                                <span className="block font-semibold text-gray-900 dark:text-gray-100">
                                                    {activityKindLabel[k]}
                                                </span>
                                                <span className="block text-xs text-gray-500 dark:text-gray-400">
                                                    {activityKindDescription[k]}
                                                </span>
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            )}
                        />
                    </FormItem>
                    <FormItem
                        label="Title"
                        htmlFor="activity-title"
                        asterisk
                        invalid={!!errors.title}
                        errorMessage={errors.title?.message}
                    >
                        <Controller
                            name="title"
                            control={control}
                            render={({ field }) => (
                                <Input
                                    id="activity-title"
                                    placeholder={`e.g. ${kind === 'lesson' ? 'Introducing fractions' : 'Fractions check-in'}`}
                                    {...field}
                                />
                            )}
                        />
                    </FormItem>
                    <FormItem label="Module" htmlFor="activity-module">
                        <Controller
                            name="moduleId"
                            control={control}
                            render={({ field }) => (
                                <Select
                                    inputId="activity-module"
                                    options={moduleOptions}
                                    value={
                                        moduleOptions.find((o) => o.value === (field.value ?? '')) ?? moduleOptions[0]
                                    }
                                    onChange={(option) => field.onChange(option?.value || null)}
                                />
                            )}
                        />
                    </FormItem>
                </Form>
            </FormProvider>
        </ConfirmDialog>
    )
}
