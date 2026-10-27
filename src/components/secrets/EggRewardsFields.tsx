'use client'

import { Controller, useFieldArray, useFormContext } from 'react-hook-form'
import Button from '@/components/ui/Button'
import Select from '@/components/ui/Select'
import { FormItem } from '@/components/ui/Form'
import NumberInput from '@/components/activities/editor/NumberInput'
import { AddIcon, DeleteIcon } from '@/configs/icons.config'
import type { ItemDefinition } from '@/@types/game/Inventory'
import type { SecretFormData } from './secretForm'

/** XP (paid through the progression engine as a secret quest) and items placed in the inventory */
export default function EggRewardsFields({ items }: { items: ItemDefinition[] }) {
    const {
        control,
        watch,
        setValue,
        formState: { errors },
    } = useFormContext<SecretFormData>()
    const { fields, append, remove } = useFieldArray({ control, name: 'itemRewards' })
    const rewards = watch('itemRewards')
    const options = items.map((i) => ({ value: i.id, label: i.name }))
    const isBunny = (itemId: string) => items.find((i) => i.id === itemId)?.effect === 'bunny_skip'

    return (
        <fieldset className="mb-4">
            <legend className="mb-2 text-sm font-semibold text-gray-900 dark:text-gray-100">Rewards</legend>
            <FormItem label="XP" htmlFor="egg-xp" invalid={!!errors.xp} errorMessage={errors.xp?.message}>
                <Controller
                    name="xp"
                    control={control}
                    render={({ field }) => (
                        <NumberInput
                            id="egg-xp"
                            min={0}
                            placeholder="No XP"
                            value={field.value}
                            onChange={field.onChange}
                        />
                    )}
                />
                <p className="mt-1 text-xs text-gray-500">
                    Paid once per student, within the secret-quest limits your administrator sets.
                </p>
            </FormItem>

            <div className="space-y-2">
                {fields.map((row, index) => {
                    const bunny = isBunny(rewards[index]?.itemId ?? '')
                    return (
                        <div key={row.id}>
                            <div className="flex items-start gap-2">
                                <Controller
                                    name={`itemRewards.${index}.itemId`}
                                    control={control}
                                    render={({ field }) => (
                                        <Select
                                            className="min-w-0 flex-1"
                                            aria-label="Item reward"
                                            options={options}
                                            value={options.find((o) => o.value === field.value) ?? null}
                                            onChange={(option) => {
                                                field.onChange(option?.value ?? '')
                                                // A secret gives one Easter Bunny at most
                                                if (option && isBunny(option.value)) {
                                                    setValue(`itemRewards.${index}.charges`, 1)
                                                }
                                            }}
                                            placeholder="Choose an item"
                                        />
                                    )}
                                />
                                <Controller
                                    name={`itemRewards.${index}.charges`}
                                    control={control}
                                    render={({ field }) => (
                                        <NumberInput
                                            className="w-24"
                                            aria-label="How many"
                                            min={1}
                                            max={bunny ? 1 : 10}
                                            disabled={bunny}
                                            value={field.value}
                                            onChange={(v) => field.onChange(v ?? 1)}
                                        />
                                    )}
                                />
                                <Button
                                    type="button"
                                    variant="plain"
                                    icon={<DeleteIcon />}
                                    aria-label="Remove reward"
                                    onClick={() => remove(index)}
                                />
                            </div>
                            {bunny && (
                                <p className="mt-1 text-xs text-gray-500">
                                    One Easter Bunny lets the student skip one question on a practice activity that
                                    allows it — never on exams or homework.
                                </p>
                            )}
                        </div>
                    )
                })}
            </div>
            <Button
                type="button"
                size="sm"
                className="mt-2"
                icon={<AddIcon />}
                disabled={fields.length >= 4 || !items.length}
                onClick={() => append({ itemId: '', charges: 1 })}
            >
                Add item reward
            </Button>
        </fieldset>
    )
}
