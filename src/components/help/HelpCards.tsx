import Link from 'next/link'
import navigationIcon, { ForwardIcon } from '@/configs/icons.config'
import { getHelpArticlePath, getHelpTopicPath } from '@/configs/app.config'
import classNames from '@/utils/classNames'
import type { HelpArticleSummary, HelpTopicView } from '@/@types/help/Help'

const CARD =
    'rounded-2xl border border-gray-200 bg-white transition-colors hover:border-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary dark:border-gray-700 dark:bg-gray-800'

/** A topic on the Help Center: icon, title, one line and how many articles it holds */
export function HelpTopicCard({ topic }: { topic: HelpTopicView }) {
    return (
        <Link
            href={getHelpTopicPath(topic.key)}
            className={classNames(CARD, 'flex h-full flex-col items-center px-5 py-6 text-center')}
        >
            <span
                className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary-subtle text-2xl text-primary"
                aria-hidden
            >
                {navigationIcon[topic.icon]}
            </span>
            <h3 className="text-base font-semibold text-gray-900 dark:text-gray-50">{topic.title}</h3>
            <p className="mt-1.5 text-sm text-gray-600 dark:text-gray-300">{topic.description}</p>
            <span className="mt-auto pt-4 text-sm font-semibold text-primary">
                {topic.articleCount} {topic.articleCount === 1 ? 'article' : 'articles'}
            </span>
        </Link>
    )
}

interface HelpArticleCardProps {
    article: HelpArticleSummary
    /** Topic title shown after the reading time */
    topicTitle?: string
    className?: string
}

/** An article link: title, summary, "N min read · Topic" */
export function HelpArticleCard({ article, topicTitle, className }: HelpArticleCardProps) {
    return (
        <Link
            href={getHelpArticlePath(article.slug)}
            className={classNames(CARD, 'group flex h-full items-start gap-4 p-4 sm:p-5', className)}
        >
            <span
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-subtle text-xl text-primary"
                aria-hidden
            >
                {navigationIcon.lesson}
            </span>
            <span className="min-w-0 flex-1">
                <span className="block font-semibold text-gray-900 dark:text-gray-50">{article.title}</span>
                <span className="mt-1 block text-sm text-gray-600 dark:text-gray-300">{article.summary}</span>
                <span className="mt-2 block text-xs text-gray-500 dark:text-gray-400">
                    {article.readMinutes} min read{topicTitle ? ` · ${topicTitle}` : ''}
                </span>
            </span>
            <ForwardIcon
                className="mt-1 shrink-0 text-gray-400 transition-transform group-hover:translate-x-0.5 group-hover:text-primary motion-reduce:transition-none"
                aria-hidden
            />
        </Link>
    )
}
