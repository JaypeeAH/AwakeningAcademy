'use client'

import { useState } from 'react'
import { FormProvider, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import Button from '@/components/ui/Button'
import Tag from '@/components/ui/Tag'
import { Form } from '@/components/ui/Form'
import { toastError, toastSuccess } from '@/components/ui/toast/toast'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import LevelFormulaSection from './LevelFormulaSection'
import RankLadderSection from './RankLadderSection'
import XpRulesSection from './XpRulesSection'
import StreaksSection from './StreaksSection'
import { SaveIcon } from '@/configs/icons.config'
import { apiSaveProgressionConfig, type ProgressionConfig } from '@/services/progression'
import { useProgressionConfigStore } from '@/stores/GameStores'
import { configurableXpSources } from '@/@types/progression/XpSourceOptions'
import { ProgressionFormSchema, type ProgressionFormData } from '@/@types/progression/forms/ProgressionFormData'
import useUnsavedChangesGuard from '@/utils/hooks/useUnsavedChangesGuard'

const FORM_ID = 'progression-form'

/** The saved configuration as form values (ranks in ladder order, configurable XP rules only) */
export const toFormValues = (config: ProgressionConfig): ProgressionFormData => ({
    settings: { ...config.settings },
    ranks: [...config.ranks]
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map(
            ({
                id,
                code,
                name,
                description,
                minLevel,
                minAverageScore,
                minPassedAssessments,
                minCompletedLessons,
            }) => ({
                id,
                code,
                name,
                description,
                minLevel,
                minAverageScore,
                minPassedAssessments,
                minCompletedLessons,
            }),
        ),
    xpRules: configurableXpSources
        .map((source) => config.xpRules.find((r) => r.source === source))
        .filter((r) => r !== undefined)
        .map(({ source, defaultXp, minXp, maxXp }) => ({ source, defaultXp, minXp, maxXp })),
})

interface ProgressionFormProps {
    config: ProgressionConfig
}

/**
 * Level formula, rank ladder and XP limits, saved together so they stay consistent. Changing the formula
 * re-derives every student's level from their XP, so that save asks for confirmation first.
 */
export default function ProgressionForm({ config }: ProgressionFormProps) {
    const setData = useProgressionConfigStore((s) => s.setData)
    const [saved, setSaved] = useState(config)
    const [pending, setPending] = useState<ProgressionFormData | null>(null)
    const [saving, setSaving] = useState(false)

    const form = useForm<ProgressionFormData>({
        resolver: zodResolver(ProgressionFormSchema),
        defaultValues: toFormValues(config),
        mode: 'onChange',
    })
    const { isDirty } = form.formState
    const guard = useUnsavedChangesGuard(() => form.formState.isDirty)

    const save = async (values: ProgressionFormData) => {
        setSaving(true)
        try {
            const result = await apiSaveProgressionConfig(values)
            const { recalculated, ...next } = result
            setData(next)
            setSaved(next)
            form.reset(toFormValues(next))
            toastSuccess(
                recalculated > 0
                    ? `Progression rules saved. ${recalculated.toLocaleString()} ${recalculated === 1 ? 'student’s level was' : 'students’ levels were'} recalculated.`
                    : 'Progression rules saved.',
            )
            setPending(null)
        } catch (error) {
            toastError('Couldn’t save the progression rules.', error)
        } finally {
            setSaving(false)
        }
    }

    const onValid = (values: ProgressionFormData) => {
        const { baseXp, xpStep, maxLevel } = saved.settings
        const formulaChanged =
            values.settings.baseXp !== baseXp ||
            values.settings.xpStep !== xpStep ||
            values.settings.maxLevel !== maxLevel
        if (formulaChanged) setPending(values)
        else void save(values)
    }

    return (
        <FormProvider {...form}>
            <Form
                id={FORM_ID}
                onSubmit={form.handleSubmit(onValid, () =>
                    toastError('Some values need fixing — check the highlighted fields.'),
                )}
                noValidate
            >
                <div className="space-y-6">
                    <LevelFormulaSection />
                    <RankLadderSection />
                    <StreaksSection />
                    <XpRulesSection />
                </div>

                <div className="sticky bottom-0 z-10 mt-6 flex flex-col gap-3 rounded-2xl border border-gray-200 bg-white/95 p-4 backdrop-blur sm:flex-row sm:items-center sm:justify-between dark:border-gray-700 dark:bg-gray-800/95">
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                        {isDirty ? (
                            <Tag className="border-transparent bg-warning-subtle text-warning">Unsaved changes</Tag>
                        ) : (
                            'All changes saved. Every save is recorded in the audit log.'
                        )}
                    </div>
                    <div className="flex gap-2">
                        <Button
                            type="button"
                            disabled={!isDirty || saving}
                            onClick={() => form.reset(toFormValues(saved))}
                        >
                            Discard changes
                        </Button>
                        <Button variant="solid" type="submit" icon={<SaveIcon />} loading={saving} disabled={!isDirty}>
                            Save rules
                        </Button>
                    </div>
                </div>
            </Form>

            <ConfirmDialog
                isOpen={!!pending}
                onClose={() => setPending(null)}
                type="warning"
                title="Recalculate every student’s level?"
                confirmText="Save and recalculate"
                onConfirm={() => pending && void save(pending)}
                loading={saving}
            >
                <p>
                    You changed the level formula. Each student’s level will be worked out again from the XP they’ve
                    already earned, so some levels may go up or down.
                </p>
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                    XP totals don’t change, and ranks already earned are kept — no one is demoted.
                </p>
            </ConfirmDialog>
            <ConfirmDialog
                isOpen={!!guard.pendingHref}
                onClose={guard.stay}
                type="warning"
                title="Leave without saving?"
                confirmText="Leave"
                cancelText="Stay"
                onConfirm={guard.leave}
            >
                You have unsaved changes. If you leave now, they’ll be lost.
            </ConfirmDialog>
        </FormProvider>
    )
}
