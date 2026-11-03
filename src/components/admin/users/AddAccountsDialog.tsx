'use client'

import { useMemo, useState } from 'react'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import Alert from '@/components/ui/Alert'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import { FormItem } from '@/components/ui/Form'
import { toastError } from '@/components/ui/toast/toast'
import { apiCreateAccounts } from '@/services/users'
import { useSWRCourses } from '@/services/courses'
import { useUsersStore } from '@/stores/AdminStores'
import { parseAccountLines } from '@/utils/accounts'
import { MAX_NEW_ACCOUNTS, type CreateAccountsResult } from '@/@types/users/UserAccount'

interface AddAccountsDialogProps {
    onClose: () => void
}

const EXAMPLE = 'DELA CRUZ, JUAN B.\tdelacruzjuan\tpassword-123'

/**
 * Administrators: student accounts that sign in with a username instead of an email — paste a class
 * list (name, username, password per line, straight from a spreadsheet) and optionally enrol everyone in
 * a course. Mount it only while open.
 */
export default function AddAccountsDialog({ onClose }: AddAccountsDialogProps) {
    const refresh = useUsersStore((s) => s.refresh)
    const { data: courses } = useSWRCourses()
    const [text, setText] = useState('')
    const [courseId, setCourseId] = useState<string | null>(null)
    const [saving, setSaving] = useState(false)
    const [result, setResult] = useState<CreateAccountsResult | null>(null)

    const { accounts, errors } = useMemo(() => parseAccountLines(text), [text])
    const courseOptions = (courses ?? []).map((c) => ({ value: c.id, label: c.title }))
    const tooMany = accounts.length > MAX_NEW_ACCOUNTS
    const ready = accounts.length > 0 && errors.length === 0 && !tooMany

    const onConfirm = async () => {
        if (result) return onClose()
        if (!ready) return
        setSaving(true)
        try {
            const created = await apiCreateAccounts({
                accounts: accounts.map(({ displayName, username, password }) => ({ displayName, username, password })),
                courseId,
            })
            setResult(created)
            await refresh()
        } catch (error) {
            toastError('Couldn’t add the accounts.', error)
        } finally {
            setSaving(false)
        }
    }

    return (
        <ConfirmDialog
            isOpen
            onClose={onClose}
            type={result ? 'success' : 'info'}
            width={680}
            title={result ? 'Accounts added' : 'Add accounts with usernames'}
            confirmText={
                result ? 'Done' : `Add ${accounts.length || ''} account${accounts.length === 1 ? '' : 's'}`.trim()
            }
            confirmButtonProps={{ disabled: !result && !ready }}
            onConfirm={onConfirm}
            loading={saving}
        >
            {result ? (
                <div className="text-sm">
                    <p className="mb-3">
                        {result.created.length} account{result.created.length === 1 ? '' : 's'} created
                        {result.courseTitle && result.created.length > 0 ? ` and added to ${result.courseTitle}` : ''}.
                        Students sign in with their username and password — share each student’s own details privately.
                    </p>
                    {result.skipped.length > 0 && (
                        <Alert showIcon type="warning">
                            <p className="mb-1 font-semibold">Not created ({result.skipped.length}):</p>
                            <ul className="list-disc pl-5">
                                {result.skipped.map((s) => (
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
                        For students without a school email. Paste one student per line —{' '}
                        <strong>name, username, password</strong> — or copy the three columns from a spreadsheet. They
                        sign in with the username; email sign-in still works for everyone else.
                    </p>
                    <FormItem label="Class list" htmlFor="accounts-text" asterisk>
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
                    <FormItem label="Add them to a course (optional)" htmlFor="accounts-course">
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
                    {text.trim() && (
                        <div aria-live="polite" className="text-sm">
                            {errors.length > 0 ? (
                                <Alert showIcon type="danger">
                                    <p className="mb-1 font-semibold">Fix these lines first:</p>
                                    <ul className="list-disc pl-5">
                                        {errors.slice(0, 8).map((e) => (
                                            <li key={e.line}>
                                                Line {e.line}: {e.message}
                                            </li>
                                        ))}
                                    </ul>
                                    {errors.length > 8 && <p className="mt-1">…and {errors.length - 8} more.</p>}
                                </Alert>
                            ) : tooMany ? (
                                <Alert showIcon type="warning">
                                    Add up to {MAX_NEW_ACCOUNTS} accounts at a time.
                                </Alert>
                            ) : (
                                <p className="text-gray-500 dark:text-gray-400">
                                    {accounts.length} account{accounts.length === 1 ? '' : 's'} ready, starting with{' '}
                                    <strong>{accounts[0]?.displayName}</strong> ({accounts[0]?.username}).
                                </p>
                            )}
                        </div>
                    )}
                </>
            )}
        </ConfirmDialog>
    )
}
