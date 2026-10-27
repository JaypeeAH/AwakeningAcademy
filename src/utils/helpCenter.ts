import { readingStats } from '@/utils/media'
import type { Role } from '@/@types/auth/Roles'
import type {
    HelpArticle,
    HelpArticlePageData,
    HelpArticleSummary,
    HelpArticleView,
    HelpCenterData,
    HelpFaq,
    HelpFaqView,
    HelpTopic,
} from '@/@types/help/Help'

/*
 * Help Center logic shared by the server (choosing what a role may read) and the browser (search).
 * The content itself lives in server/help and never reaches the browser unfiltered.
 */

export interface HelpContent {
    topics: HelpTopic[]
    articles: HelpArticle[]
    faqs: HelpFaq[]
}

/** Only the items written for this role */
export const forRole = <T extends { audiences: Role[] }>(items: T[], role: Role): T[] =>
    items.filter((item) => item.audiences.includes(role))

const toView = (article: HelpArticle): HelpArticleView => ({
    slug: article.slug,
    title: article.title,
    summary: article.summary,
    topic: article.topic,
    readMinutes: Math.max(1, readingStats(article.body).minutes),
    popular: !!article.popular,
    body: article.body,
})

export const toSummary = ({
    slug,
    title,
    summary,
    topic,
    readMinutes,
    popular,
}: HelpArticleView): HelpArticleSummary => ({
    slug,
    title,
    summary,
    topic,
    readMinutes,
    popular,
})

/** The Help Center for one role: its topics (with article counts), articles and FAQs */
export function buildHelpCenter(content: HelpContent, role: Role): HelpCenterData {
    const articles = forRole(content.articles, role).map(toView)
    const topics = forRole(content.topics, role)
        .map((topic) => ({
            key: topic.key,
            title: topic.title,
            description: topic.description,
            icon: topic.icon,
            articleCount: articles.filter((a) => a.topic === topic.key).length,
        }))
        .filter((topic) => topic.articleCount > 0)
    const faqs: HelpFaqView[] = forRole(content.faqs, role).map(({ question, answer, topic }) => ({
        question,
        answer,
        topic,
    }))
    return { role, topics, articles, faqs }
}

/** One article for one role, or null when it doesn't exist or isn't written for them */
export function buildHelpArticlePage(content: HelpContent, role: Role, slug: string): HelpArticlePageData | null {
    const center = buildHelpCenter(content, role)
    const article = center.articles.find((a) => a.slug === slug)
    const topic = article && center.topics.find((t) => t.key === article.topic)
    if (!article || !topic) return null
    const related = center.articles.filter((a) => a.topic === article.topic && a.slug !== slug).map(toSummary)
    return { role, article, topic, related }
}

/** Lower case, accents and punctuation removed, so "Can’t" finds "cant" */
const normalize = (text: string) =>
    text
        .toLowerCase()
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .replace(/[’'`]/g, '')
        .replace(/[^a-z0-9]+/g, ' ')
        .trim()

/** Markdown reduced to its words (links keep their text; images and formatting disappear) */
const plainText = (markdown: string) =>
    markdown
        .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
        .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
        .replace(/\[!(note|tip|important|warning)\]/gi, ' ')

/** Every word of the query must appear; matches in titles rank above summaries, which rank above bodies */
function score(query: string[], title: string, summary: string, body: string) {
    const t = normalize(title)
    const s = normalize(summary)
    const b = normalize(plainText(body))
    let total = 0
    for (const word of query) {
        if (t.includes(word)) total += 10
        else if (s.includes(word)) total += 4
        else if (b.includes(word)) total += 1
        else return 0
    }
    return total
}

export interface HelpSearchResults {
    articles: HelpArticleSummary[]
    faqs: HelpFaqView[]
}

/** Articles and FAQs matching every word of the query, best first */
export function searchHelp(query: string, articles: HelpArticleView[], faqs: HelpFaqView[]): HelpSearchResults {
    const words = normalize(query).split(' ').filter(Boolean)
    if (!words.length) return { articles: [], faqs: [] }
    const rank = <T>(items: T[], fields: (item: T) => [string, string, string]) =>
        items
            .map((item, index) => ({ item, index, score: score(words, ...fields(item)) }))
            .filter((r) => r.score > 0)
            .sort((a, b) => b.score - a.score || a.index - b.index)
            .map((r) => r.item)
    return {
        articles: rank(articles, (a) => [a.title, a.summary, a.body]).map(toSummary),
        faqs: rank(faqs, (f) => [f.question, '', f.answer]),
    }
}
