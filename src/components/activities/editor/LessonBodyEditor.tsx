'use client'

import {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
    type ClipboardEvent,
    type DragEvent,
    type KeyboardEvent,
} from 'react'
import { useController, useFormContext } from 'react-hook-form'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import Segment from '@/components/ui/Segment'
import { FormItem } from '@/components/ui/Form'
import { toastError } from '@/components/ui/toast/toast'
import MarkdownContent from '@/components/shared/MarkdownContent'
import MarkdownToolbar, { type EditFn, type SecretMarkerOption } from './markdown/MarkdownToolbar'
import ImageDialog from './markdown/ImageDialog'
import VideoDialog from './markdown/VideoDialog'
import VisualLessonEditor from './visual/VisualLessonEditor'
import { ExitFullScreenIcon, FullScreenIcon } from '@/configs/icons.config'
import { uploadCourseImage } from '@/services/media'
import { useSWRCourseSecrets } from '@/services/game'
import { insertBlock, insertInline, wrapSelection, type TextEdit } from '@/utils/markdownEditing'
import { imageMarkdown, readingStats } from '@/utils/media'
import { markerSnippet } from '@/utils/secrets'
import { markdownToDoc, type DocNode } from '@/utils/lessonDoc'
import { tryGetErrorMessage } from '@/utils/errors'
import classNames from '@/utils/classNames'
import type { ActivityFormData } from '@/@types/activities/forms/ActivityFormData'

interface LessonBodyEditorProps {
    label: string
    hint: string
    courseId: string
    activityId: string
    /** Lessons can hold secret markers; assessment briefings can't */
    allowSecrets?: boolean
}

/** visual: what you see is what students get (default) · write: Markdown, for those who prefer it */
type Mode = 'visual' | 'write' | 'split' | 'preview'

const IMAGE_PLACEHOLDER = 'Describe this image'

/**
 * The lesson editor. By default a visual editor (like a word processor) — teachers never see Markdown —
 * with images (upload, this course's library or a link; paste or drop works too), YouTube/Vimeo videos,
 * tip boxes, tables and secret markers. "Markdown" mode edits the same lesson as text, with side-by-side
 * and preview. Either way the lesson is saved as Markdown and rendered exactly as students see it.
 */
