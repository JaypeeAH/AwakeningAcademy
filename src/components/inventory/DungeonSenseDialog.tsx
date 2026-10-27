'use client'

import { useMemo, useState } from 'react'
import Dialog from '@/components/ui/Dialog'
import Button from '@/components/ui/Button'
import Select from '@/components/ui/Select'
import { FormItem } from '@/components/ui/Form'
import { toastError } from '@/components/ui/toast/toast'
import { CoursesSWRProvider } from '@/components/courses/CourseSWRProviders'
import { SenseIcon } from '@/configs/icons.config'
import { apiUseSkill } from '@/services/game'
import { useCoursesStore, useSkillBookStore } from '@/stores/GameStores'
import type { SkillEffect } from '@/@types/game/Inventory'

type Sensed = Extract<SkillEffect, { kind: 'dungeon_sense' }>

interface DungeonSenseDialogProps {
    isOpen: boolean
    onClose: () => void
}

function DungeonSenseForm({ onClose }: { onClose: () => void }) {
    const courses = useCoursesStore((s) => s.data)
    const loadingCourses = useCoursesStore((s) => s.loading)
    const refreshSkills = useSkillBookStore((s) => s.refresh)
    const [courseId, setCourseId] = useState<string | null>(null)
    const [using, setUsing] = useState(false)
    const [sensed, setSensed] = useState<Sensed | null>(null)

    const options = useMemo(
        () =>
            (courses ?? [])
                .filter((c) => c.status === 'published' && !c.canManage)
                .map((c) => ({ value: c.id, label: c.title })),
        [courses],
    )

    const sense = async () => {
        if (!courseId) return
        setUsing(true)
        try {
            const effect = await apiUseSkill({ skill: 'dungeon_sense', courseId })
            if (effect.kind === 'dungeon_sense') setSensed(effect)
            await refreshSkills()
        } catch (error) {
            toastError('Dungeon Sense couldn’t find anything right now.', error)
        } finally {
            setUsing(false)
        }
    }

    if (sensed) {
        return (
            <div className="text-center" aria-live="polite">
                <div className="system-eyebrow">A presence stirs in {sensed.courseTitle}</div>
                <h3 className="font-display mt-2 text-2xl">{sensed.eggTitle}</h3>
                <p className="mt-4 rounded-xl bg-gray-50 p-4 text-left text-sm dark:bg-gray-900">{sensed.clue}</p>
                <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
                    The secret is still yours to find — this is only its scent.
                </p>
                <Button className="mt-6" variant="solid" onClick={onClose} autoFocus>
                    Got it
                </Button>
            </div>
        )
    }

    return (
        <>
            <div className="system-eyebrow">Skill · Dungeon Sense</div>
            <h3 className="mt-1 text-lg font-semibold">Sense a hidden secret</h3>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                Choose a course. Dungeon Sense reveals the name of one secret you haven’t found yet, and a hint about
                where to look. It uses one charge.
            </p>
            <FormItem className="mt-4" label="Course" htmlFor="sense-course">
                <Select
                    inputId="sense-course"
                    options={options}
                    isLoading={loadingCourses}
                    placeholder={options.length || loadingCourses ? 'Choose a course' : 'Join a course first'}
                    value={options.find((o) => o.value === courseId) ?? null}
                    onChange={(option) => setCourseId(option?.value ?? null)}
                />
            </FormItem>
            <div className="mt-6 flex justify-end gap-2">
                <Button onClick={onClose}>Cancel</Button>
                <Button variant="solid" icon={<SenseIcon />} loading={using} disabled={!courseId} onClick={sense}>
                    Sense
                </Button>
            </div>
        </>
    )
}

/** Dungeon Sense: the one skill used from the skill book itself */
export default function DungeonSenseDialog({ isOpen, onClose }: DungeonSenseDialogProps) {
    return (
        <Dialog isOpen={isOpen} onClose={onClose} onRequestClose={onClose} width={480}>
            {isOpen && (
                <CoursesSWRProvider>
                    <DungeonSenseForm onClose={onClose} />
                </CoursesSWRProvider>
            )}
        </Dialog>
    )
}
