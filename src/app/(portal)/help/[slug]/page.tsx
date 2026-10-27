import { cache } from 'react'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import HelpArticleClientPage from '@/components/help/HelpArticleClientPage'
import { requireUser } from '@/server/actions/auth'
import { getHelpArticle } from '@/server/actions/help'
import { isNotFound } from '@/server/utils/errors'

interface HelpArticlePageProps {
    params: Promise<{ slug: string }>
}

const SLUG = /^[a-z0-9-]{1,80}$/

// Shared by generateMetadata and the page within one request. An article written for another role
// doesn't exist for this one (404), so its text never reaches the browser.
const loadArticle = cache(async (slug: string) => {
    if (!SLUG.test(slug)) notFound()
    try {
        return getHelpArticle(await requireUser(), slug)
    } catch (error) {
        if (isNotFound(error)) notFound()
        throw error
    }
})

export async function generateMetadata({ params }: HelpArticlePageProps): Promise<Metadata> {
    const { article } = await loadArticle((await params).slug)
    return { title: `${article.title} · Help Center` }
}

export default async function HelpArticlePage({ params }: HelpArticlePageProps) {
    const data = await loadArticle((await params).slug)
    return <HelpArticleClientPage data={data} />
}
