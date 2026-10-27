'use client'

import { useFormContext } from 'react-hook-form'
import Card from '@/components/ui/Card'
import Table from '@/components/ui/Table'
import NumberField from './NumberField'
import { xpSourceLabel } from '@/@types/progression/XpSourceOptions'
import type { ProgressionFormData } from '@/@types/progression/forms/ProgressionFormData'
import type { XpSource } from '@/@types/progression/Progression'

const { THead, TBody, Tr, Th, Td } = Table

const sourceHint: Partial<Record<XpSource, string>> = {
    lesson_completion: 'Once per lesson',
    quiz_completion: 'First pass of a quiz or practice quiz',
    exam_completion: 'First pass of an exam',
    high_score_bonus: 'Fixed bonus at or above the high-score threshold',
    homework_completion: 'First pass of homework (after marking)',
    boss_battle: 'First win of a boss battle',
    secret_quest: 'Range for the XP a discovered secret gives (teachers choose within it)',
    streak: 'Each streak milestone (once per milestone, ever)',
    skill_bonus: 'Overdrive bonus, paid once with the first pass of an armed quest',
    achievement: 'Range for the XP an achievement can give',
    team_quest: 'Each member, when their guild completes a team quest',
}

/** Default XP per kind of reward and the range teachers may choose from when they build activities. */
export default function XpRulesSection() {
    const { getValues } = useFormContext<ProgressionFormData>()
    const rules = getValues('xpRules')

    return (
        <Card header={{ content: <h4>XP rewards</h4> }} bodyClass="p-0">
            <p className="p-5 pb-4 text-sm text-gray-500 md:p-6 md:pb-4 dark:text-gray-400">
                New activities start with the default. Teachers can change an activity’s XP, but only within the minimum
                and maximum you set (the default must sit between them). The high-score bonus always uses its default.
            </p>
            <div className="overflow-x-auto">
                <Table>
                    <THead>
                        <Tr>
                            <Th>Reward</Th>
                            <Th>Minimum</Th>
                            <Th>Default</Th>
                            <Th>Maximum</Th>
                        </Tr>
                    </THead>
                    <TBody>
                        {rules.map((rule, i) => {
                            const label = xpSourceLabel[rule.source as XpSource] ?? rule.source
                            return (
                                <Tr key={rule.source}>
                                    <Td>
                                        <div className="font-semibold text-gray-900 dark:text-gray-100">{label}</div>
                                        <div className="text-xs text-gray-500">
                                            {sourceHint[rule.source as XpSource]}
                                        </div>
                                    </Td>
                                    <Td>
                                        <NumberField
                                            name={`xpRules.${i}.minXp`}
                                            id={`xp-${rule.source}-min`}
                                            label={`${label} minimum XP`}
                                            min={0}
                                        />
                                    </Td>
                                    <Td>
                                        <NumberField
                                            name={`xpRules.${i}.defaultXp`}
                                            id={`xp-${rule.source}-default`}
                                            label={`${label} default XP`}
                                            min={0}
                                        />
                                    </Td>
                                    <Td>
                                        <NumberField
                                            name={`xpRules.${i}.maxXp`}
                                            id={`xp-${rule.source}-max`}
                                            label={`${label} maximum XP`}
                                            min={0}
                                        />
                                    </Td>
                                </Tr>
                            )
                        })}
                    </TBody>
                </Table>
            </div>
        </Card>
    )
}
