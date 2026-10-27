'use client'

import { Controller, useFormContext } from 'react-hook-form'
import Input from '@/components/ui/Input'
import { FormItem } from '@/components/ui/Form'
import { DifficultyIcon } from '@/configs/icons.config'
import { DIFFICULTY_LABELS } from '@/@types/activities/ActivityKindOptions'
import classNames from '@/utils/classNames'
import type { BankMetaFormData } from '@/@types/activities/forms/BankMetaFormData'

/** Tags, difficulty and objectives for a bank question (shared by Save to bank and Edit) */
export default function BankMetaFields() {
    const {
        control,
        formState: { errors },
    } = useFormContext<BankMetaFormData>()
    return (
        <>
            <FormItem label="Tags" htmlFor="bank-tags" invalid={!!errors.tags} errorMessage={errors.tags?.message}>
                <Controller
                    name="tags"
                    control={control}
                    render={({ field }) => (
                        <Input
                            id="bank-tags"
                            placeholder="fractions, decimals, unit 3"
                            invalid={!!errors.tags}
                            {...field}
                        />
                    )}
                />
                <p className="mt-1 text-xs text-gray-500">
                    Separate tags with commas. Use them to find questions later.
                </p>
            </FormItem>
            <FormItem label="Difficulty">
                <Controller
                    name="difficulty"
                    control={control}
                    render={({ field }) => (
                        <div className="flex flex-wrap items-center gap-1" role="radiogroup" aria-label="Difficulty">
                            {DIFFICULTY_LABELS.map((label, i) => (
                                <button
                                    key={label}
                                    type="button"
                                    role="radio"
                                    aria-checked={field.value === i + 1}
                                    aria-label={`${i + 1} — ${label}`}
                                    title={label}
                                    onClick={() => field.onChange(i + 1)}
                                    className="rounded p-0.5 text-xl"
                                >
                                    <DifficultyIcon
                                        className={classNames(
                                            i < field.value
                                                ? 'fill-current text-gold'
                                                : 'text-gray-300 dark:text-gray-600',
                                        )}
                                    />
                                </button>
                            ))}
                            <span className="ml-2 text-sm text-gray-500">{DIFFICULTY_LABELS[field.value - 1]}</span>
                        </div>
                    )}
                />
            </FormItem>
            <FormItem
                label="Learning objectives"
                htmlFor="bank-objectives"
                invalid={!!errors.objectives}
                errorMessage={errors.objectives?.message}
            >
                <Controller
                    name="objectives"
                    control={control}
                    render={({ field }) => (
                        <Input
                            id="bank-objectives"
                            textArea
                            rows={3}
                            placeholder={'Add fractions with unlike denominators'}
                            invalid={!!errors.objectives}
                            {...field}
                        />
                    )}
                />
                <p className="mt-1 text-xs text-gray-500">One per line. Optional.</p>
            </FormItem>
        </>
    )
}
