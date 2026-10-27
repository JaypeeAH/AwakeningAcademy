'use client'

import { useState } from 'react'
import Button from '@/components/ui/Button'
import Tag from '@/components/ui/Tag'
import { toastError, toastSuccess } from '@/components/ui/toast/toast'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import EmptyState from '@/components/shared/EmptyState'
import ErrorState from '@/components/shared/ErrorState'
import Loading from '@/components/shared/Loading'
import { XpReward } from '@/components/game/GameTags'
import SecretEditorDialog from '@/components/secrets/SecretEditorDialog'
import MarkerSnippet from '@/components/secrets/MarkerSnippet'
import { ItemDefinitionsSWRProvider } from '@/components/admin/items/ItemsSWRProviders'
import { CourseSecretsSWRProvider } from './ManageSWRProviders'
import navigationIcon, { AddIcon, DeleteIcon, EditIcon, ItemIcon } from '@/configs/icons.config'
import { apiDeleteSecret } from '@/services/game'
import {
    getCourseSecretsState,
    useCourseActivitiesStore,
    useCourseSecretsStore,
    useItemDefinitionsStore,
} from '@/stores/GameStores'
import { rarityLabel, rarityTagClass } from '@/@types/game/Inventory'
import { eggTriggerLabel, type EasterEgg } from '@/@types/game/Secrets'

const needsMarker = (secret: EasterEgg) =>
    !!secret.markerKey && (secret.trigger === 'hidden_object' || secret.trigger === 'lesson_section')

/** The course's Easter eggs: hide secrets for students to discover, without any code changes */
export default function SecretsTab({ courseId }: { courseId: string }) {
    return (
        <CourseSecretsSWRProvider courseId={courseId}>
            <ItemDefinitionsSWRProvider>
                <SecretsList courseId={courseId} />
            </ItemDefinitionsSWRProvider>
        </CourseSecretsSWRProvider>
    )
}

