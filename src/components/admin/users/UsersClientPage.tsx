'use client'

import { useEffect, useState } from 'react'
import Card from '@/components/ui/Card'
import Table from '@/components/ui/Table'
import Select from '@/components/ui/Select'
import Segment from '@/components/ui/Segment'
import Pagination from '@/components/ui/Pagination'
import Tooltip from '@/components/ui/Tooltip'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import PageHeader from '@/components/shared/PageHeader'
import EmptyState from '@/components/shared/EmptyState'
import ErrorState from '@/components/shared/ErrorState'
import Loading from '@/components/shared/Loading'
import UserAvatar from '@/components/shared/UserAvatar'
import { LevelBadge, RankTag } from '@/components/game/GameTags'
import ChangeRoleDialog from './ChangeRoleDialog'
import AdjustXpDialog from './AdjustXpDialog'
import DeleteAccountDialog from './DeleteAccountDialog'
import { DeleteIcon, FileIcon, SearchIcon, StudentsIcon, XpIcon } from '@/configs/icons.config'
import { homePath } from '@/configs/app.config'
import { useUsersStore } from '@/stores/AdminStores'
import { getUserExportUrl } from '@/services/users'
import { ROLES, roleLabel, type Role } from '@/@types/auth/Roles'
import useSession from '@/utils/hooks/useSession'
import useDebouncedValue from '@/utils/hooks/useDebouncedValue'
import { usePageBreadcrumbs } from '@/utils/hooks/useBreadcrumbs'
import { formatDate } from '@/utils/dates'
import type { UserAccount } from '@/@types/users/UserAccount'
import { USERS_PAGE_SIZE } from '@/constants/app.constant'

const { THead, TBody, Tr, Th, Td } = Table

const PAGE_SIZE = USERS_PAGE_SIZE

const ROLE_OPTIONS = ROLES.map((role) => ({ value: role, label: roleLabel[role] }))

const ROLE_FILTERS: { value: Role | 'all'; label: string }[] = [
    { value: 'all', label: 'All' },
    { value: 'student', label: 'Students' },
    { value: 'teacher', label: 'Teachers' },
    { value: 'admin', label: 'Admins' },
]

/** Search box that updates the store's query after typing pauses */
function UserSearch() {
    const setQuery = useUsersStore((s) => s.setQuery)
    const [text, setText] = useState(() => useUsersStore.getState().query.q)
    const debounced = useDebouncedValue(text.trim(), 350)
    useEffect(() => {
        if (useUsersStore.getState().query.q !== debounced) setQuery({ q: debounced })
    }, [debounced, setQuery])

    return (
        <div className="w-full md:w-80">
            <label htmlFor="user-search" className="sr-only">
                Search users
            </label>
            <Input
                id="user-search"
                size="sm"
                type="search"
                prefix={<SearchIcon className="text-lg text-gray-400" />}
                placeholder="Search by name or email"
                value={text}
                onChange={(e) => setText(e.target.value)}
            />
        </div>
    )
}

