import { Node, mergeAttributes, ReactNodeViewRenderer, type Extensions } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Image from '@tiptap/extension-image'
import { TableKit } from '@tiptap/extension-table'
import { Placeholder } from '@tiptap/extensions'
import { CalloutView, ImageView, SecretMarkerView, VideoView } from './nodeViews'

/*
 * The visual lesson editor's building blocks. Only what lessons/utils/lessonDoc.ts can turn into Markdown
 * is offered (no underline, colours or fonts), so what a teacher sees is exactly what students get.
 */

/** A Tip / Note / Important / Warning box holding ordinary content */
export const Callout = Node.create({
    name: 'callout',
    group: 'block',
    content: 'block+',
    defining: true,
    addAttributes() {
        return { type: { default: 'tip' } }
    },
    parseHTML() {
        return [{ tag: 'div[data-callout]', getAttrs: (el) => ({ type: (el as HTMLElement).dataset.callout }) }]
    },
    renderHTML({ HTMLAttributes, node }) {
        return ['div', mergeAttributes(HTMLAttributes, { 'data-callout': node.attrs.type }), 0]
    },
    addNodeView() {
        return ReactNodeViewRenderer(CalloutView)
    },
})

/** A YouTube or Vimeo video (a link, never an upload) */
export const Video = Node.create({
    name: 'video',
    group: 'block',
    atom: true,
    draggable: true,
    addAttributes() {
        return { src: { default: '' }, title: { default: '' } }
    },
    parseHTML() {
        return [{ tag: 'div[data-video]' }]
    },
    renderHTML({ HTMLAttributes }) {
        return ['div', mergeAttributes(HTMLAttributes, { 'data-video': '' })]
    },
    addNodeView() {
        return ReactNodeViewRenderer(VideoView)
    },
})

/** A hidden object (✦, clicked) or hidden section (reached) placed from the course's Secrets */
export const SecretMarker = Node.create({
    name: 'secretMarker',
    group: 'inline',
    inline: true,
    atom: true,
    addAttributes() {
        return { key: { default: '' }, seen: { default: false }, label: { default: '✦' } }
    },
    parseHTML() {
        return [{ tag: 'span[data-secret]' }]
    },
    renderHTML({ HTMLAttributes }) {
        return ['span', mergeAttributes(HTMLAttributes, { 'data-secret': '' })]
    },
    addNodeView() {
        return ReactNodeViewRenderer(SecretMarkerView)
    },
})

const LessonImage = Image.extend({
    draggable: true,
    addNodeView() {
        return ReactNodeViewRenderer(ImageView)
    },
}).configure({ inline: false, allowBase64: false })

export function lessonExtensions(placeholder: string): Extensions {
    return [
        StarterKit.configure({
            heading: { levels: [1, 2, 3] },
            // Markdown has no underline, so it isn't offered (Ctrl+U would be lost on save)
            underline: false,
            link: { openOnClick: false, autolink: true, defaultProtocol: 'https' },
        }),
        LessonImage,
        TableKit.configure({ table: { resizable: false } }),
        Callout,
        Video,
        SecretMarker,
        Placeholder.configure({ placeholder }),
    ]
}
