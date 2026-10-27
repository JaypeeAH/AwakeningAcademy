'use client'

import { useMemo } from 'react'
import useSWR from 'swr'
import { Controller, useFieldArray, useFormContext } from 'react-hook-form'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import { FormItem } from '@/components/ui/Form'
import NumberInput from '@/components/activities/editor/NumberInput'
import { AddIcon, DeleteIcon } from '@/configs/icons.config'
import { useSWRCourses } from '@/services/courses'
import { apiGetCourseActivities } from '@/services/activities'
import { activityKindLabel } from '@/@types/activities/ActivityKindOptions'
import type { ActivitySummary } from '@/@types/activities/Activity'
import type { ItemDefinition } from '@/@types/game/Inventory'
import type { SecretFormData } from './secretForm'

interface Option {
    value: string
    label: string
}

const activityOption = (a: ActivitySummary): Option => ({
    value: a.id,
    label: `${a.title} (${activityKindLabel[a.kind]})`,
})

interface EggTriggerFieldsProps {
    courseId: string
    /** Every activity in this course (any status) */
    activities: ActivitySummary[]
    items: ItemDefinition[]
}

/** The settings the chosen trigger needs: which lesson, which activities in order, what score, … */
export default function EggTriggerFields({ courseId, activities, items }: EggTriggerFieldsProps) {
    const {
        control,
        watch,
        formState: { errors },
    } = useFormContext<SecretFormData>()
    const trigger = watch('trigger')
    const hasPhrase = watch('hasPhrase')
    const activityId = watch('activityId')

    const lessonOptions = activities.filter((a) => a.kind === 'lesson').map(activityOption)
    const allOptions = activities.map(activityOption)
    const gradedOptions = activities.filter((a) => a.kind !== 'lesson').map(activityOption)

    const singleActivity = (options: Option[], label: string, help: string, clearable = false) => (
        <FormItem
            label={label}
            htmlFor="egg-activity"
            asterisk={!clearable}
            invalid={!!errors.activityId}
            errorMessage={errors.activityId?.message}
        >
            <Controller
                name="activityId"
                control={control}
                render={({ field }) => (
                    <Select<Option>
                        inputId="egg-activity"
                        options={options}
                        value={options.find((o) => o.value === field.value) ?? null}
                        onChange={(option) => field.onChange(option?.value ?? null)}
                        isClearable={clearable}
                        placeholder={clearable ? 'Any graded activity' : 'Choose…'}
                        noOptionsMessage={() => 'Nothing to choose yet — add one in the Content tab'}
                    />
                )}
            />
            <p className="mt-1 text-xs text-gray-500">{help}</p>
        </FormItem>
    )

    switch (trigger) {
        case 'hidden_object':
            return singleActivity(
                lessonOptions,
                'Lesson',
                'After saving you’ll get a small marker to paste into this lesson. Students find the secret by clicking it.',
            )
        case 'lesson_section':
            return singleActivity(
                lessonOptions,
                'Lesson',
                'After saving you’ll get an invisible marker. Paste it where students should have read up to.',
            )
        case 'secret_phrase':
            return (
                <FormItem
                    label="Secret phrase"
                    htmlFor="egg-phrase"
                    asterisk={!hasPhrase}
                    invalid={!!errors.phrase}
                    errorMessage={errors.phrase?.message}
                >
                    <Controller
                        name="phrase"
                        control={control}
                        render={({ field }) => (
                            <Input
                                id="egg-phrase"
                                autoComplete="off"
                                placeholder={
                                    hasPhrase
                                        ? 'Leave blank to keep the current phrase'
                                        : 'e.g. the owl flies at midnight'
                                }
                                {...field}
                            />
                        )}
                    />
                    <p className="mt-1 text-xs text-gray-500">
                        Case, spacing and punctuation don’t matter. Only a fingerprint is stored, so write it down — it
                        can’t be shown again.
                    </p>
                </FormItem>
            )
        case 'activity_sequence':
            return (
                <FormItem
                    label="Activities, in order"
                    htmlFor="egg-sequence"
                    asterisk
                    invalid={!!errors.activityIds}
                    errorMessage={errors.activityIds?.message}
                >
                    <Controller
                        name="activityIds"
                        control={control}
                        render={({ field }) => (
                            <Select<Option, true>
                                inputId="egg-sequence"
                                isMulti
                                options={allOptions}
                                // Keep the chosen order (it's the order students must complete them in)
                                value={field.value.flatMap((id) => allOptions.filter((o) => o.value === id))}
                                onChange={(options) => field.onChange(options.map((o) => o.value))}
                                placeholder="Choose 2–10 activities"
                            />
                        )}
                    />
                    <p className="mt-1 text-xs text-gray-500">
                        Pick them in the order students must complete them. Quizzes and exams count once passed.
                    </p>
                </FormItem>
            )
        case 'cross_course':
            return <CrossCourseField courseId={courseId} />
        case 'score_milestone':
            return (
                <>
                    {singleActivity(
                        gradedOptions,
                        'Activity',
                        'Leave empty to count any graded activity in the course.',
                        true,
                    )}
                    <div className="grid gap-x-3 sm:grid-cols-2">
                        <FormItem
                            label="Minimum score (%)"
                            htmlFor="egg-min-percent"
                            invalid={!!errors.minPercent}
                            errorMessage={errors.minPercent?.message}
                        >
                            <Controller
                                name="minPercent"
                                control={control}
                                render={({ field }) => (
                                    <NumberInput
                                        id="egg-min-percent"
                                        min={1}
                                        max={100}
                                        value={field.value}
                                        onChange={(v) => field.onChange(v ?? 0)}
                                    />
                                )}
                            />
                        </FormItem>
                        {!activityId && (
                            <FormItem
                                label="How many activities"
                                htmlFor="egg-count"
                                invalid={!!errors.count}
                                errorMessage={errors.count?.message}
                            >
                                <Controller
                                    name="count"
                                    control={control}
                                    render={({ field }) => (
                                        <NumberInput
                                            id="egg-count"
                                            min={1}
                                            max={50}
                                            value={field.value}
                                            onChange={(v) => field.onChange(v ?? 0)}
                                        />
                                    )}
                                />
                            </FormItem>
                        )}
                    </div>
                </>
            )
        case 'streak_milestone':
            return (
                <FormItem
                    label="Days in a row"
                    htmlFor="egg-days"
                    invalid={!!errors.days}
                    errorMessage={errors.days?.message}
                >
                    <Controller
                        name="days"
                        control={control}
                        render={({ field }) => (
                            <NumberInput
                                id="egg-days"
                                min={2}
                                max={365}
                                value={field.value}
                                onChange={(v) => field.onChange(v ?? 0)}
                            />
                        )}
                    />
                    <p className="mt-1 text-xs text-gray-500">
                        A day counts when the student earns XP or hands in work, in any course.
                    </p>
                </FormItem>
            )
        case 'item_combination':
            return <ItemSetField items={items} />
        case 'class_goal':
            return (
                <>
                    {singleActivity(allOptions, 'Activity', 'Everyone who completed it shares the discovery.')}
                    <FormItem
                        label="Students needed"
                        htmlFor="egg-students"
                        invalid={!!errors.students}
                        errorMessage={errors.students?.message}
                    >
                        <Controller
                            name="students"
                            control={control}
                            render={({ field }) => (
                                <NumberInput
                                    id="egg-students"
                                    min={2}
                                    max={500}
                                    value={field.value}
                                    onChange={(v) => field.onChange(v ?? 0)}
                                />
                            )}
                        />
                    </FormItem>
                </>
            )
    }
}

