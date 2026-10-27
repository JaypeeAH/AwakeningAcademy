'use client'

import Alert from '@/components/ui/Alert'
import Card from '@/components/ui/Card'
import Table from '@/components/ui/Table'
import LinkButton from '@/components/ui/LinkButton'
import EmptyState from '@/components/shared/EmptyState'
import ErrorState from '@/components/shared/ErrorState'
import Loading from '@/components/shared/Loading'
import { XpReward } from '@/components/game/GameTags'
import { LeaderboardSWRProvider } from './ManageSWRProviders'
import navigationIcon, { guildEmblemIcon } from '@/configs/icons.config'
import { getCoursePath } from '@/configs/app.config'
import { useLeaderboardStore } from '@/stores/GameStores'
import { formatDate } from '@/utils/dates'
import { leaderboardModeLabel } from '@/@types/game/Guilds'

const { THead, TBody, Tr, Th, Td } = Table

/** The weekly leaderboard exactly as students see it (teachers change its visibility in the Guilds tab) */
export default function LeaderboardTab({ courseId }: { courseId: string }) {
    return (
        <LeaderboardSWRProvider courseId={courseId}>
            <Board courseId={courseId} />
        </LeaderboardSWRProvider>
    )
}

function Board({ courseId }: { courseId: string }) {
    const board = useLeaderboardStore(courseId, (s) => s.data)
    const error = useLeaderboardStore(courseId, (s) => s.error)
    const refresh = useLeaderboardStore(courseId, (s) => s.refresh)

    if (!board) {
        return error ? (
            <ErrorState message={error} onRetry={() => void refresh()} />
        ) : (
            <Loading loading message="Tallying this week’s XP…" />
        )
    }

    const week = `${formatDate(board.weekStart)} – ${formatDate(new Date(board.weekEnd.getTime() - 1))}`

    if (board.mode === 'off') {
        return (
            <EmptyState
                icon={navigationIcon.leaderboard}
                title="The leaderboard is off"
                description="Students don’t see a leaderboard in this course. To turn it on, choose “Initials only” or “Display names” under Guilds & leaderboard in the Guilds tab."
                action={
                    <LinkButton size="sm" href={getCoursePath(courseId, 'guilds')} icon={navigationIcon.guilds}>
                        Open the Guilds tab
                    </LinkButton>
                }
            />
        )
    }

    return (
        <div className="space-y-6">
            <Alert showIcon type="info">
                Students see this board ({leaderboardModeLabel[board.mode].toLowerCase()}) for the week of {week}. It
                counts only XP earned in this course this week; students who chose to hide themselves aren’t listed.
            </Alert>
            <div className="grid gap-6 lg:grid-cols-2">
                <Card header={{ content: <h4>Students</h4> }} bodyClass="p-0">
                    {board.entries.length ? (
                        <Table>
                            <THead>
                                <Tr>
                                    <Th className="w-16">#</Th>
                                    <Th>Student</Th>
                                    <Th className="text-right">XP this week</Th>
                                </Tr>
                            </THead>
                            <TBody>
                                {board.entries.map((entry) => (
                                    <Tr key={entry.key}>
                                        <Td className="font-semibold tabular-nums">{entry.position}</Td>
                                        <Td>{entry.label}</Td>
                                        <Td className="text-right">
                                            <XpReward amount={entry.xp} />
                                        </Td>
                                    </Tr>
                                ))}
                            </TBody>
                        </Table>
                    ) : (
                        <p className="p-5 text-sm text-gray-500">No XP earned in this course yet this week.</p>
                    )}
                </Card>
                <Card header={{ content: <h4>Guilds</h4> }} bodyClass="p-0">
                    {board.guilds.length ? (
                        <Table>
                            <THead>
                                <Tr>
                                    <Th className="w-16">#</Th>
                                    <Th>Guild</Th>
                                    <Th className="text-right">XP this week</Th>
                                </Tr>
                            </THead>
                            <TBody>
                                {board.guilds.map((guild) => (
                                    <Tr key={guild.key}>
                                        <Td className="font-semibold tabular-nums">{guild.position}</Td>
                                        <Td>
                                            <span className="flex items-center gap-2">
                                                <span className="text-primary" aria-hidden>
                                                    {guildEmblemIcon[guild.emblem]}
                                                </span>
                                                {guild.name}
                                            </span>
                                        </Td>
                                        <Td className="text-right">
                                            <XpReward amount={guild.xp} />
                                        </Td>
                                    </Tr>
                                ))}
                            </TBody>
                        </Table>
                    ) : (
                        <p className="p-5 text-sm text-gray-500">
                            No guild has earned XP this week yet. A guild’s total adds up its members’ XP.
                        </p>
                    )}
                </Card>
            </div>
        </div>
    )
}
