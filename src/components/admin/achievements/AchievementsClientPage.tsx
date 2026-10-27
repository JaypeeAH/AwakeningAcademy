'use client'

import { useState } from 'react'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import Table from '@/components/ui/Table'
import Tag from '@/components/ui/Tag'
import { toastError, toastSuccess } from '@/components/ui/toast/toast'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import EmptyState from '@/components/shared/EmptyState'
import ErrorState from '@/components/shared/ErrorState'
import Loading from '@/components/shared/Loading'
import PageHeader from '@/components/shared/PageHeader'
import { XpReward } from '@/components/game/GameTags'
import AchievementDialog from './AchievementDialog'
import { achievementIcon, conditionSummary } from './achievementIcons'
import navigationIcon, { AddIcon, DeleteIcon, EditIcon } from '@/configs/icons.config'
import { homePath } from '@/configs/app.config'
import { apiDeleteAchievement } from '@/services/social'
import { useAchievementDefinitionsStore } from '@/stores/GameStores'
import { usePageBreadcrumbs } from '@/utils/hooks/useBreadcrumbs'
import { rarityLabel, rarityTagClass } from '@/@types/game/Inventory'
import type { AchievementDefinition } from '@/@types/game/Achievements'

const { THead, TBody, Tr, Th, Td } = Table

/** Administrators define achievements as data: a condition, a look and optional XP — no code changes */
export default function AchievementsClientPage() {
    usePageBreadcrumbs([{ label: 'Dashboard', href: homePath }, { label: 'Achievements' }])
    const achievements = useAchievementDefinitionsStore((s) => s.data)
    const error = useAchievementDefinitionsStore((s) => s.error)
    const refresh = useAchievementDefinitionsStore((s) => s.refresh)
    const [dialog, setDialog] = useState<{ open: boolean; achievement: AchievementDefinition | null }>({
        open: false,
        achievement: null,
    })
    const [deleting, setDeleting] = useState<AchievementDefinition | null>(null)
    const [busy, setBusy] = useState(false)

    const remove = async () => {
        if (!deleting) return
        setBusy(true)
        try {
            await apiDeleteAchievement(deleting.id)
            await refresh()
            toastSuccess('Achievement deleted.')
            setDeleting(null)
        } catch (err) {
            toastError('Couldn’t delete the achievement.', err)
        } finally {
            setBusy(false)
        }
    }

    const addButton = (
        <Button variant="solid" icon={<AddIcon />} onClick={() => setDialog({ open: true, achievement: null })}>
            New achievement
        </Button>
    )

    return (
        <>
            <PageHeader
                eyebrow="Administration"
                title="Achievements"
                description="Students earn achievements automatically when they meet the condition, checked after every reward. Each is earned once; XP is optional."
                actions={addButton}
            />
            <Card bodyClass="p-0">
                {achievements ? (
                    achievements.length ? (
                        <div className="overflow-x-auto">
                            <Table>
                                <THead>
                                    <Tr>
                                        <Th>Achievement</Th>
                                        <Th>Earned for</Th>
                                        <Th>Reward</Th>
                                        <Th>Status</Th>
                                        <Th>
                                            <span className="sr-only">Actions</span>
                                        </Th>
                                    </Tr>
                                </THead>
                                <TBody>
                                    {achievements.map((a) => (
                                        <Tr key={a.id}>
                                            <Td>
                                                <div className="flex items-start gap-3">
                                                    <span className="mt-0.5 text-2xl text-gold" aria-hidden>
                                                        {achievementIcon(a.icon)}
                                                    </span>
                                                    <div>
                                                        <div className="font-semibold text-gray-900 dark:text-gray-100">
                                                            {a.name}
                                                        </div>
                                                        <div className="text-xs text-gray-500">
                                                            <code>{a.code}</code>
                                                            {a.description ? ` · ${a.description}` : ''}
                                                        </div>
                                                    </div>
                                                </div>
                                            </Td>
                                            <Td className="whitespace-nowrap text-sm">
                                                {conditionSummary(a.condition)}
                                            </Td>
                                            <Td>
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <Tag className={rarityTagClass[a.rarity]}>
                                                        {rarityLabel[a.rarity]}
                                                    </Tag>
                                                    {a.xpReward > 0 && <XpReward amount={a.xpReward} />}
                                                </div>
                                            </Td>
                                            <Td>
                                                <div className="flex flex-wrap gap-1">
                                                    {a.secret && <Tag>Hidden</Tag>}
                                                    {!a.active && (
                                                        <Tag className="border-transparent bg-gray-100 text-gray-500 dark:bg-gray-700">
                                                            Inactive
                                                        </Tag>
                                                    )}
                                                    {a.active && !a.secret && (
                                                        <Tag className="border-transparent bg-success-subtle text-success">
                                                            Active
                                                        </Tag>
                                                    )}
                                                </div>
                                            </Td>
                                            <Td className="whitespace-nowrap text-right">
                                                <Button
                                                    size="xs"
                                                    variant="plain"
                                                    icon={<EditIcon />}
                                                    aria-label={`Edit ${a.name}`}
                                                    onClick={() => setDialog({ open: true, achievement: a })}
                                                />
                                                <Button
                                                    size="xs"
                                                    variant="plain"
                                                    icon={<DeleteIcon />}
                                                    aria-label={`Delete ${a.name}`}
                                                    onClick={() => setDeleting(a)}
                                                />
                                            </Td>
                                        </Tr>
                                    ))}
                                </TBody>
                            </Table>
                        </div>
                    ) : (
                        <EmptyState
                            icon={navigationIcon.achievements}
                            title="No achievements yet"
                            description="Reward milestones such as a first lesson, a perfect score, a boss defeated or a learning streak."
                            action={addButton}
                        />
                    )
                ) : error ? (
                    <ErrorState message={error} onRetry={() => void refresh()} />
                ) : (
                    <Loading loading message="Loading achievements…" />
                )}
            </Card>

            <AchievementDialog
                achievement={dialog.achievement}
                isOpen={dialog.open}
                onClose={() => setDialog({ open: false, achievement: null })}
            />
            <ConfirmDialog
                isOpen={deleting !== null}
                onClose={() => setDeleting(null)}
                type="danger"
                title={`Delete “${deleting?.name ?? ''}”?`}
                confirmText="Delete"
                onConfirm={remove}
                loading={busy}
            >
                It disappears from every student’s achievements. XP already earned from it is kept. To stop new awards
                but keep it visible, switch it off instead. This can’t be undone.
            </ConfirmDialog>
        </>
    )
}
