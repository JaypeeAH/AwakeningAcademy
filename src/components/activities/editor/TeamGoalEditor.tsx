'use client'

import { Controller, useFormContext } from 'react-hook-form'
import Card from '@/components/ui/Card'
import Select from '@/components/ui/Select'
import { FormItem } from '@/components/ui/Form'
import NumberInput from './NumberInput'
import navigationIcon from '@/configs/icons.config'
import { activityKindLabel } from '@/@types/activities/ActivityKindOptions'
import classNames from '@/utils/classNames'
import type { ActivityFormData } from '@/@types/activities/forms/ActivityFormData'
import type { ActivityEditorData } from '@/@types/activities/ActivityEditor'

const MAX_TARGETS = 10

/** Team quests: what the guild must complete, and how many members must finish it */
export default function TeamGoalEditor({ siblings }: { siblings: ActivityEditorData['siblings'] }) {
    const { control } = useFormContext<ActivityFormData>()
    const options = siblings
        .filter((s) => s.kind !== 'team_quest')
        .map((s) => ({ value: s.id, label: `${s.title} (${activityKindLabel[s.kind]})` }))

    return (
        <Card
            id="team-section"
            tabIndex={-1}
            className="outline-none"
            header={{
                content: (
                    <span className="flex items-center gap-2">
                        <span className="text-success" aria-hidden>
                            {navigationIcon.team}
                        </span>
                        Team goal
                    </span>
                ),
            }}
        >
            <FormItem label="Activities the guild must complete" htmlFor="team-targets" asterisk>
                <Controller
                    name="teamConfig.activityIds"
                    control={control}
                    render={({ field }) => (
                        <Select
                            inputId="team-targets"
                            isMulti
                            options={options}
                            value={options.filter((o) => field.value.includes(o.value))}
                            onChange={(selected) => field.onChange(selected.slice(0, MAX_TARGETS).map((o) => o.value))}
                            isOptionDisabled={() => field.value.length >= MAX_TARGETS}
                            placeholder={
                                options.length ? 'Choose 1–10 activities' : 'Add other activities to this course first'
                            }
                            isDisabled={!options.length}
                        />
                    )}
                />
                <p className="mt-1 text-xs text-gray-500">
                    Each counted member must complete every one of these (graded ones must be passed).
                </p>
            </FormItem>

            <Controller
                name="teamConfig.required"
                control={control}
                render={({ field }) => {
                    const everyone = field.value === 'all'
                    const option = (selected: boolean) =>
                        classNames(
                            'flex cursor-pointer items-start gap-3 rounded-xl border px-3 py-2.5 text-sm transition-colors',
                            selected
                                ? 'border-primary bg-primary-subtle'
                                : 'border-gray-200 hover:border-primary dark:border-gray-700',
                        )
                    return (
                        <fieldset>
                            <legend className="form-label mb-2">The quest completes when</legend>
                            <div className="space-y-2">
                                <label className={option(everyone)}>
                                    <input
                                        type="radio"
                                        name="team-required"
                                        className="mt-1 h-4 w-4 shrink-0 accent-[var(--primary)]"
                                        checked={everyone}
                                        onChange={() => field.onChange('all')}
                                    />
                                    <span className="font-semibold text-gray-900 dark:text-gray-100">
                                        Everyone in the guild has finished
                                    </span>
                                </label>
                                <label className={option(!everyone)}>
                                    <input
                                        type="radio"
                                        name="team-required"
                                        className="mt-1 h-4 w-4 shrink-0 accent-[var(--primary)]"
                                        checked={!everyone}
                                        onChange={() => field.onChange(2)}
                                    />
                                    <span className="flex flex-1 flex-wrap items-center gap-2">
                                        <span className="font-semibold text-gray-900 dark:text-gray-100">At least</span>
                                        <span className="w-24">
                                            <NumberInput
                                                aria-label="Members who must finish"
                                                min={1}
                                                max={30}
                                                value={everyone ? null : (field.value as number)}
                                                disabled={everyone}
                                                onChange={(v) => field.onChange(v ?? 1)}
                                            />
                                        </span>
                                        <span className="font-semibold text-gray-900 dark:text-gray-100">
                                            members have finished
                                        </span>
                                    </span>
                                </label>
                            </div>
                        </fieldset>
                    )
                }}
            />
            <p className="mt-3 text-xs text-gray-500">
                When it completes, every active member of the guild earns this quest’s XP — once. Students without a
                guild see that they need to join one.
            </p>
        </Card>
    )
}
