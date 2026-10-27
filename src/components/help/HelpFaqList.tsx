import MarkdownContent from '@/components/shared/MarkdownContent'
import { ExpandIcon } from '@/configs/icons.config'
import classNames from '@/utils/classNames'
import type { HelpFaqView } from '@/@types/help/Help'

interface HelpFaqListProps {
    faqs: HelpFaqView[]
    /** Open every answer (search results) */
    open?: boolean
    className?: string
}

/** Questions that expand to their answers. Native <details>, so it works with keyboards and screen readers. */
export default function HelpFaqList({ faqs, open, className }: HelpFaqListProps) {
    return (
        <ul className={classNames('space-y-3', className)}>
            {faqs.map((faq) => (
                <li key={faq.question}>
                    <details
                        open={open}
                        className="group rounded-2xl border border-gray-200 bg-white open:border-primary dark:border-gray-700 dark:bg-gray-800"
                    >
                        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-2xl px-5 py-4 font-semibold text-gray-900 focus-visible:outline-2 focus-visible:outline-primary dark:text-gray-50 [&::-webkit-details-marker]:hidden">
                            {faq.question}
                            <ExpandIcon
                                className="shrink-0 text-lg text-gray-400 transition-transform group-open:rotate-180 motion-reduce:transition-none"
                                aria-hidden
                            />
                        </summary>
                        <div className="px-5 pb-4">
                            <MarkdownContent className="text-sm" internalLinks>
                                {faq.answer}
                            </MarkdownContent>
                        </div>
                    </details>
                </li>
            ))}
        </ul>
    )
}
