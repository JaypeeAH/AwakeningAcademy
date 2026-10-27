'use client'

import { Controller, useFieldArray, useFormContext } from 'react-hook-form'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import { FormItem } from '@/components/ui/Form'
import { AddIcon, DeleteIcon } from '@/configs/icons.config'
import type { ActivityFormData } from '@/@types/activities/forms/ActivityFormData'

const MAX_OBJECTIVES = 20

/** Learning objectives ("Students can…") — shown to students and used later for objective-level reports */
export default function ObjectivesEditor() {
    const { control } = useFormContext<ActivityFormData>()
    const { fields, append, remove } = useFieldArray({ control, name: 'objectives' })

    return (
        <FormItem
            label="Learning objectives"
            extra={
                <span className="ml-2 text-xs font-normal text-gray-500">
                    What students should be able to do afterwards
                </span>
            }
        >
            <ul className="space-y-2">
                {fields.map((field, index) => (
                    <li key={field.id} className="flex gap-2">
                        <Controller
                            name={`objectives.${index}.text`}
                            control={control}
                            render={({ field: input }) => (
                                <Input
                                    aria-label={`Objective ${index + 1}`}
                                    placeholder="e.g. Add fractions with unlike denominators"
                                    maxLength={300}
                                    {...input}
                                />
                            )}
                        />
                        <Button
                            type="button"
                            variant="plain"
                            icon={<DeleteIcon />}
                            aria-label={`Remove objective ${index + 1}`}
                            onClick={() => remove(index)}
                        />
                    </li>
                ))}
            </ul>
            <Button
                type="button"
                size="sm"
                variant="plain"
                icon={<AddIcon />}
                className="mt-2"
                disabled={fields.length >= MAX_OBJECTIVES}
                onClick={() => append({ text: '' })}
            >
                Add objective
            </Button>
        </FormItem>
    )
}