/** Administrators: find people, change roles and correct XP. Every change is audited. */
export default function UsersClientPage() {
    usePageBreadcrumbs([{ label: 'Dashboard', href: homePath }, { label: 'Users & roles' }])
    const { user: me } = useSession()
    const data = useUsersStore((s) => s.data)
    const loading = useUsersStore((s) => s.loading)
    const validating = useUsersStore((s) => s.validating)
    const error = useUsersStore((s) => s.error)
    const refresh = useUsersStore((s) => s.refresh)
    const query = useUsersStore((s) => s.query)
    const setQuery = useUsersStore((s) => s.setQuery)

    const [roleChange, setRoleChange] = useState<{ user: UserAccount; role: Role } | null>(null)
    const [adjusting, setAdjusting] = useState<UserAccount | null>(null)
    const [deleting, setDeleting] = useState<UserAccount | null>(null)

    const records = data?.records ?? []
    const filtered = !!query.q || !!query.role

    return (
        <>
            <PageHeader
                eyebrow="Administration"
                title="Users & roles"
                description="Everyone signs up as a student. Give teachers and administrators their role here. Changes are recorded in the audit log."
            />
            <Card bodyClass="p-0">
                <div className="flex flex-col gap-3 border-b border-gray-200 p-4 md:flex-row md:items-center md:justify-between dark:border-gray-700">
                    <UserSearch />
                    <Segment
                        size="sm"
                        value={query.role ?? 'all'}
                        onChange={(value) => {
                            if (typeof value !== 'string' || !value) return // clicking the active filter keeps it
                            setQuery({ role: value === 'all' ? null : (value as Role) })
                        }}
                        aria-label="Filter by role"
                    >
                        {ROLE_FILTERS.map((filter) => (
                            <Segment.Item key={filter.value} value={filter.value} type="button">
                                {filter.label}
                            </Segment.Item>
                        ))}
                    </Segment>
                </div>

                {error && !data ? (
                    <ErrorState message={error} onRetry={() => void refresh()} />
                ) : (
                    <Loading loading={loading && !data} message="Loading users…">
                        {records.length === 0 ? (
                            <EmptyState
                                icon={<StudentsIcon />}
                                title={filtered ? 'No one matches' : 'No users yet'}
                                description={
                                    filtered
                                        ? 'Try a different name or email, or clear the role filter.'
                                        : 'People appear here once they sign up.'
                                }
                                action={
                                    filtered ? (
                                        <Button size="sm" onClick={() => setQuery({ q: '', role: null })}>
                                            Clear filters
                                        </Button>
                                    ) : undefined
                                }
                            />
                        ) : (
                            <div className="overflow-x-auto">
                                <Table hoverable className={validating ? 'opacity-70 transition-opacity' : undefined}>
                                    <THead>
                                        <Tr>
                                            <Th>Name</Th>
                                            <Th>Role</Th>
                                            <Th>Progress</Th>
                                            <Th>Joined</Th>
                                            <Th>
                                                <span className="sr-only">Actions</span>
                                            </Th>
                                        </Tr>
                                    </THead>
                                    <TBody>
                                        {records.map((account) => {
                                            const isMe = account.id === me?.id
                                            const roleSelect = (
                                                <div className="w-40">
                                                    <Select
                                                        size="sm"
                                                        aria-label={`Role for ${account.displayName}`}
                                                        options={ROLE_OPTIONS}
                                                        value={ROLE_OPTIONS.find((o) => o.value === account.role)}
                                                        isSearchable={false}
                                                        isDisabled={isMe}
                                                        menuPortalTarget={
                                                            typeof document === 'undefined' ? undefined : document.body
                                                        }
                                                        menuPosition="fixed"
                                                        styles={{ menuPortal: (base) => ({ ...base, zIndex: 60 }) }}
                                                        onChange={(option) => {
                                                            if (option && option.value !== account.role) {
                                                                setRoleChange({ user: account, role: option.value })
                                                            }
                                                        }}
                                                    />
                                                </div>
                                            )
                                            return (
                                                <Tr key={account.id}>
                                                    <Td>
                                                        <div className="flex items-center gap-3">
                                                            <UserAvatar
                                                                userId={account.id}
                                                                name={account.displayName}
                                                                size={34}
                                                            />
                                                            <div className="min-w-0">
                                                                <div className="font-semibold text-gray-900 dark:text-gray-100">
                                                                    {account.displayName}
                                                                    {isMe && (
                                                                        <span className="ml-1.5 text-xs font-normal text-gray-500">
                                                                            (you)
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                <div className="truncate text-xs text-gray-500">
                                                                    {account.email}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </Td>
                                                    <Td>
                                                        {isMe ? (
                                                            <Tooltip title="You can’t change your own role — ask another administrator.">
                                                                {roleSelect}
                                                            </Tooltip>
                                                        ) : (
                                                            roleSelect
                                                        )}
                                                    </Td>
                                                    <Td className="whitespace-nowrap">
                                                        {account.role === 'student' ? (
                                                            <div className="flex items-center gap-2">
                                                                {account.level !== null && (
                                                                    <LevelBadge level={account.level} />
                                                                )}
                                                                {account.rankCode && (
                                                                    <RankTag code={account.rankCode} />
                                                                )}
                                                                <span className="text-xs tabular-nums text-gray-500">
                                                                    {(account.totalXp ?? 0).toLocaleString()} XP
                                                                </span>
                                                            </div>
                                                        ) : (
                                                            <span className="text-gray-400">—</span>
                                                        )}
                                                    </Td>
                                                    <Td className="whitespace-nowrap">
                                                        {formatDate(account.createdAt)}
                                                    </Td>
                                                    <Td className="text-right">
                                                        <div className="flex items-center justify-end gap-1">
                                                            {account.role === 'student' && (
                                                                <Button
                                                                    size="xs"
                                                                    icon={<XpIcon />}
                                                                    onClick={() => setAdjusting(account)}
                                                                >
                                                                    Adjust XP
                                                                </Button>
                                                            )}
                                                            <Tooltip title="Download everything stored about this person (JSON)">
                                                                <a
                                                                    href={getUserExportUrl(account.id)}
                                                                    download
                                                                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 hover:text-primary dark:hover:bg-gray-700"
                                                                    aria-label={`Download ${account.displayName}’s data`}
                                                                >
                                                                    <FileIcon aria-hidden />
                                                                </a>
                                                            </Tooltip>
                                                            {!isMe && (
                                                                <Tooltip title="Delete account (privacy request)">
                                                                    <Button
                                                                        size="xs"
                                                                        variant="plain"
                                                                        icon={<DeleteIcon />}
                                                                        aria-label={`Delete ${account.displayName}’s account`}
                                                                        onClick={() => setDeleting(account)}
                                                                    />
                                                                </Tooltip>
                                                            )}
                                                        </div>
                                                    </Td>
                                                </Tr>
                                            )
                                        })}
                                    </TBody>
                                </Table>
                            </div>
                        )}
                    </Loading>
                )}

                {data && data.total > PAGE_SIZE && (
                    <div className="flex flex-col items-center justify-between gap-3 border-t border-gray-200 p-4 sm:flex-row dark:border-gray-700">
                        <span className="text-sm text-gray-500">{data.total.toLocaleString()} people</span>
                        <Pagination
                            total={data.total}
                            pageSize={PAGE_SIZE}
                            currentPage={query.page}
                            onChange={(page) => setQuery({ page })}
                        />
                    </div>
                )}
            </Card>

            <ChangeRoleDialog
                user={roleChange?.user ?? null}
                role={roleChange?.role ?? null}
                onClose={() => setRoleChange(null)}
            />
            {adjusting && <AdjustXpDialog key={adjusting.id} student={adjusting} onClose={() => setAdjusting(null)} />}
            <DeleteAccountDialog
                user={deleting}
                onClose={() => setDeleting(null)}
                onDeleted={() => {
                    setDeleting(null)
                    void refresh()
                }}
            />
        </>
    )
}
