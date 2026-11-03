'use client'

import Input, { type InputProps } from '@/components/ui/Input'
import { useSWRSections } from '@/services/users'

/**
 * A class or group label (e.g. "11-STEM A"), suggesting the sections already in use so the same section
 * isn't typed two different ways.
 */
export default function SectionInput({ id, ...props }: InputProps & { id: string }) {
    const { data: sections } = useSWRSections()
    return (
        <>
            <Input
                id={id}
                list={`${id}-options`}
                autoComplete="off"
                maxLength={40}
                placeholder="e.g. 11-STEM A"
                {...props}
            />
            <datalist id={`${id}-options`}>
                {(sections ?? []).map((section) => (
                    <option key={section} value={section} />
                ))}
            </datalist>
        </>
    )
}
