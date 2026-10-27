'use client'

import { useMemo } from 'react'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import { SearchIcon } from '@/configs/icons.config'
import { AUTHORABLE_QUESTION_KINDS, questionKindLabel } from '@/@types/activities/Question'
import { DIFFICULTY_LABELS } from '@/@types/activities/ActivityKindOptions'
import type { BankQuery } from '@/@types/bank/BankQuestion'

interface BankFiltersProps {
    value: BankQuery
    onChange: (value: BankQuery) => void
    /** Tags in use in the bank (for the tag picker) */
    tags: string[]
    idPrefix: string
}

const kindOptions = [
    { value: '', label: 'All types' },
    ...AUTHORABLE_QUESTION_KINDS.map((kind) => ({ value: kind, label: questionKindLabel[kind] })),
]
const difficultyOptions = [
    { value: '', label: 'Any difficulty' },
    ...DIFFICULTY_LABELS.map((label, i) => ({ value: String(i + 1), label: `${i + 1} — ${label}` })),
]

/** Search, type, tag and difficulty filters for the question bank */
export default function BankFilters({ value, onChange, tags, idPrefix }: BankFiltersProps) {
    const tagOptions = useMemo(
        () => [{ value: '', label: 'All tags' }, ...tags.map((t) => ({ value: t, label: t }))],
        [tags],
    )

    return (
        <div className="grid gap-3 md:grid-cols-[1fr_repeat(3,minmax(0,11rem))]">
            <div>
                <label htmlFor={`${idPrefix}-search`} className="sr-only">
                    Search questions
                </label>
                <Input
                    id={`${idPrefix}-search`}
                    size="sm"
                    prefix={<SearchIcon className="text-lg" />}
                    placeholder="Search question text or tags"
                    value={value.q ?? ''}
                    onChange={(e) => onChange({ ...value, q: e.target.value })}
                />
            </div>
            <Select
                size="sm"
                aria-label="Question type"
                options={kindOptions}
                value={kindOptions.find((o) => o.value === (value.kind ?? ''))}
                onChange={(o) => onChange({ ...value, kind: o?.value || undefined })}
                isSearchable={false}
            />
            <Select
                size="sm"
                aria-label="Tag"
                options={tagOptions}
                value={tagOptions.find((o) => o.value === (value.tag ?? '')) ?? tagOptions[0]}
                onChange={(o) => onChange({ ...value, tag: o?.value || undefined })}
            />
            <Select
                size="sm"
                aria-label="Difficulty"
                options={difficultyOptions}
                value={difficultyOptions.find((o) => o.value === String(value.difficulty ?? ''))}
                onChange={(o) => onChange({ ...value, difficulty: o?.value ? Number(o.value) : undefined })}
                isSearchable={false}
            />
        </div>
    )
}
