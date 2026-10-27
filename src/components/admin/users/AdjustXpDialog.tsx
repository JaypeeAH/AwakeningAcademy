'use client'

import { useState } from 'react'
import { Controller, FormProvider, useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import Input from '@/components/ui/Input'
import { Form, FormItem } from '@/components/ui/Form'
import { toastError, toastSuccess } from '@/components/ui/toast/toast'
import { LevelBadge, RankTag } from '@/components/game/GameTags'
import { apiAdjustXp } from '@/services/progression'
import { useUsersStore } from '@/stores/AdminStores'
import { XpAdjustmentFormSchema, type XpAdjustmentFormData } from '@/@types/progression/forms/XpAdjustmentFormData'
import type { UserAccount } from '@/@types/users/UserAccount'

const FORM_ID = 'adjust-xp-form'

interface AdjustXpDialogProps {
    student: UserAccount
    onClose: () => void
}

/**
 * Corrects a student's XP through the same ledger as every reward. The request id is made once when the
 * dialog opens, so a double click or a retry after a network error applies the adjustment only once.
 * Mount it only while open (a fresh dialog = a fresh adjustment).
 */
export default function AdjustXpDialog({ student, onClose }: AdjustXpDialogProps) {
    const refresh = useUsersStore((s) => s.refresh)
    const [requestId] = useState(() => crypto.randomUUID())
    const form = useForm<XpAdjustmentFormData>({
        resolver: zodResolver(XpAdjustmentFormSchema),
        defaultValues: { amount: undefined, reason: '' },
    })
    const {
        control,
        formState: { errors, isSubmitting },
    } = form
    const amount = useWatch({ control, name: 'amount' })
    const total = student.totalXp ?? 0
    const projected = Number.isFinite(amount) ? total + amount : null

    const onValid = async ({ amount, reason }: XpAdjustmentFormData) => {
        try {
            const result = await apiAdjustXp({ studentId: student.id, amount, reason, requestId })
            if (result.awards.length === 0) {
                toastSuccess('This adjustment had already been applied — nothing changed.')
            } else {
                const promotion = result.promotions[result.promotions.length - 1]
                toastSuccess(
                    <span>
                        {amount > 0 ? '+' : ''}
                        {amount.toLocaleString()} XP for {student.displayName}. Now{' '}
                        {result.after.totalXp.toLocaleString()} XP, level {result.after.level}, {result.after.rankCode}
                        -Rank
                        {promotion ? ` (promoted from ${promotion.fromRank}-Rank)` : ''}.
                    </span>,
                )
            }
            await refresh()
            onClose()
        } catch (error) {
            toastError('Couldn’t adjust XP.', error)
        }
    }

    return (
        <ConfirmDialog
            isOpen
            onClose={onClose}
            type="warning"
            title={`Adjust XP for ${student.displayName}`}
            confirmText="Apply adjustment"
            confirmForm={FORM_ID}
            loading={isSubmitting}
        >
            <p className="mb-4 text-sm">
                Use this to correct mistakes — a reward lost to an outage, or one granted in error. The student sees the
                amount and your reason, and the change is recorded in the audit log. XP can’t go below zero, and ranks
                already earned are never taken away.
            </p>
            <div className="mb-4 flex flex-wrap items-center gap-2 text-sm">
                <span className="text-gray-500">Currently</span>
                {student.level !== null && <LevelBadge level={student.level} />}
                {student.rankCode && <RankTag code={student.rankCode} />}
                <span className="font-semibold tabular-nums">{total.toLocaleString()} XP</span>
            </div>
            <FormProvider {...form}>
                <Form id={FORM_ID} onSubmit={form.handleSubmit(onValid)} noValidate>
                    <FormItem
                        label="Amount"
                        htmlFor="xp-amount"
                        asterisk
                        invalid={!!errors.amount}
                        errorMessage={errors.amount?.message}
                        extra={
                            projected !== null ? (
                                <span className={`text-xs ${projected < 0 ? 'text-error' : 'text-gray-500'}`}>
                                    {projected < 0
                                        ? 'That would go below zero.'
                                        : `New total: ${projected.toLocaleString()} XP`}
                                </span>
                            ) : (
                                <span className="text-xs text-gray-500">Positive adds XP, negative removes it.</span>
                            )
                        }
                    >
                        <Controller
                            name="amount"
                            control={control}
                            render={({ field }) => (
                                <Input
                                    id="xp-amount"
                                    type="number"
                                    inputMode="numeric"
                                    step={1}
                                    min={-5000}
                                    max={5000}
                                    placeholder="e.g. 50 or -20"
                                    invalid={!!errors.amount}
                                    name={field.name}
                                    ref={field.ref}
                                    onBlur={field.onBlur}
                                    value={Number.isFinite(field.value) ? field.value : ''}
                                    onChange={(e) =>
                                        field.onChange(e.target.value === '' ? undefined : Number(e.target.value))
                                    }
                                />
                            )}
                        />
                    </FormItem>
                    <FormItem
                        label="Reason (shown to the student)"
                        htmlFor="xp-reason"
                        asterisk
                        invalid={!!errors.reason}
                        errorMessage={errors.reason?.message}
                    >
                        <Controller
                            name="reason"
                            control={control}
                            render={({ field }) => (
                                <Input
                                    id="xp-reason"
                                    textArea
                                    rows={3}
                                    maxLength={200}
                                    placeholder="e.g. Quiz reward missing after the 12 May outage"
                                    invalid={!!errors.reason}
                                    {...field}
                                />
                            )}
                        />
                    </FormItem>
                </Form>
            </FormProvider>
        </ConfirmDialog>
    )
}
