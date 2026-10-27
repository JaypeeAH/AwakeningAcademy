'use client'

import { Controller, useFormContext, type FieldPath } from 'react-hook-form'
import Input from '@/components/ui/Input'
import classNames from '@/utils/classNames'
import type { ProgressionFormData } from '@/@types/progression/forms/ProgressionFormData'

interface NumberFieldProps {
    name: FieldPath<ProgressionFormData>
    id: string
    /** Accessible name (tables have no visible label per cell) */
    label: string
    min?: number
    max?: number
    step?: number
    suffix?: string
    className?: string
    /** Show the field's error under the input */
    showError?: boolean
}

/** A numeric input bound to the progression form; empty input becomes "required" rather than 0. */
export default function NumberField({
    name,
    id,
    label,
    min,
    max,
    step = 1,
    suffix,
    className,
    showError = true,
}: NumberFieldProps) {
    const { control } = useFormContext<ProgressionFormData>()
    return (
        <Controller
            name={name}
            control={control}
            render={({ field, fieldState }) => (
                <div className={classNames('min-w-[5.5rem]', className)}>
                    <Input
                        id={id}
                        aria-label={label}
                        type="number"
                        inputMode="numeric"
                        size="sm"
                        min={min}
                        max={max}
                        step={step}
                        suffix={suffix}
                        invalid={!!fieldState.error}
                        aria-invalid={!!fieldState.error}
                        name={field.name}
                        ref={field.ref}
                        onBlur={field.onBlur}
                        value={typeof field.value === 'number' && Number.isFinite(field.value) ? field.value : ''}
                        onChange={(e) => field.onChange(e.target.value === '' ? undefined : Number(e.target.value))}
                    />
                    {showError && fieldState.error && (
                        <p className="mt-1 text-xs text-error">{fieldState.error.message}</p>
                    )}
                </div>
            )}
        />
    )
}
