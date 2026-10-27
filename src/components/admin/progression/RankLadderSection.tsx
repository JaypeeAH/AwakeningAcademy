'use client'

import { Controller, useFormContext, useFormState } from 'react-hook-form'
import Card from '@/components/ui/Card'
import Table from '@/components/ui/Table'
import Input from '@/components/ui/Input'
import Alert from '@/components/ui/Alert'
import RankEmblem from '@/components/game/RankEmblem'
import NumberField from './NumberField'
import type { ProgressionFormData } from '@/@types/progression/forms/ProgressionFormData'

const { THead, TBody, Tr, Th, Td } = Table

/** One row per rank (F → SSS). Codes and order are fixed; names, thresholds and mastery gates are editable. */
export default function RankLadderSection() {
    const { control, getValues } = useFormContext<ProgressionFormData>()
    const { errors } = useFormState({ control, name: 'ranks' })
    const ranks = getValues('ranks')
    // Ladder-wide problems (from validateRankLadder) arrive as a root error on `ranks`
    const ladderError = errors.ranks?.root?.message ?? errors.ranks?.message

    return (
        <Card header={{ content: <h4>Rank ladder</h4> }} bodyClass="p-0">
            <div className="space-y-3 p-5 pb-4 text-sm text-gray-500 md:p-6 md:pb-4 dark:text-gray-400">
                <p>
                    A student is promoted when they reach the rank’s starting level <strong>and</strong> meet every
                    mastery gate: their average best score on graded assessments (quizzes, exams, homework, boss
                    battles), how many of those they’ve passed, and how many lessons they’ve completed. Practice quizzes
                    don’t count toward mastery.
                </p>
                <p>
                    Ranks are never taken away — lowering a requirement can promote students, raising one won’t demote
                    anyone.
                </p>
                {ladderError && (
                    <Alert type="danger" showIcon>
                        {ladderError}
                    </Alert>
                )}
            </div>
            <div className="overflow-x-auto">
                <Table>
                    <THead>
                        <Tr>
                            <Th>Rank</Th>
                            <Th className="min-w-[14rem]">Name &amp; description</Th>
                            <Th>Starts at level</Th>
                            <Th>Average score</Th>
                            <Th>Passed assessments</Th>
                            <Th>Lessons completed</Th>
                        </Tr>
                    </THead>
                    <TBody>
                        {ranks.map((rank, i) => (
                            <Tr key={rank.id}>
                                <Td>
                                    <div className="flex items-center gap-2">
                                        <RankEmblem code={rank.code} size={40} />
                                        <span className="font-bold">{rank.code}</span>
                                    </div>
                                </Td>
                                <Td>
                                    <Controller
                                        name={`ranks.${i}.name`}
                                        control={control}
                                        render={({ field, fieldState }) => (
                                            <>
                                                <Input
                                                    size="sm"
                                                    aria-label={`${rank.code}-Rank name`}
                                                    invalid={!!fieldState.error}
                                                    maxLength={60}
                                                    {...field}
                                                />
                                                {fieldState.error && (
                                                    <p className="mt-1 text-xs text-error">
                                                        {fieldState.error.message}
                                                    </p>
                                                )}
                                            </>
                                        )}
                                    />
                                    <Controller
                                        name={`ranks.${i}.description`}
                                        control={control}
                                        render={({ field }) => (
                                            <Input
                                                size="sm"
                                                className="mt-2"
                                                aria-label={`${rank.code}-Rank description`}
                                                placeholder="Shown to students"
                                                maxLength={300}
                                                {...field}
                                            />
                                        )}
                                    />
                                </Td>
                                <Td>
                                    <NumberField
                                        name={`ranks.${i}.minLevel`}
                                        id={`rank-${rank.code}-level`}
                                        label={`${rank.code}-Rank starting level`}
                                        min={1}
                                        max={500}
                                    />
                                </Td>
                                <Td>
                                    <NumberField
                                        name={`ranks.${i}.minAverageScore`}
                                        id={`rank-${rank.code}-score`}
                                        label={`${rank.code}-Rank minimum average score`}
                                        min={0}
                                        max={100}
                                        suffix="%"
                                    />
                                </Td>
                                <Td>
                                    <NumberField
                                        name={`ranks.${i}.minPassedAssessments`}
                                        id={`rank-${rank.code}-passed`}
                                        label={`${rank.code}-Rank passed assessments`}
                                        min={0}
                                        max={1000}
                                    />
                                </Td>
                                <Td>
                                    <NumberField
                                        name={`ranks.${i}.minCompletedLessons`}
                                        id={`rank-${rank.code}-lessons`}
                                        label={`${rank.code}-Rank lessons completed`}
                                        min={0}
                                        max={1000}
                                    />
                                </Td>
                            </Tr>
                        ))}
                    </TBody>
                </Table>
            </div>
        </Card>
    )
}
