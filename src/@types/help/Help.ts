import type { Role } from '@/@types/auth/Roles'
import type { NavigationIconKey } from '@/configs/icons.config'

/*
 * Help Center content: articles and FAQs written for one or more roles. The server keeps only what the
 * signed-in role may read (server/help) and sends the browser just that — never the other roles' text.
 */

export interface HelpTopic {
    key: string
    title: string
    /** One line under the title on the topic card */
    description: string
    icon: NavigationIconKey
    audiences: Role[]
}

export interface HelpArticle {
    /** URL slug, unique across every role */
    slug: string
    title: string
    /** One or two sentences shown on cards and in search results */
    summary: string
    topic: string
    audiences: Role[]
    /** Markdown (rendered by MarkdownContent, so callouts and tables work) */
    body: string
    /** Shown under "Popular articles" */
    popular?: boolean
}

export interface HelpFaq {
    question: string
    /** Markdown */
    answer: string
    topic: string
    audiences: Role[]
}

/** An article as the browser receives it on the Help Center (no audiences; reading time worked out) */
export interface HelpArticleSummary {
    slug: string
    title: string
    summary: string
    topic: string
    readMinutes: number
    popular: boolean
}

export interface HelpArticleView extends HelpArticleSummary {
    body: string
}

export interface HelpTopicView {
    key: string
    title: string
    description: string
    icon: NavigationIconKey
    articleCount: number
}

export interface HelpFaqView {
    question: string
    answer: string
    topic: string
}

/** Everything the Help Center page needs, already filtered to the viewer's role */
export interface HelpCenterData {
    role: Role
    topics: HelpTopicView[]
    /** Summaries plus bodies, so search can match words inside articles */
    articles: HelpArticleView[]
    faqs: HelpFaqView[]
}

export interface HelpArticlePageData {
    role: Role
    article: HelpArticleView
    topic: HelpTopicView
    related: HelpArticleSummary[]
}
