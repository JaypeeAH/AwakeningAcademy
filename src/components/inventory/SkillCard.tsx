import Button from '@/components/ui/Button'
import Tag from '@/components/ui/Tag'
import classNames from '@/utils/classNames'
import navigationIcon, {
    CheckIcon,
    EchoIcon,
    InsightIcon,
    LockedIcon,
    OverdriveIcon,
    SecondChanceIcon,
    SenseIcon,
    SkillIcon,
    TimerIcon,
} from '@/configs/icons.config'
import { activityKindLabel } from '@/@types/activities/ActivityKindOptions'
import { rarityLabel, rarityTagClass, type PlayerSkill } from '@/@types/game/Inventory'
import { fromNow } from '@/utils/dates'
import type { ReactNode } from 'react'

const skillIcon: Record<string, ReactNode> = {
    insight: <InsightIcon />,
    knowledge_echo: <EchoIcon />,
    time_dilation: <TimerIcon />,
    second_chance: <SecondChanceIcon />,
    overdrive: <OverdriveIcon />,
    dungeon_sense: <SenseIcon />,
    guild_leader: navigationIcon.team,
}

/** Where the student activates each skill */
const whereUsed = (code: string, passive: boolean) => {
    if (passive) return 'Passive — always active once unlocked.'
    switch (code) {
        case 'insight':
        case 'knowledge_echo':
            return 'Use it from inside a quiz.'
        case 'time_dilation':
            return 'Use it from inside a timed quiz.'
        case 'second_chance':
        case 'overdrive':
            return 'Use it from the quest page.'
        case 'dungeon_sense':
            return 'Use it here to sense a hidden secret in one of your courses.'
        default:
            return null
    }
}

interface SkillCardProps {
    entry: PlayerSkill
    /** Dungeon Sense is used from this page */
    onUse?: () => void
}

/** A skill in the skill book: unlocked or what it needs, charges and when the next one returns */
export default function SkillCard({ entry, onUse }: SkillCardProps) {
    const { skill, unlocked, requirements, chargesLeft, nextChargeAt } = entry
    const where = whereUsed(skill.code, skill.passive)

    return (
        <article
            className={classNames(
                'flex h-full flex-col gap-3 rounded-2xl border p-4',
                unlocked
                    ? 'border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800'
                    : 'border-dashed border-gray-300 bg-gray-50 dark:border-gray-600 dark:bg-gray-900',
            )}
        >
            <div className="flex items-start gap-3">
                <span
                    className={classNames(
                        'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-xl',
                        unlocked ? rarityTagClass[skill.rarity] : 'bg-gray-200 text-gray-500 dark:bg-gray-700',
                    )}
                    aria-hidden
                >
                    {unlocked ? (skillIcon[skill.code] ?? <SkillIcon />) : <LockedIcon />}
                </span>
                <div className="min-w-0 flex-1">
                    <h3 className="font-semibold">{skill.name}</h3>
                    <div className="mt-1 flex flex-wrap gap-1">
                        <Tag className={rarityTagClass[skill.rarity]}>{rarityLabel[skill.rarity]}</Tag>
                        {unlocked ? (
                            <Tag className="border-transparent bg-success-subtle text-success">Unlocked</Tag>
                        ) : (
                            <Tag>Locked</Tag>
                        )}
                    </div>
                </div>
            </div>

            <p className="text-sm text-gray-600 dark:text-gray-300">{skill.description}</p>

            {!unlocked && (
                <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">To unlock</p>
                    <ul className="mt-1 space-y-1 text-sm">
                        {requirements.map((r) => (
                            <li key={r.label} className="flex items-center gap-2">
                                {r.met ? (
                                    <CheckIcon className="text-success" aria-label="Done" />
                                ) : (
                                    <LockedIcon className="text-gray-400" aria-label="Not yet" />
                                )}
                                <span className={r.met ? 'text-gray-500 line-through' : undefined}>{r.label}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            <dl className="mt-auto space-y-1 text-xs text-gray-500 dark:text-gray-400">
                {!skill.passive && (
                    <div>
                        <dt className="inline font-semibold">Charges: </dt>
                        <dd className="inline">
                            {unlocked ? `${chargesLeft} of ${skill.charges}` : skill.charges} · recharges every{' '}
                            {skill.rechargeHours} h
                            {unlocked && nextChargeAt && chargesLeft < skill.charges && (
                                <> · next {fromNow(nextChargeAt)}</>
                            )}
                        </dd>
                    </div>
                )}
                {skill.eligibleKinds.length > 0 && (
                    <div>
                        <dt className="inline font-semibold">Works on: </dt>
                        <dd className="inline">{skill.eligibleKinds.map((k) => activityKindLabel[k]).join(', ')}</dd>
                    </div>
                )}
                {where && <p>{where}</p>}
            </dl>

            {onUse && unlocked && (
                <Button
                    size="sm"
                    variant="solid"
                    icon={skillIcon[skill.code]}
                    disabled={chargesLeft === 0}
                    onClick={onUse}
                >
                    {chargesLeft === 0 ? 'Recharging' : `Use ${skill.name}`}
                </Button>
            )}
        </article>
    )
}
