import classNames from '@/utils/classNames'
import { portalShortName } from '@/configs/app.config'
import type { CommonProps } from '@/@types/common'

export interface LogoProps extends CommonProps {
    type?: 'full' | 'streamline'
    mode?: 'light' | 'dark'
    imgClass?: string
    /** Height of the mark in px */
    size?: number
}

/** Original mark: a seal with a rising flame-chevron and an opening "eye" — the moment of awakening. */
export function LogoMark({ size = 32, className }: { size?: number; className?: string }) {
    return (
        <svg viewBox="0 0 40 40" width={size} height={size} className={className} aria-hidden>
            <path
                d="M20 2 L36 11 L36 29 L20 38 L4 29 L4 11 Z"
                fill="var(--primary-subtle)"
                stroke="var(--primary)"
                strokeWidth="2"
                strokeLinejoin="round"
            />
            <path
                d="M12 25 L20 13 L28 25"
                fill="none"
                stroke="var(--primary)"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
            <path d="M15 27.5 Q20 23 25 27.5 Q20 32 15 27.5 Z" fill="var(--gold)" />
            <circle cx="20" cy="27.5" r="1.4" fill="var(--neutral)" />
        </svg>
    )
}

const Logo = ({ type = 'full', className, imgClass, size = 32, style }: LogoProps) => (
    <div className={classNames('logo flex items-center gap-2.5', className)} style={style}>
        <LogoMark size={size} className={imgClass} />
        {type === 'full' && (
            <span className="font-display text-[15px] font-bold leading-tight text-gray-900 dark:text-gray-50">
                {portalShortName}
            </span>
        )}
    </div>
)

export default Logo
