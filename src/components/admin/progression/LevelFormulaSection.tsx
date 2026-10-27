'use client'

import { useMemo } from 'react'
import { useFormContext, useWatch } from 'react-hook-form'
import Card from '@/components/ui/Card'
import Table from '@/components/ui/Table'
import { FormItem } from '@/components/ui/Form'
import { RankTag } from '@/components/game/GameTags'
import NumberField from './NumberField'
import { xpForLevel, xpToNextLevel } from '@/utils/progression'
import type { ProgressionFormData } from '@/@types/progression/forms/ProgressionFormData'

const { THead, TBody, Tr, Th, Td } = Table

const valid = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n)

/** Level formula fields with a live preview of what each level costs. */
export default function LevelFormulaSection() {
    const { control } = useFormContext<ProgressionFormData>()
    const settings = useWatch({ control, name: 'settings' })
    const ranks = useWatch({ control, name: 'ranks' })
    const baseXp = valid(settings?.baseXp) ? settings.baseXp : 0
    const xpStep = valid(settings?.xpStep) ? settings.xpStep : 0
    const maxLevel = valid(settings?.maxLevel) ? settings.maxLevel : 0

    // Levels 1–10, then every rank's starting level
    const rows = useMemo(() => {
        const levels = new Set<number>(Array.from({ length: 10 }, (_, i) => i + 1))
        ranks?.forEach((r) => valid(r.minLevel) && levels.add(r.minLevel))
        if (maxLevel) levels.add(maxLevel)
        return [...levels]
            .filter((l) => l >= 1 && (!maxLevel || l <= maxLevel))
            .sort((a, b) => a - b)
            .map((level) => ({
                level,
                ranks: (ranks ?? []).filter((r) => r.minLevel === level).map((r) => r.code),
                toNext: level >= maxLevel ? null : xpToNextLevel(level, { baseXp, xpStep }),
                cumulative: xpForLevel(level, { baseXp, xpStep }),
            }))
    }, [ranks, baseXp, xpStep, maxLevel])

    return (
        <Card header={{ content: <h4>Level formula</h4> }}>
            <div className="grid gap-6 lg:grid-cols-2">
                <div>
                    <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
                        Levels come from a student’s total XP. Going from level 1 to 2 costs{' '}
                        <strong className="text-gray-900 dark:text-gray-100">{baseXp.toLocaleString()} XP</strong>, and
                        each level after that costs{' '}
                        <strong className="text-gray-900 dark:text-gray-100">{xpStep.toLocaleString()} XP</strong> more
                        than the one before — so XP for level L → L+1 = {baseXp} + {xpStep} × (L − 1). Levels stop at{' '}
                        {maxLevel || '—'}.
                    </p>
                    <div className="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
                        <FormItem
                            label="XP for level 1 → 2"
                            htmlFor="settings-baseXp"
                            extra={<span className="text-xs text-gray-500">10–10,000</span>}
                        >
                            <NumberField
                                name="settings.baseXp"
                                id="settings-baseXp"
                                label="XP for level 1 to 2"
                                min={10}
                                max={10000}
                            />
                        </FormItem>
                        <FormItem
                            label="Extra XP per level"
                            htmlFor="settings-xpStep"
                            extra={<span className="text-xs text-gray-500">0–1,000</span>}
                        >
                            <NumberField
                                name="settings.xpStep"
                                id="settings-xpStep"
                                label="Extra XP per level"
                                min={0}
                                max={1000}
                            />
                        </FormItem>
                        <FormItem
                            label="Maximum level"
                            htmlFor="settings-maxLevel"
                            extra={<span className="text-xs text-gray-500">10–500</span>}
                        >
                            <NumberField
                                name="settings.maxLevel"
                                id="settings-maxLevel"
                                label="Maximum level"
                                min={10}
                                max={500}
                            />
                        </FormItem>
                        <FormItem
                            label="High-score bonus from"
                            htmlFor="settings-highScoreThreshold"
                            extra={
                                <span className="text-xs text-gray-500">Quiz score that earns the bonus (50–100%)</span>
                            }
                        >
                            <NumberField
                                name="settings.highScoreThreshold"
                                id="settings-highScoreThreshold"
                                label="High-score bonus threshold"
                                min={50}
                                max={100}
                                suffix="%"
                            />
                        </FormItem>
                    </div>
                </div>
                <div>
                    <div className="system-eyebrow mb-2">Preview</div>
                    <div className="max-h-96 overflow-auto rounded-xl border border-gray-200 dark:border-gray-700">
                        <Table compact>
                            <THead>
                                <Tr>
                                    <Th>Level</Th>
                                    <Th className="text-right">Total XP to reach</Th>
                                    <Th className="text-right">XP to next level</Th>
                                </Tr>
                            </THead>
                            <TBody>
                                {rows.map((row) => (
                                    <Tr key={row.level}>
                                        <Td className="whitespace-nowrap">
                                            <span className="font-semibold tabular-nums">{row.level}</span>
                                            {row.ranks.map((code) => (
                                                <RankTag key={code} code={code} className="ml-2" />
                                            ))}
                                        </Td>
                                        <Td className="text-right tabular-nums">{row.cumulative.toLocaleString()}</Td>
                                        <Td className="text-right tabular-nums">
                                            {row.toNext === null ? 'Max' : row.toNext.toLocaleString()}
                                        </Td>
                                    </Tr>
                                ))}
                            </TBody>
                        </Table>
                    </div>
                </div>
            </div>
        </Card>
    )
}
