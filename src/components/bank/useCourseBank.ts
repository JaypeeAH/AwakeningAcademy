'use client'

import { useMemo, useState } from 'react'
import { useSWRBank } from '@/services/grading'
import { filterBankQuestions } from '@/utils/questionBank'
import useDebouncedValue from '@/utils/hooks/useDebouncedValue'
import type { BankQuery } from '@/@types/bank/BankQuestion'

/**
 * A course's question bank with client-side filters. The whole bank (up to 500 questions) loads once, so
 * filtering is instant and the tag picker knows every tag. Bank data is local to the dialog/tab that shows
 * it, so it reads SWR directly rather than through a store.
 */
export default function useCourseBank(courseId: string | null) {
    const swr = useSWRBank(courseId)
    const [filter, setFilter] = useState<BankQuery>({})
    const debouncedQ = useDebouncedValue(filter.q ?? '', 250)

    const tags = useMemo(() => [...new Set((swr.data ?? []).flatMap((q) => q.tags))].sort(), [swr.data])
    const visible = useMemo(
        () => filterBankQuestions(swr.data ?? [], { ...filter, q: debouncedQ }),
        [swr.data, filter, debouncedQ],
    )

    return { ...swr, filter, setFilter, tags, visible }
}
