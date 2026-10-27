'use client'

import { useEffect, useId, useState } from 'react'
import Dialog from '@/components/ui/Dialog'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import Segment from '@/components/ui/Segment'
import Checkbox from '@/components/ui/Checkbox'
import Spinner from '@/components/ui/Spinner'
import { toastError } from '@/components/ui/toast/toast'
import Loading from '@/components/shared/Loading'
import NumberInput from './NumberInput'
import { SparkleIcon } from '@/configs/icons.config'
import { apiDraftQuestions, useSWRAiStatus } from '@/services/ai'
import { tryGetErrorMessage } from '@/utils/errors'
import {
    DRAFTABLE_KINDS,
    DraftQuestionsSchema,
    MAX_DRAFT_SOURCE_CHARS,
    draftableKindLabel,
    type DraftableKind,
} from '@/@types/ai/QuestionDrafts'
import type { QuestionInput } from '@/@types/activities/ActivitySchema'

interface AiDraftDialogProps {
    isOpen: boolean
    onClose: () => void
    activityId: string
    /** This course's lessons to draft from */
    lessons: { id: string; title: string }[]
    /** The activity's learning objectives */
    objectives: string[]
    /** How many more questions the activity can hold */
    remainingSlots: number
    onDrafted: (questions: QuestionInput[]) => void
}

/** "Draft with AI": choose a source and what you need; drafts arrive unsaved and flagged for review. */
export default function AiDraftDialog(props: AiDraftDialogProps) {
    return (
        <Dialog isOpen={props.isOpen} onClose={props.onClose} onRequestClose={props.onClose} width={640}>
            {props.isOpen && <AiDraftForm {...props} />}
        </Dialog>
    )
}

const difficultyOptions = [
    { value: 1, label: '1 — Easy recall' },
    { value: 2, label: '2 — Understanding' },
    { value: 3, label: '3 — Applying' },
    { value: 4, label: '4 — Analysing' },
    { value: 5, label: '5 — Challenging reasoning' },
]