function SecretsList({ courseId }: { courseId: string }) {
    const secrets = useCourseSecretsStore(courseId, (s) => s.data)
    const error = useCourseSecretsStore(courseId, (s) => s.error)
    const refresh = useCourseSecretsStore(courseId, (s) => s.refresh)
    const activities = useCourseActivitiesStore(courseId, (s) => s.data?.activities) ?? []
    const items = useItemDefinitionsStore((s) => s.data) ?? []

    const [editor, setEditor] = useState<{ open: boolean; secret: EasterEgg | null }>({ open: false, secret: null })
    const [placing, setPlacing] = useState<EasterEgg | null>(null)
    const [deleting, setDeleting] = useState<EasterEgg | null>(null)
    const [busy, setBusy] = useState(false)

    const itemName = (id: string) => items.find((i) => i.id === id)?.name ?? 'Item'
    const activityTitle = (id: unknown) =>
        typeof id === 'string' ? (activities.find((a) => a.id === id)?.title ?? null) : null

    const saved = async (secret: EasterEgg, created: boolean) => {
        setEditor({ open: false, secret: null })
        await getCourseSecretsState(courseId).refresh()
        // A new marker has to be pasted into the lesson before anyone can find it
        if (needsMarker(secret) && (created || secret.markerKey !== editor.secret?.markerKey)) setPlacing(secret)
    }

    const remove = async () => {
        if (!deleting) return
        setBusy(true)
        try {
            await apiDeleteSecret(deleting.id)
            await refresh()
            toastSuccess('Secret deleted.')
            setDeleting(null)
        } catch (err) {
            toastError('Couldn’t delete the secret.', err)
        } finally {
            setBusy(false)
        }
    }

    if (!secrets) {
        return error ? (
            <ErrorState message={error} onRetry={() => void refresh()} />
        ) : (
            <Loading loading message="Unlocking the vault…" />
        )
    }

    const addButton = (
        <Button variant="solid" icon={<AddIcon />} onClick={() => setEditor({ open: true, secret: null })}>
            Hide a secret
        </Button>
    )

    return (
        <>
            {secrets.length ? (
                <>
                    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            {secrets.length} {secrets.length === 1 ? 'secret' : 'secrets'} in this course. Students see
                            a silhouette in their Codex until they find one; each is found once per student.
                        </p>
                        {addButton}
                    </div>
                    <ul className="space-y-3">
                        {secrets.map((secret) => (
                            <li
                                key={secret.id}
                                className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800"
                            >
                                <div className="flex flex-wrap items-start justify-between gap-3">
                                    <div className="min-w-0">
                                        <h5 className="flex items-center gap-2">
                                            <span className="text-gold" aria-hidden>
                                                {navigationIcon.easter}
                                            </span>
                                            <span className="truncate">{secret.title}</span>
                                        </h5>
                                        <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs">
                                            <Tag className={rarityTagClass[secret.rarity]}>
                                                {rarityLabel[secret.rarity]}
                                            </Tag>
                                            <Tag>{eggTriggerLabel[secret.trigger]}</Tag>
                                            {!secret.active && (
                                                <Tag className="border-transparent bg-gray-100 text-gray-500 dark:bg-gray-700">
                                                    Inactive
                                                </Tag>
                                            )}
                                            <span className="text-gray-500">
                                                Found by {secret.discoveredCount}{' '}
                                                {secret.discoveredCount === 1 ? 'student' : 'students'}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex shrink-0 gap-1">
                                        <Button
                                            size="xs"
                                            variant="plain"
                                            icon={<EditIcon />}
                                            aria-label={`Edit ${secret.title}`}
                                            onClick={() => setEditor({ open: true, secret })}
                                        />
                                        <Button
                                            size="xs"
                                            variant="plain"
                                            icon={<DeleteIcon />}
                                            aria-label={`Delete ${secret.title}`}
                                            onClick={() => setDeleting(secret)}
                                        />
                                    </div>
                                </div>

                                {secret.clue && (
                                    <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                                        <span className="font-semibold">
                                            Clue{secret.clueVisible ? '' : ' (hidden)'}:
                                        </span>{' '}
                                        {secret.clue}
                                    </p>
                                )}
                                {activityTitle(secret.config.activityId) && (
                                    <p className="mt-1 text-xs text-gray-500">
                                        Activity: {activityTitle(secret.config.activityId)}
                                    </p>
                                )}
                                {secret.rewards.length > 0 && (
                                    <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
                                        {secret.rewards.map((reward, i) =>
                                            reward.type === 'xp' ? (
                                                <XpReward key={i} amount={reward.amount} />
                                            ) : (
                                                <span key={i} className="flex items-center gap-1">
                                                    <ItemIcon aria-hidden className="text-primary" />
                                                    {reward.charges} × {itemName(reward.itemId)}
                                                </span>
                                            ),
                                        )}
                                    </div>
                                )}
                                {needsMarker(secret) && (
                                    <MarkerSnippet
                                        trigger={secret.trigger}
                                        markerKey={secret.markerKey!}
                                        className="mt-3"
                                    />
                                )}
                            </li>
                        ))}
                    </ul>
                </>
            ) : (
                <EmptyState
                    icon={navigationIcon.easter}
                    title="No secrets hidden yet"
                    description="Hide a glowing mark in a lesson, reward a perfect score or a learning streak, or set a phrase students can whisper in their Codex. Secrets can give XP and items such as the Easter Bunny."
                    action={addButton}
                />
            )}

            <SecretEditorDialog
                courseId={courseId}
                secret={editor.secret}
                isOpen={editor.open}
                activities={activities}
                items={items}
                onClose={() => setEditor({ open: false, secret: null })}
                onSaved={(secret, created) => void saved(secret, created)}
            />
            <ConfirmDialog
                isOpen={placing !== null}
                onClose={() => setPlacing(null)}
                type="success"
                title="Now hide the marker in the lesson"
                confirmText="Done"
                onConfirm={() => setPlacing(null)}
                width={560}
            >
                {placing?.markerKey && (
                    <>
                        <p className="mb-3 text-sm">
                            Open “{activityTitle(placing.config.activityId) ?? 'the lesson'}” in the Quest Builder and
                            paste this into its content. Until then, nobody can find “{placing.title}”.
                        </p>
                        <MarkerSnippet trigger={placing.trigger} markerKey={placing.markerKey} />
                    </>
                )}
            </ConfirmDialog>
            <ConfirmDialog
                isOpen={deleting !== null}
                onClose={() => setDeleting(null)}
                type="danger"
                title={`Delete “${deleting?.title ?? ''}”?`}
                confirmText="Delete"
                onConfirm={remove}
                loading={busy}
            >
                It disappears from every student’s Codex. XP and items already earned from it are kept. Remove its
                marker from the lesson too. This can’t be undone.
            </ConfirmDialog>
        </>
    )
}
