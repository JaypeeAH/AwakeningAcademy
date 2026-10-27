'use client'

import { Controller, useFormContext, useWatch } from 'react-hook-form'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import Input from '@/components/ui/Input'
import { FormItem } from '@/components/ui/Form'
import navigationIcon, { AddIcon, DeleteIcon } from '@/configs/icons.config'
import { MAX_BOSS_PHASES } from '@/utils/boss'
import type { ActivityFormData } from '@/@types/activities/forms/ActivityFormData'

/** Boss battles: the boss's name and its phases (each question belongs to one phase) */
export default function BossEditor() {
    const {
        control,
        getValues,
        setValue,
        formState: { errors },
    } = useFormContext<ActivityFormData>()
    const phases = useWatch({ control, name: 'boss.phases' }) ?? []

    const setPhases = (next: string[]) => setValue('boss.phases', next, { shouldDirty: true, shouldValidate: true })

    const addPhase = () => setPhases([...phases, `Phase ${phases.length + 1}`])

    /** Its questions move to the last remaining phase; later phases shift down by one */
    const removePhase = (index: number) => {
        const removed = index + 1
        const next = phases.filter((_, i) => i !== index)
        setPhases(next)
        const questions = getValues('questions').map((q) => {
            const phase = q.phase ?? 1
            if (phase === removed) return { ...q, phase: next.length }
            if (phase > removed) return { ...q, phase: phase - 1 }
            return q
        })
        setValue('questions', questions, { shouldDirty: true })
    }

    return (
        <Card
            id="boss-section"
            tabIndex={-1}
            className="outline-none"
            header={{
                content: (
                    <span className="flex items-center gap-2">
                        <span className="text-error" aria-hidden>
                            {navigationIcon.boss}
                        </span>
                        Boss
                    </span>
                ),
            }}
        >
            <FormItem
                label="Boss name"
                htmlFor="boss-name"
                asterisk
                invalid={!!errors.boss?.name}
                errorMessage={errors.boss?.name?.message}
            >
                <Controller
                    name="boss.name"
                    control={control}
                    render={({ field }) => (
                        <Input id="boss-name" placeholder="e.g. The Fraction Hydra" maxLength={60} {...field} />
                    )}
                />
            </FormItem>

            <fieldset>
                <legend className="form-label mb-2">Phases</legend>
                <ol className="space-y-2">
                    {phases.map((title, i) => (
                        <li key={i} className="flex items-center gap-2">
                            <span className="w-6 shrink-0 text-center text-sm font-semibold text-gray-500">
                                {i + 1}
                            </span>
                            <Input
                                aria-label={`Phase ${i + 1} title`}
                                value={title}
                                maxLength={60}
                                invalid={!!errors.boss?.phases?.[i]}
                                onChange={(e) => setPhases(phases.map((p, j) => (j === i ? e.target.value : p)))}
                            />
                            <Button
                                type="button"
                                size="sm"
                                variant="plain"
                                icon={<DeleteIcon />}
                                aria-label={`Remove phase ${i + 1}`}
                                disabled={phases.length <= 1}
                                onClick={() => removePhase(i)}
                            />
                        </li>
                    ))}
                </ol>
                {errors.boss?.phases && <p className="mt-1 text-xs text-error">Every phase needs a title.</p>}
                <Button
                    type="button"
                    size="sm"
                    className="mt-3"
                    icon={<AddIcon />}
                    disabled={phases.length >= MAX_BOSS_PHASES}
                    onClick={addPhase}
                >
                    Add phase
                </Button>
            </fieldset>
            <p className="mt-3 text-xs text-gray-500">
                Put each question in a phase below. Students fight the phases in order, and see the boss’s HP fall after
                they hand in — it’s driven only by their score, so it never gives answers away. Removing a phase moves
                its questions to the last remaining phase.
            </p>
        </Card>
    )
}
