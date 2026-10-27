'use client'

import { useState, type ReactNode } from 'react'
import Tag from '@/components/ui/Tag'
import Button from '@/components/ui/Button'
import QuestionCard, { EMPTY_ANSWER } from '@/components/learn/QuestionCard'
import { DifficultyStars } from '@/components/game/GameTags'
import { CollapseIcon, ExpandIcon } from '@/configs/icons.config'
import { questionKindLabel } from '@/@types/activities/Question'
import { formatDate } from '@/utils/dates'
import classNames from '@/utils/classNames'
import type { BankQuestion } from '@/@types/bank/BankQuestion'

interface BankQuestionListProps {
    questions: BankQuestion[]
    /** Selection mode (Add from bank) */
    selected?: Set<string>
    onToggle?: (id: string) => void
    /** Row actions (Question bank tab) */
    actions?: (question: BankQuestion) => ReactNode
}

/** Bank questions with their tags and a read-only preview (answers shown — this is teacher-only). */
export default function BankQuestionList({ questions, selected, onToggle, actions }: BankQuestionListProps) {
    const [open, setOpen] = useState<Set<string>>(new Set())
    const toggleOpen = (id: string) =>
        setOpen((prev) => {
            const next = new Set(prev)
            if (next.has(id)) next.delete(id)
            else next.add(id)
            return next
        })

    return (
        <ul className="space-y-3">
            {questions.map((q) => {
                const isSelected = selected?.has(q.id) ?? false
                const expanded = open.has(q.id)
                const preview = {
                    id: q.id,
                    kind: q.kind,
                    prompt: q.prompt,
                    points: q.points,
                    position: 0,
                    options: q.options.map((o, i) => ({ ...o, position: i })),
                }
                return (
                    <li
                        key={q.id}
                        className={classNames(
                            'rounded-2xl border bg-white p-4 dark:bg-gray-800',
                            isSelected ? 'border-primary ring-1 ring-primary' : 'border-gray-200 dark:border-gray-700',
                        )}
                    >
                        <div className="flex items-start gap-3">
                            {onToggle && (
                                <input
                                    type="checkbox"
                                    className="mt-1 h-4 w-4 shrink-0 accent-[var(--primary)]"
                                    checked={isSelected}
                                    onChange={() => onToggle(q.id)}
                                    aria-label={`Select: ${q.prompt.slice(0, 80)}`}
                                />
                            )}
                            <div className="min-w-0 flex-1">
                                <p className="line-clamp-2 font-medium text-gray-900 dark:text-gray-50">{q.prompt}</p>
                                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-gray-500">
                                    <Tag className="border-transparent bg-gray-100 dark:bg-gray-700">
                                        {questionKindLabel[q.kind]}
                                    </Tag>
                                    <DifficultyStars difficulty={q.difficulty} />
                                    <span>
                                        {q.points} {q.points === 1 ? 'point' : 'points'}
                                    </span>
                                    {q.tags.map((tag) => (
                                        <Tag key={tag} className="border-transparent bg-primary-subtle text-primary">
                                            #{tag}
                                        </Tag>
                                    ))}
                                    <span>
                                        Saved {formatDate(q.createdAt)}
                                        {q.createdByName && ` by ${q.createdByName}`}
                                    </span>
                                </div>
                            </div>
                            <div className="flex shrink-0 items-center gap-1">
                                <Button
                                    size="xs"
                                    variant="plain"
                                    icon={expanded ? <CollapseIcon /> : <ExpandIcon />}
                                    onClick={() => toggleOpen(q.id)}
                                    aria-expanded={expanded}
                                >
                                    Preview
                                </Button>
                                {actions?.(q)}
                            </div>
                        </div>
                        {expanded && (
                            <div className="mt-3">
                                {q.objectives.length > 0 && (
                                    <p className="mb-2 text-xs text-gray-500">Objectives: {q.objectives.join(' · ')}</p>
                                )}
                                <QuestionCard
                                    question={preview}
                                    index={0}
                                    total={1}
                                    answer={EMPTY_ANSWER}
                                    review={{ response: null, key: q.key }}
                                    className="bg-gray-50 dark:bg-gray-900"
                                />
                            </div>
                        )}
                    </li>
                )
            })}
        </ul>
    )
}
