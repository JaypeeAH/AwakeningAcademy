'use client'

import { useState } from 'react'
import Link from 'next/link'
import Tabs from '@/components/ui/Tabs'
import Table from '@/components/ui/Table'
import Pagination from '@/components/ui/Pagination'
import PageHeader from '@/components/shared/PageHeader'
import Loading from '@/components/shared/Loading'
import ErrorState from '@/components/shared/ErrorState'
import EmptyState from '@/components/shared/EmptyState'
import RankEmblem from '@/components/game/RankEmblem'
import { XpReward } from '@/components/game/GameTags'
import navigationIcon from '@/configs/icons.config'
import { getLearnPath } from '@/configs/app.config'
import { useSWRRankHistory, useSWRXpHistory } from '@/services/progression'
import { xpSourceLabel } from '@/@types/progression/XpSourceOptions'
import { formatDateTime } from '@/utils/dates'
import { tryGetErrorMessage } from '@/utils/errors'
import { usePageBreadcrumbs } from '@/utils/hooks/useBreadcrumbs'
import { XP_HISTORY_PAGE_SIZE } from '@/constants/app.constant'
import FeedbackTab from './FeedbackTab'

const PAGE_SIZE = XP_HISTORY_PAGE_SIZE

/*
 * Page-local data (a paginated history no other component shares), so these read SWR directly in the
 * tab rather than going through a store.
 */

function XpLedgerTab() {
    const [page, setPage] = useState(1)
    const { data, error, mutate } = useSWRXpHistory(page)
    if (error && !data) return <ErrorState message={tryGetErrorMessage(error)} onRetry={() => void mutate()} />
    if (!data) return <Loading loading />
    if (!data.records.length) {
        return (
            <EmptyState
                icon={navigationIcon.history}
                title="No XP yet"
                description="Every reward you earn is recorded here, with where it came from."
            />
        )
    }
    return (
        <>
            <div className="overflow-x-auto">
                <Table hoverable>
                    <Table.THead>
                        <Table.Tr>
                            <Table.Th>When</Table.Th>
                            <Table.Th>What for</Table.Th>
                            <Table.Th>Type</Table.Th>
                            <Table.Th className="text-right">XP</Table.Th>
                            <Table.Th className="text-right">Total</Table.Th>
                        </Table.Tr>
                    </Table.THead>
                    <Table.TBody>
                        {data.records.map((entry) => (
                            <Table.Tr key={entry.id}>
                                <Table.Td className="whitespace-nowrap">{formatDateTime(entry.createdAt)}</Table.Td>
                                <Table.Td>
                                    {entry.activityId ? (
                                        <Link
                                            href={getLearnPath(entry.activityId)}
                                            className="hover:text-primary hover:underline"
                                        >
                                            {entry.reason}
                                        </Link>
                                    ) : (
                                        entry.reason
                                    )}
                                    {entry.awardedByName && (
                                        <span className="block text-xs text-gray-500">By {entry.awardedByName}</span>
                                    )}
                                </Table.Td>
                                <Table.Td className="whitespace-nowrap text-gray-500">
                                    {xpSourceLabel[entry.source]}
                                </Table.Td>
                                <Table.Td className="text-right">
                                    <XpReward
                                        amount={entry.amount}
                                        className={entry.amount < 0 ? 'text-error' : undefined}
                                    />
                                </Table.Td>
                                <Table.Td className="text-right tabular-nums">
                                    {entry.balanceAfter.toLocaleString()}
                                </Table.Td>
                            </Table.Tr>
                        ))}
                    </Table.TBody>
                </Table>
            </div>
            {data.total > PAGE_SIZE && (
                <Pagination
                    className="mt-4"
                    total={data.total}
                    pageSize={PAGE_SIZE}
                    currentPage={page}
                    onChange={setPage}
                />
            )}
        </>
    )
}

function RankHistoryTab() {
    const { data, error, mutate } = useSWRRankHistory()
    if (error && !data) return <ErrorState message={tryGetErrorMessage(error)} onRetry={() => void mutate()} />
    if (!data) return <Loading loading />
    if (!data.length) {
        return (
            <EmptyState
                icon={navigationIcon.progression}
                title="No promotions yet"
                description="Reach the next rank’s level and pass its mastery trial — your dashboard shows exactly what it needs."
            />
        )
    }
    return (
        <ol className="space-y-3">
            {data.map((entry) => (
                <li
                    key={entry.id}
                    className="flex items-center gap-4 rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800"
                >
                    <RankEmblem code={entry.toRankCode} size={52} />
                    <div>
                        <p className="font-semibold text-gray-900 dark:text-gray-50">
                            {entry.fromRankCode ? `${entry.fromRankCode}-Rank → ` : ''}
                            {entry.toRankCode}-Rank · {entry.toRankName}
                        </p>
                        <p className="text-sm text-gray-500">
                            At level {entry.levelAtPromotion} · {formatDateTime(entry.createdAt)}
                        </p>
                    </div>
                </li>
            ))}
        </ol>
    )
}

/** The Chronicle: every XP transaction and promotion, auditable by the student. */
export default function HistoryClientPage() {
    usePageBreadcrumbs([{ label: 'Chronicle' }])
    const [tab, setTab] = useState('xp')
    return (
        <>
            <PageHeader
                eyebrow="Chronicle"
                title="Your learning history"
                description="How every point of XP and every rank was earned — and what your teachers said."
            />
            <Tabs value={tab} onChange={(value) => setTab(String(value))}>
                <Tabs.TabList>
                    <Tabs.TabNav value="xp">XP ledger</Tabs.TabNav>
                    <Tabs.TabNav value="ranks">Promotions</Tabs.TabNav>
                    <Tabs.TabNav value="feedback">Feedback</Tabs.TabNav>
                </Tabs.TabList>
                <div className="pt-5">
                    <Tabs.TabContent value="xp">{tab === 'xp' && <XpLedgerTab />}</Tabs.TabContent>
                    <Tabs.TabContent value="ranks">{tab === 'ranks' && <RankHistoryTab />}</Tabs.TabContent>
                    <Tabs.TabContent value="feedback">{tab === 'feedback' && <FeedbackTab />}</Tabs.TabContent>
                </div>
            </Tabs>
        </>
    )
}
