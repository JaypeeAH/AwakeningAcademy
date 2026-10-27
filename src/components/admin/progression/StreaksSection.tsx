'use client'

import { useMemo, useState } from 'react'
import { Controller, useFormContext } from 'react-hook-form'
import Card from '@/components/ui/Card'
import Input from '@/components/ui/Input'
import { FormItem } from '@/components/ui/Form'
import type { ProgressionFormData } from '@/@types/progression/forms/ProgressionFormData'

/** Every IANA time zone this browser knows (for suggestions; the server validates the name) */
function timeZoneNames(): string[] {
    try {
        const intl = Intl as unknown as { supportedValuesOf?: (key: string) => string[] }
        return intl.supportedValuesOf?.('timeZone') ?? []
    } catch {
        return []
    }
}

const formatMilestones = (days: number[] | undefined) => (days ?? []).join(', ')

/** "3, 7, 14" → [3, 7, 14] (blank or invalid entries dropped, sorted, no duplicates) */
const parseMilestones = (text: string) =>
    [
        ...new Set(
            text
                .split(/[\s,;]+/)
                .map((part) => Number(part))
                .filter((n) => Number.isInteger(n) && n >= 2 && n <= 1000),
        ),
    ].sort((a, b) => a - b)

/** The school's time zone (learning days, streaks and weekly leaderboards) and the streak milestones */
export default function StreaksSection() {
    const {
        control,
        formState: { errors },
    } = useFormContext<ProgressionFormData>()
    const zones = useMemo(() => timeZoneNames(), [])

    return (
        <Card header={{ content: <h4>Learning days & streaks</h4> }}>
            <div className="grid gap-x-6 md:grid-cols-2">
                <FormItem
                    label="Time zone"
                    htmlFor="settings-timezone"
                    invalid={!!errors.settings?.timezone}
                    errorMessage={errors.settings?.timezone?.message}
                >
                    <Controller
                        name="settings.timezone"
                        control={control}
                        render={({ field }) => (
                            <Input
                                id="settings-timezone"
                                list="settings-timezone-options"
                                placeholder="e.g. Australia/Sydney"
                                autoComplete="off"
                                invalid={!!errors.settings?.timezone}
                                {...field}
                            />
                        )}
                    />
                    <datalist id="settings-timezone-options">
                        {zones.map((zone) => (
                            <option key={zone} value={zone} />
                        ))}
                    </datalist>
                    <p className="mt-1 text-xs text-gray-500">
                        A learning day runs from local midnight to midnight here. Streaks and the weekly leaderboards
                        (Monday to Sunday) use it too.
                    </p>
                </FormItem>
                <FormItem
                    label="Streak milestones (days)"
                    htmlFor="settings-streaks"
                    invalid={!!errors.settings?.streakMilestones}
                    errorMessage="Use up to 12 whole numbers of days between 2 and 1,000"
                >
                    <Controller
                        name="settings.streakMilestones"
                        control={control}
                        render={({ field }) => <MilestonesInput value={field.value} onChange={field.onChange} />}
                    />
                    <p className="mt-1 text-xs text-gray-500">
                        Separate with commas, e.g. 3, 7, 14, 30. Reaching each one pays the streak XP from the table
                        below — once per student, ever. Leave blank for no streak XP.
                    </p>
                </FormItem>
            </div>
        </Card>
    )
}

/** Free text while typing; parsed into days when the field loses focus */
function MilestonesInput({ value, onChange }: { value: number[]; onChange: (days: number[]) => void }) {
    const [text, setText] = useState(() => formatMilestones(value))
    const [lastValue, setLastValue] = useState(value)
    // The form was reset (e.g. after saving): show the saved value
    if (value !== lastValue && formatMilestones(value) !== formatMilestones(parseMilestones(text))) {
        setLastValue(value)
        setText(formatMilestones(value))
    }
    return (
        <Input
            id="settings-streaks"
            value={text}
            placeholder="3, 7, 14, 30, 60, 100"
            inputMode="numeric"
            onChange={(e) => setText(e.target.value)}
            onBlur={() => {
                const days = parseMilestones(text)
                setText(formatMilestones(days))
                setLastValue(days)
                onChange(days)
            }}
        />
    )
}
