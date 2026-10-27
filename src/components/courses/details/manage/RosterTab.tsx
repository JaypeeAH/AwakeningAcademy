'use client'

import { useState } from 'react'
import Button from '@/components/ui/Button'
import Table from '@/components/ui/Table'
import EmptyState from '@/components/shared/EmptyState'
import ErrorState from '@/components/shared/ErrorState'
import Loading from '@/components/shared/Loading'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import UserAvatar from '@/components/shared/UserAvatar'
import { toastError, toastSuccess } from '@/components/ui/toast/toast'
import { LevelBadge, RankTag } from '@/components/game/GameTags'
import AddStudentDialog from './AddStudentDialog'
import { RosterSWRProvider } from './ManageSWRProviders'
import { AddUserIcon, DeleteIcon, StudentsIcon } from '@/configs/icons.config'
import { apiRemoveStudent } from '@/services/courses'
import { getCourseState, useRosterStore } from '@/stores/GameStores'
import { fromNow } from '@/utils/dates'
import type { RosterStudent } from '@/@types/courses/Course'

const { THead, TBody, Tr, Th, Td } = Table

interface RosterTabProps {
    courseId: string
}

export default function RosterTab({ courseId }: RosterTabProps) {
    return (
        <RosterSWRProvider courseId={courseId}>
            <Roster courseId={courseId} />
        </RosterSWRProvider>
    )
}

function Roster({ courseId }: RosterTabProps) {
    const roster = useRosterStore(courseId, (s) => s.data)
    const loading = useRosterStore(courseId, (s) => s.loading)
    const error = useRosterStore(courseId, (s) => s.error)
    const refresh = useRosterStore(courseId, (s) => s.refresh)
    const [adding, setAdding] = useState(false)
    const [removing, setRemoving] = useState<RosterStudent | null>(null)
    const [busy, setBusy] = useState(false)

    const remove = async () => {
        if (!removing) return
        setBusy(true)
        try {
            await apiRemoveStudent(courseId, removing.id)
            await Promise.all([refresh(), getCourseState(courseId).refresh()])
            toastSuccess(`${removing.displayName} removed from the course.`)
            setRemoving(null)
        } catch (e) {
            toastError('Couldn’t remove the student.', e)
        } finally {
            setBusy(false)
        }
    }

    if (!roster)
        return error ? (
            <ErrorState message={error} onRetry={() => void refresh()} />
        ) : (
            <Loading loading={loading} message="Loading the roster…" />
        )

    return (
        <div className="space-y-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                    Level, rank and XP show engagement. The average score shows learning — use it (and the Progress tab)
                    to spot who needs help.
                </p>
                <Button variant="solid" size="sm" icon={<AddUserIcon />} onClick={() => setAdding(true)}>
                    Add student
                </Button>
            </div>

            {roster.length === 0 ? (
                <EmptyState
                    icon={<StudentsIcon />}
                    title="No students yet"
                    description="Publish the course and share its join code, or add students by their sign-in email."
                />
            ) : (
                <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
                    <Table hoverable>
                        <THead>
                            <Tr>
                                <Th>Student</Th>
                                <Th>Level / rank</Th>
                                <Th className="text-right">XP</Th>
                                <Th className="text-right">Completed</Th>
                                <Th className="text-right">Avg score</Th>
                                <Th>Last active</Th>
                                <Th>
                                    <span className="sr-only">Actions</span>
                                </Th>
                            </Tr>
                        </THead>
                        <TBody>
                            {roster.map((s) => (
                                <Tr key={s.id}>
                                    <Td>
                                        <div className="flex items-center gap-3">
                                            <UserAvatar userId={s.id} name={s.displayName} size={32} />
                                            <div className="min-w-0">
                                                <div className="font-semibold text-gray-900 dark:text-gray-50">
                                                    {s.displayName}
                                                </div>
                                                <div className="truncate text-xs text-gray-500">{s.email}</div>
                                            </div>
                                        </div>
                                    </Td>
                                    <Td>
                                        <div className="flex flex-wrap items-center gap-1.5">
                                            <LevelBadge level={s.level} />
                                            <RankTag code={s.rankCode} />
                                        </div>
                                    </Td>
                                    <Td className="text-right tabular-nums">{s.totalXp.toLocaleString()}</Td>
                                    <Td className="text-right tabular-nums">{s.completedCount}</Td>
                                    <Td className="text-right tabular-nums">
                                        {s.averageScore === null ? (
                                            <span className="text-gray-400">—</span>
                                        ) : (
                                            <span className={s.averageScore < 60 ? 'font-semibold text-error' : ''}>
                                                {s.averageScore}%
                                            </span>
                                        )}
                                    </Td>
                                    <Td className="whitespace-nowrap text-gray-500">
                                        {s.lastActiveAt ? fromNow(s.lastActiveAt) : 'Not yet'}
                                    </Td>
                                    <Td className="text-right">
                                        <Button
                                            size="xs"
                                            variant="plain"
                                            icon={<DeleteIcon />}
                                            aria-label={`Remove ${s.displayName}`}
                                            onClick={() => setRemoving(s)}
                                        />
                                    </Td>
                                </Tr>
                            ))}
                        </TBody>
                    </Table>
                </div>
            )}

            <AddStudentDialog courseId={courseId} isOpen={adding} onClose={() => setAdding(false)} />
            <ConfirmDialog
                isOpen={!!removing}
                onClose={() => setRemoving(null)}
                type="warning"
                title={`Remove ${removing?.displayName ?? 'this student'} from the course?`}
                confirmText="Remove"
                onConfirm={remove}
                loading={busy}
            >
                They lose access to the course. Their attempts, XP and history are kept, and they can rejoin with the
                join code.
            </ConfirmDialog>
        </div>
    )
}