function AiDraftForm({ onClose, activityId, lessons, objectives, remainingSlots, onDrafted }: AiDraftDialogProps) {
    const id = useId()
    const status = useSWRAiStatus()
    const [source, setSource] = useState<'lesson' | 'text'>(lessons.length ? 'lesson' : 'text')
    const [lessonId, setLessonId] = useState<string | null>(lessons[0]?.id ?? null)
    const [text, setText] = useState('')
    const [count, setCount] = useState(Math.min(5, Math.max(1, remainingSlots)))
    const [kinds, setKinds] = useState<DraftableKind[]>(['single_choice', 'true_false'])
    const [difficulty, setDifficulty] = useState(2)
    const [chosenObjectives, setChosenObjectives] = useState<string[]>(objectives)
    const [busy, setBusy] = useState(false)
    const [elapsed, setElapsed] = useState(0)

    useEffect(() => {
        if (!busy) return
        const timer = setInterval(() => setElapsed((s) => s + 1), 1000)
        return () => clearInterval(timer)
    }, [busy])

    if (status.isLoading) return <Loading loading className="min-h-40" />

    if (!status.data?.enabled) {
        return (
            <div>
                <h5 className="mb-3 flex items-center gap-2">
                    <SparkleIcon aria-hidden /> Draft questions with AI
                </h5>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                    AI drafting isn’t set up. An administrator adds an <code>ANTHROPIC_API_KEY</code> to the server’s
                    environment variables (Vercel → Settings → Environment Variables) and redeploys. You can still write
                    questions yourself.
                </p>
                <div className="mt-6 flex justify-end">
                    <Button onClick={onClose}>Close</Button>
                </div>
            </div>
        )
    }

    const lessonOptions = lessons.map((l) => ({ value: l.id, label: l.title }))
    const max = Math.min(10, remainingSlots)
    const input = {
        lessonId: source === 'lesson' ? lessonId : null,
        text: source === 'text' ? text : '',
        count: Math.min(count, max),
        kinds,
        difficulty,
        objectives: chosenObjectives,
    }
    const parsed = DraftQuestionsSchema.safeParse(input)
    const problem =
        max < 1
            ? 'This activity already has the most questions it can hold.'
            : parsed.success
              ? null
              : parsed.error.issues[0]?.message
    const outOfRequests = status.data.remaining === 0

    const toggle = <T,>(list: T[], value: T, on: boolean) =>
        on ? [...new Set([...list, value])] : list.filter((v) => v !== value)

    const draft = async () => {
        if (!parsed.success) return
        setElapsed(0)
        setBusy(true)
        try {
            const result = await apiDraftQuestions(activityId, parsed.data)
            onDrafted(result.questions)
            void status.mutate()
            onClose()
        } catch (error) {
            toastError(tryGetErrorMessage(error), error)
            void status.mutate()
        } finally {
            setBusy(false)
        }
    }

    return (
        <div>
            <h5 className="mb-1 flex items-center gap-2">
                <SparkleIcon aria-hidden /> Draft questions with AI
            </h5>
            <p className="mb-4 text-sm text-gray-500">
                Drafts are added to this activity unsaved and marked “AI draft”. Check each one — you can’t publish
                until every draft is reviewed.
            </p>

            <fieldset disabled={busy} className="space-y-4">
                <div>
                    <span className="form-label mb-2 block">Draft from</span>
                    <Segment value={source} onChange={(v) => setSource(v as 'lesson' | 'text')} size="sm">
                        <Segment.Item value="lesson" disabled={!lessons.length}>
                            A lesson in this course
                        </Segment.Item>
                        <Segment.Item value="text">Text I paste</Segment.Item>
                    </Segment>
                    {source === 'lesson' ? (
                        <div className="mt-2">
                            <label htmlFor={`${id}-lesson`} className="sr-only">
                                Lesson
                            </label>
                            <Select
                                inputId={`${id}-lesson`}
                                options={lessonOptions}
                                value={lessonOptions.find((o) => o.value === lessonId) ?? null}
                                onChange={(option) => setLessonId(option?.value ?? null)}
                                placeholder="Choose a lesson"
                            />
                        </div>
                    ) : (
                        <div className="mt-2">
                            <label htmlFor={`${id}-text`} className="sr-only">
                                Text to draft from
                            </label>
                            <Input
                                id={`${id}-text`}
                                textArea
                                rows={6}
                                value={text}
                                onChange={(e) => setText(e.target.value)}
                                placeholder="Paste the section of your notes or textbook the questions should cover…"
                                maxLength={MAX_DRAFT_SOURCE_CHARS}
                            />
                            <p className="mt-1 text-right text-xs text-gray-500">
                                {text.length.toLocaleString()} / {MAX_DRAFT_SOURCE_CHARS.toLocaleString()} characters
                            </p>
                        </div>
                    )}
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                        <label htmlFor={`${id}-count`} className="form-label mb-1 block">
                            How many questions
                        </label>
                        <NumberInput
                            id={`${id}-count`}
                            min={1}
                            max={Math.max(1, max)}
                            value={count}
                            onChange={(v) => setCount(v ?? 1)}
                        />
                    </div>
                    <div>
                        <label htmlFor={`${id}-difficulty`} className="form-label mb-1 block">
                            Difficulty
                        </label>
                        <Select
                            inputId={`${id}-difficulty`}
                            options={difficultyOptions}
                            value={difficultyOptions.find((o) => o.value === difficulty)}
                            onChange={(option) => option && setDifficulty(option.value)}
                            isSearchable={false}
                        />
                    </div>
                </div>

                <fieldset>
                    <legend className="form-label mb-2">Question types</legend>
                    <div className="flex flex-wrap gap-x-5 gap-y-2">
                        {DRAFTABLE_KINDS.map((kind) => (
                            <Checkbox
                                key={kind}
                                checked={kinds.includes(kind)}
                                onChange={(on) => setKinds((prev) => toggle(prev, kind, on))}
                            >
                                {draftableKindLabel[kind]}
                            </Checkbox>
                        ))}
                    </div>
                </fieldset>

                {objectives.length > 0 && (
                    <fieldset>
                        <legend className="form-label mb-2">Learning objectives to cover</legend>
                        <div className="space-y-2">
                            {objectives.map((objective) => (
                                <Checkbox
                                    key={objective}
                                    checked={chosenObjectives.includes(objective)}
                                    onChange={(on) => setChosenObjectives((prev) => toggle(prev, objective, on))}
                                >
                                    {objective}
                                </Checkbox>
                            ))}
                        </div>
                    </fieldset>
                )}
            </fieldset>

            {busy && (
                <p
                    className="mt-5 flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300"
                    role="status"
                    aria-live="polite"
                >
                    <Spinner size={18} /> Drafting your questions… this usually takes 30–60 seconds ({elapsed}s)
                </p>
            )}
            {!busy && problem && <p className="mt-4 text-sm text-warning">{problem}</p>}

            <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
                <span className="text-xs text-gray-500">
                    {status.data.remaining !== null &&
                        `${status.data.remaining} AI ${status.data.remaining === 1 ? 'request' : 'requests'} left this hour`}
                </span>
                <div className="flex gap-2">
                    <Button onClick={onClose} disabled={busy}>
                        Cancel
                    </Button>
                    <Button
                        variant="solid"
                        icon={<SparkleIcon />}
                        loading={busy}
                        disabled={!!problem || outOfRequests}
                        onClick={draft}
                    >
                        Draft questions
                    </Button>
                </div>
            </div>
        </div>
    )
}
