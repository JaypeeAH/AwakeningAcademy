'use client'

import Link from 'next/link'
import LinkButton from '@/components/ui/LinkButton'
import MarkdownContent from '@/components/shared/MarkdownContent'
import SystemPanel from '@/components/game/SystemPanel'
import XpBar from '@/components/game/XpBar'
import { XpReward } from '@/components/game/GameTags'
import navigationIcon, { guildEmblemIcon, SuccessIcon } from '@/configs/icons.config'
import { getCoursePath, getLearnPath } from '@/configs/app.config'
import { usePlayViewStore } from '@/stores/GameStores'
import { formatDateTime } from '@/utils/dates'
import classNames from '@/utils/classNames'

/**
 * A team quest: a guild goal over other activities in the course. Shows the student's guild and how far
 * each member has got. It completes by itself (and pays every member) once enough members finish.
 */
export default function TeamQuestView({ activityId }: { activityId: string }) {
    const view = usePlayViewStore(activityId, (s) => s.data)
    if (!view) return null
    const { activity, quest, team } = view

    return (
        <div className="space-y-6">
            <SystemPanel eyebrow="Team quest" title="Your guild’s mission">
                {activity.body && <MarkdownContent className="mb-4">{activity.body}</MarkdownContent>}
                {team && team.targets.length > 0 && (
                    <>
                        <p className="mb-2 text-sm text-gray-600 dark:text-gray-300">
                            {team.guild
                                ? `${team.required} ${team.required === 1 ? 'member' : 'members'} of your guild must complete:`
                                : 'Guild members must complete:'}
                        </p>
                        <ul className="space-y-1.5">
                            {team.targets.map((target) => (
                                <li key={target.id}>
                                    <Link
                                        href={getLearnPath(target.id)}
                                        className="font-medium text-primary hover:underline"
                                    >
                                        {target.title}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </>
                )}
                <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
                    When it’s done, everyone in the guild earns <XpReward amount={activity.xpReward} />.
                </p>
            </SystemPanel>

            {!team?.guild ? (
                <SystemPanel eyebrow="Guild" title="You’re not in a guild yet">
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                        Team quests are done with a guild. Join one in this course to take part.
                    </p>
                    <LinkButton
                        className="mt-4"
                        variant="solid"
                        icon={navigationIcon.guilds}
                        href={getCoursePath(quest.course.id, 'guilds')}
                    >
                        Find a guild
                    </LinkButton>
                </SystemPanel>
            ) : (
                <SystemPanel
                    eyebrow="Guild progress"
                    title={
                        <span className="flex items-center gap-2">
                            <span className="text-primary" aria-hidden>
                                {guildEmblemIcon[team.guild.emblem] ?? guildEmblemIcon.shield}
                            </span>
                            {team.guild.name}
                        </span>
                    }
                    tone={team.completedAt ? 'gold' : 'system'}
                >
                    {team.completedAt ? (
                        <p className="mb-4 flex items-center gap-2 font-semibold text-success">
                            <SuccessIcon aria-hidden /> Completed together on {formatDateTime(team.completedAt)}
                        </p>
                    ) : (
                        <XpBar
                            className="mb-4"
                            value={team.members.filter((m) => m.complete).length}
                            max={Math.max(team.required, 1)}
                            label="Members finished"
                            valueText={`${team.members.filter((m) => m.complete).length} / ${team.required} needed`}
                        />
                    )}
                    <ul className="divide-y divide-gray-100 dark:divide-gray-700">
                        {team.members.map((member, i) => (
                            <li key={i} className="flex items-center justify-between gap-3 py-2 text-sm">
                                <span className={classNames(member.isYou && 'font-semibold text-primary')}>
                                    {member.displayName}
                                    {member.isYou && ' (you)'}
                                </span>
                                <span
                                    className={classNames(
                                        'flex items-center gap-1 tabular-nums',
                                        member.complete ? 'text-success' : 'text-gray-500',
                                    )}
                                >
                                    {member.complete && <SuccessIcon aria-hidden />}
                                    {member.done} / {member.total}
                                </span>
                            </li>
                        ))}
                    </ul>
                </SystemPanel>
            )}
        </div>
    )
}
