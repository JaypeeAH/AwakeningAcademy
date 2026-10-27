import classNames from '@/utils/classNames'
import type { ReactNode } from 'react'

interface SystemPanelProps {
    title?: ReactNode
    /** Small caps line above the title, e.g. "Status" */
    eyebrow?: ReactNode
    actions?: ReactNode
    children: ReactNode
    className?: string
    bodyClassName?: string
    /** Gold frame for rare/rank moments */
    tone?: 'system' | 'gold'
    as?: 'section' | 'div' | 'article'
}

/**
 * The "system window": the game's signature panel — navy glass, a glowing top edge and corner marks.
 * Use it for game information (status, trials, rewards); plain Cards for teaching tools and reports.
 */
export default function SystemPanel({
    title,
    eyebrow,
    actions,
    children,
    className,
    bodyClassName,
    tone = 'system',
    as: Component = 'section',
}: SystemPanelProps) {
    return (
        <Component className={classNames('system-panel', tone === 'gold' && 'system-panel-gold', className)}>
            {(title || eyebrow || actions) && (
                <header className="flex items-start justify-between gap-3 px-5 pt-5">
                    <div className="min-w-0">
                        {eyebrow && <div className="system-eyebrow">{eyebrow}</div>}
                        {title && <h2 className="text-base font-semibold md:text-lg">{title}</h2>}
                    </div>
                    {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
                </header>
            )}
            <div className={classNames('p-5', bodyClassName)}>{children}</div>
        </Component>
    )
}
