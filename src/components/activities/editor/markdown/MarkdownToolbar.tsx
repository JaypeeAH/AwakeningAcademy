'use client'

import type { ReactNode } from 'react'
import Button from '@/components/ui/Button'
import Dropdown from '@/components/ui/Dropdown'
import Tooltip from '@/components/ui/Tooltip'
import {
    BoldIcon,
    BulletListIcon,
    CalloutIcon,
    CodeIcon,
    DividerIcon,
    HeadingIcon,
    ImageIcon,
    ItalicIcon,
    LinkInsertIcon,
    NumberedListIcon,
    QuoteIcon,
    SubheadingIcon,
    TableIcon,
    VideoIcon,
} from '@/configs/icons.config'
import navigationIcon from '@/configs/icons.config'
import { CALLOUT_TYPES, calloutLabel } from '@/utils/media'
import { insertBlock, prefixLines, TABLE_TEMPLATE, wrapSelection, type TextEdit } from '@/utils/markdownEditing'

export type EditFn = (selection: { value: string; start: number; end: number }) => TextEdit

export interface SecretMarkerOption {
    key: string
    title: string
    snippet: string
    kind: 'object' | 'section'
}

interface MarkdownToolbarProps {
    apply: (edit: EditFn) => void
    onImage: () => void
    onVideo: () => void
    onLink: () => void
    /** Hidden objects / sections for this lesson; undefined hides the menu (briefings) */
    secretMarkers?: SecretMarkerOption[]
    disabled?: boolean
}

function ToolButton({
    label,
    shortcut,
    icon,
    onClick,
    disabled,
}: {
    label: string
    shortcut?: string
    icon: ReactNode
    onClick: () => void
    disabled?: boolean
}) {
    return (
        <Tooltip title={shortcut ? `${label} (${shortcut})` : label}>
            <Button
                type="button"
                size="xs"
                variant="plain"
                icon={icon}
                aria-label={label}
                onClick={onClick}
                disabled={disabled}
                // Keep the textarea's selection while clicking
                onMouseDown={(e) => e.preventDefault()}
            />
        </Tooltip>
    )
}

const Separator = () => <span aria-hidden className="mx-1 h-5 w-px bg-gray-200 dark:bg-gray-700" />

/** Formatting buttons for the lesson editor. Every button edits the Markdown text, so nothing is hidden. */
export default function MarkdownToolbar({
    apply,
    onImage,
    onVideo,
    onLink,
    secretMarkers,
    disabled,
}: MarkdownToolbarProps) {
    return (
        <div
            role="toolbar"
            aria-label="Formatting"
            className="flex flex-wrap items-center gap-0.5 rounded-t-xl border border-b-0 border-gray-200 bg-gray-50 px-2 py-1 dark:border-gray-700 dark:bg-gray-900"
        >
            <ToolButton
                label="Heading"
                icon={<HeadingIcon />}
                disabled={disabled}
                onClick={() => apply((s) => prefixLines(s, '## '))}
            />
            <ToolButton
                label="Subheading"
                icon={<SubheadingIcon />}
                disabled={disabled}
                onClick={() => apply((s) => prefixLines(s, '### '))}
            />
            <ToolButton
                label="Bold"
                shortcut="Ctrl+B"
                icon={<BoldIcon />}
                disabled={disabled}
                onClick={() => apply((s) => wrapSelection(s, '**', '**', 'bold text'))}
            />
            <ToolButton
                label="Italic"
                shortcut="Ctrl+I"
                icon={<ItalicIcon />}
                disabled={disabled}
                onClick={() => apply((s) => wrapSelection(s, '_', '_', 'italic text'))}
            />
            <ToolButton label="Link" shortcut="Ctrl+K" icon={<LinkInsertIcon />} disabled={disabled} onClick={onLink} />
            <Separator />
            <ToolButton
                label="Bulleted list"
                icon={<BulletListIcon />}
                disabled={disabled}
                onClick={() => apply((s) => prefixLines(s, '- '))}
            />
            <ToolButton
                label="Numbered list"
                icon={<NumberedListIcon />}
                disabled={disabled}
                onClick={() => apply((s) => prefixLines(s, (i) => `${i + 1}. `))}
            />
            <ToolButton
                label="Quote"
                icon={<QuoteIcon />}
                disabled={disabled}
                onClick={() => apply((s) => prefixLines(s, '> '))}
            />
            <Dropdown
                placement="bottom-start"
                renderTitle={
                    <Button
                        type="button"
                        size="xs"
                        variant="plain"
                        icon={<CalloutIcon />}
                        aria-label="Callout box"
                        title="Callout box (tip, note, warning)"
                        disabled={disabled}
                    />
                }
            >
                {CALLOUT_TYPES.map((type) => (
                    <Dropdown.Item
                        key={type}
                        eventKey={type}
                        onClick={() =>
                            apply((s) =>
                                insertBlock(
                                    s,
                                    `> [!${type.toUpperCase()}]\n> Write your ${calloutLabel[type].toLowerCase()} here.`,
                                    `Write your ${calloutLabel[type].toLowerCase()} here.`,
                                ),
                            )
                        }
                    >
                        {calloutLabel[type]}
                    </Dropdown.Item>
                ))}
            </Dropdown>
            <ToolButton
                label="Code"
                icon={<CodeIcon />}
                disabled={disabled}
                onClick={() => apply((s) => wrapSelection(s, '`', '`', 'code'))}
            />
            <ToolButton
                label="Table"
                icon={<TableIcon />}
                disabled={disabled}
                onClick={() => apply((s) => insertBlock(s, TABLE_TEMPLATE, 'Column 1'))}
            />
            <ToolButton
                label="Divider"
                icon={<DividerIcon />}
                disabled={disabled}
                onClick={() => apply((s) => insertBlock(s, '---'))}
            />
            <Separator />
            <ToolButton label="Image" icon={<ImageIcon />} disabled={disabled} onClick={onImage} />
            <ToolButton label="Video (YouTube or Vimeo)" icon={<VideoIcon />} disabled={disabled} onClick={onVideo} />
            {secretMarkers && (
                <Dropdown
                    placement="bottom-end"
                    renderTitle={
                        <Button
                            type="button"
                            size="xs"
                            variant="plain"
                            icon={navigationIcon.easter}
                            aria-label="Hide a secret here"
                            title="Hide a secret here"
                            disabled={disabled}
                        />
                    }
                >
                    {secretMarkers.length ? (
                        secretMarkers.map((marker) => (
                            <Dropdown.Item
                                key={marker.key}
                                eventKey={marker.key}
                                onClick={() => apply((s) => insertBlock(s, marker.snippet))}
                            >
                                {marker.kind === 'object' ? '✦' : '◆'} {marker.title}
                                <span className="ml-1 text-xs text-gray-500">
                                    {marker.kind === 'object' ? '(hidden object)' : '(hidden section)'}
                                </span>
                            </Dropdown.Item>
                        ))
                    ) : (
                        <Dropdown.Item eventKey="none" disabled>
                            <span className="max-w-60 whitespace-normal text-xs text-gray-500">
                                Create a “hidden object” or “lesson section” secret for this lesson in the course’s
                                Secrets tab, then place it here.
                            </span>
                        </Dropdown.Item>
                    )}
                </Dropdown>
            )}
        </div>
    )
}
