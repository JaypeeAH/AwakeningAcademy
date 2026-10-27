'use client'

import Link from 'next/link'
import MarkdownContent from '@/components/shared/MarkdownContent'
import { HelpArticleCard } from './HelpCards'
import StillStuck from './StillStuck'
import navigationIcon, { ClockIcon, PrevIcon } from '@/configs/icons.config'
import { getHelpTopicPath, helpPath } from '@/configs/app.config'
import { usePageBreadcrumbs } from '@/utils/hooks/useBreadcrumbs'
import type { HelpArticlePageData } from '@/@types/help/Help'

/** One Help Center article, with others from the same topic */
export default function HelpArticleClientPage({ data }: { data: HelpArticlePageData }) {
    const { article, topic, related, role } = data
    usePageBreadcrumbs([
        { label: 'Help Center', href: helpPath },
        { label: topic.title, href: getHelpTopicPath(topic.key) },
        { label: article.title },
    ])

    return (
        <div className="mx-auto max-w-3xl space-y-10">
            <article aria-labelledby="help-article-title">
                <Link
                    href={getHelpTopicPath(topic.key)}
                    className="mb-4 inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline"
                >
                    <PrevIcon aria-hidden /> {topic.title}
                </Link>
                <header className="mb-6 border-b border-gray-200 pb-5 dark:border-gray-700">
                    <h1 id="help-article-title" className="text-2xl md:text-3xl">
                        {article.title}
                    </h1>
                    <p className="mt-2 text-gray-600 dark:text-gray-300">{article.summary}</p>
                    <p className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-500 dark:text-gray-400">
                        <span className="inline-flex items-center gap-1.5">
                            <span className="text-base text-primary" aria-hidden>
                                {navigationIcon[topic.icon]}
                            </span>
                            {topic.title}
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                            <ClockIcon aria-hidden /> {article.readMinutes} min read
                        </span>
                    </p>
                </header>
                <MarkdownContent internalLinks>{article.body}</MarkdownContent>
            </article>

            {related.length > 0 && (
                <section aria-labelledby="help-related">
                    <h2 id="help-related" className="mb-4 text-lg font-semibold">
                        Related articles
                    </h2>
                    <ul className="space-y-3">
                        {related.map((r) => (
                            <li key={r.slug}>
                                <HelpArticleCard article={r} topicTitle={topic.title} />
                            </li>
                        ))}
                    </ul>
                </section>
            )}

            <StillStuck role={role} />
        </div>
    )
}
