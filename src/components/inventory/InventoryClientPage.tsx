'use client'

import { useState } from 'react'
import Link from 'next/link'
import Button from '@/components/ui/Button'
import PageHeader from '@/components/shared/PageHeader'
import Loading from '@/components/shared/Loading'
import ErrorState from '@/components/shared/ErrorState'
import EmptyState from '@/components/shared/EmptyState'
import SystemPanel from '@/components/game/SystemPanel'
import navigationIcon from '@/configs/icons.config'
import { codexPath, homePath } from '@/configs/app.config'
import { useInventoryStore, useSkillBookStore } from '@/stores/GameStores'
import { formatDateTime } from '@/utils/dates'
import { usePageBreadcrumbs } from '@/utils/hooks/useBreadcrumbs'
import classNames from '@/utils/classNames'
import { InventorySWRProvider, SkillBookSWRProvider } from './InventorySWRProviders'
import ItemCard from './ItemCard'
import SkillCard from './SkillCard'
import DungeonSenseDialog from './DungeonSenseDialog'

function ItemsSection() {
    const inventory = useInventoryStore((s) => s.data)
    const error = useInventoryStore((s) => s.error)
    const refresh = useInventoryStore((s) => s.refresh)

    return (
        <SystemPanel eyebrow="Inventory" title="Your items">
            {!inventory ? (
                error ? (
                    <ErrorState message={error} onRetry={() => void refresh()} />
                ) : (
                    <Loading loading />
                )
            ) : inventory.items.length === 0 ? (
                <EmptyState
                    compact
                    icon={navigationIcon.inventory}
                    title="Your bag is empty"
                    description="Items come from discovering secrets hidden in your courses — the Easter Bunny among them."
                    action={
                        <Link href={codexPath}>
                            <Button variant="solid" icon={navigationIcon.codex}>
                                Open the Codex
                            </Button>
                        </Link>
                    }
                />
            ) : (
                <ul className="grid gap-4 sm:grid-cols-2">
                    {inventory.items.map((entry) => (
                        <li key={entry.item.id}>
                            <ItemCard entry={entry} />
                        </li>
                    ))}
                </ul>
            )}
        </SystemPanel>
    )
}

function HistorySection() {
    const history = useInventoryStore((s) => s.data?.history)
    if (!history?.length) return null
    return (
        <SystemPanel eyebrow="Ledger" title="Recent item history">
            <ul className="divide-y divide-gray-200 text-sm dark:divide-gray-700">
                {history.slice(0, 15).map((entry) => (
                    <li key={entry.id} className="flex items-center justify-between gap-3 py-2">
                        <div className="min-w-0">
                            <p className="truncate font-medium">{entry.itemName}</p>
                            <p className="truncate text-xs text-gray-500 dark:text-gray-400">
                                {entry.reason} · {formatDateTime(entry.createdAt)}
                            </p>
                        </div>
                        <div className="shrink-0 text-right">
                            <span
                                className={classNames(
                                    'font-semibold tabular-nums',
                                    entry.delta > 0 ? 'text-success' : 'text-error',
                                )}
                            >
                                {entry.delta > 0 ? `+${entry.delta}` : entry.delta}
                            </span>
                            <span className="block text-xs text-gray-500">now {entry.balanceAfter}</span>
                        </div>
                    </li>
                ))}
            </ul>
        </SystemPanel>
    )
}

function SkillBookSection() {
    const book = useSkillBookStore((s) => s.data)
    const error = useSkillBookStore((s) => s.error)
    const refresh = useSkillBookStore((s) => s.refresh)
    const [sensing, setSensing] = useState(false)

    if (!book) {
        return (
            <SystemPanel eyebrow="Skill book" title="Skills">
                {error ? <ErrorState message={error} onRetry={() => void refresh()} /> : <Loading loading />}
            </SystemPanel>
        )
    }
    const unlocked = book.skills.filter((s) => s.unlocked).length

    return (
        <SystemPanel
            eyebrow="Skill book"
            title="Skills"
            actions={
                <span className="text-sm text-gray-500 dark:text-gray-400">
                    {unlocked} of {book.skills.length} unlocked
                </span>
            }
        >
            {book.skills.length === 0 ? (
                <EmptyState compact icon={navigationIcon.skills} title="No skills yet" />
            ) : (
                <ul className="grid gap-4 md:grid-cols-2">
                    {book.skills.map((entry) => (
                        <li key={entry.skill.id}>
                            <SkillCard
                                entry={entry}
                                onUse={entry.skill.code === 'dungeon_sense' ? () => setSensing(true) : undefined}
                            />
                        </li>
                    ))}
                </ul>
            )}
            <DungeonSenseDialog isOpen={sensing} onClose={() => setSensing(false)} />
        </SystemPanel>
    )
}

/** The student's bag (items, Easter Bunnies) and skill book */
export default function InventoryClientPage() {
    usePageBreadcrumbs([{ label: 'Dashboard', href: homePath }, { label: 'Inventory & Skills' }])

    return (
        <InventorySWRProvider>
            <SkillBookSWRProvider>
                <PageHeader
                    eyebrow="Player"
                    title="Inventory & Skills"
                    description="Items you’ve found and the skills you’ve unlocked. Skills grow with your level, rank and discoveries."
                />
                <div className="grid gap-6 xl:grid-cols-5">
                    <div className="space-y-6 xl:col-span-2">
                        <ItemsSection />
                        <HistorySection />
                    </div>
                    <div className="xl:col-span-3">
                        <SkillBookSection />
                    </div>
                </div>
            </SkillBookSWRProvider>
        </InventorySWRProvider>
    )
}
