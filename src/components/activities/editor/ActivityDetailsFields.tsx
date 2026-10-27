'use client'

import { Controller, useFormContext } from 'react-hook-form'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import { FormItem } from '@/components/ui/Form'
import type { ActivityFormData } from '@/@types/activities/forms/ActivityFormData'
import type { CourseModule } from '@/@types/courses/Course'

interface ActivityDetailsFieldsProps {
    modules: CourseModule[]
}

/** Title, quest-card summary and module */
export default function ActivityDetailsFields({ modules }: ActivityDetailsFieldsProps) {
    const {
        control,
        formState: { errors },
    } = useFormContext<ActivityFormData>()
    const moduleOptions = [{ value: '', label: 'No module' }, ...modules.map((m) => ({ value: m.id, label: m.title }))]

    return (
        <>
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
                        <Input id="activity-title" maxLength={160} invalid={!!errors.title} {...field} />
                    )}
                />
            </FormItem>
            <FormItem
                label="Summary"
                htmlFor="activity-summary"
                invalid={!!errors.summary}
                errorMessage={errors.summary?.message}
                extra={
                    <span className="ml-2 text-xs font-normal text-gray-500">One or two lines on the quest card</span>
                }
            >
                <Controller
                    name="summary"
                    control={control}
                    render={({ field }) => <Input id="activity-summary" textArea rows={2} maxLength={500} {...field} />}
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
                            value={moduleOptions.find((o) => o.value === field.value) ?? moduleOptions[0]}
                            onChange={(option) => field.onChange(option?.value ?? '')}
                        />
                    )}
                />
            </FormItem>
        </>
    )
}
