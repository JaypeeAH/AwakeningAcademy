'use client'

import { useState } from 'react'
import Link from 'next/link'
import Dropdown from '@/components/ui/Dropdown'
import Button from '@/components/ui/Button'
import { toastError } from '@/components/ui/toast/toast'
import navigationIcon, { NotificationIcon } from '@/configs/icons.config'
import { apiMarkNotificationsRead, useSWRNotifications } from '@/services/misc'
import { useNotificationsStore } from '@/stores/GameStores'
import { notificationIcon, notificationLink } from '@/@types/notifications/Notification'
import type { AppNotification } from '@/@types/notifications/Notification'
import useSyncResource from '@/utils/hooks/useSyncResource'
import { fromNow } from '@/utils/dates'
import classNames from '@/utils/classNames'

/** Polls the user's notifications and pushes them into the store */
export function NotificationsSWRProvider() {
    const swr = useSWRNotifications()
    const setters = useNotificationsStore()
    useSyncResource(swr, setters)
    return null
}

/** System messages: level ups, promotions, adjustments. Opening the menu doesn't mark them read; clicking one, or the button, does. */
export default function NotificationBell() {
    const feed = useNotificationsStore((state) => state.data)
    const setData = useNotificationsStore((state) => state.setData)
    const [marking, setMarking] = useState(false)
    const unread = feed?.unread ?? 0

    const markAllRead = async () => {
        setMarking(true)
        try {
            setData(await apiMarkNotificationsRead({ all: true }))
        } catch (error) {
            toastError('Couldn’t mark notifications as read.', error)
        } finally {
            setMarking(false)
        }
    }

    /** Clicking a message marks just that one read (optimistically) and follows its link */
    const markRead = async (n: AppNotification) => {
        if (n.readAt || !feed) return
        setData({
            records: feed.records.map((r) => (r.id === n.id ? { ...r, readAt: new Date() } : r)),
            unread: Math.max(0, feed.unread - 1),
        })
        try {
            setData(await apiMarkNotificationsRead({ ids: [n.id] }))
        } catch (error) {
            toastError('Couldn’t mark the notification as read.', error)
        }
    }

    return (
        <>
            <NotificationsSWRProvider />
            <Dropdown
                placement="bottom-end"
                renderTitle={
                    <button
                        type="button"
                        className="header-action-item header-action-item-hoverable relative text-xl"
                        aria-label={unread ? `Notifications, ${unread} unread` : 'Notifications'}
                    >
                        <NotificationIcon />
                        {unread > 0 && (
                            <span className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-error px-1 text-[10px] font-bold text-white">
                                {unread > 9 ? '9+' : unread}
                            </span>
                        )}
                    </button>
                }
            >
                <Dropdown.Item variant="header">
                    <div className="flex items-center justify-between gap-4 px-2 py-1">
                        <span className="font-semibold text-gray-900 dark:text-gray-100">System messages</span>
                        {unread > 0 && (
                            <Button size="xs" variant="plain" loading={marking} onClick={markAllRead}>
                                Mark all read
                            </Button>
                        )}
                    </div>
                </Dropdown.Item>
                <Dropdown.Item variant="divider" />
                <div className="max-h-96 w-80 overflow-y-auto">
                    {!feed?.records.length ? (
                        <p className="px-4 py-6 text-center text-sm text-gray-500">
                            Nothing yet. Rewards and promotions will appear here.
                        </p>
                    ) : (
                        <ul>
                            {feed.records.map((n) => {
                                const href = notificationLink(n)
                                const rowClass = 'flex w-full gap-3 px-3 py-2.5 text-left'
                                const content = (
                                    <>
                                        <span className="mt-0.5 text-lg text-primary">
                                            {navigationIcon[notificationIcon[n.kind] ?? 'progression']}
                                        </span>
                                        <span className="min-w-0 flex-1">
                                            <span className="block text-sm font-semibold text-gray-900 dark:text-gray-100">
                                                {n.title}
                                            </span>
                                            {n.body && (
                                                <span className="block text-xs text-gray-500 dark:text-gray-400">
                                                    {n.body}
                                                </span>
                                            )}
                                            <span className="block text-[11px] text-gray-400">
                                                {fromNow(n.createdAt)}
                                            </span>
                                        </span>
                                    </>
                                )
                                return (
                                    <Dropdown.Item
                                        key={n.id}
                                        variant="custom"
                                        eventKey={n.id}
                                        className={classNames(
                                            'cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700',
                                            !n.readAt && 'bg-primary-subtle',
                                        )}
                                        onClick={() => markRead(n)}
                                    >
                                        {href ? (
                                            <Link href={href} className={rowClass}>
                                                {content}
                                            </Link>
                                        ) : (
                                            <div className={rowClass}>{content}</div>
                                        )}
                                    </Dropdown.Item>
                                )
                            })}
                        </ul>
                    )}
                </div>
            </Dropdown>
        </>
    )
}