/** Activities across every course this teacher teaches, grouped by course */
function CrossCourseField({ courseId }: { courseId: string }) {
    const {
        control,
        formState: { errors },
    } = useFormContext<SecretFormData>()
    const courses = useSWRCourses()
    const managed = useMemo(() => (courses.data ?? []).filter((c) => c.canManage), [courses.data])
    const ids = managed.map((c) => c.id)
    const activities = useSWR(ids.length ? ['secret-cross-course', ...ids] : null, () =>
        Promise.all(ids.map((id) => apiGetCourseActivities(id))),
    )
    const groups = useMemo(
        () =>
            managed
                .map((course, i) => ({
                    label: course.id === courseId ? `${course.title} (this course)` : course.title,
                    options: (activities.data?.[i]?.activities ?? []).map(activityOption),
                }))
                .filter((g) => g.options.length),
        [managed, activities.data, courseId],
    )
    const flat = groups.flatMap((g) => g.options)

    return (
        <FormItem
            label="Activities across your courses"
            htmlFor="egg-cross-course"
            asterisk
            invalid={!!errors.activityIds}
            errorMessage={errors.activityIds?.message}
        >
            <Controller
                name="activityIds"
                control={control}
                render={({ field }) => (
                    <Select<Option, true>
                        inputId="egg-cross-course"
                        isMulti
                        isLoading={!activities.data && !activities.error}
                        options={groups}
                        value={field.value.flatMap((id) => flat.filter((o) => o.value === id))}
                        onChange={(options) => field.onChange(options.map((o) => o.value))}
                        placeholder="Choose 2–10 activities"
                    />
                )}
            />
            <p className="mt-1 text-xs text-gray-500">
                Include at least one activity from this course and one from another course you teach. Students must be
                enrolled in both to find it.
            </p>
        </FormItem>
    )
}

/** Items the student must hold at the same time (they keep them) */
function ItemSetField({ items }: { items: ItemDefinition[] }) {
    const {
        control,
        formState: { errors },
    } = useFormContext<SecretFormData>()
    const { fields, append, remove } = useFieldArray({ control, name: 'items' })
    const options = items.map((i) => ({ value: i.id, label: i.name }))

    return (
        <fieldset className="mb-4">
            <legend className="mb-2 text-sm font-semibold text-gray-900 dark:text-gray-100">Items to collect</legend>
            <div className="space-y-2">
                {fields.map((row, index) => (
                    <div key={row.id} className="flex items-start gap-2">
                        <Controller
                            name={`items.${index}.itemId`}
                            control={control}
                            render={({ field }) => (
                                <Select<Option>
                                    className="min-w-0 flex-1"
                                    aria-label="Item"
                                    options={options}
                                    value={options.find((o) => o.value === field.value) ?? null}
                                    onChange={(option) => field.onChange(option?.value ?? '')}
                                    placeholder="Choose an item"
                                />
                            )}
                        />
                        <Controller
                            name={`items.${index}.count`}
                            control={control}
                            render={({ field }) => (
                                <NumberInput
                                    className="w-24"
                                    aria-label="How many"
                                    min={1}
                                    max={99}
                                    value={field.value}
                                    onChange={(v) => field.onChange(v ?? 1)}
                                />
                            )}
                        />
                        <Button
                            type="button"
                            variant="plain"
                            icon={<DeleteIcon />}
                            aria-label="Remove item"
                            onClick={() => remove(index)}
                        />
                    </div>
                ))}
            </div>
            {errors.items?.message && <p className="mt-1 text-xs text-error">{errors.items.message}</p>}
            <Button
                type="button"
                size="sm"
                className="mt-2"
                icon={<AddIcon />}
                disabled={fields.length >= 6}
                onClick={() => append({ itemId: '', count: 1 })}
            >
                Add item
            </Button>
        </fieldset>
    )
}