export default function LessonBodyEditor({ label, hint, courseId, activityId, allowSecrets }: LessonBodyEditorProps) {
    const { control } = useFormContext<ActivityFormData>()
    const { field, fieldState } = useController({ control, name: 'body' })
    const textarea = useRef<HTMLTextAreaElement | null>(null)
    const [mode, setMode] = useState<Mode>('visual')
    // Image/video chosen in a dialog while in visual mode
    const [pendingInsert, setPendingInsert] = useState<DocNode | null>(null)
    const clearPending = useCallback(() => setPendingInsert(null), [])
    const [fullScreen, setFullScreen] = useState(false)
    const [dialog, setDialog] = useState<'image' | 'video' | null>(null)
    const [uploading, setUploading] = useState(0)
    const body = field.value ?? ''
    const stats = useMemo(() => readingStats(body), [body])

    const secrets = useSWRCourseSecrets(allowSecrets ? courseId : null)
    const secretMarkers = useMemo<SecretMarkerOption[] | undefined>(() => {
        if (!allowSecrets) return undefined
        return (secrets.data ?? [])
            .filter((egg) => egg.markerKey && egg.config.activityId === activityId)
            .map((egg) => ({
                key: egg.markerKey!,
                title: egg.title,
                snippet: markerSnippet(egg.trigger, egg.markerKey!),
                kind: egg.trigger === 'lesson_section' ? ('section' as const) : ('object' as const),
            }))
    }, [allowSecrets, secrets.data, activityId])

    // Full screen: the page behind doesn't scroll, and Escape leaves (unless a dialog is open)
    useEffect(() => {
        if (!fullScreen) return
        const previous = document.body.style.overflow
        document.body.style.overflow = 'hidden'
        const onKey = (e: globalThis.KeyboardEvent) => {
            if (e.key === 'Escape' && !dialog) setFullScreen(false)
        }
        window.addEventListener('keydown', onKey)
        return () => {
            document.body.style.overflow = previous
            window.removeEventListener('keydown', onKey)
        }
    }, [fullScreen, dialog])

    const toggleFullScreen = () => {
        // Markdown mode goes side by side in full screen; the visual editor is already what students see
        if (mode === 'write' && !fullScreen) setMode('split')
        if (mode === 'split' && fullScreen) setMode('write')
        setFullScreen(!fullScreen)
    }

    /** Dialog results: as editor blocks in visual mode, as Markdown text otherwise */
    const insertFromDialog = (markdown: string) => {
        if (mode === 'visual') setPendingInsert(markdownToDoc(markdown).content?.[0] ?? null)
        else apply((s) => insertBlock(s, markdown))
    }

    /** Applies an edit to the current text and selection, then restores focus and the new selection */
    const apply = useCallback(
        (edit: EditFn) => {
            const el = textarea.current
            const value = el?.value ?? body
            const start = el?.selectionStart ?? value.length
            const end = el?.selectionEnd ?? value.length
            const next: TextEdit = edit({ value, start, end })
            field.onChange(next.value)
            requestAnimationFrame(() => {
                if (!textarea.current) return
                textarea.current.focus()
                textarea.current.setSelectionRange(next.selectionStart, next.selectionEnd)
            })
        },
        [body, field],
    )

    const insertLink = () =>
        apply(({ value, start, end }) => {
            const text = value.slice(start, end) || 'link text'
            const edit = insertInline({ value, start, end }, `[${text}](https://)`)
            // Select the address so it can be typed straight away
            const urlStart = start + text.length + 3
            return { ...edit, selectionStart: urlStart, selectionEnd: urlStart + 'https://'.length }
        })

    const uploadImages = async (files: File[]) => {
        const images = files.filter((f) => f.type.startsWith('image/'))
        if (!images.length) return false
        setUploading((n) => n + images.length)
        for (const file of images) {
            try {
                const media = await uploadCourseImage(courseId, file)
                apply((s) => insertBlock(s, imageMarkdown(media.url, IMAGE_PLACEHOLDER), IMAGE_PLACEHOLDER))
            } catch (error) {
                toastError(`${file.name}: ${tryGetErrorMessage(error)}`, error)
            } finally {
                setUploading((n) => n - 1)
            }
        }
        return true
    }

    const onPaste = (e: ClipboardEvent<HTMLTextAreaElement>) => {
        const files = Array.from(e.clipboardData.files)
        if (files.some((f) => f.type.startsWith('image/'))) {
            e.preventDefault()
            void uploadImages(files)
        }
    }

    const onDrop = (e: DragEvent<HTMLTextAreaElement>) => {
        const files = Array.from(e.dataTransfer.files)
        if (files.some((f) => f.type.startsWith('image/'))) {
            e.preventDefault()
            void uploadImages(files)
        }
    }

    const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
        if (!(e.ctrlKey || e.metaKey) || e.altKey) return
        const key = e.key.toLowerCase()
        if (key === 'b') apply((s) => wrapSelection(s, '**', '**', 'bold text'))
        else if (key === 'i') apply((s) => wrapSelection(s, '_', '_', 'italic text'))
        else if (key === 'k') insertLink()
        else return
        e.preventDefault()
    }

    const editor = (
        <div>
            <MarkdownToolbar
                apply={apply}
                onImage={() => setDialog('image')}
                onVideo={() => setDialog('video')}
                onLink={insertLink}
                secretMarkers={secretMarkers}
            />
            <Input
                id="activity-body"
                textArea
                rows={fullScreen ? 28 : 18}
                className="rounded-t-none font-mono text-sm"
                placeholder={
                    '## A heading\n\nWrite your lesson here. Use the toolbar for formatting, images and videos —\nor paste an image straight in.'
                }
                name={field.name}
                value={body}
                onChange={field.onChange}
                onBlur={field.onBlur}
                ref={(el: HTMLTextAreaElement | null) => {
                    textarea.current = el
                    field.ref(el)
                }}
                onPaste={onPaste}
                onDrop={onDrop}
                onKeyDown={onKeyDown}
                aria-describedby="activity-body-help"
            />
        </div>
    )

    const preview = (
        <div className="min-h-40 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
            {body.trim() ? (
                <MarkdownContent showSecretMarkers={allowSecrets}>{body}</MarkdownContent>
            ) : (
                <p className="text-sm text-gray-500">Nothing written yet.</p>
            )}
        </div>
    )

    const visual = (
        <VisualLessonEditor
            value={body}
            onChange={field.onChange}
            onBlur={field.onBlur}
            courseId={courseId}
            onImage={() => setDialog('image')}
            onVideo={() => setDialog('video')}
            secretMarkers={secretMarkers}
            pendingInsert={pendingInsert}
            onInserted={clearPending}
            onUploading={(delta) => setUploading((n) => n + delta)}
            tall={fullScreen}
        />
    )

    const modes = (
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <Segment value={mode} onChange={(value) => setMode(value as Mode)} size="xs">
                <Segment.Item value="visual">Editor</Segment.Item>
                <Segment.Item value="write">Markdown</Segment.Item>
                {fullScreen && mode !== 'visual' && <Segment.Item value="split">Side by side</Segment.Item>}
                <Segment.Item value="preview">Preview</Segment.Item>
            </Segment>
            <Button
                type="button"
                size="xs"
                icon={fullScreen ? <ExitFullScreenIcon /> : <FullScreenIcon />}
                onClick={toggleFullScreen}
            >
                {fullScreen ? 'Exit full screen' : 'Full screen'}
            </Button>
        </div>
    )

    return (
        <FormItem
            label={label}
            htmlFor="activity-body"
            invalid={!!fieldState.error}
            errorMessage={fieldState.error?.message}
            extra={<span className="ml-2 text-xs font-normal text-gray-500">{hint}</span>}
        >
            <div
                className={classNames(
                    fullScreen &&
                        'fixed inset-0 z-[35] flex flex-col overflow-y-auto bg-white p-4 sm:p-6 dark:bg-gray-900',
                )}
                role={fullScreen ? 'region' : undefined}
                aria-label={fullScreen ? `${label} (full screen)` : undefined}
            >
                {fullScreen && <h4 className="mb-3">{label}</h4>}
                {modes}
                {mode === 'visual' ? (
                    visual
                ) : mode === 'preview' ? (
                    preview
                ) : mode === 'split' ? (
                    <div className="grid gap-4 md:grid-cols-2">
                        {editor}
                        <div className="max-h-[calc(100vh-10rem)] overflow-y-auto">{preview}</div>
                    </div>
                ) : (
                    editor
                )}
                <p
                    id="activity-body-help"
                    className={classNames('mt-2 flex flex-wrap justify-between gap-2 text-xs text-gray-500')}
                    role="status"
                    aria-live="polite"
                >
                    <span>
                        {uploading > 0
                            ? `Uploading ${uploading === 1 ? 'an image' : `${uploading} images`}…`
                            : mode === 'visual'
                              ? 'Paste or drop images to upload them · Ctrl+B bold · Ctrl+I italic'
                              : 'Markdown mode, for those who like it · Ctrl+B bold · Ctrl+I italic · Ctrl+K link'}
                    </span>
                    {stats.words > 0 && (
                        <span>
                            {stats.words} words · about {stats.minutes} min read
                        </span>
                    )}
                </p>
            </div>
            <ImageDialog
                isOpen={dialog === 'image'}
                courseId={courseId}
                onClose={() => setDialog(null)}
                onInsert={insertFromDialog}
            />
            <VideoDialog isOpen={dialog === 'video'} onClose={() => setDialog(null)} onInsert={insertFromDialog} />
        </FormItem>
    )
}
