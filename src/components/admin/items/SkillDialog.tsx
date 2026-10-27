'use client'

import { Controller, FormProvider, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import Switcher from '@/components/ui/Switcher'
import { Form, FormItem } from '@/components/ui/Form'
import { toastError, toastSuccess } from '@/components/ui/toast/toast'
import NumberInput from '@/components/activities/editor/NumberInput'
import { apiUpdateSkill } from '@/services/game'
import { useSkillDefinitionsStore } from '@/stores/GameStores'
import {
    RARITIES,
    UpdateSkillDefinitionSchema,
    rarityLabel,
    type SkillDefinition,
    type UpdateSkillDefinitionInput,
} from '@/@types/game/Inventory'
import type { Rank } from '@/@types/progression/Progression'

const FORM_ID = 'skill-form'
const RARITY_OPTIONS = RARITIES.map((value) => ({ value, label: rarityLabel[value] }))

/** Numeric settings some skills read, with what they mean */
const CONFIG_FIELDS: Record<string, { key: string; label: string; help: string; min: number; max: number }[]> = {
    time_dilation: [
        { key: 'minutes', label: 'Extra minutes', help: 'Added to a timed attempt (1–30).', min: 1, max: 30 },
    ],
    overdrive: [
        {
            key: 'bonus',
            label: 'Bonus XP',
            help: 'Paid on the first pass, within the skill-bonus XP limits.',
            min: 0,
            max: 1000,
        },
    ],
}

type NumberKey = 'minLevel' | 'minRankOrder' | 'minDiscoveries' | 'charges' | 'rechargeHours'

interface SkillDialogProps {
    skill: SkillDefinition | null
    ranks: Rank[]
    onClose: () => void
}

/** Tune a skill: when it unlocks, how often it recharges, and whether it's available at all */
export default function SkillDialog({ skill, ranks, onClose }: SkillDialogProps) {
    const config = Object.fromEntries(
        Object.entries(skill?.config ?? {}).filter((entry): entry is [string, number] => typeof entry[1] === 'number'),
    )
    const form = useForm<UpdateSkillDefinitionInput>({
        resolver: zodResolver(UpdateSkillDefinitionSchema),
        values: {
            name: skill?.name ?? '',
            description: skill?.description ?? '',
            rarity: skill?.rarity ?? 'common',
            minLevel: skill?.minLevel ?? 1,
            minRankOrder: skill?.minRankOrder ?? 1,
            minDiscoveries: skill?.minDiscoveries ?? 0,
            charges: skill?.charges ?? 1,
            rechargeHours: skill?.rechargeHours ?? 24,
            enabled: skill?.enabled ?? true,
            config,
        },
    })
    const {
        control,
        formState: { errors, isSubmitting },
    } = form
    const rankOptions = ranks.map((r) => ({ value: r.sortOrder, label: `${r.code}-Rank · ${r.name}` }))

    const onValid = async (input: UpdateSkillDefinitionInput) => {
        if (!skill) return
        try {
            await apiUpdateSkill(skill.id, input)
            await useSkillDefinitionsStore.getState().refresh()
            toastSuccess('Skill saved.')
            onClose()
        } catch (error) {
            toastError('Couldn’t save the skill.', error)
        }
    }

    const numberField = (name: NumberKey, label: string, min: number, max: number, help?: string) => (
        <FormItem label={label} htmlFor={`skill-${name}`} invalid={!!errors[name]} errorMessage={errors[name]?.message}>
            <Controller
                name={name}
                control={control}
                render={({ field }) => (
                    <NumberInput
                        id={`skill-${name}`}
                        min={min}
                        max={max}
                        value={field.value}
                        onChange={(v) => field.onChange(v ?? min)}
                    />
                )}
            />
            {help && <p className="mt-1 text-xs text-gray-500">{help}</p>}
        </FormItem>
    )

    return (
        <ConfirmDialog
            isOpen={skill !== null}
            onClose={onClose}
            title={skill ? `Edit ${skill.name}` : 'Edit skill'}
            confirmText="Save"
            confirmForm={FORM_ID}
            loading={isSubmitting}
            width={620}
        >
            <FormProvider {...form}>
                <Form
                    id={FORM_ID}
                    onSubmit={form.handleSubmit(onValid)}
                    noValidate
                    className="max-h-[60vh] overflow-y-auto pr-1"
                >
                    <FormItem
                        label="Name"
                        htmlFor="skill-name"
                        asterisk
                        invalid={!!errors.name}
                        errorMessage={errors.name?.message}
                    >
                        <Controller
                            name="name"
                            control={control}
                            render={({ field }) => <Input id="skill-name" {...field} />}
                        />
                    </FormItem>
                    <FormItem label="Description" htmlFor="skill-description">
                        <Controller
                            name="description"
                            control={control}
                            render={({ field }) => <Input id="skill-description" textArea rows={2} {...field} />}
                        />
                    </FormItem>
                    <FormItem label="Rarity" htmlFor="skill-rarity">
                        <Controller
                            name="rarity"
                            control={control}
                            render={({ field }) => (
                                <Select
                                    inputId="skill-rarity"
                                    options={RARITY_OPTIONS}
                                    value={RARITY_OPTIONS.find((o) => o.value === field.value)}
                                    onChange={(option) => option && field.onChange(option.value)}
                                    isSearchable={false}
                                />
                            )}
                        />
                    </FormItem>

                    <h6 className="mb-2">Unlocks at</h6>
                    <div className="grid gap-x-3 sm:grid-cols-3">
                        {numberField('minLevel', 'Level', 1, 500)}
                        <FormItem label="Rank" htmlFor="skill-rank">
                            <Controller
                                name="minRankOrder"
                                control={control}
                                render={({ field }) => (
                                    <Select
                                        inputId="skill-rank"
                                        options={rankOptions}
                                        value={rankOptions.find((o) => o.value === field.value) ?? null}
                                        onChange={(option) => option && field.onChange(option.value)}
                                        isSearchable={false}
                                    />
                                )}
                            />
                        </FormItem>
                        {numberField('minDiscoveries', 'Secrets found', 0, 1000)}
                    </div>

                    {!skill?.passive && (
                        <>
                            <h6 className="mb-2">Charges</h6>
                            <div className="grid gap-x-3 sm:grid-cols-2">
                                {numberField('charges', 'Uses per window', 1, 20)}
                                {numberField(
                                    'rechargeHours',
                                    'Recharge (hours)',
                                    1,
                                    720,
                                    'Each use comes back this long after it was spent.',
                                )}
                            </div>
                        </>
                    )}

                    {(CONFIG_FIELDS[skill?.code ?? ''] ?? []).map((c) => (
                        <FormItem key={c.key} label={c.label} htmlFor={`skill-config-${c.key}`}>
                            <Controller
                                name={`config.${c.key}`}
                                control={control}
                                render={({ field }) => (
                                    <NumberInput
                                        id={`skill-config-${c.key}`}
                                        min={c.min}
                                        max={c.max}
                                        value={field.value}
                                        onChange={(v) => field.onChange(v ?? c.min)}
                                    />
                                )}
                            />
                            <p className="mt-1 text-xs text-gray-500">{c.help}</p>
                        </FormItem>
                    ))}

                    <Controller
                        name="enabled"
                        control={control}
                        render={({ field }) => (
                            <label className="mb-2 flex items-start gap-3 text-sm">
                                <Switcher checked={field.value} onChange={field.onChange} />
                                <span>
                                    <span className="font-semibold text-gray-900 dark:text-gray-100">Enabled</span>
                                    <span className="block text-xs text-gray-500">
                                        Disabled skills disappear from students’ skill books and can’t be used.
                                    </span>
                                </span>
                            </label>
                        )}
                    />
                </Form>
            </FormProvider>
        </ConfirmDialog>
    )
}
