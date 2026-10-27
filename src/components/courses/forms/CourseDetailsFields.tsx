'use client'

import { useMemo } from 'react'
import { Controller, useFormContext } from 'react-hook-form'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import { FormItem } from '@/components/ui/Form'
import { useSWRSubjects } from '@/services/misc'
import { SWR_ONCE_ONLY } from '@/configs/swr.config'
import type { CourseFormData } from '@/@types/courses/forms/CourseFormData'

interface SubjectOption {
    value: string
    label: string
}

/** Title, subject and description — shared by the create and edit course dialogs */
export default function CourseDetailsFields() {
    const {
        control,
        formState: { errors },
    } = useFormContext<CourseFormData>()
    const { data: subjects, isLoading, error } = useSWRSubjects(SWR_ONCE_ONLY)
    const options = useMemo<SubjectOption[]>(
        () => (subjects ?? []).map((s) => ({ value: s.id, label: s.name })),
        [subjects],
    )

    return (
        <>
            <FormItem
                label="Course title"
                htmlFor="course-title"
                asterisk
                invalid={!!errors.title}
                errorMessage={errors.title?.message}
            >
                <Controller
                    name="title"
                    control={control}
                    render={({ field }) => (
                        <Input
                            id="course-title"
                            placeholder="e.g. Year 8 Algebra"
                            invalid={!!errors.title}
                            {...field}
                        />
                    )}
                />
            </FormItem>
            <FormItem
                label="Subject"
                htmlFor="course-subject"
                asterisk
                invalid={!!errors.subjectId}
                errorMessage={errors.subjectId?.message}
                extra={
                    <span className="ml-2 text-xs font-normal text-gray-500">
                        XP earned here grows students’ path (class) in this subject
                    </span>
                }
            >
                <Controller
                    name="subjectId"
                    control={control}
                    render={({ field }) => (
                        <Select<SubjectOption>
                            inputId="course-subject"
                            options={options}
                            isLoading={isLoading}
                            value={options.find((o) => o.value === field.value) ?? null}
                            onChange={(option) => field.onChange(option?.value ?? '')}
                            onBlur={field.onBlur}
                            invalid={!!errors.subjectId}
                            placeholder={
                                error ? 'Subjects couldn’t be loaded — refresh to try again' : 'Choose a subject…'
                            }
                        />
                    )}
                />
            </FormItem>
            <FormItem
                label="Description"
                htmlFor="course-description"
                invalid={!!errors.description}
                errorMessage={errors.description?.message}
            >
                <Controller
                    name="description"
                    control={control}
                    render={({ field }) => (
                        <Input
                            id="course-description"
                            textArea
                            rows={3}
                            placeholder="What students will learn (optional)"
                            {...field}
                        />
                    )}
                />
            </FormItem>
        </>
    )
}
