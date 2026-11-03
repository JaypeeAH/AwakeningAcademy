'use client'

import { useMemo, useState } from 'react'
import { Controller, FormProvider, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { mutate } from 'swr'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import Alert from '@/components/ui/Alert'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Segment from '@/components/ui/Segment'
import Select from '@/components/ui/Select'
import { Form, FormItem } from '@/components/ui/Form'
import { toastError } from '@/components/ui/toast/toast'
import SectionInput from './SectionInput'
import { RefreshIcon } from '@/configs/icons.config'
import { apiCreateAccounts, sectionsUrl } from '@/services/users'
import { useSWRCourses } from '@/services/courses'
import { useUsersStore } from '@/stores/AdminStores'
import { generatePassword, parseAccountLines } from '@/utils/accounts'
import { DisplayNameSchema, NewPasswordSchema } from '@/@types/auth/AuthSchema'
import {
    MAX_NEW_ACCOUNTS,
    SectionSchema,
    UsernameSchema,
    type CreateAccountsInput,
    type CreateAccountsResult,
} from '@/@types/users/UserAccount'

interface AddAccountsDialogProps {
    onClose: () => void
}

type Mode = 'one' | 'list'

const ONE_FORM_ID = 'add-one-account-form'
const EXAMPLE = 'DELA CRUZ, JUAN B.\tdelacruzjuan\tpassword-123'

const OneAccountSchema = z.object({
    displayName: DisplayNameSchema,
    username: UsernameSchema,
    password: NewPasswordSchema,
})
type OneAccount = z.infer<typeof OneAccountSchema>

/**
 * Administrators: student accounts that sign in with a username instead of an email — one at a time, or
 * a pasted class list (name, username, password per line, straight from a spreadsheet). Every new
 * account can be given a section and enrolled in a course. Mount it only while open.
 */
export default function AddAccountsDialog({ onClose }: AddAccountsDialogProps) {
    const refresh = useUsersStore((s) => s.refresh)
    const { data: courses } = useSWRCourses()
    const [mode, setMode] = useState<Mode>('one')
    const [text, setText] = useState('')
    const [section, setSection] = useState('')
    const [sectionError, setSectionError] = useState<string | null>(null)
    const [courseId, setCourseId] = useState<string | null>(null)
    const [saving, setSaving] = useState(false)
    const [result, setResult] = useState<{ created: CreateAccountsResult; one: OneAccount | null } | null>(null)

    const oneForm = useForm<OneAccount>({
        resolver: zodResolver(OneAccountSchema),
        defaultValues: { displayName: '', username: '', password: generatePassword() },
    })
    const {
        control,
        setError,
        setValue,
        formState: { errors },
    } = oneForm

    const { accounts, errors: lineErrors } = useMemo(() => parseAccountLines(text), [text])
    const courseOptions = (courses ?? []).map((c) => ({ value: c.id, label: c.title }))
    const tooMany = accounts.length > MAX_NEW_ACCOUNTS
    const listReady = accounts.length > 0 && lineErrors.length === 0 && !tooMany

    /** Creates the accounts; returns what the server did, or null when it failed (already reported) */
    const create = async (list: CreateAccountsInput['accounts']) => {
        const parsedSection = SectionSchema.safeParse(section)
        if (!parsedSection.success) {
            setSectionError(parsedSection.error.issues[0]?.message ?? 'Check the section')
            return null
        }
        setSectionError(null)
        setSaving(true)
        try {
            const created = await apiCreateAccounts({ accounts: list, section: parsedSection.data, courseId })
            await Promise.all([refresh(), mutate(sectionsUrl)])
            return created
        } catch (error) {
            toastError('Couldn’t add the accounts.', error)
            return null
        } finally {
            setSaving(false)
        }
    }

    const onValidOne = async (account: OneAccount) => {
        const created = await create([account])
        if (!created) return
        const skipped = created.skipped[0]
        // Nothing to report on a separate screen: keep the form so the username can be changed
        if (skipped) setError('username', { message: skipped.reason })
        else setResult({ created, one: account })
    }

    const onConfirm = async () => {
        if (result) return onClose()
        if (!listReady) return
        const created = await create(
            accounts.map(({ displayName, username, password }) => ({ displayName, username, password })),
        )
        if (created) setResult({ created, one: null })
    }

    const addAnother = () => {
        oneForm.reset({ displayName: '', username: '', password: generatePassword() })
        setResult(null)
    }

    const sharedFields = (
        <>
            <FormItem
                label={mode === 'one' ? 'Section (optional)' : 'Section for everyone (optional)'}
                htmlFor="accounts-section"
                invalid={!!sectionError}
                errorMessage={sectionError ?? undefined}
            >
                <SectionInput
                    id="accounts-section"
                    invalid={!!sectionError}
                    value={section}
                    onChange={(e) => setSection(e.target.value)}
                />
            </FormItem>
            <FormItem label="Add to a course (optional)" htmlFor="accounts-course">
                <Select
                    inputId="accounts-course"
                    size="sm"
                    isClearable
                    placeholder="No course"
                    options={courseOptions}
                    value={courseOptions.find((o) => o.value === courseId) ?? null}
                    onChange={(option) => setCourseId(option?.value ?? null)}
                    menuPortalTarget={typeof document === 'undefined' ? undefined : document.body}
                    menuPosition="fixed"
                    styles={{ menuPortal: (base) => ({ ...base, zIndex: 60 }) }}
                />
            </FormItem>
        </>
    )

    const confirmText = result
        ? 'Done'
        : mode === 'one'
          ? 'Add account'
          : accounts.length
            ? `Add ${accounts.length} account${accounts.length === 1 ? '' : 's'}`
            : 'Add accounts'

    return (
        <ConfirmDialog
            isOpen
            onClose={onClose}
            type={result ? 'success' : 'info'}
            width={680}
            title={result ? 'Accounts added' : 'Add accounts with usernames'}
            confirmText={confirmText}
            {...(mode === 'one' && !result ? { confirmForm: ONE_FORM_ID } : { onConfirm })}
            confirmButtonProps={{ disabled: !result && mode === 'list' && !listReady }}
            loading={saving}
        >
            {result ? (
                <div className="text-sm">
                    {result.one ? (
                        <>
                            <p className="mb-3">
                                <strong>{result.one.displayName}</strong> can sign in now
                                {result.created.courseTitle ? ` and is in ${result.created.courseTitle}` : ''}. Share
                                these details privately:
                            </p>
                            <dl className="mb-4 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 rounded-lg bg-gray-100 p-3 font-mono dark:bg-gray-700">
                                <dt className="font-sans text-gray-500">Username</dt>
                                <dd className="select-all">{result.one.username}</dd>
                                <dt className="font-sans text-gray-500">Password</dt>
                                <dd className="select-all">{result.one.password}</dd>
                            </dl>
                            <Button size="sm" onClick={addAnother}>
                                Add another student
                            </Button>
                        </>
                    ) : (
                        <p className="mb-3">
                            {result.created.created.length} account{result.created.created.length === 1 ? '' : 's'}{' '}
                            created
                            {result.created.courseTitle && result.created.created.length > 0
                                ? ` and added to ${result.created.courseTitle}`
                                : ''}
                            . Students sign in with their username and password — share each student’s own details
                            privately.
                        </p>
                    )}
                    {result.created.skipped.length > 0 && (
                        <Alert showIcon type="warning">
                            <p className="mb-1 font-semibold">Not created ({result.created.skipped.length}):</p>
                            <ul className="list-disc pl-5">
                                {result.created.skipped.map((s) => (
                                    <li key={s.username}>
                                        {s.displayName} ({s.username}): {s.reason}
                                    </li>
                                ))}
                            </ul>
                        </Alert>
                    )}
                </div>
            ) : (
                <>
                    <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
                        For students without a school email. They sign in with a username and password; email sign-in
                        still works for everyone else.
                    </p>
                    <Segment
                        size="sm"
                        className="mb-5"
                        value={mode}
                        onChange={(value) => {
                            if (value === 'one' || value === 'list') setMode(value)
                        }}
                        aria-label="How many accounts"
                    >
                        <Segment.Item value="one" type="button">
                            One student
                        </Segment.Item>
                        <Segment.Item value="list" type="button">
                            Paste a list
                        </Segment.Item>
                    </Segment>

                    {mode === 'one' ? (
                        <FormProvider {...oneForm}>
                            <Form id={ONE_FORM_ID} onSubmit={oneForm.handleSubmit(onValidOne)} noValidate>
                                <FormItem
                                    label="Name"
                                    htmlFor="account-name"
                                    asterisk
                                    invalid={!!errors.displayName}
                                    errorMessage={errors.displayName?.message}
                                >
                                    <Controller
                                        name="displayName"
                                        control={control}
                                        render={({ field }) => (
                                            <Input
                                                id="account-name"
                                                autoComplete="off"
                                                placeholder="e.g. DELA CRUZ, JUAN B."
                                                invalid={!!errors.displayName}
                                                {...field}
                                            />
                                        )}
                                    />
                                </FormItem>
                                <div className="grid gap-x-4 sm:grid-cols-2">
                                    <FormItem
                                        label="Username"
                                        htmlFor="account-username"
                                        asterisk
                                        invalid={!!errors.username}
                                        errorMessage={errors.username?.message}
                                    >
                                        <Controller
                                            name="username"
                                            control={control}
                                            render={({ field }) => (
                                                <Input
                                                    id="account-username"
                                                    autoComplete="off"
                                                    autoCapitalize="none"
                                                    spellCheck={false}
                                                    placeholder="e.g. delacruzjuan"
                                                    invalid={!!errors.username}
                                                    {...field}
                                                />
                                            )}
                                        />
                                    </FormItem>
                                    <FormItem
                                        label="Password"
                                        htmlFor="account-password"
                                        asterisk
                                        invalid={!!errors.password}
                                        errorMessage={errors.password?.message}
                                    >
                                        <Controller
                                            name="password"
                                            control={control}
                                            render={({ field }) => (
                                                <Input
                                                    id="account-password"
                                                    autoComplete="off"
                                                    spellCheck={false}
                                                    className="font-mono"
                                                    invalid={!!errors.password}
                                                    suffix={
                                                        <Button
                                                            type="button"
                                                            size="xs"
                                                            variant="plain"
                                                            icon={<RefreshIcon />}
                                                            aria-label="Make a new password"
                                                            onClick={() =>
                                                                setValue('password', generatePassword(), {
                                                                    shouldValidate: true,
                                                                })
                                                            }
                                                        />
                                                    }
                                                    {...field}
                                                />
                                            )}
                                        />
                                    </FormItem>
                                </div>
                                {sharedFields}
                            </Form>
                        </FormProvider>
                    ) : (
                        <>
                            <FormItem
                                label="Class list"
                                htmlFor="accounts-text"
                                asterisk
                                extra={
                                    <span className="text-xs text-gray-500">
                                        One per line: name, username, password — or three spreadsheet columns
                                    </span>
                                }
                            >
                                <Input
                                    id="accounts-text"
                                    textArea
                                    rows={8}
                                    spellCheck={false}
                                    className="font-mono text-xs"
                                    placeholder={EXAMPLE}
                                    value={text}
                                    onChange={(e) => setText(e.target.value)}
                                />
                            </FormItem>
                            {sharedFields}
                            {text.trim() && (
                                <div aria-live="polite" className="text-sm">
                                    {lineErrors.length > 0 ? (
                                        <Alert showIcon type="danger">
                                            <p className="mb-1 font-semibold">Fix these lines first:</p>
                                            <ul className="list-disc pl-5">
                                                {lineErrors.slice(0, 8).map((e) => (
                                                    <li key={e.line}>
                                                        Line {e.line}: {e.message}
                                                    </li>
                                                ))}
                                            </ul>
                                            {lineErrors.length > 8 && (
                                                <p className="mt-1">…and {lineErrors.length - 8} more.</p>
                                            )}
                                        </Alert>
                                    ) : tooMany ? (
                                        <Alert showIcon type="warning">
                                            Add up to {MAX_NEW_ACCOUNTS} accounts at a time.
                                        </Alert>
                                    ) : (
                                        <p className="text-gray-500 dark:text-gray-400">
                                            {accounts.length} account{accounts.length === 1 ? '' : 's'} ready, starting
                                            with <strong>{accounts[0]?.displayName}</strong> ({accounts[0]?.username}).
                                        </p>
                                    )}
                                </div>
                            )}
                        </>
                    )}
                </>
            )}
        </ConfirmDialog>
    )
}
