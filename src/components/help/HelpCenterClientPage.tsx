'use client'

import { useDeferredValue, useId, useMemo, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import EmptyState from '@/components/shared/EmptyState'
import { HelpArticleCard, HelpTopicCard } from './HelpCards'
import HelpFaqList from './HelpFaqList'
import StillStuck from './StillStuck'
import navigationIcon, { PrevIcon, SearchIcon } from '@/configs/icons.config'
import { helpPath } from '@/configs/app.config'
import { usePageBreadcrumbs } from '@/utils/hooks/useBreadcrumbs'
import { searchHelp, toSummary } from '@/utils/helpCenter'
import type { Role } from '@/@types/auth/Roles'
import type { HelpCenterData } from '@/@types/help/Help'

const INTRO: Record<Role, { subtitle: string; placeholder: string }> = {
    student: {
        subtitle: 'How quests, XP, ranks and everything else in the Academy work, and what to do when you’re stuck.',
        placeholder: 'Search, e.g. “join code”, “streak” or “Easter Bunny”',
    },
    teacher: {
        subtitle: 'How to build courses, mark work and use the game features with your class.',
        placeholder: 'Search, e.g. “publish”, “rubric” or “AI drafts”',
    },
    admin: {
        subtitle: 'Running the Academy — people, rules and operations — plus every guide teachers see.',
        placeholder: 'Search, e.g. “roles”, “rate limits” or “backups”',
    },
}

const SECTION_TITLE = 'mb-4 text-lg font-semibold md:text-xl'

/** The Help Center home: search, topics, popular articles and FAQs — all already filtered to the viewer's role */
export default function HelpCenterClientPage({ data }: { data: HelpCenterData }) {
    const searchParams = useSearchParams()
    const searchId = useId()
    const [query, setQuery] = useState('')
    const deferredQuery = useDeferredValue(query)
    const topic = data.topics.find((t) => t.key === searchParams.get('topic')) ?? null
    const topicTitle = useMemo(() => new Map(data.topics.map((t) => [t.key, t.title])), [data.topics])
    const results = useMemo(
        () => searchHelp(deferredQuery, data.articles, data.faqs),
        [deferredQuery, data.articles, data.faqs],
    )
    const searching = deferredQuery.trim().length > 0
    const resultCount = results.articles.length + results.faqs.length
    const popular = data.articles.filter((a) => a.popular).map(toSummary)
    const intro = INTRO[data.role]

    usePageBreadcrumbs(
        topic ? [{ label: 'Help Center', href: helpPath }, { label: topic.title }] : [{ label: 'Help Center' }],
    )

    return (
        <div className="space-y-10">
            <section
                aria-labelledby="help-title"
                className="rounded-2xl border border-gray-200 px-4 py-10 text-center sm:px-8 md:py-14 dark:border-gray-700"
                style={{ background: 'radial-gradient(ellipse at 20% 0%, var(--primary-subtle), transparent 70%)' }}
            >
                <h1 id="help-title" className="text-2xl md:text-4xl">
                    Help Center
                </h1>
                <p className="mx-auto mt-3 max-w-xl text-gray-600 dark:text-gray-300">{intro.subtitle}</p>
                <form role="search" className="mx-auto mt-6 max-w-2xl" onSubmit={(e) => e.preventDefault()}>
                    <label htmlFor={searchId} className="sr-only">
                        Search help articles and questions
                    </label>
                    <Input
                        id={searchId}
                        type="search"
                        size="lg"
                        autoComplete="off"
                        prefix={<SearchIcon className="text-xl" />}
                        placeholder={intro.placeholder}
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                    />
                </form>
                <p className="sr-only" role="status" aria-live="polite">
                    {searching ? `${resultCount} ${resultCount === 1 ? 'result' : 'results'}` : ''}
                </p>
            </section>

            {searching ? (
                <section aria-labelledby="help-results">
                    <h2 id="help-results" className={SECTION_TITLE}>
                        {resultCount ? `Results for “${deferredQuery.trim()}”` : 'No results'}
                    </h2>
                    {resultCount === 0 ? (
                        <EmptyState
                            icon={<SearchIcon />}
                            title={`Nothing matches “${deferredQuery.trim()}”`}
                            description="Try fewer or different words, or clear the search and browse the topics."
                            action={<Button onClick={() => setQuery('')}>Clear search</Button>}
                        />
                    ) : (
                        <div className="space-y-8">
                            {results.articles.length > 0 && (
                                <div className="grid gap-4 lg:grid-cols-2">
                                    {results.articles.map((article) => (
                                        <HelpArticleCard
                                            key={article.slug}
                                            article={article}
                                            topicTitle={topicTitle.get(article.topic)}
                                        />
                                    ))}
                                </div>
                            )}
                            {results.faqs.length > 0 && (
                                <div>
                                    <h3 className="mb-3 text-base font-semibold">Frequently asked questions</h3>
                                    <HelpFaqList faqs={results.faqs} open />
                                </div>
                            )}
                        </div>
                    )}
                </section>
            ) : topic ? (
                <section aria-labelledby="help-topic">
                    <Link
                        href={helpPath}
                        className="mb-3 inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline"
                    >
                        <PrevIcon aria-hidden /> All topics
                    </Link>
                    <div className="mb-5 flex items-center gap-3">
                        <span
                            className="flex h-11 w-11 items-center justify-center rounded-full bg-primary-subtle text-2xl text-primary"
                            aria-hidden
                        >
                            {navigationIcon[topic.icon]}
                        </span>
                        <div>
                            <h2 id="help-topic" className="text-lg font-semibold md:text-xl">
                                {topic.title}
                            </h2>
                            <p className="text-sm text-gray-600 dark:text-gray-300">{topic.description}</p>
                        </div>
                    </div>
                    <div className="grid gap-4 lg:grid-cols-2">
                        {data.articles
                            .filter((a) => a.topic === topic.key)
                            .map((article) => (
                                <HelpArticleCard key={article.slug} article={toSummary(article)} />
                            ))}
                    </div>
                    {data.faqs.some((f) => f.topic === topic.key) && (
                        <div className="mt-8">
                            <h3 className="mb-3 text-base font-semibold">Frequently asked questions</h3>
                            <HelpFaqList faqs={data.faqs.filter((f) => f.topic === topic.key)} />
                        </div>
                    )}
                </section>
            ) : (
                <>
                    <section aria-labelledby="help-topics">
                        <h2 id="help-topics" className={SECTION_TITLE}>
                            Browse by topic
                        </h2>
                        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                            {data.topics.map((t) => (
                                <li key={t.key}>
                                    <HelpTopicCard topic={t} />
                                </li>
                            ))}
                        </ul>
                    </section>

                    {popular.length > 0 && (
                        <section aria-labelledby="help-popular">
                            <h2 id="help-popular" className={SECTION_TITLE}>
                                Popular articles
                            </h2>
                            <ul className="grid gap-4 lg:grid-cols-2">
                                {popular.map((article) => (
                                    <li key={article.slug}>
                                        <HelpArticleCard article={article} topicTitle={topicTitle.get(article.topic)} />
                                    </li>
                                ))}
                            </ul>
                        </section>
                    )}

                    {data.faqs.length > 0 && (
                        <section aria-labelledby="help-faqs">
                            <h2 id="help-faqs" className={SECTION_TITLE}>
                                Frequently asked questions
                            </h2>
                            <HelpFaqList faqs={data.faqs} />
                        </section>
                    )}
                </>
            )}

            <StillStuck role={data.role} />
        </div>
    )
}
