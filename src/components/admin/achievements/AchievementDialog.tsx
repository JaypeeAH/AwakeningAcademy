'use client'

import { Controller, FormProvider, useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import Switcher from '@/components/ui/Switcher'
import { Form, FormItem } from '@/components/ui/Form'
import { toastError, toastSuccess } from '@/components/ui/toast/toast'
import NumberInput from '@/components/activities/editor/NumberInput'
import { ACHIEVEMENT_ICONS, achievementIcon } from './achievementIcons'
import { apiCreateAchievement, apiUpdateAchievement } from '@/services/social'
import { useAchievementDefinitionsStore } from '@/stores/GameStores'
import { RARITIES, rarityLabel } from '@/@types/game/Inventory'
import {
    SaveAchievementSchema,
    achievementConditionLabel,
    type AchievementCondition,
    type AchievementConditionType,
    type AchievementDefinition,
    type SaveAchievementInput,
} from '@/@types/game/Achievements'

const FORM_ID = 'achievement-form'

const RARITY_OPTIONS = RARITIES.map((value) => ({ value, label: rarityLabel[value] }))
const CONDITION_OPTIONS = (Object.keys(achievementConditionLabel) as AchievementConditionType[]).map((value) => ({
    value,
    label: achievementConditionLabel[value],
}))
const ICON_OPTIONS = ACHIEVEMENT_ICONS.map(({ value, label }) => ({ value, label }))

/** A fresh condition of a type, keeping the threshold where it still fits */
function conditionOf(type: AchievementConditionType, previous: AchievementCondition): AchievementCondition {
    const threshold = previous.type === 'streak' ? previous.days : previous.min
    if (type === 'streak') return { type, days: Math.max(2, threshold) }
    if (type === 'level' || type === 'rank') return { type, min: Math.max(2, threshold) }
    return { type, min: Math.max(1, threshold) } as AchievementCondition
}

const thresholdLabel: Record<AchievementConditionType, string> = {
    lessons_completed: 'Lessons',
    assessments_passed: 'Activities passed',
    perfect_scores: 'Perfect scores',
    bosses_defeated: 'Bosses',
    streak: 'Days in a row',
    team_quests: 'Team quests',
    discoveries: 'Secrets',
    level: 'Level',
    rank: 'Rank number (2 = E-Rank, 3 = D-Rank…)',
    total_xp: 'XP',
    courses_joined: 'Courses',
}

interface AchievementDialogProps {
    /** Edit this achievement; null creates one */
    achievement: AchievementDefinition | null
    isOpen: boolean
    onClose: () => void
}

/** Create or edit an achievement: what earns it (a condition), its look and its XP */
export default function AchievementDialog({ achievement, isOpen, onClose }: AchievementDialogProps) {
    const form = useForm<SaveAchievementInput>({
        resolver: zodResolver(SaveAchievementSchema),
        values: {
            code: achievement?.code ?? '',
            name: achievement?.name ?? '',
            description: achievement?.description ?? '',
            icon: achievement?.icon ?? 'achievement',
            rarity: achievement?.rarity ?? 'common',
            condition: achievement?.condition ?? { type: 'lessons_completed', min: 5 },
            xpReward: achievement?.xpReward ?? 25,
            secret: achievement?.secret ?? false,
            active: achievement?.active ?? true,
            sortOrder: achievement?.sortOrder ?? 100,
        },
    })
    const {
        control,
        formState: { errors, isSubmitting },
    } = form
    const icon = useWatch({ control, name: 'icon' })

    const onValid = async (input: SaveAchievementInput) => {
        try {
            if (achievement) await apiUpdateAchievement(achievement.id, input)
            else await apiCreateAchievement(input)
            await useAchievementDefinitionsStore.getState().refresh()
            toastSuccess(achievement ? 'Achievement saved.' : 'Achievement created.')
            onClose()
        } catch (error) {
            toastError('Couldn’t save the achievement.', error)
        }
    }

    return (
        <ConfirmDialog
            isOpen={isOpen}
            onClose={onClose}
            title={achievement ? `Edit ${achievement.name}` : 'New achievement'}
            confirmText={achievement ? 'Save' : 'Create achievement'}
            confirmForm={FORM_ID}
            loading={isSubmitting}
            width={600}
        >
            <FormProvider {...form}>
                <Form id={FORM_ID} onSubmit={form.handleSubmit(onValid)} noValidate>
                    <div className="grid gap-x-3 sm:grid-cols-2">
                        <FormItem
                            label="Name"
                            htmlFor="achievement-name"
                            asterisk
                            invalid={!!errors.name}
                            errorMessage={errors.name?.message}
                        >
                            <Controller
                                name="name"
                                control={control}
                                render={({ field }) => (
                                    <Input
                                        id="achievement-name"
                                        placeholder="e.g. Bookworm"
                                        maxLength={60}
                                        {...field}
                                    />
                                )}
                            />
                        </FormItem>
                        <FormItem
                            label="Code"
                            htmlFor="achievement-code"
                            asterisk={!achievement}
                            invalid={!!errors.code}
                            errorMessage={errors.code?.message}
                        >
                            <Controller
                                name="code"
                                control={control}
                                render={({ field }) => (
                                    <Input
                                        id="achievement-code"
                                        placeholder="bookworm"
                                        disabled={!!achievement}
                                        {...field}
                                    />
                                )}
                            />
                            <p className="mt-1 text-xs text-gray-500">
                                {achievement
                                    ? 'Codes can’t change once created.'
                                    : 'Lowercase letters, numbers and underscores.'}
                            </p>
                        </FormItem>
                    </div>
                    <FormItem label="Description" htmlFor="achievement-description">
                        <Controller
                            name="description"
                            control={control}
                            render={({ field }) => (
                                <Input
                                    id="achievement-description"
                                    textArea
                                    rows={2}
                                    placeholder="What students did to earn it"
                                    maxLength={300}
                                    {...field}
                                />
                            )}
                        />
                    </FormItem>

                    <Controller
                        name="condition"
                        control={control}
                        render={({ field }) => {
                            const condition = field.value
                            const threshold = condition.type === 'streak' ? condition.days : condition.min
                            const conditionError = errors.condition as
                                { min?: { message?: string }; days?: { message?: string } } | undefined
                            return (
                                <div className="grid gap-x-3 sm:grid-cols-[1fr_11rem]">
                                    <FormItem label="Earned for" htmlFor="achievement-condition">
                                        <Select
                                            inputId="achievement-condition"
                                            options={CONDITION_OPTIONS}
                                            value={CONDITION_OPTIONS.find((o) => o.value === condition.type)}
                                            onChange={(option) =>
                                                option && field.onChange(conditionOf(option.value, condition))
                                            }
                                            isSearchable={false}
                                        />
                                    </FormItem>
                                    <FormItem
                                        label={thresholdLabel[condition.type]}
                                        htmlFor="achievement-threshold"
                                        invalid={!!conditionError}
                                        errorMessage={conditionError?.min?.message ?? conditionError?.days?.message}
                                    >
                                        <NumberInput
                                            id="achievement-threshold"
                                            min={
                                                condition.type === 'streak' ||
                                                condition.type === 'level' ||
                                                condition.type === 'rank'
                                                    ? 2
                                                    : 1
                                            }
                                            value={threshold}
                                            onChange={(v) =>
                                                field.onChange(
                                                    condition.type === 'streak'
                                                        ? { ...condition, days: v ?? 2 }
                                                        : { ...condition, min: v ?? 1 },
                                                )
                                            }
                                        />
                                    </FormItem>
                                </div>
                            )
                        }}
                    />

                    <div className="grid gap-x-3 sm:grid-cols-3">
                        <FormItem label="Icon" htmlFor="achievement-icon">
                            <div className="flex items-center gap-2">
                                <span className="text-2xl text-gold" aria-hidden>
                                    {achievementIcon(icon)}
                                </span>
                                <Controller
                                    name="icon"
                                    control={control}
                                    render={({ field }) => (
                                        <Select
                                            className="flex-1"
                                            inputId="achievement-icon"
                                            options={ICON_OPTIONS}
                                            value={ICON_OPTIONS.find((o) => o.value === field.value) ?? ICON_OPTIONS[0]}
                                            onChange={(option) => option && field.onChange(option.value)}
                                            isSearchable={false}
                                        />
                                    )}
                                />
                            </div>
                        </FormItem>
                        <FormItem label="Rarity" htmlFor="achievement-rarity">
                            <Controller
                                name="rarity"
                                control={control}
                                render={({ field }) => (
                                    <Select
                                        inputId="achievement-rarity"
                                        options={RARITY_OPTIONS}
                                        value={RARITY_OPTIONS.find((o) => o.value === field.value)}
                                        onChange={(option) => option && field.onChange(option.value)}
                                        isSearchable={false}
                                    />
                                )}
                            />
                        </FormItem>
                        <FormItem
                            label="XP reward"
                            htmlFor="achievement-xp"
                            invalid={!!errors.xpReward}
                            errorMessage={errors.xpReward?.message}
                        >
                            <Controller
                                name="xpReward"
                                control={control}
                                render={({ field }) => (
                                    <NumberInput
                                        id="achievement-xp"
                                        min={0}
                                        max={10000}
                                        value={field.value}
                                        onChange={(v) => field.onChange(v ?? 0)}
                                    />
                                )}
                            />
                        </FormItem>
                    </div>
                    <p className="-mt-2 mb-4 text-xs text-gray-500">
                        XP is kept within the Achievement range on the Progression rules page (0 = no XP). Earning it is
                        once per student.
                    </p>

                    <div className="grid gap-3 sm:grid-cols-2">
                        <Controller
                            name="secret"
                            control={control}
                            render={({ field }) => (
                                <label className="flex items-start gap-3 text-sm">
                                    <Switcher checked={field.value} onChange={field.onChange} />
                                    <span>
                                        <span className="font-semibold text-gray-900 dark:text-gray-100">Hidden</span>
                                        <span className="block text-xs text-gray-500">
                                            Shown to students as ??? until they earn it.
                                        </span>
                                    </span>
                                </label>
                            )}
                        />
                        <Controller
                            name="active"
                            control={control}
                            render={({ field }) => (
                                <label className="flex items-start gap-3 text-sm">
                                    <Switcher checked={field.value} onChange={field.onChange} />
                                    <span>
                                        <span className="font-semibold text-gray-900 dark:text-gray-100">Active</span>
                                        <span className="block text-xs text-gray-500">
                                            Off: no one can earn it (already earned ones are kept).
                                        </span>
                                    </span>
                                </label>
                            )}
                        />
                    </div>
                    <FormItem label="Sort order" htmlFor="achievement-sort" className="mt-4">
                        <Controller
                            name="sortOrder"
                            control={control}
                            render={({ field }) => (
                                <NumberInput
                                    id="achievement-sort"
                                    min={0}
                                    max={1000}
                                    value={field.value}
                                    onChange={(v) => field.onChange(v ?? 0)}
                                />
                            )}
                        />
                    </FormItem>
                </Form>
            </FormProvider>
        </ConfirmDialog>
    )
}
