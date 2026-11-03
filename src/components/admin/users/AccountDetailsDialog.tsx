'use client'

import { Controller, FormProvider, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { mutate } from 'swr'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import Input from '@/components/ui/Input'
import { Form, FormItem } from '@/components/ui/Form'
import { toastError, toastSuccess } from '@/components/ui/toast/toast'
import PasswordInput from '@/components/auth/PasswordInput'
import SectionInput from './SectionInput'
import { apiUpdateAccountDetails, sectionsUrl } from '@/services/users'
import { useUsersStore } from '@/stores/AdminStores'
import { isPlaceholderEmail, isValidUsername, normalizeUsername } from '@/utils/accounts'
import { getErrorCode } from '@/utils/errors'
import { SectionSchema, type UserAccount } from '@/@types/users/UserAccount'

const FORM_ID = 'account-details-form'

const FormSchema = z.object({
    username: z
        .string()
        .trim()
        .refine((u) => u === '' || isValidUsername(u), 'Use 3–32 letters, digits, dots, dashes or underscores'),
    password: z
        .string()
        .refine((p) => p === '' || (p.length >= 8 && p.length <= 72), 'Use 8–72 characters, or leave it empty'),
    section: SectionSchema,
})
type FormValues = z.input<typeof FormSchema>
type FormData = z.output<typeof FormSchema>

interface AccountDetailsDialogProps {
    user: UserAccount
    onClose: () => void
}

/**
 * Administrators: give an account a username (a second way to sign in), change it, set a new password —
 * the only way back in for username-only accounts, which have no inbox for a reset link — or change the
 * account's section. Mount it only while open.
 */
export default function AccountDetailsDialog({ user, onClose }: AccountDetailsDialogProps) {
    const refresh = useUsersStore((s) => s.refresh)
    const usernameOnly = isPlaceholderEmail(user.email)
    const form = useForm<FormValues, unknown, FormData>({
        resolver: zodResolver(
            FormSchema.refine((f) => !usernameOnly || f.username !== '', {
                message: 'This account has no email, so it needs a username.',
                path: ['username'],
            }),
        ),
        defaultValues: { username: user.username ?? '', password: '', section: user.section ?? '' },
    })
    const {
        control,
        setError,
        formState: { errors, isSubmitting },
    } = form

    const onValid = async ({ username, password, section }: FormData) => {
        const nextUsername = username ? normalizeUsername(username) : null
        const input = {
            ...(nextUsername !== user.username ? { username: nextUsername } : {}),
            ...(password ? { password } : {}),
            ...(section !== user.section ? { section } : {}),
        }
        if (!Object.keys(input).length) return onClose()
        try {
            await apiUpdateAccountDetails(user.id, input)
            toastSuccess(`Saved ${user.displayName}’s account details.`)
            await Promise.all([refresh(), mutate(sectionsUrl)])
            onClose()
        } catch (error) {
            if (getErrorCode(error) === 'USERNAME_TAKEN')
                setError('username', { message: 'That username is already taken.' })
            else toastError('Couldn’t save the account details.', error)
        }
    }

    return (
        <ConfirmDialog
            isOpen
            onClose={onClose}
            type="warning"
            title={`Account details for ${user.displayName}`}
            confirmText="Save"
            confirmForm={FORM_ID}
            loading={isSubmitting}
        >
            <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
                {usernameOnly
                    ? 'This account signs in with a username only. If the student forgets their password, set a new one here and tell them privately.'
                    : `They sign in with ${user.email}. A username is optional — it lets them sign in with it instead.`}{' '}
                Changes are recorded in the audit log.
            </p>
            <FormProvider {...form}>
                <Form id={FORM_ID} onSubmit={form.handleSubmit(onValid)} noValidate>
                    <FormItem
                        label="Username"
                        htmlFor="login-username"
                        asterisk={usernameOnly}
                        invalid={!!errors.username}
                        errorMessage={errors.username?.message}
                    >
                        <Controller
                            name="username"
                            control={control}
                            render={({ field }) => (
                                <Input
                                    id="login-username"
                                    autoComplete="off"
                                    autoCapitalize="none"
                                    spellCheck={false}
                                    placeholder={usernameOnly ? undefined : 'No username'}
                                    invalid={!!errors.username}
                                    {...field}
                                />
                            )}
                        />
                    </FormItem>
                    <FormItem
                        label="New password"
                        htmlFor="login-password"
                        invalid={!!errors.password}
                        errorMessage={errors.password?.message}
                        extra={<span className="text-xs text-gray-500">Leave empty to keep the current one.</span>}
                    >
                        <Controller
                            name="password"
                            control={control}
                            render={({ field }) => (
                                <PasswordInput
                                    id="login-password"
                                    autoComplete="new-password"
                                    invalid={!!errors.password}
                                    {...field}
                                />
                            )}
                        />
                    </FormItem>
                    <FormItem
                        label="Section"
                        htmlFor="account-section"
                        invalid={!!errors.section}
                        errorMessage={errors.section?.message}
                        extra={<span className="text-xs text-gray-500">Their class or group. Optional.</span>}
                    >
                        <Controller
                            name="section"
                            control={control}
                            render={({ field }) => (
                                <SectionInput
                                    id="account-section"
                                    invalid={!!errors.section}
                                    {...field}
                                    value={field.value ?? ''}
                                />
                            )}
                        />
                    </FormItem>
                </Form>
            </FormProvider>
        </ConfirmDialog>
    )
}
